/**
 * Module centralisé d'initialisation Firebase Admin
 * Partagé entre le service de notifications et le stockage GCS
 */
const admin = require('firebase-admin');
const logger = require('./logger');

const BUCKET_NAME = process.env.GCS_BUCKET || 'mbiyo-uploads';

let initialized = false;

function initFirebase() {
  if (initialized || admin.apps.length) {
    initialized = true;
    return admin;
  }

  try {
    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
        storageBucket: BUCKET_NAME,
      });
      initialized = true;
      logger.info('Firebase Admin initialisé (project: %s, bucket: %s)', process.env.FIREBASE_PROJECT_ID, BUCKET_NAME);
    } else {
      logger.warn('FIREBASE_PROJECT_ID non défini — Firebase désactivé');
    }
  } catch (error) {
    logger.warn('Firebase init error:', error.message);
  }

  return admin;
}

function getAdmin() {
  if (!initialized) initFirebase();
  return admin;
}

function getBucket() {
  const fb = getAdmin();
  return fb.storage().bucket(BUCKET_NAME);
}

module.exports = {
  initFirebase,
  getAdmin,
  getBucket,
  BUCKET_NAME,
};
