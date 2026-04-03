const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const supplierController = require('../controllers/supplier.controller');

// Routes publiques
router.get('/', supplierController.list);
router.get('/nearby', supplierController.nearby);
router.get('/:id', supplierController.getById);
router.get('/:id/products', supplierController.getProducts);

// Routes authentifiées (fournisseur)
router.post('/register', authenticate, [
  body('business_name').trim().notEmpty(),
  body('business_type').isIn(['restaurant', 'supermarket', 'pharmacy', 'fuel', 'shop']),
], supplierController.register);

router.put('/me', authenticate, authorize('supplier'), supplierController.updateProfile);
router.put('/me/logo', authenticate, authorize('supplier'), upload.single('logo'), supplierController.uploadLogo);
router.put('/me/status', authenticate, authorize('supplier'), supplierController.toggleOpen);
router.put('/me/hours', authenticate, authorize('supplier'), supplierController.updateHours);
router.get('/me/stats', authenticate, authorize('supplier'), supplierController.getStats);
router.get('/me/orders', authenticate, authorize('supplier'), supplierController.getOrders);

module.exports = router;
