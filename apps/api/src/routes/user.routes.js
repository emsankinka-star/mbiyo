const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { db } = require('../database');
const { apiResponse, paginate } = require('../utils/helpers');

// GET /api/users - Admin: liste des utilisateurs
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const { limit: lim, offset } = paginate(null, parseInt(page), parseInt(limit));

    let query = db('users').select(
      'id', 'full_name', 'email', 'phone', 'role', 'avatar_url', 'is_active', 'is_verified', 'created_at'
    );

    if (role) query = query.where('role', role);
    if (search) {
      query = query.where(function () {
        this.where('full_name', 'ilike', `%${search}%`)
          .orWhere('phone', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`);
      });
    }

    const total = await query.clone().count('* as count').first();
    const users = await query.orderBy('created_at', 'desc').limit(lim).offset(offset);

    return apiResponse(res, 200, {
      users,
      pagination: { page: parseInt(page), limit: lim, total: parseInt(total.count) },
    });
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// PATCH /api/users/:id/status - Activer/désactiver
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { is_active } = req.body;
    const [user] = await db('users').where('id', req.params.id)
      .update({ is_active }).returning(['id', 'full_name', 'is_active']);
    return apiResponse(res, 200, user, `Utilisateur ${is_active ? 'activé' : 'désactivé'}`);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

module.exports = router;
