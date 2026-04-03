const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware d'authentification Socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Token requis'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket;
    logger.info(`Socket connecté: ${user.id} (${user.role})`);

    // Rejoindre les rooms selon le rôle
    socket.join(`user_${user.id}`);

    if (user.role === 'driver') {
      socket.join('drivers');
      socket.join(`driver_${user.id}`);
    }

    if (user.role === 'supplier') {
      socket.join('suppliers');
      socket.join(`supplier_${user.id}`);
    }

    if (user.role === 'admin') {
      socket.join('admins');
    }

    // ============================
    // ÉVÉNEMENTS LIVREUR
    // ============================

    // Mise à jour de la position du livreur
    socket.on('driver:location_update', (data) => {
      const { latitude, longitude, order_id } = data;

      // Broadcast aux clients qui suivent cette commande
      if (order_id) {
        io.to(`order_${order_id}`).emit('driver:location', {
          driver_id: user.id,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        });
      }

      // Mettre à jour pour le monitoring admin
      io.to('admins').emit('driver:location', {
        driver_id: user.id,
        latitude,
        longitude,
      });
    });

    // Livreur change de statut (online/offline)
    socket.on('driver:status', (data) => {
      io.to('admins').emit('driver:status_change', {
        driver_id: user.id,
        is_online: data.is_online,
      });
    });

    // ============================
    // ÉVÉNEMENTS COMMANDE
    // ============================

    // Client suit une commande
    socket.on('order:track', (data) => {
      socket.join(`order_${data.order_id}`);
      logger.debug(`User ${user.id} suit la commande ${data.order_id}`);
    });

    // Arrêter le suivi
    socket.on('order:untrack', (data) => {
      socket.leave(`order_${data.order_id}`);
    });

    // ============================
    // CHAT / SUPPORT
    // ============================

    socket.on('chat:message', (data) => {
      const { to_user_id, message, order_id } = data;
      io.to(`user_${to_user_id}`).emit('chat:message', {
        from_user_id: user.id,
        message,
        order_id,
        timestamp: new Date().toISOString(),
      });
    });

    // ============================
    // DÉCONNEXION
    // ============================

    socket.on('disconnect', (reason) => {
      logger.info(`Socket déconnecté: ${user.id} (${reason})`);
    });
  });

  logger.info('🔌 Socket.io initialisé');
  return io;
}

function getIO() {
  if (!io) {
    // Retourner un stub si pas encore initialisé
    return {
      to: () => ({ emit: () => {} }),
      emit: () => {},
    };
  }
  return io;
}

module.exports = { initializeSocket, getIO };
