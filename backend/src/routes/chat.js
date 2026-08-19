'use strict';
const { requireAuth } = require('../middleware/auth');
const { newId } = require('../lib/auth');

const ACTION_TYPES = ['ubicacion', 'hora', 'ver_viaje', 'ver_envio'];

function notify(db, userId, type, title, bodyText, relatedId) {
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, related_type, related_id, created_at)
     VALUES (?, ?, ?, ?, ?, 'booking', ?, ?)`
  ).run(newId('notif'), userId, type, title, bodyText || '', relatedId || null, new Date().toISOString());
}

function serializeMessage(m) {
  return {
    id: m.id,
    booking_id: m.booking_id,
    sender_id: m.sender_id,
    body: m.body,
    action_type: m.action_type,
    read: !!m.read,
    created_at: m.created_at,
  };
}

function register(router, db) {
  router.get('/api/bookings/:id/messages', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación.' });
    }
    const rows = db.prepare('SELECT * FROM messages WHERE booking_id = ? ORDER BY created_at ASC').all(booking.id);
    db.prepare("UPDATE messages SET read = 1 WHERE booking_id = ? AND sender_id != ? AND read = 0")
      .run(booking.id, user.id);
    res.json({ messages: rows.map(serializeMessage) });
  });

  router.post('/api/bookings/:id/messages', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación.' });
    }
    const text = (body.body || '').trim();
    const actionType = body.action_type && ACTION_TYPES.includes(body.action_type) ? body.action_type : null;
    if (!text && !actionType) return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });

    const id = newId('msg');
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO messages (id, booking_id, sender_id, body, action_type, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, booking.id, user.id, text, actionType, now);

    const otherUserId = booking.sender_id === user.id ? booking.traveler_id : booking.sender_id;
    notify(db, otherUserId, 'mensaje', 'Nuevo mensaje', text || 'Te ha enviado una acción rápida.', booking.id);

    const saved = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    res.status(201).json({ message: serializeMessage(saved) });
  });
}

module.exports = { register };
