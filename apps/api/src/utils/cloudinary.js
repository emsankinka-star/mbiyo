const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const { getBucket, BUCKET_NAME } = require('./firebase');

/**
 * Compresse une image avec Sharp avant upload
 * - Images standard (produits, logos, covers) → max 800px, qualité 80, WebP
 * - Avatars → max 300px, qualité 75, WebP
 * - Documents (PDF) → pas de compression
 */
async function compressImage(buffer, mimetype, options = {}) {
  // Ne pas compresser les PDF
  if (mimetype === 'application/pdf') {
    return { buffer, format: 'pdf', contentType: 'application/pdf' };
  }

  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 80,
    format = 'webp',
  } = options;

  try {
    const compressed = await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat(format, { quality })
      .toBuffer();

    const originalSize = buffer.length;
    const compressedSize = compressed.length;
    const savings = Math.round((1 - compressedSize / originalSize) * 100);
    logger.info(`Image compressée: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (-${savings}%)`);

    return { buffer: compressed, format, contentType: `image/${format}` };
  } catch (error) {
    logger.error('Erreur compression image:', error.message);
    return { buffer, format: mimetype.split('/')[1], contentType: mimetype };
  }
}

/**
 * Upload un fichier vers Google Cloud Storage avec compression
 * @param {Object} file - Objet multer (buffer, mimetype, originalname)
 * @param {string} folder - Dossier GCS (ex: 'products', 'avatars')
 * @param {Object} compressOptions - Options de compression Sharp
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadToGCS(file, folder = 'misc', compressOptions = {}) {
  const { buffer: processedBuffer, format, contentType } = await compressImage(
    file.buffer,
    file.mimetype,
    compressOptions
  );

  const bucket = getBucket();
  const filename = `mbiyo/${folder}/${uuidv4()}.${format}`;
  const blob = bucket.file(filename);

  // Token pour l'accès public via Firebase-style URL
  const token = uuidv4();

  await blob.save(processedBuffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  // URL Firebase Storage (accessible publiquement via token, sans rendre le bucket public)
  const encodedPath = encodeURIComponent(filename);
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodedPath}?alt=media&token=${token}`;

  logger.info(`Image uploadée: ${filename} (${(processedBuffer.length / 1024).toFixed(1)}KB)`);

  return { url, path: filename };
}

/**
 * Supprime un fichier de GCS par son URL ou path
 * @param {string} urlOrPath - URL GCS complète ou chemin dans le bucket
 */
async function deleteFromGCS(urlOrPath) {
  if (!urlOrPath) return;

  try {
    let filePath = urlOrPath;

    // Extraire le chemin depuis une URL Firebase Storage
    if (urlOrPath.includes('firebasestorage.googleapis.com')) {
      const url = new URL(urlOrPath);
      // Format: /v0/b/bucket/o/encoded-path
      const encodedPath = url.pathname.split('/o/')[1];
      if (encodedPath) filePath = decodeURIComponent(encodedPath);
    }
    // Ancien format storage.googleapis.com
    else if (urlOrPath.includes('storage.googleapis.com')) {
      const url = new URL(urlOrPath);
      filePath = url.pathname.replace(`/${BUCKET_NAME}/`, '');
    }

    // Ne pas supprimer les anciennes images locales (/uploads/...)
    if (filePath.startsWith('/uploads/')) return;

    const bucket = getBucket();
    await bucket.file(filePath).delete();
    logger.info(`Image supprimée de GCS: ${filePath}`);
  } catch (error) {
    // Ignorer silencieusement si le fichier n'existe pas
    if (error.code !== 404) {
      logger.error('Erreur suppression GCS:', error.message);
    }
  }
}

// Presets de compression par type d'usage
const COMPRESS_PRESETS = {
  avatar: { maxWidth: 300, maxHeight: 300, quality: 75, format: 'webp' },
  logo: { maxWidth: 500, maxHeight: 500, quality: 80, format: 'webp' },
  cover: { maxWidth: 1200, maxHeight: 600, quality: 80, format: 'webp' },
  product: { maxWidth: 800, maxHeight: 800, quality: 80, format: 'webp' },
  category: { maxWidth: 400, maxHeight: 400, quality: 80, format: 'webp' },
  document: { maxWidth: 1200, maxHeight: 1600, quality: 85, format: 'webp' },
};

module.exports = {
  uploadToCloudinary: uploadToGCS,     // Alias rétrocompatible
  deleteFromCloudinary: deleteFromGCS, // Alias rétrocompatible
  uploadToGCS,
  deleteFromGCS,
  compressImage,
  COMPRESS_PRESETS,
};
