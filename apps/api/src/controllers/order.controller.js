const { validationResult } = require('express-validator');
const { db } = require('../database');
const {
  apiResponse, generateOrderNumber, calculateDistance,
  calculateDeliveryFee, calculateCommission, paginate,
} = require('../utils/helpers');
const { getIO } = require('../socket');
const { notifyUser } = require('../services/notification.service');
const { findNearestDrivers } = require('../services/matching.service');
const logger = require('../utils/logger');

const orderController = {
  /**
   * POST /api/orders - Créer une commande
   */
  async create(req, res) {
    const trx = await db.transaction();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return apiResponse(res, 400, errors.array());

      const { supplier_id, items, delivery_lat, delivery_lng, delivery_address, notes } = req.body;

      // Vérifier le fournisseur
      const supplier = await trx('suppliers').where('id', supplier_id).first();
      if (!supplier) {
        await trx.rollback();
        return apiResponse(res, 404, null, 'Fournisseur non trouvé');
      }

      // Calculer le sous-total
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await trx('products').where('id', item.product_id).first();
        if (!product || !product.is_available) {
          await trx.rollback();
          return apiResponse(res, 400, null, `Produit indisponible: ${item.product_id}`);
        }

        // Vérifier le stock (-1 = illimité)
        if (product.stock_quantity !== -1 && product.stock_quantity < item.quantity) {
          await trx.rollback();
          return apiResponse(res, 400, null, `Stock insuffisant pour: ${product.name}`);
        }

        const unitPrice = product.promo_price || product.price;
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          selected_variants: JSON.stringify(item.variants || []),
          selected_extras: JSON.stringify(item.extras || []),
          special_instructions: item.special_instructions,
        });

        // Décrémenter le stock (-1 = illimité, skip)
        if (product.stock_quantity !== -1) {
          await trx('products').where('id', product.id).decrement('stock_quantity', item.quantity);
        }
      }

      // Vérifier minimum de commande
      if (supplier.minimum_order > 0 && subtotal < supplier.minimum_order) {
        await trx.rollback();
        return apiResponse(res, 400, null, `Commande minimum: ${supplier.minimum_order} CDF`);
      }

      // Calculer la distance et les frais
      const distanceKm = calculateDistance(
        parseFloat(supplier.latitude), parseFloat(supplier.longitude),
        parseFloat(delivery_lat), parseFloat(delivery_lng)
      );

      const delivery_fee = calculateDeliveryFee(distanceKm);
      const commission = calculateCommission(subtotal, parseFloat(supplier.commission_rate));
      const total = subtotal + delivery_fee;

      // Créer la commande
      const [order] = await trx('orders').insert({
        order_number: generateOrderNumber(),
        client_id: req.user.id,
        supplier_id: supplier.id,
        status: 'pending',
        subtotal,
        delivery_fee,
        commission,
        total,
        pickup_lat: supplier.latitude,
        pickup_lng: supplier.longitude,
        delivery_lat,
        delivery_lng,
        delivery_address: delivery_address || 'Repère GPS',
        notes,
        distance_km: Math.round(distanceKm * 100) / 100,
        estimated_delivery: new Date(Date.now() + (supplier.preparation_time + 20) * 60000),
      }).returning('*');

      // Ajouter les items
      for (const item of orderItems) {
        await trx('order_items').insert({ order_id: order.id, ...item });
      }

      await trx.commit();

      // Notifier le fournisseur via WebSocket
      const io = getIO();
      io.to(`supplier_${supplier.user_id}`).emit('new_order', {
        order_id: order.id,
        order_number: order.order_number,
        total: order.total,
        items_count: orderItems.length,
      });

      // Notification push
      await notifyUser(supplier.user_id, {
        title: 'Nouvelle commande! 🎉',
        body: `Commande #${order.order_number} - ${total} CDF`,
        type: 'order',
        data: { order_id: order.id },
      });

      // Récupérer avec les items
      order.items = orderItems;

      logger.info(`Nouvelle commande: ${order.order_number} (${total} CDF)`);
      return apiResponse(res, 201, order, 'Commande créée avec succès');
    } catch (error) {
      await trx.rollback();
      logger.error('Erreur création commande:', error);
      return apiResponse(res, 500, null, 'Erreur lors de la création de la commande');
    }
  },

  /**
   * GET /api/orders/my - Mes commandes
   */
  async getMyOrders(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const { limit: lim, offset } = paginate(null, parseInt(page), parseInt(limit));

      let query = db('orders').where('client_id', req.user.id);
      if (status) query = query.where('status', status);

      const orders = await query.orderBy('created_at', 'desc').limit(lim).offset(offset);

      for (const order of orders) {
        order.items = await db('order_items').where('order_id', order.id);
        if (order.supplier_id) {
          order.supplier = await db('suppliers')
            .select('id', 'business_name', 'business_type', 'logo_url')
            .where('id', order.supplier_id).first();
        }
        if (order.driver_id) {
          order.driver = await db('drivers')
            .join('users', 'drivers.user_id', 'users.id')
            .select('drivers.id', 'users.full_name', 'users.phone', 'drivers.vehicle_type', 'drivers.license_plate', 'drivers.current_lat', 'drivers.current_lng')
            .where('drivers.id', order.driver_id).first();
        }
      }

      return apiResponse(res, 200, orders);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/orders/:id
   */
  async getById(req, res) {
    try {
      const order = await db('orders').where('id', req.params.id).first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée');

      order.items = await db('order_items').where('order_id', order.id);

      if (order.supplier_id) {
        order.supplier = await db('suppliers')
          .join('users', 'suppliers.user_id', 'users.id')
          .select('suppliers.*', 'users.full_name as owner_name', 'users.phone as owner_phone')
          .where('suppliers.id', order.supplier_id).first();
      }

      if (order.driver_id) {
        order.driver = await db('drivers')
          .join('users', 'drivers.user_id', 'users.id')
          .select('drivers.*', 'users.full_name', 'users.phone', 'users.avatar_url')
          .where('drivers.id', order.driver_id).first();
      }

      return apiResponse(res, 200, order);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PATCH /api/orders/:id/accept - Fournisseur accepte
   */
  async accept(req, res) {
    try {
      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      if (!supplier) return apiResponse(res, 403, null, 'Profil fournisseur requis');

      const order = await db('orders').where('id', req.params.id).where('status', 'pending').where('supplier_id', supplier.id).first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée ou déjà traitée');

      const [updated] = await db('orders').where('id', order.id)
        .update({ status: 'accepted', accepted_at: new Date() }).returning('*');

      // Notifier le client
      const io = getIO();
      io.to(`user_${order.client_id}`).emit('order_update', {
        order_id: order.id, status: 'accepted',
      });

      await notifyUser(order.client_id, {
        title: 'Commande acceptée! ✅',
        body: `Votre commande #${order.order_number} a été acceptée.`,
        type: 'order', data: { order_id: order.id },
      });

      // Notify supplier
      const supplier = await db('suppliers').where('id', order.supplier_id).first();
      io.to(`supplier_${supplier.user_id}`).emit('order_update', {
        order_id: order.id, status: 'accepted',
      });

      return apiResponse(res, 200, updated, 'Commande acceptée');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PATCH /api/orders/:id/reject - Fournisseur refuse
   */
  async reject(req, res) {
    try {
      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      if (!supplier) return apiResponse(res, 403, null, 'Profil fournisseur requis');

      const order = await db('orders').where('id', req.params.id).where('supplier_id', supplier.id).whereIn('status', ['pending', 'accepted']).first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée');

      const { reason } = req.body;
      const [updated] = await db('orders').where('id', order.id)
        .update({ status: 'cancelled', cancelled_at: new Date(), cancellation_reason: reason || 'Refusé par le fournisseur' })
        .returning('*');

      // TODO: Rembourser le client
      const io = getIO();
      io.to(`user_${updated.client_id}`).emit('order_update', {
        order_id: updated.id, status: 'cancelled',
      });

      return apiResponse(res, 200, updated, 'Commande refusée');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PATCH /api/orders/:id/preparing
   */
  async markPreparing(req, res) {
    try {
      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      if (!supplier) return apiResponse(res, 403, null, 'Profil fournisseur requis');

      const order = await db('orders').where('id', req.params.id).where('supplier_id', supplier.id).where('status', 'accepted').first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée ou statut invalide');

      const [updated] = await db('orders').where('id', order.id)
        .update({ status: 'preparing' }).returning('*');

      const io = getIO();
      io.to(`user_${updated.client_id}`).emit('order_update', {
        order_id: updated.id, status: 'preparing',
      });

      return apiResponse(res, 200, updated);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PATCH /api/orders/:id/ready - Prêt → chercher livreur
   */
  async markReady(req, res) {
    try {
      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      if (!supplier) return apiResponse(res, 403, null, 'Profil fournisseur requis');

      const order = await db('orders').where('id', req.params.id).where('supplier_id', supplier.id).where('status', 'preparing').first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée ou statut invalide');

      const [updated] = await db('orders').where('id', order.id)
        .update({ status: 'ready', prepared_at: new Date() }).returning('*');

      // Trouver les livreurs les plus proches
      const nearbyDrivers = await findNearestDrivers(
        parseFloat(updated.pickup_lat),
        parseFloat(updated.pickup_lng),
        5 // rayon en km
      );

      // Notifier les livreurs disponibles
      const io = getIO();
      for (const driver of nearbyDrivers) {
        io.to(`driver_${driver.user_id}`).emit('new_delivery_request', {
          order_id: updated.id,
          order_number: updated.order_number,
          pickup: { lat: updated.pickup_lat, lng: updated.pickup_lng },
          delivery: { lat: updated.delivery_lat, lng: updated.delivery_lng },
          delivery_fee: updated.delivery_fee,
          distance_km: updated.distance_km,
        });

        await notifyUser(driver.user_id, {
          title: 'Course disponible! 🛵',
          body: `${updated.delivery_fee} CDF - ${updated.distance_km} km`,
          type: 'order', data: { order_id: updated.id },
        });
      }

      io.to(`user_${updated.client_id}`).emit('order_update', {
        order_id: updated.id, status: 'ready',
        message: 'Votre commande est prête, un livreur arrive bientôt!',
      });

      return apiResponse(res, 200, updated, 'Commande prête, livreurs notifiés');
    } catch (error) {
      logger.error('Erreur markReady:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * POST /api/orders/:id/accept-delivery - Livreur accepte
   */
  async acceptDelivery(req, res) {
    try {
      const order = await db('orders').where('id', req.params.id).where('status', 'ready').whereNull('driver_id').first();
      if (!order) return apiResponse(res, 404, null, 'Course plus disponible');

      const driver = await db('drivers').where('user_id', req.user.id).first();
      if (!driver || !driver.is_validated) {
        return apiResponse(res, 403, null, 'Profil livreur non validé');
      }

      const [updated] = await db('orders').where('id', order.id)
        .update({ driver_id: driver.id, status: 'assigned' }).returning('*');

      await db('drivers').where('id', driver.id).update({ is_busy: true });

      const io = getIO();
      // Notifier client
      io.to(`user_${order.client_id}`).emit('order_update', {
        order_id: order.id,
        status: 'assigned',
        driver: { id: driver.id, user_id: driver.user_id },
      });

      // Notifier fournisseur
      const supplier = await db('suppliers').where('id', order.supplier_id).first();
      io.to(`supplier_${supplier.user_id}`).emit('order_update', {
        order_id: order.id, status: 'assigned',
      });

      // Annuler la course pour les autres livreurs
      io.emit('delivery_taken', { order_id: order.id });

      return apiResponse(res, 200, updated, 'Course acceptée');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PATCH /api/orders/:id/picked-up
   */
  async markPickedUp(req, res) {
    try {
      const driver = await db('drivers').where('user_id', req.user.id).first();
      if (!driver) return apiResponse(res, 403, null, 'Profil livreur requis');

      const order = await db('orders').where('id', req.params.id).where('driver_id', driver.id).where('status', 'assigned').first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée ou statut invalide');

      const [updated] = await db('orders').where('id', order.id)
        .update({ status: 'picked_up', picked_up_at: new Date() }).returning('*');

      const io = getIO();
      io.to(`user_${updated.client_id}`).emit('order_update', {
        order_id: updated.id, status: 'picked_up',
        message: 'Le livreur a récupéré votre commande!',
      });

      return apiResponse(res, 200, updated);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PATCH /api/orders/:id/delivering
   */
  async markDelivering(req, res) {
    try {
      const driver = await db('drivers').where('user_id', req.user.id).first();
      if (!driver) return apiResponse(res, 403, null, 'Profil livreur requis');

      const order = await db('orders').where('id', req.params.id).where('driver_id', driver.id).where('status', 'picked_up').first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée ou statut invalide');

      const [updated] = await db('orders').where('id', order.id)
        .update({ status: 'delivering' }).returning('*');

      const io = getIO();
      io.to(`user_${updated.client_id}`).emit('order_update', {
        order_id: updated.id, status: 'delivering',
        message: 'Votre commande est en route!',
      });

      return apiResponse(res, 200, updated);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PATCH /api/orders/:id/delivered
   */
  async markDelivered(req, res) {
    try {
      const driver = await db('drivers').where('user_id', req.user.id).first();
      if (!driver) return apiResponse(res, 403, null, 'Profil livreur requis');

      const order = await db('orders').where('id', req.params.id).where('driver_id', driver.id).where('status', 'delivering').first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée ou statut invalide');

      const [updated] = await db('orders').where('id', order.id)
        .update({ status: 'delivered', delivered_at: new Date() }).returning('*');

      // Libérer le livreur
      if (order.driver_id) {
        await db('drivers').where('id', order.driver_id).update({ is_busy: false });
        await db('drivers').where('id', order.driver_id)
          .increment('total_deliveries', 1)
          .increment('total_earnings', parseFloat(order.delivery_fee))
          .increment('today_earnings', parseFloat(order.delivery_fee));
      }

      // Notifications
      const io = getIO();
      io.to(`user_${order.client_id}`).emit('order_update', {
        order_id: order.id, status: 'delivered',
        message: 'Votre commande a été livrée! Donnez votre avis.',
      });

      await notifyUser(order.client_id, {
        title: 'Commande livrée! 🎉',
        body: `Commande #${order.order_number} livrée. Donnez votre avis!`,
        type: 'order', data: { order_id: order.id },
      });

      // TODO: Déclencher les paiements fournisseur et livreur via SerdiPay

      return apiResponse(res, 200, updated, 'Commande livrée');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * POST /api/orders/:id/cancel
   */
  async cancel(req, res) {
    try {
      const order = await db('orders').where('id', req.params.id).where('client_id', req.user.id).first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée');

      const cancellableStatuses = ['pending', 'accepted'];
      if (!cancellableStatuses.includes(order.status)) {
        return apiResponse(res, 400, null, 'Cette commande ne peut plus être annulée');
      }

      const [updated] = await db('orders').where('id', order.id)
        .update({
          status: 'cancelled',
          cancelled_at: new Date(),
          cancellation_reason: req.body.reason || 'Annulé par le client',
        }).returning('*');

      // TODO: Rembourser via SerdiPay

      return apiResponse(res, 200, updated, 'Commande annulée');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * POST /api/orders/estimate - Estimer les frais
   */
  async estimateDelivery(req, res) {
    try {
      const { supplier_id, delivery_lat, delivery_lng } = req.body;
      const supplier = await db('suppliers').where('id', supplier_id).first();
      if (!supplier) return apiResponse(res, 404, null, 'Fournisseur non trouvé');

      const distanceKm = calculateDistance(
        parseFloat(supplier.latitude), parseFloat(supplier.longitude),
        parseFloat(delivery_lat), parseFloat(delivery_lng)
      );

      const delivery_fee = calculateDeliveryFee(distanceKm);
      const estimated_time = Math.round(supplier.preparation_time + (distanceKm * 4)); // 4 min/km

      return apiResponse(res, 200, {
        distance_km: Math.round(distanceKm * 100) / 100,
        delivery_fee,
        estimated_time_minutes: estimated_time,
        currency: 'CDF',
      });
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },
};

module.exports = orderController;
