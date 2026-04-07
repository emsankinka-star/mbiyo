const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Validation
const registerValidation = [
  body('full_name').trim().isLength({ min: 2 }).withMessage('Nom requis (min 2 caractères)'),
  body('phone').trim().matches(/^\+?[0-9]{9,15}$/).withMessage('Numéro de téléphone invalide'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe min 6 caractères'),
  // Le rôle est ignoré côté serveur — toujours 'client' à l'inscription
];

const loginValidation = [
  body('phone').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateProfile);
router.put('/me/avatar', authenticate, upload.single('avatar'), authController.uploadAvatar);
router.put('/me/password', authenticate, authController.changePassword);
router.put('/me/location', authenticate, authController.updateLocation);
router.put('/me/fcm-token', authenticate, authController.updateFcmToken);

module.exports = router;
