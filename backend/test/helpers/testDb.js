'use strict';
// Base de datos SQLite en memoria para tests: mismas migraciones + catálogo geográfico que
// usa la app real, sin tocar el fichero de datos de la demo (backend/data/yaquevas.db).

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

function createTestDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const file of ['001_init.sql', '002_geo.sql']) {
    const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'migrations', file), 'utf8');
    db.exec(sql);
  }
  // Misma lista de ALTER que usa la BD real (backend/src/db.js) — una sola fuente de verdad
  // en migrations/alters.js para que nunca puedan desincronizarse.
  require('../../src/migrations/alters').applyAlters(db);
  require('../../src/lib/geo').seedGeo(db);
  return db;
}

module.exports = { createTestDb };
