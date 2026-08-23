'use strict';
const { requireAuth } = require('../middleware/auth');
const { newId } = require('../lib/auth');
const { getVisibleRatingSummary } = require('../lib/trust');

const TERMINAL_STATUSES = ['entregado', 'pago_liberado', 'finalizado'];

function register(router, db) {
  // Perfil público de confianza: lo que se muestra de la otra parte en una operación.
  router.get('/api/users/:id/trust', async (req, res, body, params) => {
    const user = await db.prepare('SELECT id, name, identity_verified, created_at FROM users WHERE id = ?').get(params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const { rating_avg, rating_count } = await getVisibleRatingSummary(db, params.id);
    const opsCount = (await db.prepare(
      `SELECT COUNT(*) c FROM bookings WHERE (sender_id = ? OR traveler_id = ?) AND status IN ('entregado','pago_liberado','finalizado')`
    ).get(params.id, params.id)).c;

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
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
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
    const existing = await db.prepare('SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?').get(booking.id, user.id);
    if (existing) return res.status(400).json({ error: 'Ya has valorado esta operación.' });

    const id = newId('rev');
    await db.prepare(
      'INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, booking.id, user.id, revieweeId, rating, (body.comment || '').trim(), new Date().toISOString());

    res.status(201).json({ ok: true });
  });

  // Reseñas destacadas para la home: solo texto real escrito por personas reales, nunca
  // inventado. Reutiliza la misma regla de visibilidad "doble-ciego" que el perfil de
  // confianza (ver lib/trust.js) — no se enseña una reseña antes de que sea pública ahí.
  // Si todavía no hay ninguna con comentario, el frontend simplemente no muestra la sección
  // en vez de rellenarla con testimonios de mentira.
  router.get('/api/reviews/featured', async (req, res, body, params, query) => {
    const limit = Math.min(Number(query?.limit) || 6, 12);
    const rows = await db.prepare(
      `SELECT r.rating, r.comment, r.created_at, u.name AS reviewer_name
       FROM reviews r
       JOIN bookings b ON b.id = r.booking_id
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.rating >= 4
         AND TRIM(r.comment) != ''
         AND (
           b.delivered_at IS NULL
           OR julianday('now') - julianday(b.delivered_at) >= 14
           OR EXISTS (SELECT 1 FROM reviews r2 WHERE r2.booking_id = r.booking_id AND r2.reviewer_id != r.reviewer_id)
         )
       ORDER BY r.created_at DESC
       LIMIT ?`
    ).all(limit);
    res.json({
      reviews: rows.map((r) => ({
        rating: r.rating,
        comment: r.comment,
        reviewer_first_name: (r.reviewer_name || '').split(' ')[0],
        created_at: r.created_at,
      })),
    });
  });

  router.get('/api/bookings/:id/review-status', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) {
      return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    }
    const existing = await db.prepare('SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?').get(booking.id, user.id);
    res.json({ already_reviewed: !!existing });
  });
}

module.exports = { register };
