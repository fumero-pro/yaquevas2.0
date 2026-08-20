'use strict';
// Conexión a la base de datos. Usa node:sqlite (nativo en Node >= 22.5).
// Para producción real se recomienda migrar a Postgres; el SQL de migrations/001_init.sql
// está escrito en un estilo estándar fácil de portar.

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'yaquevas.db');
const isNew = !fs.existsSync(DB_PATH);

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

// Ejecutar migraciones siempre, en orden (usan CREATE TABLE IF NOT EXISTS, son idempotentes)
for (const file of ['001_init.sql', '002_geo.sql']) {
  const migrationSql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
  db.exec(migrationSql);
}

// Añade columnas nuevas a bases de datos ya existentes (CREATE TABLE IF NOT EXISTS no las
// crea retroactivamente). Lista compartida con test/helpers/testDb.js — ver migrations/alters.js.
require('./migrations/alters').applyAlters(db);

// Catálogo de países/ubicaciones (Canarias + provincias de Cuba). Idempotente (INSERT OR IGNORE).
require('./lib/geo').seedGeo(db);

module.exports = { db, isNew, DB_PATH };
