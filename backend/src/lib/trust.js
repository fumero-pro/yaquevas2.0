'use strict';
// Reseñas "doble-ciego" (como Airbnb, ver docs/BENCHMARK_COMPETENCIA.md): una reseña solo
// cuenta para la valoración pública de alguien cuando la otra parte de esa operación también
// ha reseñado, o cuando han pasado 14 días desde la entrega — lo que ocurra antes. Evita que
// quien ve primero la reseña que le han puesto la use para decidir qué poner él, y evita la
// presión de que la valoración pública de alguien cambie antes de que haya podido contar su
// propia versión.
const VISIBILITY_WINDOW_DAYS = 14;

function getVisibleRatingSummary(db, userId) {
  const row = db.prepare(
    `SELECT AVG(r.rating) avg, COUNT(*) c
     FROM reviews r
     JOIN bookings b ON b.id = r.booking_id
     WHERE r.reviewee_id = ?
       AND (
         b.delivered_at IS NULL
         OR julianday('now') - julianday(b.delivered_at) >= ?
         OR EXISTS (SELECT 1 FROM reviews r2 WHERE r2.booking_id = r.booking_id AND r2.reviewer_id != r.reviewer_id)
       )`
  ).get(userId, VISIBILITY_WINDOW_DAYS);
  return {
    rating_avg: row.c > 0 ? Math.round(row.avg * 10) / 10 : null,
    rating_count: row.c,
  };
}

module.exports = { getVisibleRatingSummary, VISIBILITY_WINDOW_DAYS };
