'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDb } = require('./helpers/testDb');
const { generateReferralCode, resolveReferrer, awardReferralIfEligible } = require('../src/lib/referral');

function insertUser(db, id, { referredBy = null } = {}) {
  db.prepare(
    `INSERT INTO users (id, name, surname, email, password_hash, password_salt, referral_code, referred_by, created_at)
     VALUES (?, 'Test', 'User', ?, 'x', 'x', ?, ?, datetime('now'))`
  ).run(id, `${id}@test.local`, `${id.toUpperCase()}_CODE`, referredBy);
}

function insertCompletedBooking(db, { id, senderId, travelerId }) {
  db.prepare(
    `INSERT INTO trips (id, user_id, origin_island, origin_place, destination_island, destination_place,
      trip_date, transport_mode, capacity_json, used_json, status, created_at)
     VALUES (?, ?, 'Tenerife', '', 'Gran Canaria', '', '2026-01-01', 'avion', '{}', '{}', 'finalizado', datetime('now'))`
  ).run(`trip_${id}`, travelerId);
  db.prepare(
    `INSERT INTO shipments (id, sender_id, recipient_name, origin_island, origin_place, destination_island,
      destination_place, desired_date, category, weight_kg, status, created_at)
     VALUES (?, ?, 'Test', 'Tenerife', '', 'Gran Canaria', '', '2026-01-01', 'permitido', 1, 'entregado', datetime('now'))`
  ).run(`ship_${id}`, senderId);
  db.prepare(
    `INSERT INTO bookings (id, shipment_id, trip_id, sender_id, traveler_id, base_price,
      sender_commission_pct, traveler_commission_pct, sender_total, traveler_net, platform_commission,
      status, delivered_at, created_at)
     VALUES (?, ?, ?, ?, ?, 10, 6, 6, 10.6, 9.4, 1.2, 'pago_liberado', datetime('now'), datetime('now'))`
  ).run(id, `ship_${id}`, `trip_${id}`, senderId, travelerId);
}

test('generateReferralCode produce códigos distintos y sin caracteres raros', () => {
  const a = generateReferralCode('María José Ñíguez');
  const b = generateReferralCode('María José Ñíguez');
  assert.match(a, /^[A-Z0-9]+$/);
  assert.notEqual(a, b); // sufijo aleatorio distinto cada vez
});

test('resolveReferrer encuentra al usuario por su código, sin distinguir mayúsculas/espacios', () => {
  const db = createTestDb();
  insertUser(db, 'usr_referrer'); // referral_code guardado: 'USR_REFERRER_CODE'
  const found = resolveReferrer(db, '  usr_referrer_code  ');
  assert.equal(found.id, 'usr_referrer');
});

test('resolveReferrer devuelve null si el código no existe', () => {
  const db = createTestDb();
  assert.equal(resolveReferrer(db, 'NOEXISTE'), null);
  assert.equal(resolveReferrer(db, ''), null);
  assert.equal(resolveReferrer(db, null), null);
});

test('la primera operación completada de un usuario referido paga a ambas partes', () => {
  const db = createTestDb();
  insertUser(db, 'usr_referrer');
  insertUser(db, 'usr_referred', { referredBy: 'usr_referrer' });
  insertUser(db, 'usr_other');
  insertCompletedBooking(db, { id: 'book_1', senderId: 'usr_referred', travelerId: 'usr_other' });

  const reward = awardReferralIfEligible(db, 'usr_referred', 'book_1');
  assert.ok(reward);
  assert.equal(reward.referrer.id, 'usr_referrer');
  assert.equal(reward.amount, 5); // valor por defecto de referral_reward_eur

  const row = db.prepare('SELECT * FROM referral_rewards WHERE referred_id = ?').get('usr_referred');
  assert.equal(row.referrer_id, 'usr_referrer');
  assert.equal(row.status, 'pagado');
});

test('no paga nada si el usuario no fue referido por nadie', () => {
  const db = createTestDb();
  insertUser(db, 'usr_solo');
  insertUser(db, 'usr_other');
  insertCompletedBooking(db, { id: 'book_2', senderId: 'usr_solo', travelerId: 'usr_other' });

  const reward = awardReferralIfEligible(db, 'usr_solo', 'book_2');
  assert.equal(reward, null);
});

test('no vuelve a pagar en la segunda operación completada del mismo referido', () => {
  const db = createTestDb();
  insertUser(db, 'usr_referrer');
  insertUser(db, 'usr_referred', { referredBy: 'usr_referrer' });
  insertUser(db, 'usr_other');

  // Igual que en producción: cada `deliver()` llama a awardReferralIfEligible justo cuando ESA
  // reserva pasa a completada, no con las dos ya existentes de golpe (si no, el recuento de
  // "primera operación" no refleja el orden real de los eventos).
  insertCompletedBooking(db, { id: 'book_3', senderId: 'usr_referred', travelerId: 'usr_other' });
  const first = awardReferralIfEligible(db, 'usr_referred', 'book_3');
  assert.ok(first);

  insertCompletedBooking(db, { id: 'book_4', senderId: 'usr_referred', travelerId: 'usr_other' });
  const second = awardReferralIfEligible(db, 'usr_referred', 'book_4');
  assert.equal(second, null);

  const count = db.prepare('SELECT COUNT(*) AS n FROM referral_rewards WHERE referred_id = ?').get('usr_referred').n;
  assert.equal(count, 1);
});
