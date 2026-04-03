const { v4: uuidv4 } = require('uuid');

/**
 * Générer un numéro de commande unique
 * Format: MBY-YYYYMMDD-XXXX
 */
function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MBY-${dateStr}-${random}`;
}

/**
 * Calculer la distance entre deux points GPS (formule Haversine)
 * @returns Distance en kilomètres
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Calculer les frais de livraison
 */
function calculateDeliveryFee(distanceKm, baseFee, perKmFee) {
  const base = baseFee || parseInt(process.env.DEFAULT_BASE_FEE) || 2000;
  const perKm = perKmFee || parseInt(process.env.DEFAULT_PER_KM_FEE) || 500;
  return Math.round(base + (distanceKm * perKm));
}

/**
 * Calculer la commission plateforme
 */
function calculateCommission(subtotal, rate) {
  const commissionRate = rate || parseFloat(process.env.PLATFORM_COMMISSION_RATE) || 0.15;
  return Math.round(subtotal * commissionRate);
}

/**
 * Formater un montant en CDF
 */
function formatCDF(amount) {
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'CDF',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Paginer les résultats
 */
function paginate(query, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  return { limit: Math.min(limit, 100), offset };
}

/**
 * Réponse API standardisée
 */
function apiResponse(res, statusCode, data, message = null) {
  const response = { success: statusCode < 400 };
  if (message) response.message = message;
  if (data !== undefined) response.data = data;
  return res.status(statusCode).json(response);
}

module.exports = {
  generateOrderNumber,
  calculateDistance,
  calculateDeliveryFee,
  calculateCommission,
  formatCDF,
  paginate,
  apiResponse,
};
