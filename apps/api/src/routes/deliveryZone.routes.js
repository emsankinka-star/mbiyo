const router = require('express').Router();
const { db } = require('../database');
const { apiResponse } = require('../utils/helpers');

// GET /api/delivery-zones
router.get('/', async (req, res) => {
  try {
    const zones = await db('delivery_zones').where('is_active', true).orderBy('name', 'asc');
    return apiResponse(res, 200, zones);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

module.exports = router;
