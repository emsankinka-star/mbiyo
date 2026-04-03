const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const orderController = require('../controllers/order.controller');

// Client
router.post('/', authenticate, [
  body('supplier_id').isUUID(),
  body('items').isArray({ min: 1 }),
  body('delivery_lat').isFloat(),
  body('delivery_lng').isFloat(),
], orderController.create);

router.get('/my', authenticate, orderController.getMyOrders);
router.get('/:id', authenticate, orderController.getById);
router.post('/:id/cancel', authenticate, orderController.cancel);

// Fournisseur
router.patch('/:id/accept', authenticate, authorize('supplier'), orderController.accept);
router.patch('/:id/reject', authenticate, authorize('supplier'), orderController.reject);
router.patch('/:id/preparing', authenticate, authorize('supplier'), orderController.markPreparing);
router.patch('/:id/ready', authenticate, authorize('supplier'), orderController.markReady);

// Livreur
router.post('/:id/accept-delivery', authenticate, authorize('driver'), orderController.acceptDelivery);
router.patch('/:id/picked-up', authenticate, authorize('driver'), orderController.markPickedUp);
router.patch('/:id/delivering', authenticate, authorize('driver'), orderController.markDelivering);
router.patch('/:id/delivered', authenticate, authorize('driver'), orderController.markDelivered);

// Calcul frais de livraison
router.post('/estimate', authenticate, orderController.estimateDelivery);

module.exports = router;
