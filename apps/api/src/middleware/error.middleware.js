const logger = require('../utils/logger');

/**
 * Middleware 404
 */
function notFound(req, res, next) {
  const error = new Error(`Route non trouvée: ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Middleware de gestion d'erreurs global
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Erreur interne du serveur';

  logger.error(`[${statusCode}] ${message}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
