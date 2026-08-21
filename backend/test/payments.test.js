'use strict';
// Lo único verificable sin credenciales reales de Stripe: que sin STRIPE_SECRET_KEY todo el
// sistema se comporta exactamente en modo simulado (nunca intenta llamar a la API real), y que
// un webhook sin firma válida se rechaza siempre. Los flujos que sí llaman a Stripe de verdad
// (createCheckoutSession, createVerificationSession con clave real) no se pueden probar en este
// entorno — ver el aviso en lib/payments.js y lib/identity.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('isPaymentsConfigured es false sin STRIPE_SECRET_KEY', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  delete require.cache[require.resolve('../src/lib/payments')];
  const { isPaymentsConfigured } = require('../src/lib/payments');
  assert.equal(isPaymentsConfigured(), false);
});

test('createCheckoutSession lanza un error claro si Stripe no está configurado', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  delete require.cache[require.resolve('../src/lib/payments')];
  const { createCheckoutSession } = require('../src/lib/payments');
  await assert.rejects(
    () => createCheckoutSession({ id: 'book_1', sender_total: 10 }, { successUrl: 'https://x', cancelUrl: 'https://x' }),
    /Stripe no está configurado/
  );
});

test('createRefund lanza un error claro si Stripe no está configurado', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  delete require.cache[require.resolve('../src/lib/payments')];
  const { createRefund } = require('../src/lib/payments');
  await assert.rejects(() => createRefund('pi_fake'), /Stripe no está configurado/);
});

test('verifyWebhookSignature devuelve null sin STRIPE_WEBHOOK_SECRET (aunque haya body)', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete require.cache[require.resolve('../src/lib/payments')];
  const { verifyWebhookSignature } = require('../src/lib/payments');
  assert.equal(verifyWebhookSignature(Buffer.from('{}'), 'fake-signature'), null);
});

test('isIdentityConfigured es false sin STRIPE_SECRET_KEY', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  delete require.cache[require.resolve('../src/lib/payments')];
  delete require.cache[require.resolve('../src/lib/identity')];
  const { isIdentityConfigured } = require('../src/lib/identity');
  assert.equal(isIdentityConfigured(), false);
});
