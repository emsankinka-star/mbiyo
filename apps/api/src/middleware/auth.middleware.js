const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { apiResponse } = require('../utils/helpers');

/**
 * Middleware d'authentification JWT
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return apiResponse(res, 401, null, 'Token d\'authentification requis');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return apiResponse(res, 401, null, 'Token expiré, veuillez vous reconnecter');
    }
    return apiResponse(res, 401, null, 'Token invalide');
  }
}

/**
 * Middleware d'autorisation par rôle
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return apiResponse(res, 401, null, 'Non authentifié');
    }
    if (!roles.includes(req.user.role)) {
      return apiResponse(res, 403, null, 'Accès non autorisé');
    }
    next();
  };
}

/**
 * Middleware optionnel - n'échoue pas si pas de token
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      // Token invalide - on continue sans user
    }
  }
  next();
}

module.exports = { authenticate, authorize, optionalAuth };
