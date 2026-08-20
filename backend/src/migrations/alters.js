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
];

function applyAlters(db) {
  for (const stmt of ALTERS) {
    try { db.exec(stmt); } catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
  }
}

module.exports = { ALTERS, applyAlters };
