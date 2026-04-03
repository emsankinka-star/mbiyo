const db = require('../database');
const { apiResponse } = require('../utils/helpers');

exports.createReview = async (req, res) => {
  const { order_id, target_id, target_type, rating, comment } = req.body;
  if (rating < 1 || rating > 5) return res.status(400).json(apiResponse(null, false, 'Note entre 1 et 5'));

  const existing = await db('reviews').where({ user_id: req.user.id, order_id }).first();
  if (existing) return res.status(400).json(apiResponse(null, false, 'Avis déjà laissé pour cette commande'));

  const [review] = await db('reviews').insert({
    user_id: req.user.id, order_id, target_id, target_type, rating, comment,
  }).returning('*');

  // Update average rating
  const [avg] = await db('reviews').where({ target_id, target_type }).avg('rating as avg');
  const table = target_type === 'supplier' ? 'suppliers' : target_type === 'driver' ? 'drivers' : null;
  if (table) {
    const field = table === 'suppliers' ? 'user_id' : 'user_id';
    await db(table).where(field, target_id).update({ rating: parseFloat(avg.avg).toFixed(1) });
  }

  res.status(201).json(apiResponse(review));
};

exports.getReviews = async (req, res) => {
  const { target_id, target_type } = req.query;
  const reviews = await db('reviews')
    .leftJoin('users', 'reviews.user_id', 'users.id')
    .select('reviews.*', 'users.full_name as reviewer_name')
    .where({ target_id, target_type })
    .orderBy('reviews.created_at', 'desc');
  res.json(apiResponse(reviews));
};
