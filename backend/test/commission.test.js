'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateCommission } = require('../src/lib/commission');

test('comisión por defecto es 6% remitente + 6% viajero = 12% total', async () => {
  const c = calculateCommission(100);
  assert.equal(c.sender_fee, 6);
  assert.equal(c.traveler_fee, 6);
  assert.equal(c.sender_total, 106);
  assert.equal(c.traveler_net, 94);
  assert.equal(c.platform_commission, 12);
});

test('respeta porcentajes configurables distintos del 6/6 por defecto', async () => {
  const c = calculateCommission(200, 10, 5);
  assert.equal(c.sender_total, 220); // 200 + 10%
  assert.equal(c.traveler_net, 190); // 200 - 5%
  assert.equal(c.platform_commission, 30);
});

test('redondea a 2 decimales de forma consistente', async () => {
  const c = calculateCommission(33.33, 6, 6);
  assert.equal(c.sender_fee, 2);
  assert.equal(c.sender_total, 35.33);
});
