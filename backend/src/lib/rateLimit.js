'use strict';
// Rate limiting propio, en memoria, sin dependencias externas (mismo criterio que el resto
// del backend). Pensado para mitigar fuerza bruta en /api/auth/login y /api/auth/register
// (LAUNCH_CHECKLIST.md, sección técnica). Ventana deslizante simple por IP + ruta.
//
// Limitación conocida: el estado es en memoria de un solo proceso. Si YaQueVas se despliega
// con más de una instancia detrás de un balanceador, este limiter debe sustituirse por uno
// con almacén compartido (Redis u otro) — dejar esto documentado en vez de fingir que ya
// soporta múltiples instancias.

const buckets = new Map(); // key -> { count, windowStart }

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket && req.socket.remoteAddress || 'unknown';
}

// Limpia buckets antiguos de vez en cuando para no crecer indefinidamente en memoria.
let lastSweep = Date.now();
function sweep(now, maxAgeMs) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > maxAgeMs) buckets.delete(key);
  }
}

// Devuelve un middleware-like checker: rateLimit({ windowMs, max }) -> (req) => boolean (true = permitido)
function rateLimiter({ windowMs = 60_000, max = 10, keyPrefix = '' } = {}) {
  return function check(req) {
    const now = Date.now();
    sweep(now, windowMs * 5);
    const key = `${keyPrefix}:${clientIp(req)}`;
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { count: 0, windowStart: now };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    return bucket.count <= max;
  };
}

module.exports = { rateLimiter, clientIp };
