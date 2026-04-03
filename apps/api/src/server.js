require('dotenv').config({ path: '../../.env' });
require('dotenv').config(); // also load local .env for Railway

const app = require('./app');
const { createServer } = require('http');
const { initializeSocket } = require('./socket');
const { initializeDatabase } = require('./database');
const { migrate } = require('./database/migrate');
const { seed } = require('./database/seed');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

// Initialiser Socket.io
initializeSocket(httpServer);

// Démarrer le serveur
async function start() {
  try {
    // Tester la connexion à la base de données
    await initializeDatabase();
    logger.info('✅ Base de données connectée');

    // Exécuter les migrations et seeds (idempotent)
    if (process.env.RUN_MIGRATIONS === 'true') {
      logger.info('🔄 Exécution des migrations...');
      await migrate();
      logger.info('🌱 Exécution des seeds...');
      await seed();
    }

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Mbiyo API démarrée sur le port ${PORT}`);
      logger.info(`📡 WebSocket prêt`);
      logger.info(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
}

start();

// Gestion des arrêts propres
process.on('SIGTERM', () => {
  logger.info('SIGTERM reçu. Arrêt propre...');
  httpServer.close(() => process.exit(0));
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
