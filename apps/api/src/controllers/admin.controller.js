const db = require('../database');
const { apiResponse, paginate } = require('../utils/helpers');

exports.getStats = async (req, res) => {
  const [userCount] = await db('users').count('id as count');
  const [driverCount] = await db('users').where('role', 'driver').count('id as count');
  const [supplierCount] = await db('suppliers').count('id as count');
  const [orderCount] = await db('orders').count('id as count');
  const [revenue] = await db('orders').where('status', 'delivered').sum('total_amount as total');
  const [commission] = await db('orders').where('status', 'delivered').sum('commission_amount as total');

  const dailyOrders = await db('orders')
    .select(db.raw("DATE(created_at) as date, COUNT(*) as count"))
    .where('created_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
    .groupByRaw('DATE(created_at)').orderBy('date');

  const dailyRevenue = await db('orders').where('status', 'delivered')
    .select(db.raw("DATE(created_at) as date, SUM(total_amount) as amount"))
    .where('created_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
    .groupByRaw('DATE(created_at)').orderBy('date');

  const recentOrders = await db('orders')
    .join('users', 'orders.client_id', 'users.id')
    .select('orders.*', 'users.full_name as client_name')
    .orderBy('orders.created_at', 'desc').limit(10);

  const [pending] = await db('orders').where('status', 'pending').count('id as count');
  const [active] = await db('orders').whereIn('status', ['accepted', 'preparing', 'ready', 'picked_up', 'delivering']).count('id as count');
  const [delivered] = await db('orders').where('status', 'delivered').count('id as count');
  const [cancelled] = await db('orders').where('status', 'cancelled').count('id as count');

  const topSuppliers = await db('orders')
    .join('suppliers', 'orders.supplier_id', 'suppliers.id')
    .where('orders.status', 'delivered')
    .select('suppliers.business_name as name')
    .count('orders.id as orders_count')
    .sum('orders.total_amount as revenue')
    .groupBy('suppliers.id', 'suppliers.business_name')
    .orderBy('revenue', 'desc').limit(5);

  res.json(apiResponse({
    total_users: +userCount.count, total_drivers: +driverCount.count,
    total_suppliers: +supplierCount.count, total_orders: +orderCount.count,
    total_revenue: +revenue.total || 0, total_commission: +commission.total || 0,
    daily_orders: dailyOrders, daily_revenue: dailyRevenue,
    recent_orders: recentOrders, top_suppliers: topSuppliers,
    pending_orders: +pending.count, active_orders: +active.count,
    delivered_orders: +delivered.count, cancelled_orders: +cancelled.count,
  }));
};

exports.getUsers = async (req, res) => {
  const { search, role, page = 1, limit = 20 } = req.query;
  let query = db('users').select('*');
  if (role) query = query.where('role', role);
  if (search) query = query.where(function () {
    this.where('full_name', 'ilike', `%${search}%`).orWhere('phone', 'ilike', `%${search}%`);
  });
  const total = await query.clone().count('id as count').first();
  const users = await query.orderBy('created_at', 'desc').limit(limit).offset((page - 1) * limit);
  res.json(apiResponse({ users, total: +total.count, page: +page }));
};

exports.toggleUserStatus = async (req, res) => {
  const user = await db('users').where('id', req.params.id).first();
  if (!user) return res.status(404).json(apiResponse(null, false, 'Utilisateur introuvable'));
  await db('users').where('id', req.params.id).update({ is_active: !user.is_active });
  res.json(apiResponse({ is_active: !user.is_active }));
};

exports.validateDriver = async (req, res) => {
  const { approved } = req.body;
  const driver = await db('drivers').where('user_id', req.params.id).first();
  if (!driver) return res.status(404).json(apiResponse(null, false, 'Livreur introuvable'));
  const status = approved ? 'approved' : 'rejected';
  await db('drivers').where('user_id', req.params.id).update({ verification_status: status });
  if (approved) await db('users').where('id', req.params.id).update({ is_active: true });
  await db('notifications').insert({
    user_id: req.params.id, title: approved ? 'Compte validé' : 'Compte refusé',
    message: approved ? 'Votre compte livreur a été approuvé. Vous pouvez commencer à livrer !' : 'Votre candidature de livreur a été refusée.',
    type: 'system',
  });
  res.json(apiResponse({ verification_status: status }));
};

exports.validateSupplier = async (req, res) => {
  const { approved } = req.body;
  const supplier = await db('suppliers').where('user_id', req.params.id).first();
  if (!supplier) return res.status(404).json(apiResponse(null, false, 'Fournisseur introuvable'));
  const status = approved ? 'approved' : 'rejected';
  await db('suppliers').where('user_id', req.params.id).update({ verification_status: status });
  if (approved) await db('users').where('id', req.params.id).update({ is_active: true });
  await db('notifications').insert({
    user_id: req.params.id, title: approved ? 'Commerce validé' : 'Commerce refusé',
    message: approved ? 'Votre commerce a été approuvé sur Mbiyo !' : 'Votre demande d\'inscription a été refusée.',
    type: 'system',
  });
  res.json(apiResponse({ verification_status: status }));
};

exports.getOrders = async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  let query = db('orders')
    .leftJoin('users', 'orders.client_id', 'users.id')
    .leftJoin('suppliers', 'orders.supplier_id', 'suppliers.id')
    .select('orders.*', 'users.full_name as client_name', 'suppliers.business_name as supplier_name');
  if (status) query = query.where('orders.status', status);
  if (search) query = query.where('orders.order_number', 'ilike', `%${search}%`);
  const orders = await query.orderBy('orders.created_at', 'desc').limit(limit).offset((page - 1) * limit);
  res.json(apiResponse({ orders }));
};

exports.createDeliveryZone = async (req, res) => {
  const [zone] = await db('delivery_zones').insert(req.body).returning('*');
  res.status(201).json(apiResponse(zone));
};

exports.updateDeliveryZone = async (req, res) => {
  const [zone] = await db('delivery_zones').where('id', req.params.id).update(req.body).returning('*');
  if (!zone) return res.status(404).json(apiResponse(null, false, 'Zone introuvable'));
  res.json(apiResponse(zone));
};

exports.deleteDeliveryZone = async (req, res) => {
  await db('delivery_zones').where('id', req.params.id).del();
  res.json(apiResponse(null, true, 'Zone supprimée'));
};
