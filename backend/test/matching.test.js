'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDb } = require('./helpers/testDb');
const { matchScore, findMatchesForShipment } = require('../src/lib/matching');

function insertUser(db, id) {
  db.prepare(
    `INSERT INTO users (id, name, surname, email, password_hash, password_salt, created_at)
     VALUES (?, 'Test', 'User', ?, 'x', 'x', datetime('now'))`
  ).run(id, `${id}@test.local`);
}

function insertTrip(db, overrides = {}) {
  const trip = {
    id: 'trip_1', user_id: 'usr_1', origin_island: 'Tenerife', origin_place: 'Santa Cruz',
    destination_island: 'Gran Canaria', destination_place: 'Las Palmas', trip_date: '2026-09-01',
    transport_mode: 'avion', capacity_json: JSON.stringify({ maletas_grandes: 2, maletas_pequenas: 2, sobres: 5, cajas_medianas: 2, kg: 30 }),
    used_json: JSON.stringify({ maletas_grandes: 0, maletas_pequenas: 0, sobres: 0, cajas_medianas: 0, kg: 0 }),
    accepts_fragile: 1, accepts_detours: 1, status: 'publicado', ...overrides,
  };
  db.prepare(
    `INSERT INTO trips (id, user_id, origin_island, origin_place, destination_island, destination_place, trip_date,
      transport_mode, capacity_json, used_json, accepts_fragile, accepts_detours, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(trip.id, trip.user_id, trip.origin_island, trip.origin_place, trip.destination_island, trip.destination_place,
    trip.trip_date, trip.transport_mode, trip.capacity_json, trip.used_json, trip.accepts_fragile, trip.accepts_detours, trip.status);
  return trip;
}

function insertShipment(db, overrides = {}) {
  const s = {
    id: 'ship_1', sender_id: 'usr_2', recipient_name: 'Ana', origin_island: 'Tenerife', origin_place: 'Santa Cruz',
    destination_island: 'Gran Canaria', destination_place: 'Las Palmas', desired_date: '2026-09-01',
    category: 'permitido', weight_kg: 3, fragile: 0, status: 'publicado', ...overrides,
  };
  db.prepare(
    `INSERT INTO shipments (id, sender_id, recipient_name, origin_island, origin_place, destination_island,
      destination_place, desired_date, category, weight_kg, fragile, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).run(s.id, s.sender_id, s.recipient_name, s.origin_island, s.origin_place, s.destination_island,
    s.destination_place, s.desired_date, s.category, s.weight_kg, s.fragile, s.status);
  return s;
}

function seedUsers(db) {
  insertUser(db, 'usr_1');
  insertUser(db, 'usr_2');
}

test('matchScore devuelve null si la ruta no coincide', () => {
  const db = createTestDb();
  seedUsers(db);
  const trip = insertTrip(db);
  const shipment = insertShipment(db, { destination_island: 'La Palma' });
  assert.equal(matchScore(shipment, trip, []), null);
});

test('matchScore devuelve null si el contenido es frágil y el viaje no lo acepta', () => {
  const db = createTestDb();
  seedUsers(db);
  const trip = insertTrip(db, { accepts_fragile: 0 });
  const shipment = insertShipment(db, { fragile: 1 });
  assert.equal(matchScore(shipment, trip, []), null);
});

test('matchScore puntúa más alto cuando coinciden fecha y localidad exactas', () => {
  const db = createTestDb();
  seedUsers(db);
  const tripExact = insertTrip(db, { id: 'trip_exact' });
  const tripDiff = insertTrip(db, { id: 'trip_diff', origin_place: 'Otro sitio', trip_date: '2026-09-10' });
  const shipment = insertShipment(db);
  const exact = matchScore(shipment, tripExact, []);
  const diff = matchScore(shipment, tripDiff, []);
  assert.ok(exact.score > diff.score);
});

test('findMatchesForShipment encuentra un viaje compatible en Cuba igual que en Canarias', () => {
  const db = createTestDb();
  seedUsers(db);
  insertTrip(db, { id: 'trip_cuba', origin_island: 'Tenerife', destination_island: 'La Habana' });
  const shipment = insertShipment(db, { id: 'ship_cuba', origin_island: 'Tenerife', destination_island: 'La Habana' });
  const matches = findMatchesForShipment(db, shipment, []);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].trip.destination_island, 'La Habana');
});
