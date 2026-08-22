'use strict';
// Webhooks de Stripe. Registrado aparte de las demás rutas porque necesita el cuerpo SIN
// parsear para verificar la firma (ver server.js: esta ruta se excluye del parseo JSON
// genérico). Sin STRIPE_WEBHOOK_SECRET configurado, verifyWebhookSignature siempre devuelve
// null y el endpoint responde 400 — no hay forma de que un webhook no verificado cambie nada.
const { verifyWebhookSignature } = require('../lib/payments');
const { markPaymentReceived } = require('./bookings');

function register(router, db) {
  router.post('/api/webhooks/stripe', async (req, res, rawBody) => {
    const signature = req.headers['stripe-signature'];
    const event = verifyWebhookSignature(rawBody, signature);
    if (!event) return res.status(400).json({ error: 'Firma de webhook inválida o Stripe no configurado.' });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const bookingId = session.metadata && session.metadata.booking_id;
      const booking = bookingId ? await db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) : null;
      if (booking && booking.status === 'aceptado') {
        await markPaymentReceived(db, booking, { provider: 'stripe', providerRef: session.payment_intent || session.id, isDemo: false });
      }
    }

    if (event.type === 'identity.verification_session.verified') {
      const session = event.data.object;
      const userId = session.metadata && session.metadata.user_id;
      if (userId) {
        await db.prepare('UPDATE users SET identity_verified = 1, identity_provider_ref = ? WHERE id = ?').run(session.id, userId);
      }
    }

    // Stripe Connect: se dispara cada vez que cambia el estado de una cuenta conectada (alta
    // completada, requisito nuevo pedido por Stripe, etc.) — payouts_enabled es lo único que
    // nos importa para decidir si el payout de la entrega puede ser una transferencia real.
    if (event.type === 'account.updated') {
      const account = event.data.object;
      await db.prepare('UPDATE users SET stripe_connect_payouts_enabled = ? WHERE stripe_connect_account_id = ?')
        .run(account.payouts_enabled ? 1 : 0, account.id);
    }

    res.json({ received: true });
  });
}

module.exports = { register };
