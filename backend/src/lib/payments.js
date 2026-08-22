'use strict';
// Cobro real al remitente vía Stripe Checkout, en modo test (gratis, sin dinero real) hasta
// que se decida pasar a producción con claves live. Sin STRIPE_SECRET_KEY configurada, el
// resto del sistema sigue exactamente en modo simulado (ver routes/bookings.js) — este módulo
// nunca es obligatorio para que la demo funcione.
//
// IMPORTANTE (honestidad, no falsa confianza): este código sigue el contrato documentado por
// Stripe para Checkout Sessions y verificación de firma de webhooks, pero no se ha podido
// probar contra una cuenta Stripe real dentro de este entorno de trabajo (no hay forma de
// crear la cuenta ni obtener claves de prueba desde aquí — eso lo tiene que hacer el usuario).
// Antes de confiar en este flujo, pruébalo de verdad con tus propias claves de test.

let _stripe = null;
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    const Stripe = require('stripe');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

function isPaymentsConfigured() {
  return !!getStripeClient();
}

// Crea una sesión de Checkout por el importe total que paga el remitente (sender_total, en €).
// successUrl/cancelUrl deben apuntar de vuelta a la pantalla de la operación en YaQueVas.
async function createCheckoutSession(booking, { successUrl, cancelUrl }) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe no está configurado (falta STRIPE_SECRET_KEY).');
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: Math.round(booking.sender_total * 100), // Stripe trabaja en céntimos
        product_data: { name: `YaQueVas — envío ${booking.id}` },
      },
      quantity: 1,
    }],
    metadata: { booking_id: booking.id, kind: 'yaquevas_booking_payment' },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return { checkout_url: session.url, session_id: session.id };
}

// Verifica la firma del webhook y devuelve el evento ya parseado, o null si no es válido.
// rawBody debe ser el cuerpo SIN parsear (Buffer/string) — la firma se calcula sobre los bytes
// exactos que envía Stripe, un JSON.stringify(JSON.parse(...)) ya no coincide.
function verifyWebhookSignature(rawBody, signatureHeader) {
  const stripe = getStripeClient();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return null;
  try {
    return stripe.webhooks.constructEvent(rawBody, signatureHeader, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return null;
  }
}

// Stripe Connect (cuentas Express) para pagar de verdad al viajero — patrón "separate charges
// and transfers": el cobro del remitente ya entra en la cuenta de la plataforma vía Checkout
// (arriba), y en la entrega se transfiere la parte del viajero a su cuenta conectada. La
// plataforma se queda con la diferencia (la comisión) sin necesidad de un segundo cobro.
// Requiere una cuenta Express por viajero (KYC bancario lo gestiona Stripe, no nosotros).
async function createConnectAccount(user) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe no está configurado (falta STRIPE_SECRET_KEY).');
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'ES',
    email: user.email,
    capabilities: { transfers: { requested: true } },
    business_type: 'individual',
    metadata: { user_id: user.id },
  });
  return account.id;
}

// URL alojada por Stripe donde el viajero rellena sus datos bancarios/KYC. refreshUrl se usa si
// el enlace caduca a medio proceso (Stripe lo exige); returnUrl es a donde vuelve al terminar
// (no significa que ya esté aprobado — eso se confirma por webhook, igual que Identity/Checkout).
async function createConnectOnboardingLink(accountId, { returnUrl, refreshUrl }) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe no está configurado (falta STRIPE_SECRET_KEY).');
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
  return link.url;
}

async function getConnectAccountStatus(accountId) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe no está configurado (falta STRIPE_SECRET_KEY).');
  const account = await stripe.accounts.retrieve(accountId);
  return { payouts_enabled: !!account.payouts_enabled, details_submitted: !!account.details_submitted };
}

// Transferencia real de la parte del viajero (netAmount, en €) a su cuenta conectada. Se llama
// solo en la entrega (routes/bookings.js), nunca antes — el dinero del remitente está retenido
// en la cuenta de la plataforma hasta ese momento.
async function createTransfer(accountId, netAmountEur, bookingId) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe no está configurado (falta STRIPE_SECRET_KEY).');
  const transfer = await stripe.transfers.create({
    amount: Math.round(netAmountEur * 100),
    currency: 'eur',
    destination: accountId,
    metadata: { booking_id: bookingId, kind: 'yaquevas_traveler_payout' },
  });
  return { transfer_id: transfer.id };
}

// Reembolsa al MISMO método de pago original — nunca a un saldo interno ("wallet") que el
// usuario no pidió, uno de los fallos más citados contra Grabr/Vinted (ver
// docs/PRINCIPIOS_DE_DISENO.md punto 19). paymentIntentId es el provider_ref guardado en
// `payments` para el cobro original (session.payment_intent de Stripe Checkout).
async function createRefund(paymentIntentId) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe no está configurado (falta STRIPE_SECRET_KEY).');
  const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
  return { refund_id: refund.id, status: refund.status };
}

module.exports = {
  isPaymentsConfigured, createCheckoutSession, verifyWebhookSignature, createRefund, getStripeClient,
  createConnectAccount, createConnectOnboardingLink, getConnectAccountStatus, createTransfer,
};
