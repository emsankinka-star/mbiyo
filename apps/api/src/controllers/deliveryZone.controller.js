const db = require('../database');
const { apiResponse } = require('../utils/helpers');

exports.getDeliveryZones = async (req, res) => {
  const zones = await db('delivery_zones').where('is_active', true).orderBy('name');
  res.json(apiResponse(zones));
};
