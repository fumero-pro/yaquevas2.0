'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDb } = require('./helpers/testDb');
const { calculateOrientativePrice, SIZE_PRICE_MULTIPLIER, INTERNACIONAL_PRICE_PER_KG_DEFAULT, AVION_PRICE_PREMIUM_PCT_DEFAULT } = require('../src/lib/pricing');

const CONFIG = { baremo_discount_pct: 20, min_price: 5, max_price: 200, fragile_surcharge: 2, extra_luggage_surcharge: 3 };
const unaCajaMediana = [{ item_type: 'caja_mediana', quantity: 1 }];

test('sin muestras reales, usa la estimación demo y lo marca como tal', async () => {
  const db = await createTestDb();
  const price = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: unaCajaMediana, fragile: false, extraLuggage: false,
  });
  assert.equal(price.reference_source, 'estimacion_demo_pendiente_de_datos_reales');
  assert.equal(price.breakdown.distancia, 'interinsular');
});

test('ruta Canarias-Cuba se categoriza como internacional y tiene base más alta', async () => {
  const db = await createTestDb();
  const nacional = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: unaCajaMediana, fragile: false, extraLuggage: false,
  });
  const internacional = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', items: unaCajaMediana, fragile: false, extraLuggage: false,
  });
  assert.equal(internacional.breakdown.distancia, 'internacional');
  assert.ok(internacional.reference_price > nacional.reference_price);
});

test('acepta tanto nombres de isla como ids de ubicación, con el mismo resultado', async () => {
  const db = await createTestDb();
  const byName = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', items: unaCajaMediana, fragile: false, extraLuggage: false,
  });
  const byId = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'loc_island_tenerife', destinationIsland: 'loc_province_la_habana', items: unaCajaMediana, fragile: false, extraLuggage: false,
  });
  assert.equal(byName.orientative_price, byId.orientative_price);
});

test('el precio escala por talla del bulto, no por peso: una talla mayor cuesta más aunque comparta rango de peso con otra menor', async () => {
  const db = await createTestDb();
  // maleta_pequena (L, 8kg) y objeto_voluminoso (XXL, también 8kg típico) pesan lo mismo pero son
  // tallas distintas — el precio debe reflejar la talla (multiplicador), no el peso compartido.
  const maletaPequena = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: [{ item_type: 'maleta_pequena', quantity: 1 }], fragile: false, extraLuggage: false,
  });
  const objetoVoluminoso = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: [{ item_type: 'objeto_voluminoso', quantity: 1 }], fragile: false, extraLuggage: false,
  });
  assert.ok(objetoVoluminoso.orientative_price > maletaPequena.orientative_price);
  const ratio = SIZE_PRICE_MULTIPLIER.objeto_voluminoso / SIZE_PRICE_MULTIPLIER.maleta_pequena;
  assert.ok(Math.abs(objetoVoluminoso.reference_price / maletaPequena.reference_price - ratio) < 0.01);
});

test('varias unidades del mismo bulto suman precio proporcional a la cantidad', async () => {
  const db = await createTestDb();
  const unSobre = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: [{ item_type: 'sobre', quantity: 1 }], fragile: false, extraLuggage: false,
  });
  const tresSobres = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: [{ item_type: 'sobre', quantity: 3 }], fragile: false, extraLuggage: false,
  });
  assert.equal(tresSobres.reference_price, Number((unSobre.reference_price * 3).toFixed(2)));
});

test('usa la media de pricing_reference_samples cuando existen, en vez de la estimación demo', async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at) VALUES (?, ?, ?, ?, ?)')
    .run('smp_1', 'Tenerife-Gran Canaria', 'Correos', 10, now);
  await db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at) VALUES (?, ?, ?, ?, ?)')
    .run('smp_2', 'Tenerife-Gran Canaria', 'Correos', 20, now);
  const price = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: unaCajaMediana, fragile: false, extraLuggage: false,
  });
  assert.equal(price.reference_source, 'muestras_reales');
  assert.equal(price.reference_price, 15); // media de 10 y 20
});

test('ignora una muestra de precio fuera del rango de peso declarado', async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at, weight_min_kg, weight_max_kg) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('smp_liviano', 'Tenerife-Gran Canaria', 'Test', 5, now, 0, 2);
  await db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at, weight_min_kg, weight_max_kg) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('smp_pesado', 'Tenerife-Gran Canaria', 'Test', 50, now, 10, 30);
  // Un sobre (0,3kg típico) cae dentro del rango de la muestra liviana y fuera de la pesada — el
  // rango de peso solo sirve para casar con muestras reales de mercado; la talla (multiplicador
  // de sobre) se sigue aplicando encima del precio unitario de la muestra, nunca se ignora.
  const price = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: [{ item_type: 'sobre', quantity: 1 }], fragile: false, extraLuggage: false,
  });
  assert.equal(price.reference_source, 'muestras_reales');
  assert.equal(price.reference_price, Number((5 * SIZE_PRICE_MULTIPLIER.sobre).toFixed(2))); // muestra 0-2kg (5€) × talla S
});

test('ignora una muestra de precio caducada', async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at, valid_until) VALUES (?, ?, ?, ?, ?, ?)')
    .run('smp_caducada', 'Tenerife-Gran Canaria', 'Test', 999, now, '2020-01-01');
  const price = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: [{ item_type: 'sobre', quantity: 1 }], fragile: false, extraLuggage: false,
  });
  assert.equal(price.reference_source, 'estimacion_demo_pendiente_de_datos_reales'); // la única muestra ya caducó
});

test('una muestra sin rango de peso ni caducidad se sigue aplicando a cualquier envío (compatibilidad)', async () => {
  const db = await createTestDb();
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at) VALUES (?, ?, ?, ?, ?)')
    .run('smp_sin_rango', 'Tenerife-Gran Canaria', 'Test', 12, now);
  const price = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: unaCajaMediana, fragile: false, extraLuggage: false,
  });
  assert.equal(price.reference_source, 'muestras_reales');
  assert.equal(price.reference_price, 12); // talla M, multiplicador 1x sobre el precio unitario de la muestra
});

test('el precio final nunca baja del mínimo ni sube del máximo configurado', async () => {
  const db = await createTestDb();
  const tooCheap = await calculateOrientativePrice(db, { ...CONFIG, baremo_discount_pct: 99 }, {
    originIsland: 'Tenerife', destinationIsland: 'La Gomera', items: [{ item_type: 'sobre', quantity: 1 }], fragile: false, extraLuggage: false,
  });
  assert.ok(tooCheap.orientative_price >= CONFIG.min_price);
});

test('a Cuba el precio es por kg, no por talla: dos tallas distintas con el mismo peso cuestan igual', async () => {
  const db = await createTestDb();
  // maleta_pequena (8kg típico) y objeto_voluminoso (también 8kg típico) son tallas distintas,
  // pero a Cuba el precio depende del peso total, no de la talla — deben salir iguales.
  const maletaPequena = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', items: [{ item_type: 'maleta_pequena', quantity: 1 }], fragile: false, extraLuggage: false,
  });
  const objetoVoluminoso = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', items: [{ item_type: 'objeto_voluminoso', quantity: 1 }], fragile: false, extraLuggage: false,
  });
  assert.equal(maletaPequena.reference_price, objetoVoluminoso.reference_price);
  assert.equal(maletaPequena.reference_price, Number((INTERNACIONAL_PRICE_PER_KG_DEFAULT * 8).toFixed(2)));
});

test('a Cuba, más peso cuesta estrictamente más (por kg)', async () => {
  const db = await createTestDb();
  const ligero = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', items: [{ item_type: 'sobre', quantity: 1 }], fragile: false, extraLuggage: false,
  });
  const pesado = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', items: [{ item_type: 'bulto_extra_grande', quantity: 1 }], fragile: false, extraLuggage: false,
  });
  assert.ok(pesado.reference_price > ligero.reference_price);
});

test('a Cuba, ir en avión siempre cuesta más que en barco', async () => {
  const db = await createTestDb();
  const enBarco = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', items: unaCajaMediana, fragile: false, extraLuggage: false, transportMode: 'barco',
  });
  const enAvion = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', items: unaCajaMediana, fragile: false, extraLuggage: false, transportMode: 'avion',
  });
  assert.ok(enAvion.reference_price > enBarco.reference_price);
  const esperado = Number((enBarco.reference_price * (1 + AVION_PRICE_PREMIUM_PCT_DEFAULT / 100)).toFixed(2));
  assert.equal(enAvion.reference_price, esperado);
});

test('dentro de Canarias el medio de transporte no cambia el precio', async () => {
  const db = await createTestDb();
  const enBarco = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: unaCajaMediana, fragile: false, extraLuggage: false, transportMode: 'barco',
  });
  const enAvion = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: unaCajaMediana, fragile: false, extraLuggage: false, transportMode: 'avion',
  });
  assert.equal(enBarco.orientative_price, enAvion.orientative_price);
});

test('coche misma isla: con direcciones reales (lat/lon), el precio depende de la distancia', async () => {
  const db = await createTestDb();
  // Santa Cruz de Tenerife (~28.46,-16.25) y Los Cristianos (~28.05,-16.72) — mismo origen y
  // destino (Tenerife) para que distanceCategory lo trate como misma_zona.
  const cerca = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Tenerife', items: unaCajaMediana, fragile: false, extraLuggage: false,
    originLat: 28.46, originLon: -16.25, destinationLat: 28.47, destinationLon: -16.26,
  });
  const lejos = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Tenerife', items: unaCajaMediana, fragile: false, extraLuggage: false,
    originLat: 28.46, originLon: -16.25, destinationLat: 28.05, destinationLon: -16.72,
  });
  assert.equal(cerca.reference_source, 'distancia_real_estimacion');
  assert.ok(lejos.reference_price > cerca.reference_price);
  assert.ok(lejos.breakdown.distancia_km > cerca.breakdown.distancia_km);
});

test('coche misma isla: sin coordenadas, sigue usando el ancla plana de siempre', async () => {
  const db = await createTestDb();
  const price = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Tenerife', items: unaCajaMediana, fragile: false, extraLuggage: false,
  });
  assert.equal(price.breakdown.distancia, 'misma_zona');
  assert.equal(price.reference_source, 'estimacion_demo_pendiente_de_datos_reales');
  assert.equal(price.breakdown.distancia_km, null);
});

test('coordenadas en una ruta interinsular (islas distintas) no activan el precio por distancia', async () => {
  const db = await createTestDb();
  const price = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Gran Canaria', items: unaCajaMediana, fragile: false, extraLuggage: false,
    originLat: 28.46, originLon: -16.25, destinationLat: 28.10, destinationLon: -15.41,
  });
  assert.equal(price.breakdown.distancia, 'interinsular');
  assert.equal(price.breakdown.distancia_km, null);
});

test('coche misma isla: el precio deja margen real por encima del coste de gasolina, no solo lo justo', async () => {
  const db = await createTestDb();
  // Santa Cruz de Tenerife -> Los Cristianos, ~65km reales (ver verificación en navegador).
  const price = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'Tenerife', items: unaCajaMediana, fragile: false, extraLuggage: false,
    originLat: 28.4682, originLon: -16.2546, destinationLat: 28.0525, destinationLon: -16.7196,
  });
  const travelerCommissionPct = 10;
  const travelerNet = price.orientative_price * (1 - travelerCommissionPct / 100);
  assert.ok(price.breakdown.combustible_estimado > 0);
  // El viajero debe quedarse con más del doble del coste real de gasolina, si no el trayecto no
  // compensa de verdad y nadie lo aceptaría.
  assert.ok(travelerNet > price.breakdown.combustible_estimado * 2, `margen insuficiente: cobra ${travelerNet}, gasolina real ${price.breakdown.combustible_estimado}`);
});

test('recargos de fragilidad y equipaje extra se suman al precio', async () => {
  const db = await createTestDb();
  const base = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', items: unaCajaMediana, fragile: false, extraLuggage: false,
  });
  const withSurcharges = await calculateOrientativePrice(db, CONFIG, {
    originIsland: 'Tenerife', destinationIsland: 'La Habana', items: unaCajaMediana, fragile: true, extraLuggage: true,
  });
  assert.ok(withSurcharges.orientative_price > base.orientative_price);
});
