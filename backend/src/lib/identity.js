'use strict';
// Verificación de identidad real vía Stripe Identity, en modo test (gratis) hasta pasar a
// producción. Sin STRIPE_SECRET_KEY, la verificación queda simulada: se marca
// identity_verified=1 al instante, etiquetado como demo — nunca se presenta como real.
//
// Mismo aviso de honestidad que lib/payments.js: contrato seguido según la documentación de
// Stripe Identity, no probado contra una cuenta real por no tener credenciales en este entorno.

const { getStripeClient } = require('./payments');

function isIdentityConfigured() {
  return !!getStripeClient();
}

// Crea una sesión de verificación (documento + selfie/biometría) para un usuario. YaQueVas
// nunca almacena el documento en sí: solo guarda el id de sesión de Stripe como referencia
// técnica (users.identity_provider_ref) para poder consultar el estado si hace falta.
async function createVerificationSession(user, { returnUrl }) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe no está configurado (falta STRIPE_SECRET_KEY).');
  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: { user_id: user.id },
    options: { document: { require_matching_selfie: true } },
    return_url: returnUrl,
  });
  return { session_id: session.id, url: session.url, client_secret: session.client_secret };
}

module.exports = { isIdentityConfigured, createVerificationSession };
