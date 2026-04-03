const knex = require('knex');
const logger = require('../utils/logger');

const config = {
  client: 'pg',
  connection: process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        host: 'localhost',
        port: 5432,
        user: 'mbiyo_user',
        password: 'mbiyo_password',
        database: 'mbiyo_db',
      },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: __dirname + '/migrations',
  },
  seeds: {
    directory: __dirname + '/seeds',
  },
};

const db = knex(config);

async function initializeDatabase() {
  try {
    await db.raw('SELECT 1');
    logger.info('Connection PostgreSQL réussie');
    return true;
  } catch (error) {
    logger.error('Erreur de connexion PostgreSQL:', error.message);
    throw error;
  }
}

module.exports = { db, initializeDatabase, config };
