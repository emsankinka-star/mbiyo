const { validationResult } = require('express-validator');
const { db } = require('../database');
const { apiResponse, paginate } = require('../utils/helpers');
const { uploadToCloudinary, deleteFromCloudinary, COMPRESS_PRESETS } = require('../utils/cloudinary');

const productController = {
  /**
   * GET /api/products
   */
  async list(req, res) {
    try {
      const { page = 1, limit = 20, supplier_id, category_id } = req.query;
      const { limit: lim, offset } = paginate(null, parseInt(page), parseInt(limit));

      let query = db('products')
        .join('suppliers', 'products.supplier_id', 'suppliers.id')
        .select('products.*', 'suppliers.business_name as supplier_name')
        .where('products.is_available', true);

      if (supplier_id) query = query.where('products.supplier_id', supplier_id);
      if (category_id) query = query.where('products.category_id', category_id);

      const total = await query.clone().count('* as count').first();
      const products = await query.orderBy('products.sort_order', 'asc').limit(lim).offset(offset);

      return apiResponse(res, 200, {
        products,
        pagination: { page: parseInt(page), limit: lim, total: parseInt(total.count) },
      });
    } catch (error) {
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
        .where(function () {
          this.where('products.name', 'ilike', `%${q}%`)
            .orWhere('products.description', 'ilike', `%${q}%`);
        })
        .orderBy('products.name', 'asc')
        .limit(lim)
        .offset(offset);

      return apiResponse(res, 200, products);
    } catch (error) {
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

      const { name, description, price, promo_price, category_id, stock_quantity, variants, extras, unit } = req.body;

      const [product] = await db('products').insert({
        supplier_id: supplier.id,
        category_id,
        name,
        description,
        price,
        promo_price,
        stock_quantity: stock_quantity || -1,
        variants: JSON.stringify(variants || []),
        extras: JSON.stringify(extras || []),
        unit,
      }).returning('*');

      return apiResponse(res, 201, product, 'Produit créé');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
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

      const updates = {};
      const fields = ['name', 'description', 'price', 'promo_price', 'category_id', 'stock_quantity', 'is_available', 'unit', 'sort_order'];
      fields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      if (req.body.variants) updates.variants = JSON.stringify(req.body.variants);
      if (req.body.extras) updates.extras = JSON.stringify(req.body.extras);

      const [updated] = await db('products').where('id', req.params.id).update(updates).returning('*');
      return apiResponse(res, 200, updated, 'Produit mis à jour');
    } catch (error) {
      return apiResponse(res, 500, null, 'Erreur serveur');
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
      return apiResponse(res, 500, null, 'Erreur upload image');
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
      return apiResponse(res, 500, null, 'Erreur serveur');
    }
  },
};

module.exports = productController;
