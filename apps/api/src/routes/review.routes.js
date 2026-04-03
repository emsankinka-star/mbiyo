const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { db } = require('../database');
const { apiResponse } = require('../utils/helpers');

// POST /api/reviews
router.post('/', authenticate, async (req, res) => {
  try {
    const { order_id, target_id, target_type, rating, comment } = req.body;

    if (!['driver', 'supplier'].includes(target_type)) {
      return apiResponse(res, 400, null, 'Type cible invalide');
    }
    if (rating < 1 || rating > 5) {
      return apiResponse(res, 400, null, 'Note entre 1 et 5');
    }

    // Vérifier que la commande est livrée
    const order = await db('orders').where('id', order_id).where('client_id', req.user.id).first();
    if (!order || order.status !== 'delivered') {
      return apiResponse(res, 400, null, 'Commande non livrée');
    }

    // Vérifier qu'on n'a pas déjà noté
    const existing = await db('reviews')
      .where('order_id', order_id)
      .where('target_type', target_type)
      .where('reviewer_id', req.user.id)
      .first();
    if (existing) {
      return apiResponse(res, 409, null, 'Vous avez déjà noté');
    }

    const [review] = await db('reviews').insert({
      order_id,
      reviewer_id: req.user.id,
      target_id,
      target_type,
      rating,
      comment,
    }).returning('*');

    // Mettre à jour la moyenne
    const tableName = target_type === 'driver' ? 'drivers' : 'suppliers';
    const avgResult = await db('reviews')
      .where('target_id', target_id)
      .where('target_type', target_type)
      .avg('rating as avg')
      .count('* as count')
      .first();

    await db(tableName).where('id', target_id).update({
      rating: Math.round(parseFloat(avgResult.avg) * 100) / 100,
      total_reviews: parseInt(avgResult.count),
    });

    return apiResponse(res, 201, review, 'Merci pour votre avis!');
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// GET /api/reviews/:target_type/:target_id
router.get('/:target_type/:target_id', async (req, res) => {
  try {
    const reviews = await db('reviews')
      .join('users', 'reviews.reviewer_id', 'users.id')
      .select('reviews.*', 'users.full_name as reviewer_name')
      .where('reviews.target_id', req.params.target_id)
      .where('reviews.target_type', req.params.target_type)
      .orderBy('reviews.created_at', 'desc')
      .limit(50);
    return apiResponse(res, 200, reviews);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

module.exports = router;
