/**
 * Service de matching livreur ↔ commande
 * Algorithme: distance + note + disponibilité
 */
const { db } = require('../database');
const { calculateDistance } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Trouver les livreurs les plus proches d'un point
 * @param {number} lat - Latitude du point de pickup
 * @param {number} lng - Longitude du point de pickup
 * @param {number} radiusKm - Rayon de recherche en km
 * @param {number} maxDrivers - Nombre max de livreurs
 */
async function findNearestDrivers(lat, lng, radiusKm = 5, maxDrivers = 10) {
  try {
    // Récupérer les livreurs en ligne, validés et disponibles
    const drivers = await db('drivers')
      .where('is_online', true)
      .where('is_validated', true)
      .where('is_busy', false)
      .whereNotNull('current_lat')
      .whereNotNull('current_lng');

    if (drivers.length === 0) {
      logger.warn('Aucun livreur disponible');
      return [];
    }

    // Calculer la distance et le score pour chaque livreur
    const scoredDrivers = drivers
      .map((driver) => {
        const distance = calculateDistance(
          lat, lng,
          parseFloat(driver.current_lat),
          parseFloat(driver.current_lng)
        );

        // Score = pondération distance (60%) + note (30%) + expérience (10%)
        const distanceScore = Math.max(0, 1 - (distance / radiusKm)); // 0-1
        const ratingScore = (parseFloat(driver.rating) || 3) / 5; // 0-1
        const experienceScore = Math.min(driver.total_deliveries / 100, 1); // 0-1

        const totalScore = (distanceScore * 0.6) + (ratingScore * 0.3) + (experienceScore * 0.1);

        return {
          ...driver,
          distance_km: Math.round(distance * 100) / 100,
          score: Math.round(totalScore * 100) / 100,
        };
      })
      .filter((d) => d.distance_km <= radiusKm)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxDrivers);

    logger.info(`${scoredDrivers.length} livreurs trouvés dans un rayon de ${radiusKm}km`);
    return scoredDrivers;
  } catch (error) {
    logger.error('Erreur matching livreurs:', error);
    return [];
  }
}

/**
 * Assigner automatiquement un livreur à une commande
 */
async function autoAssignDriver(orderId) {
  try {
    const order = await db('orders').where('id', orderId).first();
    if (!order || order.driver_id) return null;

    const drivers = await findNearestDrivers(
      parseFloat(order.pickup_lat),
      parseFloat(order.pickup_lng),
      10, // rayon 10km
      1  // meilleur livreur uniquement
    );

    if (drivers.length === 0) return null;

    const bestDriver = drivers[0];
    await db('orders').where('id', orderId).update({ driver_id: bestDriver.id });
    await db('drivers').where('id', bestDriver.id).update({ is_busy: true });

    logger.info(`Livreur ${bestDriver.id} assigné à la commande ${order.order_number}`);
    return bestDriver;
  } catch (error) {
    logger.error('Erreur auto-assign:', error);
    return null;
  }
}

module.exports = { findNearestDrivers, autoAssignDriver };
