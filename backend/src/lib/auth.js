'use strict';
const crypto = require('crypto');

// Hash de contraseñas con scrypt (nativo de Node, seguro, sin dependencias externas).
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
}

// Tokens de sesión firmados tipo JWT simplificado (HMAC-SHA256), sin librerías externas.
// Un SESSION_SECRET fijo y conocido (como tenía este archivo antes) permitiría forjar tokens
// de cualquier usuario, incluido superadmin. La solución no puede ser "fallar el arranque si
// falta la variable": en un despliegue real (p.ej. Render) eso tumbaría la web entera hasta
// que alguien la configure a mano. En vez de eso: si falta, se genera un secreto aleatorio
// nuevo en cada arranque (nunca predecible) y se avisa alto y claro en los logs. La única
// pega de este modo intermedio: como el secreto cambia en cada reinicio del proceso, todas
// las sesiones activas se invalidan cada vez que el servidor se reinicia — pon la variable de
// verdad en cuanto puedas para que las sesiones sobrevivan a los reinicios.
function resolveSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const generated = crypto.randomBytes(48).toString('hex');
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '\n⚠️  SESSION_SECRET no está configurado. Usando un secreto aleatorio generado solo ' +
      'para este arranque (seguro, pero cambia en cada reinicio y invalida todas las ' +
      'sesiones activas). Configura SESSION_SECRET como variable de entorno cuanto antes.\n'
    );
  }
  return generated;
}
const SECRET = resolveSecret();

function signToken(payload, expiresInSeconds = 60 * 60 * 24 * 7) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const b64 = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, newId };
