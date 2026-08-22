'use strict';
// Stripe Connect: alta del viajero como cuenta conectada para poder cobrar de verdad en la
// entrega (ver lib/payments.js y la liberación de pago en routes/bookings.js). Sin
// STRIPE_SECRET_KEY configurada, sigue exactamente el modo demo de siempre — este módulo nunca
// es obligatorio para que el resto de la app funcione.
const { requireAuth } = require('../middleware/auth');
const { rateLimiter } = require('../lib/rateLimit');
const {
  isPaymentsConfigured, createConnectAccount, createConnectOnboardingLink, getConnectAccountStatus,
} = require('../lib/payments');

// Crear cuentas Connect y enlaces de onboarding tiene coste/cuota en Stripe — igual que
// identityLimiter en auth.js, protege el rato antes de que el viajero termine su alta.
const payoutLimiter = rateLimiter({ windowMs: 10 * 60_000, max: 5, keyPrefix: 'payout_onboard' });

function register(router, db) {
  // Empieza (o retoma) el alta de la cuenta conectada del viajero. Devuelve la URL alojada por
  // Stripe donde rellena sus datos bancarios/KYC; el estado real de "ya puede cobrar" llega por
  // webhook (account.updated, ver routes/webhooks.js), nunca aquí mismo.
  router.post('/api/me/payout/start', async (req, res) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    if (!payoutLimiter(req)) {
      return res.status(429).json({ error: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' });
    }

    if (!isPaymentsConfigured()) {
      return res.json({ modo_demo: true, aviso: 'Cobro simulado (MODO DEMOSTRACIÓN). Pendiente de conectar proveedor de pagos real.' });
    }

    let accountId = user.stripe_connect_account_id;
    if (!accountId) {
      accountId = await createConnectAccount(user);
      await db.prepare('UPDATE users SET stripe_connect_account_id = ? WHERE id = ?').run(accountId, user.id);
    }

    // PUBLIC_APP_URL primero: mismo motivo que en /api/bookings/:id/pay y /api/me/identity/start,
    // Stripe exige URLs absolutas y req.headers.origin no siempre llega.
    const baseUrl = process.env.PUBLIC_APP_URL || req.headers.origin || '';
    const onboarding_url = await createConnectOnboardingLink(accountId, {
      returnUrl: `${baseUrl}/mi-cuenta.html?cobro=completado`,
      refreshUrl: `${baseUrl}/mi-cuenta.html?cobro=reintentar`,
    });
    res.json({ modo_demo: false, onboarding_url });
  });

  // El viajero vuelve de Stripe (o entra a mi-cuenta más tarde): consulta en vivo si Stripe ya
  // habilitó los pagos, por si el webhook todavía no ha llegado. Actualiza la copia en BD de
  // paso, así que las siguientes visitas no necesitan volver a llamar a Stripe.
  router.get('/api/me/payout/status', async (req, res) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    if (!user.stripe_connect_account_id) {
      return res.json({ conectado: false, payouts_enabled: false });
    }
    if (!isPaymentsConfigured()) {
      return res.json({ conectado: true, payouts_enabled: !!user.stripe_connect_payouts_enabled });
    }
    const status = await getConnectAccountStatus(user.stripe_connect_account_id);
    await db.prepare('UPDATE users SET stripe_connect_payouts_enabled = ? WHERE id = ?').run(status.payouts_enabled ? 1 : 0, user.id);
    res.json({ conectado: true, payouts_enabled: status.payouts_enabled, details_submitted: status.details_submitted });
  });
}

module.exports = { register };
