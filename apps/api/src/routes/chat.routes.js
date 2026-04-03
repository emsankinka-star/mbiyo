const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const chatController = require('../controllers/chat.controller');

// Récupérer les messages d'une commande
router.get('/:orderId', authenticate, chatController.getMessages);

// Envoyer un message
router.post('/:orderId', authenticate, chatController.sendMessage);

// Marquer comme lus
router.patch('/:orderId/read', authenticate, chatController.markAsRead);

// Nombre de messages non lus
router.get('/:orderId/unread', authenticate, chatController.getUnreadCount);

module.exports = router;
