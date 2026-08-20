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

module.exports = { isPaymentsConfigured, createCheckoutSession, verifyWebhookSignature, getStripeClient };
