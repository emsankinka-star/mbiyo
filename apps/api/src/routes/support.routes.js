const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { db } = require('../database');
const { apiResponse } = require('../utils/helpers');

// Créer un ticket
router.post('/', authenticate, async (req, res) => {
  try {
    const { subject, description, order_id, priority } = req.body;
    const [ticket] = await db('support_tickets').insert({
      user_id: req.user.id,
      order_id,
      subject,
      description,
      priority: priority || 'medium',
    }).returning('*');
    return apiResponse(res, 201, ticket, 'Ticket créé');
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// Mes tickets
router.get('/my', authenticate, async (req, res) => {
  try {
    const tickets = await db('support_tickets')
      .where('user_id', req.user.id)
      .orderBy('created_at', 'desc');
    return apiResponse(res, 200, tickets);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// Détail d'un ticket + messages
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await db('support_tickets').where('id', req.params.id).first();
    if (!ticket) return apiResponse(res, 404, null, 'Ticket non trouvé');

    ticket.messages = await db('support_messages')
      .join('users', 'support_messages.sender_id', 'users.id')
      .select('support_messages.*', 'users.full_name as sender_name', 'users.role as sender_role')
      .where('ticket_id', ticket.id)
      .orderBy('created_at', 'asc');

    return apiResponse(res, 200, ticket);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// Ajouter un message à un ticket
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    const [msg] = await db('support_messages').insert({
      ticket_id: req.params.id,
      sender_id: req.user.id,
      message,
    }).returning('*');
    return apiResponse(res, 201, msg);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// Admin: liste tous les tickets
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = db('support_tickets')
      .join('users', 'support_tickets.user_id', 'users.id')
      .select('support_tickets.*', 'users.full_name', 'users.phone');

    if (status) query = query.where('support_tickets.status', status);
    if (priority) query = query.where('support_tickets.priority', priority);

    const tickets = await query.orderBy('support_tickets.created_at', 'desc');
    return apiResponse(res, 200, tickets);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

// Admin: mettre à jour un ticket
router.patch('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, assigned_to } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (assigned_to) updates.assigned_to = assigned_to;

    const [ticket] = await db('support_tickets').where('id', req.params.id)
      .update(updates).returning('*');
    return apiResponse(res, 200, ticket);
  } catch (error) {
    return apiResponse(res, 500, null, 'Erreur serveur');
  }
});

module.exports = router;
