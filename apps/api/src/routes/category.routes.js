const router = require('express').Router();
const { db } = require('../database');
const { apiResponse } = require('../utils/helpers');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const categories = await db('categories')
      .where('is_active', true)
      .orderBy('sort_order', 'asc');
    return apiResponse(res, 200, categories);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// GET /api/categories/:slug
router.get('/:slug', async (req, res) => {
  try {
    const category = await db('categories').where('slug', req.params.slug).first();
    if (!category) return apiResponse(res, 404, null, 'Catégorie non trouvée');
    return apiResponse(res, 200, category);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

module.exports = router;
