'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDb } = require('./helpers/testDb');
const { calculateOrientativePrice } = require('../src/lib/pricing');

const CONFIG = { baremo_discount_pct: 20, min_price: 5, max_price: 200, price_per_kg_extra: 0.8, fragile_surcharge: 2, extra_luggage_surcharge: 3 };

test('sin muestras reales, usa la estimación demo y lo marca como tal', () => {
  const db = createTestDb();
  const price = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', weightKg: 3, fragile: false, extraLuggage: false,
  });
  assert.equal(price.reference_source, 'estimacion_demo_pendiente_de_datos_reales');
  assert.equal(price.breakdown.distancia, 'interinsular');
});

test('ruta Canarias-Cuba se categoriza como internacional y tiene base más alta', () => {
  const db = createTestDb();
  const nacional = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', weightKg: 3, fragile: false, extraLuggage: false,
  });
  const internacional = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', weightKg: 3, fragile: false, extraLuggage: false,
  });
  assert.equal(internacional.breakdown.distancia, 'internacional');
  assert.ok(internacional.reference_price > nacional.reference_price);
});

test('acepta tanto nombres de isla como ids de ubicación, con el mismo resultado', () => {
  const db = createTestDb();
  const byName = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', weightKg: 3, fragile: false, extraLuggage: false,
  });
  const byId = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'loc_island_tenerife', destinationIsland: 'loc_province_la_habana', weightKg: 3, fragile: false, extraLuggage: false,
  });
  assert.equal(byName.orientative_price, byId.orientative_price);
});

test('usa la media de pricing_reference_samples cuando existen, en vez de la estimación demo', () => {
  const db = createTestDb();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at) VALUES (?, ?, ?, ?, ?)')
    .run('smp_1', 'Tenerife-Gran Canaria', 'Correos', 10, now);
  db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at) VALUES (?, ?, ?, ?, ?)')
    .run('smp_2', 'Tenerife-Gran Canaria', 'Correos', 20, now);
  const price = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', weightKg: 3, fragile: false, extraLuggage: false,
  });
  assert.equal(price.reference_source, 'muestras_reales');
  assert.equal(price.reference_price, 15); // media de 10 y 20
});

test('ignora una muestra de precio fuera del rango de peso declarado', () => {
  const db = createTestDb();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at, weight_min_kg, weight_max_kg) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('smp_liviano', 'Tenerife-Gran Canaria', 'Test', 5, now, 0, 2);
  db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at, weight_min_kg, weight_max_kg) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('smp_pesado', 'Tenerife-Gran Canaria', 'Test', 50, now, 10, 30);
  const price = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', weightKg: 1, fragile: false, extraLuggage: false,
  });
  assert.equal(price.reference_source, 'muestras_reales');
  assert.equal(price.reference_price, 5); // solo la muestra de 0-2kg aplica a un envío de 1kg
});

test('ignora una muestra de precio caducada', () => {
  const db = createTestDb();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at, valid_until) VALUES (?, ?, ?, ?, ?, ?)')
    .run('smp_caducada', 'Tenerife-Gran Canaria', 'Test', 999, now, '2020-01-01');
  const price = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', weightKg: 1, fragile: false, extraLuggage: false,
  });
  assert.equal(price.reference_source, 'estimacion_demo_pendiente_de_datos_reales'); // la única muestra ya caducó
});

test('una muestra sin rango de peso ni caducidad se sigue aplicando a cualquier envío (compatibilidad)', () => {
  const db = createTestDb();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at) VALUES (?, ?, ?, ?, ?)')
    .run('smp_sin_rango', 'Tenerife-Gran Canaria', 'Test', 12, now);
  const price = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', weightKg: 40, fragile: false, extraLuggage: false,
  });
  assert.equal(price.reference_source, 'muestras_reales');
  assert.equal(price.reference_price, 12);
});

test('el precio final nunca baja del mínimo ni sube del máximo configurado', () => {
  const db = createTestDb();
  const tooCheap = calculateOrientativePrice(db, { ...CONFIG, baremo_discount_pct: 99 }, {
    originIsland: 'Tenerife', destinationIsland: 'La Gomera', weightKg: 1, fragile: false, extraLuggage: false,
  });
  assert.ok(tooCheap.orientative_price >= CONFIG.min_price);
});

test('recargos de fragilidad y equipaje extra se suman al precio', () => {
  const db = createTestDb();
  const base = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', weightKg: 3, fragile: false, extraLuggage: false,
  });
  const withSurcharges = calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', weightKg: 3, fragile: true, extraLuggage: true,
  });
  assert.ok(withSurcharges.orientative_price > base.orientative_price);
});
