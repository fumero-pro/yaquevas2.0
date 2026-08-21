# Activar email transaccional (Resend) — gratis, sin tarjeta

El código ya está preparado para enviar email real (`backend/src/lib/email.js`), hoy solo se usa
para el email de bienvenida al registrarse. **Sin hacer nada de esto, el registro sigue
funcionando exactamente igual, solo que el email queda "simulado" (se ve en los logs del
servidor, nunca bloquea ni rompe el registro).**

Esto lo tienes que hacer tú (no una IA): crear la cuenta requiere tus propios datos.

## 1. Crea la cuenta (gratis, sin tarjeta)

1. Ve a [resend.com/signup](https://resend.com/signup) y crea una cuenta.
2. El plan gratuito da 3.000 emails al mes (100 al día), permanente, sin fecha de caducidad —
   verificado en 2026, no una promoción temporal.

## 2. Copia tu API key

Dashboard → **API Keys** → **Create API Key**. Empieza por `re_...`. Pégala en tu `.env` (nunca
la subas a git):

```
EMAIL_API_KEY=re_...
```

## 3. Remitente

**Para probar ya mismo, sin dominio propio**: pon `EMAIL_FROM=onboarding@resend.dev` — es el
remitente de pruebas de Resend, funciona sin verificar nada, pero solo para desarrollo (Resend
puede limitarlo o marcarlo como no confiable en producción real).

**Para producción de verdad**: verifica tu propio dominio en Dashboard → **Domains** → **Add
Domain** (`yaquevas.es` o el que uses), sigue las instrucciones de registros DNS (SPF/DKIM) que
te da Resend, y usa `EMAIL_FROM=notificaciones@yaquevas.es` (o el remitente que prefieras de ese
dominio).

```
EMAIL_FROM=notificaciones@yaquevas.es
```

## 4. Probarlo

1. Con `EMAIL_API_KEY` y `EMAIL_FROM` puestos, arranca el servidor normalmente (`npm run server`).
2. Regístrate con un email real tuyo desde `/registro.html`.
3. Deberías recibir el email de bienvenida en segundos. Si no llega, revisa los logs del servidor
   (`console.error` imprime el motivo si Resend rechaza el envío — causa más probable: dominio no
   verificado o `EMAIL_FROM` con un dominio distinto al verificado).

## Aviso importante

Igual que con Stripe: este código se ha escrito siguiendo la documentación oficial de Resend,
pero **no se ha podido probar contra una cuenta real** durante su desarrollo — no había forma de
crear la cuenta desde este entorno. Confírmalo tú mismo con los pasos de arriba antes de confiar
en que llegan emails reales a usuarios de verdad.

## Qué se envía (actualizado 2026-08-21)

- Bienvenida al registrarse, con enlace de confirmación de email incluido (`/verificar-email.html`,
  `users.email_verified` ya se marca de verdad al confirmarlo — antes existía la columna pero no
  se usaba).
- Recuperación de contraseña (`/recuperar.html` → `/restablecer.html`).
- **Toda notificación interna** (aceptación, pago, recogida, entrega, pago liberado, recompensa de
  referido...) se envía también por email si el usuario tiene `notif_prefs.email` activo —
  centralizado en `backend/src/lib/notify.js`, usado por `routes/bookings.js` y `routes/chat.js`.

Ver también `docs/SMS_SETUP.md` para la confirmación de teléfono por SMS (Twilio), mismo patrón de
"simulado sin configurar, real con las variables de entorno puestas".
