const { validationResult } = require('express-validator');
const { db } = require('../database');
const { apiResponse, paginate, calculateDistance } = require('../utils/helpers');
const logger = require('../utils/logger');
const { uploadToCloudinary, deleteFromCloudinary, COMPRESS_PRESETS } = require('../utils/cloudinary');

const supplierController = {
  /**
   * GET /api/suppliers/me - Profil du fournisseur connecté
   */
  async getMyProfile(req, res) {
    try {
      const supplier = await db('suppliers')
        .join('users', 'suppliers.user_id', 'users.id')
        .select('suppliers.*', 'users.full_name as owner_name', 'users.phone as owner_phone')
        .where('suppliers.user_id', req.user.id)
        .first();

      if (!supplier) {
        return apiResponse(res, 404, null, 'Profil fournisseur non trouvé');
      }

      return apiResponse(res, 200, supplier);
    } catch (error) {
      logger.error('Erreur getMyProfile:', error.message);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/suppliers - Liste des fournisseurs
   */
  async list(req, res) {
    try {
      const { page = 1, limit = 20, type, search, city } = req.query;
      const { limit: lim, offset } = paginate(null, parseInt(page), parseInt(limit));

      let baseQuery = db('suppliers')
        .join('users', 'suppliers.user_id', 'users.id')
        .where('suppliers.is_validated', true);

      if (type) baseQuery = baseQuery.where('suppliers.business_type', type);
      if (search) {
        baseQuery = baseQuery.where('suppliers.business_name', 'ilike', `%${search}%`);
      }

      const total = await baseQuery.clone().count('* as count').first();
      const suppliers = await baseQuery.clone()
        .select('suppliers.*', 'users.full_name as owner_name', 'users.phone as owner_phone')
        .orderBy('suppliers.rating', 'desc').limit(lim).offset(offset);

      return apiResponse(res, 200, {
        suppliers,
        pagination: { page: parseInt(page), limit: lim, total: parseInt(total.count) },
      });
    } catch (error) {
      logger.error('Erreur liste fournisseurs:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/suppliers/nearby - Fournisseurs à proximité
   */
  async nearby(req, res) {
    try {
      const { lat, lng, radius = 10, type } = req.query;
      if (!lat || !lng) {
        return apiResponse(res, 400, null, 'Latitude et longitude requises');
      }

      let query = db('suppliers')
        .join('users', 'suppliers.user_id', 'users.id')
        .select(
          'suppliers.*',
          'users.full_name as owner_name'
        )
        .where('suppliers.is_validated', true)
        .where('suppliers.is_open', true);

      if (type) query = query.where('suppliers.business_type', type);

      const suppliers = await query;

      // Filtrer par distance et ajouter la distance
      const nearby = suppliers
        .map((s) => ({
          ...s,
          distance_km: s.latitude && s.longitude
            ? calculateDistance(parseFloat(lat), parseFloat(lng), parseFloat(s.latitude), parseFloat(s.longitude))
            : null,
        }))
        .filter((s) => s.distance_km !== null && s.distance_km <= parseFloat(radius))
        .sort((a, b) => a.distance_km - b.distance_km);

      return apiResponse(res, 200, nearby);
    } catch (error) {
      logger.error('Erreur nearby:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/suppliers/:id
   */
  async getById(req, res) {
    try {
      const supplier = await db('suppliers')
        .join('users', 'suppliers.user_id', 'users.id')
        .select('suppliers.*', 'users.full_name as owner_name', 'users.phone as owner_phone')
        .where('suppliers.id', req.params.id)
        .first();

      if (!supplier) {
        return apiResponse(res, 404, null, 'Fournisseur non trouvé');
      }

      return apiResponse(res, 200, supplier);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/suppliers/:id/products
   */
  async getProducts(req, res) {
    try {
      const { category_id } = req.query;
      let query = db('products')
        .where('supplier_id', req.params.id)
        .where('is_available', true);

      if (category_id) query = query.where('category_id', category_id);

      const products = await query.orderBy('sort_order', 'asc');
      return apiResponse(res, 200, products);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * POST /api/suppliers/register
   */
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return apiResponse(res, 400, errors.array(), 'Données invalides');
      }

      const { business_name, business_type, description, address, latitude, longitude, rccm, email } = req.body;

      // Vérifier si déjà fournisseur
      const existing = await db('suppliers').where('user_id', req.user.id).first();
      if (existing) {
        return apiResponse(res, 409, existing, 'Vous êtes déjà enregistré comme fournisseur');
      }

      // Upload logo si fourni (graceful - ne bloque pas l'inscription)
      let logo_url = null;
      if (req.file) {
        try {
          const result = await uploadToCloudinary(req.file, 'suppliers/logos', COMPRESS_PRESETS.logo);
          logo_url = result.url;
        } catch (uploadErr) {
          logger.error('Erreur upload logo (inscription continue sans logo):', uploadErr.message);
        }
      }

      // Créer le profil fournisseur (uniquement les valeurs définies)
      const insertData = {
        user_id: req.user.id,
        business_name,
        business_type,
      };
      if (description) insertData.description = description;
      if (address) insertData.address = address;
      if (latitude) insertData.latitude = latitude;
      if (longitude) insertData.longitude = longitude;
      if (rccm) insertData.rccm = rccm;
      if (email) insertData.email = email;
      if (logo_url) insertData.logo_url = logo_url;

      const [supplier] = await db('suppliers').insert(insertData).returning('*');

      // Mettre à jour le rôle
      await db('users').where('id', req.user.id).update({ role: 'supplier' });

      logger.info(`Nouveau fournisseur: ${business_name} (${business_type})`);
      return apiResponse(res, 201, supplier, 'Inscription fournisseur réussie. En attente de validation.');
    } catch (error) {
      logger.error('Erreur register supplier:', error.message || error);
      logger.error('Stack:', error.stack);
      return apiResponse(res, 500, null, error.message || 'Erreur lors de la création du profil fournisseur');
    }
  },

  /**
   * PUT /api/suppliers/me
   */
  async updateProfile(req, res) {
    try {
      const { business_name, description, address, latitude, longitude, preparation_time, minimum_order, address_details, rccm, email } = req.body;
      const updates = {};
      if (business_name) updates.business_name = business_name;
      if (description !== undefined) updates.description = description;
      if (address) updates.address = address;
      if (latitude) updates.latitude = latitude;
      if (longitude) updates.longitude = longitude;
      if (preparation_time) updates.preparation_time = preparation_time;
      if (minimum_order !== undefined) updates.minimum_order = minimum_order;
      if (address_details !== undefined) updates.address_details = JSON.stringify(address_details);
      if (rccm !== undefined) updates.rccm = rccm;
      if (email !== undefined) updates.email = email;

      const [supplier] = await db('suppliers')
        .where('user_id', req.user.id)
        .update(updates)
        .returning('*');

      return apiResponse(res, 200, supplier, 'Profil mis à jour');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PUT /api/suppliers/me/logo
   */
  async uploadLogo(req, res) {
    try {
      if (!req.file) return apiResponse(res, 400, null, 'Fichier requis');

      // Supprimer l'ancien logo
      const existing = await db('suppliers').where('user_id', req.user.id).first();
      if (existing?.logo_url) await deleteFromCloudinary(existing.logo_url);

      const { url } = await uploadToCloudinary(req.file, 'suppliers/logos', COMPRESS_PRESETS.logo);

      const [supplier] = await db('suppliers')
        .where('user_id', req.user.id)
        .update({ logo_url: url })
        .returning('*');
      return apiResponse(res, 200, supplier);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur upload logo');
    }
  },

  /**
   * PUT /api/suppliers/me/cover
   */
  async uploadCover(req, res) {
    try {
      if (!req.file) return apiResponse(res, 400, null, 'Fichier requis');

      const existing = await db('suppliers').where('user_id', req.user.id).first();
      if (existing?.cover_url) await deleteFromCloudinary(existing.cover_url);

      const { url } = await uploadToCloudinary(req.file, 'suppliers/covers', COMPRESS_PRESETS.cover);

      const [supplier] = await db('suppliers')
        .where('user_id', req.user.id)
        .update({ cover_url: url })
        .returning('*');
      return apiResponse(res, 200, supplier);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur upload cover');
    }
  },

  /**
   * PUT /api/suppliers/me/status
   */
  async toggleOpen(req, res) {
    try {
      const { is_open } = req.body;
      const [supplier] = await db('suppliers')
        .where('user_id', req.user.id)
        .update({ is_open })
        .returning(['id', 'business_name', 'is_open']);
      return apiResponse(res, 200, supplier);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PUT /api/suppliers/me/hours
   */
  async updateHours(req, res) {
    try {
      const { opening_hours } = req.body;
      const [supplier] = await db('suppliers')
        .where('user_id', req.user.id)
        .update({ opening_hours: JSON.stringify(opening_hours) })
        .returning('*');
      return apiResponse(res, 200, supplier);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/suppliers/me/stats
   */
  async getStats(req, res) {
    try {
      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      if (!supplier) {
        return apiResponse(res, 404, null, 'Profil fournisseur non trouvé');
      }

      const { period = '30d' } = req.query;
      let dateFilter = new Date();
      if (period === '7d') dateFilter.setDate(dateFilter.getDate() - 7);
      else if (period === '30d') dateFilter.setDate(dateFilter.getDate() - 30);
      else dateFilter.setFullYear(dateFilter.getFullYear() - 1);

      const totalOrders = await db('orders')
        .where('supplier_id', supplier.id)
        .where('created_at', '>=', dateFilter)
        .count('* as count').first();

      const completedOrders = await db('orders')
        .where('supplier_id', supplier.id)
        .where('status', 'delivered')
        .where('created_at', '>=', dateFilter)
        .count('* as count').first();

      const revenue = await db('orders')
        .where('supplier_id', supplier.id)
        .where('status', 'delivered')
        .where('created_at', '>=', dateFilter)
        .sum('subtotal as total').first();

      return apiResponse(res, 200, {
        total_orders: parseInt(totalOrders.count),
        completed_orders: parseInt(completedOrders.count),
        revenue: parseFloat(revenue.total) || 0,
        rating: supplier.rating,
        total_reviews: supplier.total_reviews,
      });
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/suppliers/me/orders
   */
  async getOrders(req, res) {
    try {
      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      const { status, page = 1, limit = 20 } = req.query;
      const { limit: lim, offset } = paginate(null, parseInt(page), parseInt(limit));

      let query = db('orders')
        .where('supplier_id', supplier.id)
        .join('users', 'orders.client_id', 'users.id')
        .select('orders.*', 'users.full_name as client_name', 'users.phone as client_phone');

      if (status) query = query.where('orders.status', status);

      const orders = await query.orderBy('orders.created_at', 'desc').limit(lim).offset(offset);

      // Ajouter les items à chaque commande
      for (const order of orders) {
        order.items = await db('order_items').where('order_id', order.id);
      }

      return apiResponse(res, 200, orders);
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },
};

module.exports = supplierController;
