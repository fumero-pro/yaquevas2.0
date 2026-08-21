'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateCommission } = require('../src/lib/commission');

test('comisión por defecto es 10% remitente + 10% viajero = 20% total', async () => {
  const c = calculateCommission(100);
  assert.equal(c.sender_fee, 10);
  assert.equal(c.traveler_fee, 10);
  assert.equal(c.sender_total, 110);
  assert.equal(c.traveler_net, 90);
  assert.equal(c.platform_commission, 20);
});

test('respeta porcentajes configurables distintos del 10/10 por defecto', async () => {
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
