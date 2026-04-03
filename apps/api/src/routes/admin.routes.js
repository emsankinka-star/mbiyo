const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { db } = require('../database');
const { apiResponse, paginate } = require('../utils/helpers');
const upload = require('../middleware/upload.middleware');
const { uploadToCloudinary, deleteFromCloudinary, COMPRESS_PRESETS } = require('../utils/cloudinary');

// ==========================================
// GESTION DES UTILISATEURS
// ==========================================
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20, status } = req.query;
    const { limit: lim, offset } = paginate(null, parseInt(page), parseInt(limit));

    let query = db('users').select('id', 'full_name', 'email', 'phone', 'role', 'is_active', 'is_verified', 'created_at');
    if (role) query = query.where('role', role);
    if (status === 'active') query = query.where('is_active', true);
    if (status === 'inactive') query = query.where('is_active', false);
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

// ==========================================
// VALIDATION DES LIVREURS
// ==========================================
router.get('/drivers/pending', authenticate, authorize('admin'), async (req, res) => {
  try {
    const drivers = await db('drivers')
      .join('users', 'drivers.user_id', 'users.id')
      .select('drivers.*', 'users.full_name', 'users.phone', 'users.email')
      .where('drivers.is_validated', false)
      .orderBy('drivers.created_at', 'desc');
    return apiResponse(res, 200, drivers);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

router.patch('/drivers/:id/validate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { is_validated } = req.body;
    const [driver] = await db('drivers').where('id', req.params.id)
      .update({ is_validated }).returning('*');

    // Notifier le livreur
    const { notifyUser } = require('../services/notification.service');
    await notifyUser(driver.user_id, {
      title: is_validated ? 'Compte validé! ✅' : 'Validation refusée ❌',
      body: is_validated
        ? 'Votre profil livreur a été validé. Vous pouvez commencer à livrer!'
        : 'Votre profil livreur a été refusé. Contactez le support.',
      type: 'system',
    });

    return apiResponse(res, 200, driver, `Livreur ${is_validated ? 'validé' : 'rejeté'}`);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// ==========================================
// VALIDATION DES FOURNISSEURS
// ==========================================
router.get('/suppliers/pending', authenticate, authorize('admin'), async (req, res) => {
  try {
    const suppliers = await db('suppliers')
      .join('users', 'suppliers.user_id', 'users.id')
      .select('suppliers.*', 'users.full_name', 'users.phone', 'users.email')
      .where('suppliers.is_validated', false)
      .orderBy('suppliers.created_at', 'desc');
    return apiResponse(res, 200, suppliers);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

router.patch('/suppliers/:id/validate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { is_validated, commission_rate } = req.body;
    const updates = { is_validated };
    if (commission_rate) updates.commission_rate = commission_rate;

    const [supplier] = await db('suppliers').where('id', req.params.id)
      .update(updates).returning('*');

    const { notifyUser } = require('../services/notification.service');
    await notifyUser(supplier.user_id, {
      title: is_validated ? 'Boutique validée! ✅' : 'Validation refusée ❌',
      body: is_validated
        ? `${supplier.business_name} a été validée. Commencez à vendre!`
        : 'Votre boutique a été refusée. Contactez le support.',
      type: 'system',
    });

    return apiResponse(res, 200, supplier);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// ==========================================
// COMMANDES
// ==========================================
router.get('/orders', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20, from, to } = req.query;
    const { limit: lim, offset } = paginate(null, parseInt(page), parseInt(limit));

    let query = db('orders')
      .leftJoin('users', 'orders.client_id', 'users.id')
      .leftJoin('suppliers', 'orders.supplier_id', 'suppliers.id')
      .select(
        'orders.*',
        'users.full_name as client_name',
        'users.phone as client_phone',
        'suppliers.business_name as supplier_name'
      );

    if (status) query = query.where('orders.status', status);
    if (from) query = query.where('orders.created_at', '>=', from);
    if (to) query = query.where('orders.created_at', '<=', to);

    const total = await query.clone().count('* as count').first();
    const orders = await query.orderBy('orders.created_at', 'desc').limit(lim).offset(offset);

    return apiResponse(res, 200, {
      orders,
      pagination: { page: parseInt(page), limit: lim, total: parseInt(total.count) },
    });
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// ==========================================
// STATISTIQUES GLOBALES
// ==========================================
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let dateFilter = new Date();
    if (period === '7d') dateFilter.setDate(dateFilter.getDate() - 7);
    else if (period === '30d') dateFilter.setDate(dateFilter.getDate() - 30);
    else dateFilter.setFullYear(dateFilter.getFullYear() - 1);

    const [totalUsers] = await db('users').count('* as count');
    const [totalClients] = await db('users').where('role', 'client').count('* as count');
    const [totalDrivers] = await db('drivers').count('* as count');
    const [activeDrivers] = await db('drivers').where('is_online', true).count('* as count');
    const [totalSuppliers] = await db('suppliers').count('* as count');
    const [totalOrders] = await db('orders').where('created_at', '>=', dateFilter).count('* as count');
    const [deliveredOrders] = await db('orders').where('status', 'delivered').where('created_at', '>=', dateFilter).count('* as count');
    const [totalRevenue] = await db('orders').where('status', 'delivered').where('created_at', '>=', dateFilter).sum('total as amount');
    const [totalCommissions] = await db('orders').where('status', 'delivered').where('created_at', '>=', dateFilter).sum('commission as amount');

    // Commandes par jour (derniers 7 jours)
    const dailyOrders = await db('orders')
      .select(db.raw("DATE(created_at) as date, COUNT(*) as count, SUM(total) as revenue"))
      .where('created_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc');

    return apiResponse(res, 200, {
      users: {
        total: parseInt(totalUsers.count),
        clients: parseInt(totalClients.count),
        drivers: parseInt(totalDrivers.count),
        active_drivers: parseInt(activeDrivers.count),
        suppliers: parseInt(totalSuppliers.count),
      },
      orders: {
        total: parseInt(totalOrders.count),
        delivered: parseInt(deliveredOrders.count),
        completion_rate: totalOrders.count > 0
          ? Math.round((deliveredOrders.count / totalOrders.count) * 100) : 0,
      },
      revenue: {
        total: parseFloat(totalRevenue.amount) || 0,
        commissions: parseFloat(totalCommissions.amount) || 0,
        currency: 'CDF',
      },
      daily_orders: dailyOrders,
    });
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// ==========================================
// ZONES DE LIVRAISON
// ==========================================
router.get('/delivery-zones', authenticate, authorize('admin'), async (req, res) => {
  try {
    const zones = await db('delivery_zones').orderBy('name', 'asc');
    return apiResponse(res, 200, zones);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

router.post('/delivery-zones', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, city, center_lat, center_lng, radius_km, base_fee, per_km_fee } = req.body;
    const [zone] = await db('delivery_zones').insert({
      name, city, center_lat, center_lng, radius_km, base_fee, per_km_fee,
    }).returning('*');
    return apiResponse(res, 201, zone);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

router.put('/delivery-zones/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [zone] = await db('delivery_zones').where('id', req.params.id)
      .update(req.body).returning('*');
    return apiResponse(res, 200, zone);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// ==========================================
// CATÉGORIES (CRUD admin)
// ==========================================
router.post('/categories', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, name_sw, slug, sort_order } = req.body;
    const [category] = await db('categories').insert({ name, name_sw, slug, sort_order }).returning('*');
    return apiResponse(res, 201, category);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

router.put('/categories/:id/image', authenticate, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return apiResponse(res, 400, null, 'Image requise');
    const existing = await db('categories').where('id', req.params.id).first();
    if (!existing) return apiResponse(res, 404, null, 'Catégorie non trouvée');
    if (existing.image_url) await deleteFromCloudinary(existing.image_url);
    const { url } = await uploadToCloudinary(req.file, 'categories', COMPRESS_PRESETS.category);
    const [category] = await db('categories').where('id', req.params.id).update({ image_url: url }).returning('*');
    return apiResponse(res, 200, category);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur upload image catégorie');
  }
});

router.put('/categories/:id/icon', authenticate, authorize('admin'), upload.single('icon'), async (req, res) => {
  try {
    if (!req.file) return apiResponse(res, 400, null, 'Icône requise');
    const existing = await db('categories').where('id', req.params.id).first();
    if (!existing) return apiResponse(res, 404, null, 'Catégorie non trouvée');
    if (existing.icon_url) await deleteFromCloudinary(existing.icon_url);
    const { url } = await uploadToCloudinary(req.file, 'categories/icons', COMPRESS_PRESETS.category);
    const [category] = await db('categories').where('id', req.params.id).update({ icon_url: url }).returning('*');
    return apiResponse(res, 200, category);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur upload icône catégorie');
  }
});

// ==========================================
// COMMISSIONS
// ==========================================
router.patch('/suppliers/:id/commission', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { commission_rate } = req.body;
    const [supplier] = await db('suppliers').where('id', req.params.id)
      .update({ commission_rate }).returning('*');
    return apiResponse(res, 200, supplier);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// ==========================================
// MONITORING TEMPS RÉEL
// ==========================================
router.get('/monitoring', authenticate, authorize('admin'), async (req, res) => {
  try {
    const activeOrders = await db('orders')
      .whereNotIn('status', ['delivered', 'cancelled', 'refunded'])
      .leftJoin('suppliers', 'orders.supplier_id', 'suppliers.id')
      .leftJoin('drivers', 'orders.driver_id', 'drivers.id')
      .leftJoin('users as client', 'orders.client_id', 'client.id')
      .leftJoin('users as driver_user', 'drivers.user_id', 'driver_user.id')
      .select(
        'orders.*',
        'suppliers.business_name',
        'client.full_name as client_name',
        'driver_user.full_name as driver_name',
        'drivers.current_lat as driver_lat',
        'drivers.current_lng as driver_lng'
      )
      .orderBy('orders.created_at', 'desc');

    const onlineDrivers = await db('drivers')
      .join('users', 'drivers.user_id', 'users.id')
      .select('drivers.*', 'users.full_name')
      .where('drivers.is_online', true);

    return apiResponse(res, 200, {
      active_orders: activeOrders,
      online_drivers: onlineDrivers,
    });
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

module.exports = router;
