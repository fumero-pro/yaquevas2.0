'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { itemsToUsage, capacityStatus, fitsInTrip, emptyUsage, addUsage } = require('../src/lib/tetris');

test('itemsToUsage suma bultos por tipo y estima kg', () => {
  const usage = itemsToUsage([
    { item_type: 'maleta_grande', quantity: 1 },
    { item_type: 'sobre', quantity: 2 },
  ]);
  assert.equal(usage.maletas_grandes, 1);
  assert.equal(usage.sobres, 2);
  assert.equal(usage.kg, 18.6); // 18 (maleta grande) + 2*0.3 (sobres)
});

test('itemsToUsage ignora tipos de bulto desconocidos sin lanzar', () => {
  const usage = itemsToUsage([{ item_type: 'inventado', quantity: 5 }]);
  assert.deepEqual(usage, emptyUsage());
});

test('fitsInTrip: cabe cuando hay espacio y peso suficiente', () => {
  const capacity = { maletas_grandes: 1, maletas_pequenas: 0, sobres: 0, cajas_medianas: 0, kg: 20 };
  const used = emptyUsage();
  const result = fitsInTrip(capacity, used, [{ item_type: 'maleta_grande', quantity: 1 }]);
  assert.equal(result.fits, true);
});

test('fitsInTrip: no cabe si excede el peso aunque el volumen quepa', () => {
  const capacity = { maletas_grandes: 2, maletas_pequenas: 0, sobres: 0, cajas_medianas: 0, kg: 5 };
  const used = emptyUsage();
  const result = fitsInTrip(capacity, used, [{ item_type: 'maleta_grande', quantity: 1 }]); // 18kg > 5kg
  assert.equal(result.fits, false);
  assert.equal(result.fitsWeight, false);
});

test('capacityStatus calcula porcentajes y sugerencias sin capacidad configurada', () => {
  const status = capacityStatus({ maletas_grandes: 0, maletas_pequenas: 0, sobres: 0, cajas_medianas: 0, kg: 0 }, emptyUsage());
  assert.equal(status.capacity_total_l, 0);
  assert.equal(status.space_used_pct, 0);
  assert.deepEqual(status.suggestions, []);
});

test('addUsage no muta los objetos originales', () => {
  const a = emptyUsage();
  const b = { ...emptyUsage(), sobres: 3, kg: 1 };
  const sum = addUsage(a, b);
  assert.equal(sum.sobres, 3);
  assert.equal(a.sobres, 0); // el original no cambia
});
