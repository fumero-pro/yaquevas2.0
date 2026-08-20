# Activar Stripe (pagos + verificación de identidad) — gratis, modo test

El código ya está preparado para usar Stripe de verdad tanto para el cobro al remitente
(Stripe Checkout) como para la verificación de identidad del DNI/pasaporte (Stripe Identity).
**Sin hacer nada de esto, la plataforma sigue funcionando exactamente igual que hasta ahora, en
modo simulado.** Activar Stripe es opcional y no cuesta dinero mientras uses el modo de prueba.

Esto lo tienes que hacer tú (no una IA): crear la cuenta requiere tus propios datos y aceptar
las condiciones de Stripe.

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

Este código se ha escrito siguiendo la documentación oficial de Stripe (Checkout Sessions,
verificación de firma de webhooks, Identity Verification Sessions), pero **no se ha podido
probar contra una cuenta Stripe real** durante su desarrollo — no había forma de crear la cuenta
ni obtener claves desde ese entorno. Antes de confiar en este flujo para dinero real, complétalo
en modo test tú mismo siguiendo los pasos de arriba y confirma que el ciclo completo (pagar →
webhook → estado actualizado) funciona como se espera.

## Lo que falta para producción (no cubierto todavía)

El cobro al remitente ya está resuelto de esta forma. **El payout al viajero (pagarle a él) no
está implementado con Stripe todavía** — sigue registrándose como pago simulado incluso con
Stripe configurado. Para pagar de verdad a los viajeros hace falta **Stripe Connect** (cada
viajero necesita su propia cuenta conectada, con su propio proceso de alta/KYC bancario), que es
una pieza bastante más grande y no se ha abordado en esta pasada — es el siguiente paso lógico
una vez que el cobro esté validado y funcionando.
