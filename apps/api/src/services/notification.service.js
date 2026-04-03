/**
 * Service de notifications (FCM + in-app)
 */
const { db } = require('../database');
const logger = require('../utils/logger');
const { getAdmin } = require('../utils/firebase');

/**
 * Envoyer une notification à un utilisateur
 */
async function notifyUser(userId, { title, body, type = 'system', data = {} }) {
  try {
    // Sauvegarder en base
    await db('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      data: JSON.stringify(data),
    });

    // Push notification via FCM
    const firebaseAdmin = getAdmin();
    if (firebaseAdmin && firebaseAdmin.apps.length) {
      const user = await db('users').select('fcm_token').where('id', userId).first();
      if (user?.fcm_token) {
        try {
          await firebaseAdmin.messaging().send({
            token: user.fcm_token,
            notification: { title, body },
            data: { ...data, type },
            android: {
              priority: 'high',
              notification: { sound: 'default', channelId: 'mbiyo_orders' },
            },
          });
        } catch (fcmError) {
          // Token invalide - le supprimer
          if (fcmError.code === 'messaging/invalid-registration-token') {
            await db('users').where('id', userId).update({ fcm_token: null });
          }
          logger.warn('Erreur FCM:', fcmError.message);
        }
      }
    }
  } catch (error) {
    logger.error('Erreur notification:', error);
  }
}

/**
 * Récupérer les notifications d'un utilisateur
 */
async function getUserNotifications(userId, page = 1, limit = 30) {
  const offset = (page - 1) * limit;
  return db('notifications')
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

/**
 * Marquer une notification comme lue
 */
async function markAsRead(notificationId, userId) {
  return db('notifications')
    .where('id', notificationId)
    .where('user_id', userId)
    .update({ is_read: true });
}

/**
 * Marquer toutes les notifications comme lues
 */
async function markAllAsRead(userId) {
  return db('notifications')
    .where('user_id', userId)
    .where('is_read', false)
    .update({ is_read: true });
}

module.exports = { notifyUser, getUserNotifications, markAsRead, markAllAsRead };
