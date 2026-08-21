'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDb } = require('./helpers/testDb');
const { getVisibleRatingSummary } = require('../src/lib/trust');

async function insertUser(db, id) {
  await db.prepare(
    `INSERT INTO users (id, name, surname, email, password_hash, password_salt, created_at)
     VALUES (?, 'Test', 'User', ?, 'x', 'x', datetime('now'))`
  ).run(id, `${id}@test.local`);
}

async function insertDeliveredBooking(db, { id, deliveredAt }) {
  // bookings.shipment_id / trip_id son FK reales: hace falta una fila mínima válida en cada
  // tabla, aunque el test solo le interese la reseña.
  await db.prepare(
    `INSERT INTO trips (id, user_id, origin_island, origin_place, destination_island, destination_place,
      trip_date, transport_mode, capacity_json, used_json, status, created_at)
     VALUES (?, 'usr_traveler', 'Tenerife', '', 'Gran Canaria', '', '2026-01-01', 'avion', '{}', '{}', 'finalizado', datetime('now'))`
  ).run(`trip_${id}`);
  await db.prepare(
    `INSERT INTO shipments (id, sender_id, recipient_name, origin_island, origin_place, destination_island,
      destination_place, desired_date, category, weight_kg, status, created_at)
     VALUES (?, 'usr_sender', 'Test', 'Tenerife', '', 'Gran Canaria', '', '2026-01-01', 'permitido', 1, 'entregado', datetime('now'))`
  ).run(`ship_${id}`);
  await db.prepare(
    `INSERT INTO bookings (id, shipment_id, trip_id, sender_id, traveler_id, base_price,
      sender_commission_pct, traveler_commission_pct, sender_total, traveler_net, platform_commission,
      status, delivered_at, created_at)
     VALUES (?, ?, ?, 'usr_sender', 'usr_traveler', 10, 6, 6, 10.6, 9.4, 1.2, 'entregado', ?, datetime('now'))`
  ).run(id, `ship_${id}`, `trip_${id}`, deliveredAt);
}

async function insertReview(db, { bookingId, reviewerId, revieweeId, rating }) {
  await db.prepare(
    'INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))'
  ).run(`rev_${reviewerId}_${bookingId}`, bookingId, reviewerId, revieweeId, rating, '');
}

test('una reseña sola (sin la del otro lado) no cuenta todavía si la entrega es reciente', async () => {
  const db = await createTestDb();
  await insertUser(db, 'usr_sender'); await insertUser(db, 'usr_traveler');
  await insertDeliveredBooking(db, { id: 'book_1', deliveredAt: new Date().toISOString() });
  await insertReview(db, { bookingId: 'book_1', reviewerId: 'usr_sender', revieweeId: 'usr_traveler', rating: 2 });

  const summary = await getVisibleRatingSummary(db, 'usr_traveler');
  assert.equal(summary.rating_count, 0);
  assert.equal(summary.rating_avg, null);
});

test('cuando ambas partes han reseñado, las dos reseñas se vuelven visibles', async () => {
  const db = await createTestDb();
  await insertUser(db, 'usr_sender'); await insertUser(db, 'usr_traveler');
  await insertDeliveredBooking(db, { id: 'book_2', deliveredAt: new Date().toISOString() });
  await insertReview(db, { bookingId: 'book_2', reviewerId: 'usr_sender', revieweeId: 'usr_traveler', rating: 4 });
  await insertReview(db, { bookingId: 'book_2', reviewerId: 'usr_traveler', revieweeId: 'usr_sender', rating: 5 });

  const travelerSummary = await getVisibleRatingSummary(db, 'usr_traveler');
  const senderSummary = await getVisibleRatingSummary(db, 'usr_sender');
  assert.equal(travelerSummary.rating_count, 1);
  assert.equal(travelerSummary.rating_avg, 4);
  assert.equal(senderSummary.rating_count, 1);
  assert.equal(senderSummary.rating_avg, 5);
});

test('una reseña sola se vuelve visible pasados 14 días desde la entrega, aunque el otro lado nunca reseñe', async () => {
  const db = await createTestDb();
  await insertUser(db, 'usr_sender'); await insertUser(db, 'usr_traveler');
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  await insertDeliveredBooking(db, { id: 'book_3', deliveredAt: fifteenDaysAgo });
  await insertReview(db, { bookingId: 'book_3', reviewerId: 'usr_sender', revieweeId: 'usr_traveler', rating: 3 });

  const summary = await getVisibleRatingSummary(db, 'usr_traveler');
  assert.equal(summary.rating_count, 1);
  assert.equal(summary.rating_avg, 3);
});

test('exactamente en el límite de 13 días todavía no es visible sin la reseña del otro lado', async () => {
  const db = await createTestDb();
  await insertUser(db, 'usr_sender'); await insertUser(db, 'usr_traveler');
  const thirteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString();
  await insertDeliveredBooking(db, { id: 'book_4', deliveredAt: thirteenDaysAgo });
  await insertReview(db, { bookingId: 'book_4', reviewerId: 'usr_sender', revieweeId: 'usr_traveler', rating: 1 });

  const summary = await getVisibleRatingSummary(db, 'usr_traveler');
  assert.equal(summary.rating_count, 0);
});
