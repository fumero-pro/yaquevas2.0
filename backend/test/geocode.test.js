'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { haversineKm } = require('../src/lib/geocode');

test('haversineKm devuelve 0 para el mismo punto', () => {
  assert.equal(haversineKm(28.46, -16.25, 28.46, -16.25), 0);
});

test('haversineKm: distancia real Santa Cruz de Tenerife - Los Cristianos ronda los 75km', () => {
  const km = haversineKm(28.4682, -16.2546, 28.0525, -16.7196);
  assert.ok(km > 60 && km < 90, `esperaba ~75km, dio ${km}`);
});

test('haversineKm es simétrica (A->B == B->A)', () => {
  const ab = haversineKm(28.46, -16.25, 28.10, -15.41);
  const ba = haversineKm(28.10, -15.41, 28.46, -16.25);
  assert.equal(ab, ba);
});
