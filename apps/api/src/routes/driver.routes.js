const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const driverController = require('../controllers/driver.controller');

// Inscription livreur
router.post('/register', authenticate, upload.fields([
  { name: 'id_document', maxCount: 1 },
  { name: 'license', maxCount: 1 },
  { name: 'vehicle_photo', maxCount: 1 },
]), [
  body('vehicle_type').isIn(['moto', 'velo', 'voiture']),
  body('license_plate').trim().notEmpty(),
], driverController.register);

// Routes livreur authentifié
router.get('/me', authenticate, authorize('driver'), driverController.getProfile);
router.put('/me/status', authenticate, authorize('driver'), driverController.toggleOnline);
router.put('/me/location', authenticate, authorize('driver'), driverController.updateLocation);
router.get('/me/earnings', authenticate, authorize('driver'), driverController.getEarnings);
router.get('/me/deliveries', authenticate, authorize('driver'), driverController.getDeliveryHistory);
router.get('/me/stats', authenticate, authorize('driver'), driverController.getStats);

// Courses disponibles
router.get('/available-orders', authenticate, authorize('driver'), driverController.getAvailableOrders);

module.exports = router;
