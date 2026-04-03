const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const paymentController = require('../controllers/payment.controller');

// Initier un paiement
router.post('/initiate', authenticate, paymentController.initiate);

// Webhook SerdiPay (pas d'auth JWT, validé par signature)
router.post('/webhook/serdipay', paymentController.handleWebhook);

// Vérifier le statut d'un paiement
router.get('/:id/status', authenticate, paymentController.checkStatus);

// Historique
router.get('/my', authenticate, paymentController.getMyPayments);

module.exports = router;
