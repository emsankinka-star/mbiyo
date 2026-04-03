const { validationResult } = require('express-validator');
const { db } = require('../database');
const { apiResponse, calculateDistance, paginate } = require('../utils/helpers');
const logger = require('../utils/logger');
const { uploadToCloudinary, COMPRESS_PRESETS } = require('../utils/cloudinary');

const driverController = {
  /**
   * POST /api/drivers/register - Inscription livreur
   */
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return apiResponse(res, 400, errors.array());

      const existing = await db('drivers').where('user_id', req.user.id).first();
      if (existing) return apiResponse(res, 409, null, 'Déjà inscrit comme livreur');

      const { vehicle_type, license_plate } = req.body;
      const files = req.files || {};

      // Upload des documents vers Cloudinary avec compression
      const [idDocUrl, licenseUrl, vehicleUrl] = await Promise.all([
        files.id_document ? uploadToCloudinary(files.id_document[0], 'drivers/documents', COMPRESS_PRESETS.document) : null,
        files.license ? uploadToCloudinary(files.license[0], 'drivers/licenses', COMPRESS_PRESETS.document) : null,
        files.vehicle_photo ? uploadToCloudinary(files.vehicle_photo[0], 'drivers/vehicles', COMPRESS_PRESETS.product) : null,
      ]);

      const [driver] = await db('drivers').insert({
        user_id: req.user.id,
        vehicle_type,
        license_plate,
        id_document_url: idDocUrl?.url || null,
        license_url: licenseUrl?.url || null,
        vehicle_photo_url: vehicleUrl?.url || null,
      }).returning('*');

      await db('users').where('id', req.user.id).update({ role: 'driver' });

      logger.info(`Nouveau livreur inscrit: ${req.user.phone}`);
      return apiResponse(res, 201, driver, 'Inscription livreur réussie. En attente de validation.');
    } catch (error) {
      logger.error('Erreur register driver:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/drivers/me - Profil livreur
   */
  async getProfile(req, res) {
    try {
      const driver = await db('drivers')
        .join('users', 'drivers.user_id', 'users.id')
        .select('drivers.*', 'users.full_name', 'users.phone', 'users.avatar_url')
        .where('drivers.user_id', req.user.id)
        .first();

      if (!driver) return apiResponse(res, 404, null, 'Profil livreur non trouvé');
      return apiResponse(res, 200, driver);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PUT /api/drivers/me/status - En ligne / hors ligne
   */
  async toggleOnline(req, res) {
    try {
      const { is_online } = req.body;
      const [driver] = await db('drivers')
        .where('user_id', req.user.id)
        .update({ is_online, today_earnings: is_online ? db.raw('today_earnings') : 0 })
        .returning('*');

      return apiResponse(res, 200, driver);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PUT /api/drivers/me/location - Mettre à jour la position
   */
  async updateLocation(req, res) {
    try {
      const { latitude, longitude } = req.body;
      await db('drivers').where('user_id', req.user.id).update({
        current_lat: latitude,
        current_lng: longitude,
      });
      await db('users').where('id', req.user.id).update({ latitude, longitude });
      return apiResponse(res, 200, { latitude, longitude });
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/drivers/me/earnings - Gains
   */
  async getEarnings(req, res) {
    try {
      const driver = await db('drivers').where('user_id', req.user.id).first();
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const monthStart = new Date();
      monthStart.setDate(1);

      const [todayEarnings] = await db('orders')
        .where('driver_id', driver.id)
        .where('status', 'delivered')
        .where('delivered_at', '>=', todayStart)
        .sum('delivery_fee as total');

      const [weekEarnings] = await db('orders')
        .where('driver_id', driver.id)
        .where('status', 'delivered')
        .where('delivered_at', '>=', weekStart)
        .sum('delivery_fee as total');

      const [monthEarnings] = await db('orders')
        .where('driver_id', driver.id)
        .where('status', 'delivered')
        .where('delivered_at', '>=', monthStart)
        .sum('delivery_fee as total');

      return apiResponse(res, 200, {
        today: parseFloat(todayEarnings.total) || 0,
        week: parseFloat(weekEarnings.total) || 0,
        month: parseFloat(monthEarnings.total) || 0,
        total: parseFloat(driver.total_earnings) || 0,
        total_deliveries: driver.total_deliveries,
      });
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/drivers/me/deliveries - Historique
   */
  async getDeliveryHistory(req, res) {
    try {
      const driver = await db('drivers').where('user_id', req.user.id).first();
      const { page = 1, limit = 20 } = req.query;
      const { limit: lim, offset } = paginate(null, parseInt(page), parseInt(limit));

      const deliveries = await db('orders')
        .where('driver_id', driver.id)
        .whereIn('status', ['delivered', 'cancelled'])
        .join('suppliers', 'orders.supplier_id', 'suppliers.id')
        .leftJoin('users', 'orders.client_id', 'users.id')
        .select('orders.*', 'suppliers.business_name', 'users.full_name as client_name')
        .orderBy('orders.created_at', 'desc')
        .limit(lim).offset(offset);

      return apiResponse(res, 200, deliveries);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/drivers/me/stats
   */
  async getStats(req, res) {
    try {
      const driver = await db('drivers').where('user_id', req.user.id).first();

      const completionRate = driver.total_deliveries > 0
        ? await db('orders').where('driver_id', driver.id).where('status', 'delivered').count('* as count').first()
        : { count: 0 };

      const totalAssigned = await db('orders').where('driver_id', driver.id).count('* as count').first();

      return apiResponse(res, 200, {
        rating: parseFloat(driver.rating),
        total_reviews: driver.total_reviews,
        total_deliveries: driver.total_deliveries,
        total_earnings: parseFloat(driver.total_earnings),
        completion_rate: totalAssigned.count > 0
          ? Math.round((completionRate.count / totalAssigned.count) * 100)
          : 0,
      });
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/drivers/available-orders
   */
  async getAvailableOrders(req, res) {
    try {
      const driver = await db('drivers').where('user_id', req.user.id).first();
      if (!driver.is_online || !driver.is_validated) {
        return apiResponse(res, 200, []);
      }

      const orders = await db('orders')
        .where('status', 'ready')
        .whereNull('driver_id')
        .join('suppliers', 'orders.supplier_id', 'suppliers.id')
        .join('users', 'orders.client_id', 'users.id')
        .select(
          'orders.*',
          'suppliers.business_name',
          'suppliers.address as pickup_address',
          'suppliers.address_details as pickup_address_details',
          'users.full_name as client_name',
          'users.phone as client_phone'
        )
        .orderBy('orders.created_at', 'asc');

      // Ajouter la distance depuis le livreur
      const withDistance = orders.map((order) => ({
        ...order,
        distance_to_pickup: driver.current_lat && order.pickup_lat
          ? calculateDistance(
            parseFloat(driver.current_lat), parseFloat(driver.current_lng),
            parseFloat(order.pickup_lat), parseFloat(order.pickup_lng)
          ).toFixed(1)
          : null,
      })).sort((a, b) => (a.distance_to_pickup || 999) - (b.distance_to_pickup || 999));

      return apiResponse(res, 200, withDistance);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },
};

module.exports = driverController;
