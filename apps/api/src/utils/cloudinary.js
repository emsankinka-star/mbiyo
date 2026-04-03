const { v2: cloudinary } = require('cloudinary');
const sharp = require('sharp');
const logger = require('./logger');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Compresse une image avec Sharp avant upload
 */
async function compressImage(buffer, mimetype, options = {}) {
  if (mimetype === 'application/pdf') {
    return { buffer, format: 'pdf' };
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

    return { buffer: compressed, format };
  } catch (error) {
    logger.error('Erreur compression image:', error.message);
    return { buffer, format: mimetype.split('/')[1] };
  }
}

/**
 * Upload un fichier vers Cloudinary avec compression Sharp
 * @param {Object} file - Objet multer (buffer, mimetype, originalname)
 * @param {string} folder - Dossier Cloudinary (ex: 'products', 'avatars')
 * @param {Object} compressOptions - Options de compression Sharp
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadToCloudinary(file, folder = 'misc', compressOptions = {}) {
  const { buffer: processedBuffer, format } = await compressImage(
    file.buffer,
    file.mimetype,
    compressOptions
  );

  return new Promise((resolve, reject) => {
    const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `mbiyo/${folder}`,
        resource_type: resourceType,
        format: resourceType === 'image' ? format : undefined,
      },
      (error, result) => {
        if (error) {
          logger.error('Erreur upload Cloudinary:', error.message);
          return reject(error);
        }
        logger.info(`Image uploadée: ${result.public_id} (${(processedBuffer.length / 1024).toFixed(1)}KB)`);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(processedBuffer);
  });
}

/**
 * Supprime un fichier de Cloudinary
 * @param {string} urlOrPublicId - URL Cloudinary complète ou public_id
 */
async function deleteFromCloudinary(urlOrPublicId) {
  if (!urlOrPublicId) return;

  try {
    let publicId = urlOrPublicId;

    // Extraire le public_id depuis l'URL
    if (urlOrPublicId.includes('cloudinary.com')) {
      const parts = urlOrPublicId.split('/upload/');
      if (parts[1]) {
        publicId = parts[1].replace(/^v\d+\//, '').replace(/\.[^/.]+$/, '');
      }
    }

    // Ne pas supprimer les anciennes images locales
    if (publicId.startsWith('/uploads/')) return;

    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Image supprimée de Cloudinary: ${publicId} (${result.result})`);
  } catch (error) {
    logger.error('Erreur suppression Cloudinary:', error.message);
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
  uploadToCloudinary,
  deleteFromCloudinary,
  compressImage,
  COMPRESS_PRESETS,
};
