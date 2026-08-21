# Activar SMS real (Twilio) — verificación de teléfono

El código ya está preparado para enviar SMS real (`backend/src/lib/sms.js`), aunque hoy no está
enchufado a ningún botón visible: el usuario decidió el 2026-08-21 que la cuenta se confirme solo
por email, para no asumir el coste de Twilio. El backend sigue funcionando (`/api/me/phone/send-code`,
`/api/me/phone/verify-code`), solo que `mi-cuenta.html` ya no muestra la tarjeta "Confirma tu
teléfono" (se quitó a propósito, para no prometer un SMS que nunca llegaría a un usuario real).
**Si en algún momento se activa Twilio siguiendo esta guía, hay que volver a añadir esa tarjeta en
`mi-cuenta.html`** (el HTML y el cableado de eventos están en el historial de git, commit anterior
a esta nota) para que la gente pueda usarla.

Esto lo tienes que hacer tú (no una IA): crear la cuenta requiere tus propios datos y una tarjeta
para verificarla (Twilio no tiene plan sin tarjeta, aunque el saldo de prueba es gratis).

## 1. Crea la cuenta

1. Ve a [twilio.com/try-twilio](https://www.twilio.com/try-twilio) y crea una cuenta.
2. Twilio da un saldo de prueba gratuito (unos $15) al verificar tu cuenta — de sobra para probar
   cientos de SMS de verificación.
3. **Modo prueba**: con una cuenta trial, los SMS solo se pueden enviar a números que hayas
   verificado tú mismo en el dashboard (Phone Numbers → Verified Caller IDs) — normal para probar
   con tu propio móvil, hay que pasar a cuenta de pago para enviar a cualquier número.

## 2. Copia tus credenciales

Dashboard principal (Account Info) → copia **Account SID** y **Auth Token**. Pégalas en tu `.env`
(nunca las subas a git):

```
SMS_ACCOUNT_SID=AC...
SMS_AUTH_TOKEN=...
```

## 3. Número de origen

Twilio te da un número de prueba gratuito al crear la cuenta (Phone Numbers → Manage → Active
Numbers). Cópialo en formato internacional:

```
SMS_FROM_NUMBER=+1...
```

## 4. Probarlo

1. Con las tres variables puestas, arranca el servidor normalmente (`npm run server`).
2. Entra en `/mi-cuenta.html` con una cuenta que tenga tu propio teléfono (verificado en Twilio si
   sigues en modo prueba) y pulsa "Enviar código".
3. Deberías recibir el SMS en segundos. Si no llega, revisa los logs del servidor
   (`console.error` imprime el motivo si Twilio rechaza el envío — causa más probable en trial: el
   número de destino no está en la lista de verificados).

## Aviso importante

Igual que con Stripe y Resend: este código se ha escrito siguiendo la documentación oficial de
Twilio, pero **no se ha podido probar contra una cuenta real** durante su desarrollo — no había
forma de crear la cuenta desde este entorno. Confírmalo tú mismo con los pasos de arriba antes de
confiar en que llegan SMS reales a usuarios de verdad.

## Cómo funciona el código

6 dígitos, caduca en 10 minutos, máximo 5 intentos por código (`backend/src/lib/phoneVerification.js`).
Solo se guarda el hash SHA-256 del código en base de datos, nunca el código en claro — igual que
los tokens de recuperación de contraseña y confirmación de email.
