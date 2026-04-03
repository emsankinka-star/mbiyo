const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const productController = require('../controllers/product.controller');

// Routes publiques
router.get('/', productController.list);
router.get('/search', productController.search);
router.get('/:id', productController.getById);

// Routes fournisseur
router.post('/', authenticate, authorize('supplier'), [
  body('name').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
], productController.create);

router.put('/:id', authenticate, authorize('supplier'), productController.update);
router.delete('/:id', authenticate, authorize('supplier'), productController.remove);
router.put('/:id/image', authenticate, authorize('supplier'), upload.single('image'), productController.uploadImage);
router.patch('/:id/availability', authenticate, authorize('supplier'), productController.toggleAvailability);
router.patch('/:id/stock', authenticate, authorize('supplier'), productController.updateStock);

module.exports = router;
