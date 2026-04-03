const { db } = require('../database');
const { apiResponse } = require('../utils/helpers');
const { getIO } = require('../socket');
const logger = require('../utils/logger');

const chatController = {
  /**
   * GET /api/chat/:orderId - Récupérer les messages d'une commande
   */
  async getMessages(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      // Vérifier que l'utilisateur est lié à cette commande
      const order = await db('orders').where('id', orderId).first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée');

      // Le client, le livreur (via drivers table), ou le fournisseur peuvent accéder au chat
      let authorized = order.client_id === userId;
      if (!authorized && order.driver_id) {
        const driver = await db('drivers').where('id', order.driver_id).first();
        if (driver && driver.user_id === userId) authorized = true;
      }
      if (!authorized && order.supplier_id) {
        const supplier = await db('suppliers').where('id', order.supplier_id).first();
        if (supplier && supplier.user_id === userId) authorized = true;
      }

      if (!authorized) {
        return apiResponse(res, 403, null, 'Accès refusé');
      }

      const messages = await db('messages')
        .where('order_id', orderId)
        .join('users', 'messages.sender_id', 'users.id')
        .select(
          'messages.id',
          'messages.order_id',
          'messages.sender_id',
          'messages.receiver_id',
          'messages.content',
          'messages.is_read',
          'messages.created_at',
          'users.full_name as sender_name'
        )
        .orderBy('messages.created_at', 'asc');

      // Marquer comme lus les messages reçus par cet utilisateur
      await db('messages')
        .where('order_id', orderId)
        .where('receiver_id', userId)
        .where('is_read', false)
        .update({ is_read: true });

      return apiResponse(res, 200, messages);
    } catch (error) {
      logger.error('Erreur getMessages:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * POST /api/chat/:orderId - Envoyer un message
   */
  async sendMessage(req, res) {
    try {
      const { orderId } = req.params;
      const { content, receiver_id } = req.body;
      const userId = req.user.id;

      if (!content || !content.trim()) {
        return apiResponse(res, 400, null, 'Contenu requis');
      }

      // Vérifier la commande
      const order = await db('orders').where('id', orderId).first();
      if (!order) return apiResponse(res, 404, null, 'Commande non trouvée');

      // Déterminer le destinataire automatiquement si non fourni
      let targetId = receiver_id;
      if (!targetId) {
        if (order.client_id === userId && order.driver_id) {
          // Client → driver user_id
          const driver = await db('drivers').where('id', order.driver_id).first();
          targetId = driver?.user_id;
        } else if (order.driver_id) {
          // Driver → client
          const driver = await db('drivers').where('id', order.driver_id).first();
          if (driver?.user_id === userId) {
            targetId = order.client_id;
          }
        }
      }

      if (!targetId) {
        return apiResponse(res, 400, null, 'Aucun destinataire trouvé');
      }

      // Sauvegarder en base
      const [message] = await db('messages').insert({
        order_id: orderId,
        sender_id: userId,
        receiver_id: targetId,
        content: content.trim(),
      }).returning('*');

      // Enrichir avec le nom de l'expéditeur
      const sender = await db('users').where('id', userId).select('full_name').first();
      message.sender_name = sender?.full_name || 'Utilisateur';

      // Émettre en temps réel via Socket.IO
      const io = getIO();
      io.to(`user_${targetId}`).emit('chat:message', {
        id: message.id,
        order_id: orderId,
        sender_id: userId,
        receiver_id: targetId,
        content: message.content,
        sender_name: message.sender_name,
        is_read: false,
        created_at: message.created_at,
      });

      return apiResponse(res, 201, message, 'Message envoyé');
    } catch (error) {
      logger.error('Erreur sendMessage:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PATCH /api/chat/:orderId/read - Marquer tous les messages comme lus
   */
  async markAsRead(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const count = await db('messages')
        .where('order_id', orderId)
        .where('receiver_id', userId)
        .where('is_read', false)
        .update({ is_read: true });

      // Notifier l'expéditeur que les messages ont été lus
      if (count > 0) {
        const io = getIO();
        io.to(`order_${orderId}`).emit('chat:read', {
          order_id: orderId,
          reader_id: userId,
        });
      }

      return apiResponse(res, 200, { marked: count });
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/chat/:orderId/unread - Nombre de messages non lus
   */
  async getUnreadCount(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const result = await db('messages')
        .where('order_id', orderId)
        .where('receiver_id', userId)
        .where('is_read', false)
        .count('* as count')
        .first();

      return apiResponse(res, 200, { unread: parseInt(result.count) || 0 });
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },
};

module.exports = chatController;
