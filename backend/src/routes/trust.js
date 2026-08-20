'use strict';
const { requireAuth } = require('../middleware/auth');
const { newId } = require('../lib/auth');
const { getVisibleRatingSummary } = require('../lib/trust');

const TERMINAL_STATUSES = ['entregado', 'pago_liberado', 'finalizado'];

function register(router, db) {
  // Perfil público de confianza: lo que se muestra de la otra parte en una operación.
  router.get('/api/users/:id/trust', async (req, res, body, params) => {
    const user = db.prepare('SELECT id, name, identity_verified, created_at FROM users WHERE id = ?').get(params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const { rating_avg, rating_count } = getVisibleRatingSummary(db, params.id);
    const opsCount = db.prepare(
      `SELECT COUNT(*) c FROM bookings WHERE (sender_id = ? OR traveler_id = ?) AND status IN ('entregado','pago_liberado','finalizado')`
    ).get(params.id, params.id).c;

    res.json({
      id: user.id,
      name: user.name,
      identity_verified: !!user.identity_verified,
      rating_avg,
      rating_count,
      completed_operations: opsCount,
      member_since: user.created_at,
    });
  });

  router.post('/api/bookings/:id/review', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) {
      return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    }
    if (!TERMINAL_STATUSES.includes(booking.status)) {
      return res.status(400).json({ error: 'Solo se puede valorar una operación ya entregada.' });
    }
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La valoración debe ser un número entero de 1 a 5.' });
    }
    const revieweeId = booking.sender_id === user.id ? booking.traveler_id : booking.sender_id;
    const existing = db.prepare('SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?').get(booking.id, user.id);
    if (existing) return res.status(400).json({ error: 'Ya has valorado esta operación.' });

    const id = newId('rev');
    db.prepare(
      'INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, booking.id, user.id, revieweeId, rating, (body.comment || '').trim(), new Date().toISOString());

    res.status(201).json({ ok: true });
  });

  router.get('/api/bookings/:id/review-status', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) {
      return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    }
    const existing = db.prepare('SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?').get(booking.id, user.id);
    res.json({ already_reviewed: !!existing });
  });
}

module.exports = { register };
