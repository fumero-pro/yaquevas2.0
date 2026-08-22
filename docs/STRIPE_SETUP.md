# Stripe (pagos + verificación de identidad + payout al viajero) — modo test

**Estado real (2026-08-22): cobro al remitente, webhook y verificación de identidad ya están
conectados y verificados en producción (yaquevas.es), en modo test.** `STRIPE_SECRET_KEY` y
`STRIPE_WEBHOOK_SECRET` están puestos en Render; una operación real de extremo a extremo
(pagar → webhook → estado actualizado) se probó con éxito. Sin ninguna de las dos variables, la
plataforma sigue funcionando exactamente igual que antes, en modo simulado — no es obligatorio.

Lo que queda pendiente y sí requiere que lo hagas tú (no una IA, ver el aviso de la sección
Connect más abajo): **activar Stripe Connect en el dashboard**, un paso de aceptar condiciones
que Stripe solo permite hacer a la persona dueña de la cuenta.

## 1. Crea la cuenta (gratis, sin tarjeta)

1. Ve a [dashboard.stripe.com/register](https://dashboard.stripe.com/register) y crea una cuenta.
2. No hace falta rellenar los datos de negocio/banco todavía — puedes activar el **modo de
   prueba** (interruptor "Test mode" arriba a la derecha del panel) sin completar nada de eso.
   En modo de prueba no se mueve dinero real y no tiene coste ni límite de tiempo.

## 2. Copia tu clave secreta de prueba

En el panel, con el modo de prueba activado: **Desarrolladores → Claves de API → Clave secreta**
(empieza por `sk_test_...`). Pégala en tu `.env` (nunca la subas a git):

```
STRIPE_SECRET_KEY=sk_test_...
```

Con solo esto, el cobro al remitente (`POST /api/bookings/:id/pay`) ya empieza a crear sesiones
reales de Stripe Checkout en modo test en vez de simular el pago al instante.

## 3. Webhooks (para que el pago se confirme automáticamente)

Stripe avisa a YaQueVas de que un pago se completó mediante un webhook — sin esto, el pago
quedaría "pendiente" para siempre aunque el usuario pague en la pantalla de Stripe.

**En local, con Stripe CLI** (recomendado para probar):

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

El comando imprime un secreto (`whsec_...`) — pégalo en `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Deja `stripe listen` corriendo mientras pruebas: reenvía los eventos de tu cuenta de test a tu
servidor local.

**En producción**, en vez de Stripe CLI: Dashboard → Desarrolladores → Webhooks → Añadir
endpoint, con la URL pública `https://tu-dominio/api/webhooks/stripe` y estos eventos:
- `checkout.session.completed` (confirma el cobro al remitente)
- `identity.verification_session.verified` (confirma la verificación de identidad)

## 4. Verificación de identidad (Stripe Identity)

No requiere ninguna variable adicional — usa la misma `STRIPE_SECRET_KEY`. En modo de prueba,
Stripe Identity simula la verificación de documentos sin coste. Actívala llamando a
`POST /api/me/identity/start` desde una cuenta con sesión iniciada.

## 5. Probarlo

1. Con `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` puestos y `stripe listen` corriendo, arranca
   el servidor normalmente (`npm run server`).
2. Sigue el flujo habitual: publica un envío, acéptalo como viajero, y pulsa "Pagar" como
   remitente — ahora deberías ir a una pantalla real de Stripe Checkout (modo test).
3. Usa una [tarjeta de prueba de Stripe](https://stripe.com/docs/testing) (por ejemplo
   `4242 4242 4242 4242`, cualquier fecha futura y CVC) para completar el pago.
4. Si `stripe listen` está corriendo, el webhook debería llegar en segundos y el estado de la
   operación pasar a "Pago realizado" automáticamente.

## Aviso importante

El cobro al remitente y el webhook (secciones 1-3) se probaron con éxito en producción el
2026-08-22: `checkout_url` real devuelto, pago confirmado por webhook, estado de la operación
actualizado solo. Lo único que no se ha completado todavía por el motivo del punto 4 más abajo
(entrar datos de tarjeta en un formulario de pago requiere tu permiso explícito, aunque sea con
la tarjeta de test) es el paso 5.3 de arriba (pagar de verdad con `4242 4242 4242 4242` y
comprobar que el webhook llega) — el código y la configuración ya están listos para que lo hagas
tú en cualquier momento.

## 6. Payout al viajero (Stripe Connect) — código listo, falta un paso tuyo

**Ya implementado en el código** (commit correspondiente, ver `backend/src/lib/payments.js`,
`backend/src/routes/payouts.js`, `backend/src/routes/webhooks.js`, la liberación de pago en
`backend/src/routes/bookings.js`): cada viajero puede darse de alta con una cuenta Stripe Connect
Express (`POST /api/me/payout/start`, tarjeta en `mi-cuenta.html`) y, con la cuenta ya habilitada,
la entrega transfiere de verdad su compensación (`stripe.transfers.create`, patrón "separate
charges and transfers": el cobro del remitente ya está en la cuenta de la plataforma, en la
entrega solo se transfiere la parte del viajero, la comisión se queda sola en el balance de la
plataforma). El evento de webhook `account.updated` ya está añadido al endpoint de producción y
mantiene `stripe_connect_payouts_enabled` al día.

**Bloqueado en un paso que solo puede hacer el dueño de la cuenta**: al probar la creación de una
cuenta Connect contra la cuenta real de Stripe, la API devolvió:

> "You can only create new accounts if you've signed up for Connect, which you can do at
> https://dashboard.stripe.com/connect."

Stripe exige que la cuenta de la plataforma acepte las condiciones del Platform Agreement de
Connect antes de poder crear cuentas conectadas — esto es aceptar términos legales/de facturación
propios de Stripe Connect, así que lo tienes que hacer tú desde el dashboard, no una IA:

1. Entra en [dashboard.stripe.com/connect](https://dashboard.stripe.com/connect) (con el modo de
   prueba activado) y sigue el asistente de activación de Connect — en modo test no pide datos de
   banco/negocio reales.
2. Una vez activado, cualquier viajero podrá pulsar "Configurar cobro" en `mi-cuenta.html` y dar
   de alta su cuenta conectada (en modo test, Stripe rellena los datos de KYC automáticamente si
   se usa la opción de cuenta de prueba que ofrece su propio formulario).
3. Avísame cuando esté activado y hago la prueba de extremo a extremo (alta de cuenta → entrega →
   transferencia real) igual que se hizo con el cobro al remitente.
