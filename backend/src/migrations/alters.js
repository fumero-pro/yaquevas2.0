'use strict';
// ALTER TABLE idempotentes compartidos entre backend/src/db.js (BD real) y
// backend/test/helpers/testDb.js (BD de test en memoria) — una sola lista para que nunca
// puedan desincronizarse entre sí (ya pasó una vez: un test falló porque la BD de test no
// tenía columnas que sí existían en la real). CREATE TABLE IF NOT EXISTS no re-crea columnas
// nuevas en tablas ya existentes, por eso cada columna añadida después de la migración
// inicial necesita su propio ALTER aquí, ejecutado con un catch que ignora "ya existe".
const ALTERS = [
  'ALTER TABLE notifications ADD COLUMN related_type TEXT',
  'ALTER TABLE notifications ADD COLUMN related_id TEXT',
  'ALTER TABLE trips ADD COLUMN origin_location_id TEXT REFERENCES locations(id)',
  'ALTER TABLE trips ADD COLUMN destination_location_id TEXT REFERENCES locations(id)',
  'ALTER TABLE shipments ADD COLUMN origin_location_id TEXT REFERENCES locations(id)',
  'ALTER TABLE shipments ADD COLUMN destination_location_id TEXT REFERENCES locations(id)',
  'ALTER TABLE pricing_reference_samples ADD COLUMN weight_min_kg REAL',
  'ALTER TABLE pricing_reference_samples ADD COLUMN weight_max_kg REAL',
  'ALTER TABLE pricing_reference_samples ADD COLUMN valid_until TEXT',
  // Prueba de entrega con foto obligatoria (lección de Roadie/GoShare, ver
  // docs/BENCHMARK_COMPETENCIA.md) — antes solo hacía falta el QR/código, sin evidencia visual.
  'ALTER TABLE bookings ADD COLUMN delivery_photo_url TEXT',
  // Referidos (ver docs/VIRALIDAD_REFERIDOS.md): código propio de cada usuario + quién le
  // invitó, si alguien. La recompensa se paga solo al completar una operación real, nunca al
  // registrarse — así se cierra la vía de fraude más común (cuentas falsas sin transacción).
  'ALTER TABLE users ADD COLUMN referral_code TEXT',
  'ALTER TABLE users ADD COLUMN referred_by TEXT REFERENCES users(id)',
  `CREATE TABLE IF NOT EXISTS referral_rewards (
    id TEXT PRIMARY KEY,
    referrer_id TEXT NOT NULL REFERENCES users(id),
    referred_id TEXT NOT NULL REFERENCES users(id),
    triggering_booking_id TEXT NOT NULL REFERENCES bookings(id),
    amount_eur REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | pagado (demo: se marca pagado al momento)
    created_at TEXT NOT NULL,
    UNIQUE(referred_id)
  )`,
  // Recuperación de contraseña (ver docs — bloqueador real de soporte identificado en la
  // auditoría nocturna: no existía ningún flujo de "olvidé mi contraseña"). token_hash guarda
  // solo el hash SHA-256, nunca el token real (ver lib/passwordReset.js).
  `CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  // Confirmación de cuenta por email (enlace) y teléfono (código SMS) — ver lib/emailVerification.js
  // y lib/phoneVerification.js. `users.email_verified`/`phone_verified` ya existían desde el
  // inicio pero nunca se marcaban a 1 fuera del seed de demo; estas tablas son lo que faltaba.
  `CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS phone_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    phone TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  // Recompensa de referidos pasa de "dinero en efectivo" (nunca implementado de verdad, no hay
  // forma de pagar a un usuario sin Stripe Connect) a "descuento en la comisión de la próxima
  // operación" — pedido explícito del usuario ("como pago 5 euros a la gente? mejor un
  // descuento"). amount_eur se mantiene en el esquema (NOT NULL) por compatibilidad con filas
  // ya existentes, pero deja de usarse: la recompensa real ahora vive en discount_pct.
  // referrer_redeemed/referred_redeemed van por separado porque una misma fila beneficia a DOS
  // personas (quien invitó y quien fue invitado) que canjean su descuento en momentos distintos.
  'ALTER TABLE referral_rewards ADD COLUMN discount_pct REAL',
  'ALTER TABLE referral_rewards ADD COLUMN referrer_redeemed INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE referral_rewards ADD COLUMN referred_redeemed INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE referral_rewards ADD COLUMN referrer_redeemed_booking_id TEXT',
  'ALTER TABLE referral_rewards ADD COLUMN referred_redeemed_booking_id TEXT',
  // Dirección exacta de recogida/entrega (calle + número, buscada vía Nominatim/OpenStreetMap —
  // ver lib/geocode.js), petición explícita del usuario ("como si se compartiera ubicación en
  // WhatsApp"). Nullable: un envío sigue siendo válido solo con el punto de encuentro genérico
  // (Aeropuerto/Puerto/Acordar directamente) si el remitente no busca una dirección exacta. Con
  // ambas coordenadas presentes y origen/destino en la misma isla, el precio de un trayecto en
  // coche se calcula por distancia real (ver backend/src/lib/pricing.js), no solo por talla.
  'ALTER TABLE shipments ADD COLUMN origin_lat REAL',
  'ALTER TABLE shipments ADD COLUMN origin_lon REAL',
  'ALTER TABLE shipments ADD COLUMN destination_lat REAL',
  'ALTER TABLE shipments ADD COLUMN destination_lon REAL',
  // Stripe Connect (cuentas Express) para pagar de verdad al viajero en la entrega, en vez del
  // registro "demo" de siempre — ver lib/payments.js. payouts_enabled se actualiza por webhook
  // (account.updated) cuando Stripe confirma que la cuenta ya puede recibir transferencias; sin
  // ninguna de las dos columnas rellenas, el payout sigue cayendo al modo demo sin bloquear nada.
  'ALTER TABLE users ADD COLUMN stripe_connect_account_id TEXT',
  'ALTER TABLE users ADD COLUMN stripe_connect_payouts_enabled INTEGER NOT NULL DEFAULT 0',
  // Antes la mayoría de edad era solo una casilla autodeclarada ("confirmo que soy mayor de
  // 18") sin ningún dato que la respalde — trivial de marcar sin serlo. Ahora se pide la fecha
  // de nacimiento real y el backend calcula la edad (ver routes/auth.js). Nullable porque los
  // usuarios ya registrados antes de este cambio no tienen este dato — no se les bloquea
  // retroactivamente, solo se exige a partir de ahora en el registro nuevo.
  'ALTER TABLE users ADD COLUMN birthdate TEXT',
  // Registro de que el remitente dio su consentimiento expreso a que el servicio empiece de
  // inmediato y renunció al derecho de desistimiento de 14 días (art. 103.a RD 1/2007) en el
  // momento concreto de pagar — mismo criterio de trazabilidad que ya se usa para la aceptación
  // del contenido por parte del viajero (tabla `acceptances`). Ver routes/bookings.js (pay).
  'ALTER TABLE bookings ADD COLUMN withdrawal_waived_at TEXT',
];

async function applyAlters(db) {
  for (const stmt of ALTERS) {
    try { await db.exec(stmt); } catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
  }
}

module.exports = { ALTERS, applyAlters };
