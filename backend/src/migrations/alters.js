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
];

function applyAlters(db) {
  for (const stmt of ALTERS) {
    try { db.exec(stmt); } catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
  }
}

module.exports = { ALTERS, applyAlters };
