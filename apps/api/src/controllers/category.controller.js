const db = require('../database');
const { apiResponse } = require('../utils/helpers');

exports.getCategories = async (req, res) => {
  const categories = await db('categories').where('is_active', true).orderBy('sort_order');
  res.json(apiResponse(categories));
};

exports.getCategoryBySlug = async (req, res) => {
  const category = await db('categories').where('slug', req.params.slug).first();
  if (!category) return res.status(404).json(apiResponse(null, false, 'Catégorie introuvable'));
  res.json(apiResponse(category));
};
