const { validationResult } = require('express-validator');
const { db } = require('../database');
const { apiResponse, paginate } = require('../utils/helpers');
const { uploadToCloudinary, deleteFromCloudinary, COMPRESS_PRESETS } = require('../utils/cloudinary');
const logger = require('../utils/logger');

const VALID_UNITS = ['piece', 'kg', 'g', 'L', 'mL', 'm', 'pack'];

const UNIT_DEFAULTS = {
  piece: { min_quantity: 1, step: 1 },
  kg:    { min_quantity: 0.1, step: 0.1 },
  g:     { min_quantity: 100, step: 100 },
  L:     { min_quantity: 0.5, step: 0.5 },
  mL:    { min_quantity: 100, step: 100 },
  m:     { min_quantity: 0.5, step: 0.5 },
  pack:  { min_quantity: 1, step: 1 },
};

const productController = {
  /**
   * GET /api/products
   */
  async list(req, res) {
    try {
      const { page = 1, limit = 20, supplier_id, category_id } = req.query;
      const { limit: lim, offset } = paginate(null, parseInt(page), parseInt(limit));

      let baseQuery = db('products')
        .join('suppliers', 'products.supplier_id', 'suppliers.id')
        .where('products.is_available', true)
        .where('suppliers.is_validated', true);

      if (supplier_id) baseQuery = baseQuery.where('products.supplier_id', supplier_id);
      if (category_id) baseQuery = baseQuery.where('products.category_id', category_id);

      const total = await baseQuery.clone().count('* as count').first();
      const products = await baseQuery.clone()
        .select('products.*', 'suppliers.business_name as supplier_name')
        .orderBy('products.sort_order', 'asc').limit(lim).offset(offset);

      return apiResponse(res, 200, {
        products,
        pagination: { page: parseInt(page), limit: lim, total: parseInt(total.count) },
      });
    } catch (error) {
      logger.error('Erreur liste produits:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/products/search
   */
  async search(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      if (!q) return apiResponse(res, 400, null, 'Terme de recherche requis');

      const { limit: lim, offset } = paginate(null, parseInt(page), parseInt(limit));

      const products = await db('products')
        .join('suppliers', 'products.supplier_id', 'suppliers.id')
        .select('products.*', 'suppliers.business_name as supplier_name')
        .where('products.is_available', true)
        .where('suppliers.is_validated', true)
        .where(function () {
          this.where('products.name', 'ilike', `%${q}%`)
            .orWhere('products.description', 'ilike', `%${q}%`);
        })
        .orderBy('products.name', 'asc')
        .limit(lim)
        .offset(offset);

      return apiResponse(res, 200, products);
    } catch (error) {
      logger.error('Erreur recherche produits:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * GET /api/products/:id
   */
  async getById(req, res) {
    try {
      const product = await db('products')
        .join('suppliers', 'products.supplier_id', 'suppliers.id')
        .select('products.*', 'suppliers.business_name as supplier_name')
        .where('products.id', req.params.id)
        .first();

      if (!product) return apiResponse(res, 404, null, 'Produit non trouvé');
      return apiResponse(res, 200, product);
    } catch (error) {
      logger.error('Erreur détail produit:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * POST /api/products
   */
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return apiResponse(res, 400, errors.array());

      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      if (!supplier) return apiResponse(res, 403, null, 'Profil fournisseur requis');

      const { name, description, price, promo_price, category_id, stock_quantity, variants, extras, unit, min_quantity, step } = req.body;

      const safeUnit = VALID_UNITS.includes(unit) ? unit : 'piece';
      const defaults = UNIT_DEFAULTS[safeUnit];

      // Colonnes de base (toujours présentes)
      const insertData = {
        supplier_id: supplier.id,
        name,
        description: description || null,
        price: parseFloat(price),
        promo_price: promo_price != null && promo_price !== '' ? parseFloat(promo_price) : null,
        stock_quantity: stock_quantity != null && stock_quantity !== '' ? parseInt(stock_quantity) : -1,
      };

      // Only include category_id if it's a valid UUID value
      if (category_id && category_id.length > 0) {
        insertData.category_id = category_id;
      }

      // Colonnes optionnelles (ajoutées par migration — peuvent ne pas exister)
      const optionalCols = {};
      optionalCols.variants = db.raw('?::jsonb', [JSON.stringify(variants || [])]);
      optionalCols.extras = db.raw('?::jsonb', [JSON.stringify(extras || [])]);
      optionalCols.unit = safeUnit;
      optionalCols.min_quantity = min_quantity || defaults.min_quantity;
      optionalCols.step = step || defaults.step;

      // Essai 1: avec toutes les colonnes
      try {
        const [product] = await db('products').insert({ ...insertData, ...optionalCols }).returning('*');
        return apiResponse(res, 201, product, 'Produit créé');
      } catch (fullErr) {
        // Si une colonne n'existe pas, réessayer sans les colonnes optionnelles
        if (fullErr.message && fullErr.message.includes('does not exist')) {
          logger.warn('Colonnes optionnelles manquantes, insertion basique:', fullErr.message);
          const [product] = await db('products').insert(insertData).returning('*');
          return apiResponse(res, 201, product, 'Produit créé');
        }
        throw fullErr;
      }
    } catch (error) {
      logger.error('Erreur création produit:', error.message || error);
      logger.error('Stack:', error.stack);
      return apiResponse(res, 500, null, error.message || 'Erreur lors de la création du produit');
    }
  },

  /**
   * PUT /api/products/:id
   */
  async update(req, res) {
    try {
      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      const product = await db('products').where('id', req.params.id).where('supplier_id', supplier.id).first();
      if (!product) return apiResponse(res, 404, null, 'Produit non trouvé');

      // Colonnes de base (toujours présentes)
      const baseFields = ['name', 'description', 'price', 'promo_price', 'category_id', 'stock_quantity', 'is_available'];
      // Colonnes optionnelles (peuvent ne pas exister en DB)
      const optionalFields = ['sort_order', 'min_quantity', 'step'];

      const baseUpdates = {};
      const optionalUpdates = {};

      baseFields.forEach((f) => { if (req.body[f] !== undefined) baseUpdates[f] = req.body[f]; });
      optionalFields.forEach((f) => { if (req.body[f] !== undefined) optionalUpdates[f] = req.body[f]; });

      if (req.body.unit && VALID_UNITS.includes(req.body.unit)) {
        optionalUpdates.unit = req.body.unit;
        if (!req.body.min_quantity) optionalUpdates.min_quantity = UNIT_DEFAULTS[req.body.unit].min_quantity;
        if (!req.body.step) optionalUpdates.step = UNIT_DEFAULTS[req.body.unit].step;
      }

      if (req.body.variants) optionalUpdates.variants = db.raw('?::jsonb', [JSON.stringify(req.body.variants)]);
      if (req.body.extras) optionalUpdates.extras = db.raw('?::jsonb', [JSON.stringify(req.body.extras)]);

      // Essai avec toutes les colonnes, fallback sans les optionnelles
      const allUpdates = { ...baseUpdates, ...optionalUpdates };
      try {
        const [updated] = await db('products').where('id', req.params.id).update(allUpdates).returning('*');
        return apiResponse(res, 200, updated, 'Produit mis à jour');
      } catch (fullErr) {
        if (fullErr.message && fullErr.message.includes('does not exist') && Object.keys(baseUpdates).length > 0) {
          logger.warn('Update fallback sans colonnes optionnelles:', fullErr.message);
          const [updated] = await db('products').where('id', req.params.id).update(baseUpdates).returning('*');
          return apiResponse(res, 200, updated, 'Produit mis à jour');
        }
        throw fullErr;
      }
    } catch (error) {
      logger.error('Erreur mise à jour produit:', error.message || error);
      return apiResponse(res, 500, null, error.message || 'Erreur mise à jour produit');
    }
  },

  /**
   * DELETE /api/products/:id
   */
  async remove(req, res) {
    try {
      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      const deleted = await db('products').where('id', req.params.id).where('supplier_id', supplier.id).del();
      if (!deleted) return apiResponse(res, 404, null, 'Produit non trouvé');
      return apiResponse(res, 200, null, 'Produit supprimé');
    } catch (error) {
      logger.error('Erreur suppression produit:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PUT /api/products/:id/image
   */
  async uploadImage(req, res) {
    try {
      if (!req.file) return apiResponse(res, 400, null, 'Image requise');

      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      // Supprimer l'ancienne image de Cloudinary
      const existing = await db('products').where('id', req.params.id).where('supplier_id', supplier.id).first();
      if (!existing) return apiResponse(res, 404, null, 'Produit non trouvé');
      if (existing?.image_url) await deleteFromCloudinary(existing.image_url);

      // Compresser et uploader vers Cloudinary
      const { url } = await uploadToCloudinary(req.file, 'products', COMPRESS_PRESETS.product);

      const [product] = await db('products').where('id', req.params.id).update({ image_url: url }).returning('*');
      return apiResponse(res, 200, product);
    } catch (error) {
      logger.error('Erreur upload image produit:', error);
      return apiResponse(res, 500, null, error.message || 'Erreur upload image');
    }
  },

  /**
   * PATCH /api/products/:id/availability
   */
  async toggleAvailability(req, res) {
    try {
      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      const existing = await db('products').where('id', req.params.id).where('supplier_id', supplier.id).first();
      if (!existing) return apiResponse(res, 404, null, 'Produit non trouvé');

      const [product] = await db('products').where('id', req.params.id)
        .update({ is_available: !existing.is_available }).returning('*');
      return apiResponse(res, 200, product);
    } catch (error) {
      logger.error('Erreur toggle disponibilité:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },

  /**
   * PATCH /api/products/:id/stock
   */
  async updateStock(req, res) {
    try {
      const supplier = await db('suppliers').where('user_id', req.user.id).first();
      const existing = await db('products').where('id', req.params.id).where('supplier_id', supplier.id).first();
      if (!existing) return apiResponse(res, 404, null, 'Produit non trouvé');

      const { stock_quantity } = req.body;
      const [product] = await db('products').where('id', req.params.id).update({ stock_quantity }).returning('*');
      return apiResponse(res, 200, product);
    } catch (error) {
      logger.error('Erreur mise à jour stock:', error);
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },
};

module.exports = productController;
