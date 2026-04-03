const axios = require('axios');
const crypto = require('crypto');
const { db } = require('../database');
const { apiResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const SERDIPAY_API = process.env.SERDIPAY_API_URL || 'https://api.serdipay.com';
const SERDIPAY_KEY = process.env.SERDIPAY_API_KEY;
const SERDIPAY_SECRET = process.env.SERDIPAY_SECRET_KEY;
const SERDIPAY_MERCHANT = process.env.SERDIPAY_MERCHANT_ID;

const paymentController = {
  /**
   * POST /api/payments/initiate - Initier un paiement via SerdiPay
   */
  async initiate(req, res) {
    try {
      const { order_id, phone_number } = req.body;

      const order = await db('orders').where('id', order_id).first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée');
      if (order.client_id !== req.user.id) {
        return apiResponse(res, 403, null, 'Non autorisé');
      }

      // Créer l'enregistrement de paiement
      const [payment] = await db('payments').insert({
        order_id: order.id,
        user_id: req.user.id,
        amount: order.total,
        currency: 'CDF',
        type: 'client_payment',
        phone_number,
        status: 'pending',
      }).returning('*');

      // Appel API SerdiPay
      try {
        const response = await axios.post(`${SERDIPAY_API}/v1/payments`, {
          merchant_id: SERDIPAY_MERCHANT,
          amount: order.total,
          currency: 'CDF',
          phone: phone_number,
          reference: payment.id,
          description: `Commande Mbiyo #${order.order_number}`,
          callback_url: `${process.env.APP_URL}/api/payments/webhook/serdipay`,
          metadata: {
            order_id: order.id,
            payment_id: payment.id,
          },
        }, {
          headers: {
            'Authorization': `Bearer ${SERDIPAY_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        // Mettre à jour avec la référence SerdiPay
        await db('payments').where('id', payment.id).update({
          serdipay_tx_id: response.data.transaction_id,
          serdipay_reference: response.data.reference,
          metadata: JSON.stringify(response.data),
        });

        return apiResponse(res, 200, {
          payment_id: payment.id,
          transaction_id: response.data.transaction_id,
          checkout_url: response.data.checkout_url,
          status: 'pending',
        }, 'Paiement initié. Confirmez sur votre téléphone.');
      } catch (serdipayError) {
        logger.error('Erreur SerdiPay:', serdipayError.response?.data || serdipayError.message);
        
        // En mode dev, simuler le succès
        if (process.env.NODE_ENV !== 'production') {
          await db('payments').where('id', payment.id).update({
            status: 'completed',
            serdipay_tx_id: `SIM_${Date.now()}`,
          });
          return apiResponse(res, 200, {
            payment_id: payment.id,
            status: 'completed (simulation)',
          }, 'Paiement simulé en mode développement');
        }

        return apiResponse(res, 502, null, 'Erreur de paiement. Réessayez.');
      }
    } catch (error) {
      logger.error('Erreur initiate payment:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * POST /api/payments/webhook/serdipay - Webhook SerdiPay
   */
  async handleWebhook(req, res) {
    try {
      // Vérifier la signature
      const signature = req.headers['x-serdipay-signature'];
      const webhookSecret = process.env.SERDIPAY_WEBHOOK_SECRET;

      if (webhookSecret && signature) {
        const expectedSig = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');

        if (signature !== expectedSig) {
          logger.warn('Webhook signature invalide');
          return res.status(400).json({ error: 'Signature invalide' });
        }
      }

      const { transaction_id, status, reference, amount } = req.body;

      // Trouver le paiement
      const payment = await db('payments')
        .where('serdipay_tx_id', transaction_id)
        .orWhere('id', reference)
        .first();

      if (!payment) {
        logger.warn(`Webhook: paiement non trouvé pour tx ${transaction_id}`);
        return res.status(404).json({ error: 'Paiement non trouvé' });
      }

      const newStatus = status === 'success' ? 'completed' : 'failed';
      await db('payments').where('id', payment.id).update({
        status: newStatus,
        metadata: JSON.stringify({ ...(typeof payment.metadata === 'string' ? JSON.parse(payment.metadata || '{}') : (payment.metadata || {})), webhook: req.body }),
      });

      if (newStatus === 'completed' && payment.type === 'client_payment') {
        // Paiement réussi → confirmer la commande
        await db('orders').where('id', payment.order_id).update({ status: 'pending' });

        // Déclencher les paiements fournisseur/livreur quand la commande sera livrée
        logger.info(`Paiement confirmé: ${payment.id} / Commande: ${payment.order_id}`);
      }

      if (newStatus === 'failed') {
        logger.warn(`Paiement échoué: ${payment.id}`);
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Erreur webhook:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Distribuer les paiements après livraison
   */
  async distributePayments(orderId) {
    try {
      const order = await db('orders').where('id', orderId).first();
      if (!order || order.status !== 'delivered') return;

      const supplier = await db('suppliers').where('id', order.supplier_id).first();
      const driver = order.driver_id ? await db('drivers').where('id', order.driver_id).first() : null;

      // Montant fournisseur = subtotal - commission
      const supplierAmount = parseFloat(order.subtotal) - parseFloat(order.commission);

      // Payer le fournisseur
      await db('payments').insert({
        order_id: order.id,
        user_id: supplier.user_id,
        amount: supplierAmount,
        currency: 'CDF',
        type: 'supplier_payout',
        status: 'pending',
      });

      // Payer le livreur
      if (driver) {
        await db('payments').insert({
          order_id: order.id,
          user_id: driver.user_id,
          amount: order.delivery_fee,
          currency: 'CDF',
          type: 'driver_payout',
          status: 'pending',
        });
      }

      // TODO: Appeler l'API SerdiPay pour transférer les fonds

      logger.info(`Paiements distribués pour commande ${order.order_number}`);
    } catch (error) {
      logger.error('Erreur distribution paiements:', error);
    }
  },

  /**
   * GET /api/payments/:id/status
   */
  async checkStatus(req, res) {
    try {
      const payment = await db('payments').where('id', req.params.id).first();
      if (!payment) return apiResponse(res, 404, null, 'Paiement non trouvé');
      return apiResponse(res, 200, { status: payment.status, amount: payment.amount });
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/payments/my
   */
  async getMyPayments(req, res) {
    try {
      const payments = await db('payments')
        .where('user_id', req.user.id)
        .orderBy('created_at', 'desc')
        .limit(50);
      return apiResponse(res, 200, payments);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },
};

module.exports = paymentController;
