const db = require('../database');
const { apiResponse } = require('../utils/helpers');

exports.createTicket = async (req, res) => {
  const { subject, message, order_id } = req.body;
  const [ticket] = await db('support_tickets').insert({
    user_id: req.user.id, subject, message, order_id: order_id || null, status: 'open',
  }).returning('*');
  res.status(201).json(apiResponse(ticket));
};

exports.getMyTickets = async (req, res) => {
  const tickets = await db('support_tickets').where('user_id', req.user.id).orderBy('created_at', 'desc');
  res.json(apiResponse(tickets));
};

exports.getTicket = async (req, res) => {
  const ticket = await db('support_tickets').where('id', req.params.id).first();
  if (!ticket) return res.status(404).json(apiResponse(null, false, 'Ticket introuvable'));
  const messages = await db('support_messages').where('ticket_id', req.params.id).orderBy('created_at', 'asc');
  res.json(apiResponse({ ...ticket, messages }));
};

exports.addMessage = async (req, res) => {
  const { message } = req.body;
  const isAdmin = req.user.role === 'admin';
  const [msg] = await db('support_messages').insert({
    ticket_id: req.params.id, user_id: req.user.id, message, is_admin: isAdmin,
  }).returning('*');
  if (isAdmin) await db('support_tickets').where('id', req.params.id).update({ status: 'in_progress' });
  res.status(201).json(apiResponse(msg));
};

exports.getAdminTickets = async (req, res) => {
  const { status } = req.query;
  let query = db('support_tickets')
    .leftJoin('users', 'support_tickets.user_id', 'users.id')
    .select('support_tickets.*', 'users.full_name as user_name');
  if (status) query = query.where('support_tickets.status', status);
  const tickets = await query.orderBy('support_tickets.created_at', 'desc');
  res.json(apiResponse(tickets));
};

exports.updateTicketStatus = async (req, res) => {
  const { status } = req.body;
  const [ticket] = await db('support_tickets').where('id', req.params.id).update({ status }).returning('*');
  res.json(apiResponse(ticket));
};
