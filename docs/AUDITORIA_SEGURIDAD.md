# Auditoría de seguridad del código (2026-08-20/21, sesión nocturna)

Auditoría real del código (no de percepción de marca) — grep/lectura directa del backend, no
investigación externa. Complementa los DAFO de percepción de seguridad ya escritos esta sesión.

## Arreglado esta sesión

1. **Comparación de firma no era en tiempo constante** (`backend/src/lib/auth.js`,
   `verifyToken`): comparaba la firma HMAC del token de sesión con `!==` (string comparison),
   que corta en cuanto encuentra el primer byte distinto — vía teórica de ataque de temporización
   para deducir la firma byte a byte. `verifyPassword`, justo encima en el mismo archivo, ya
   usaba `crypto.timingSafeEqual` correctamente; `verifyToken` no. Arreglado para usar el mismo
   patrón.
2. **Sin límite de intentos en `/api/me/identity/start`**: cada sesión real de Stripe Identity
   tiene coste cuando esté conectado a producción; una cuenta autenticada podía generar sesiones
   en bucle sin límite. Añadido rate limit (5 cada 10 min por IP), igual que login/registro.

## Revisado y confirmado correcto (sin cambios)

- **SQL injection**: todas las consultas usan parámetros `?` de `better-sqlite3`/`node:sqlite`.
  Los dos únicos sitios con interpolación de string en el SQL (`admin.js` export CSV,
  `lib/geo.js` orden de países) usan constantes internas o un objeto whitelist fijo, nunca texto
  de usuario directo — no hay vector de inyección real.
- **IDOR (acceso a recursos de otro usuario)**: revisados los endpoints de `bookings.js`
  (aceptar, rechazar, pagar, entregar, QR, cancelar, disputa) — todos comprueban
  `booking.sender_id`/`booking.traveler_id` contra el usuario autenticado antes de actuar o leer.
- **Precio de una operación**: siempre se recalcula en el servidor (`calculateOrientativePrice`);
  si el remitente ajusta el precio, el valor propuesto se recorta (`Math.min`/`Math.max`) dentro
  de un margen ±30% y los límites globales configurados — nunca se confía en un precio que venga
  del cliente sin más.
- **Autorización por rol**: `middleware/auth.js` relee el usuario de la base de datos en cada
  petición (no confía en el rol guardado dentro del token) — un cambio de rol o desactivación de
  cuenta se aplica de inmediato, no hay ventana donde un token viejo mantenga privilegios ya
  revocados.
- **Contraseñas**: `scrypt` nativo de Node con salt aleatorio de 16 bytes por usuario y
  comparación en tiempo constante — adecuado, sin dependencias externas.
- **Verificación de firma de los webhooks de Stripe** (`routes/webhooks.js`,
  `lib/payments.js`): delega en `stripe.webhooks.constructEvent()`, el método oficial del SDK de
  Stripe (verificación de firma + tolerancia de timestamp ya auditadas por Stripe) — no hay
  verificación casera reinventada. Sin `STRIPE_WEBHOOK_SECRET` configurado, siempre devuelve
  `null` y el endpoint responde 400: no hay forma de que un webhook falso cambie nada.

## Gaps ya conocidos, documentados previamente en `LAUNCH_CHECKLIST.md` (no repetidos aquí)

Token de sesión en `localStorage` en vez de cookie httpOnly, rate limiting en memoria de un solo
proceso (no soporta múltiples instancias sin almacén compartido), CSP con `unsafe-inline`
pendiente de migrar a nonces, MFA pendiente para cuentas admin, fotos guardadas como base64 en
SQLite en vez de storage en la nube. Ninguno se tocó esta sesión — el checklist ya los tenía
correctamente identificados y priorizados, no hacía falta repetir el hallazgo.

## Metodología (para la próxima vez que se audite)

Revisado con `Grep`/`Read` directos sobre `backend/src/`: `lib/auth.js`, `middleware/auth.js`,
`lib/rateLimit.js`, `lib/photo.js`, `lib/payments.js`, `routes/webhooks.js`, y una muestra
representativa de rutas en `routes/bookings.js` y `routes/admin.js`. No se auditó línea por línea
cada archivo del proyecto — es una pasada dirigida a las zonas de mayor riesgo (autenticación,
autorización, dinero, inyección), no una auditoría exhaustiva de cada endpoint. Si se retoma, las
zonas no revisadas explícitamente esta vez son: `routes/chat.js`, `routes/trust.js` y
`routes/shipments.js`.
