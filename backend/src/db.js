'use strict';
// Conexión a la base de datos. Con TURSO_DATABASE_URL configurada usa Turso (SQLite en la nube,
// persiste de verdad entre redeploys — ver docs/TURSO_SETUP.md); si no, un archivo SQLite local
// con node:sqlite (nativo en Node >= 22.5), como antes. `db` expone siempre la misma interfaz
// async (`db.prepare(sql).get/all/run(...)`, `db.exec(sql)`) sea cual sea el motor real detrás —
// ver lib/dbAdapter.js. El bootstrap (migraciones + catálogo geográfico) vive en `initDb()`,
// que server.js/seed.js deben `await` antes de usar la base de datos.

const path = require('path');
const fs = require('fs');
const { wrapSyncDb, wrapTursoClient } = require('./lib/dbAdapter');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'yaquevas.db');

let db;
let isNew = false;

if (process.env.TURSO_DATABASE_URL) {
  const { createClient } = require('@libsql/client');
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  db = wrapTursoClient(client);
} else {
  const { DatabaseSync } = require('node:sqlite');
  isNew = !fs.existsSync(DB_PATH);
  const rawDb = new DatabaseSync(DB_PATH);
  rawDb.exec('PRAGMA foreign_keys = ON;');
  db = wrapSyncDb(rawDb);
}

async function initDb() {
  // Migraciones siempre, en orden (CREATE TABLE IF NOT EXISTS, son idempotentes)
  for (const file of ['001_init.sql', '002_geo.sql']) {
    const migrationSql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
    await db.exec(migrationSql);
  }
  // Añade columnas/tablas nuevas a bases de datos ya existentes — ver migrations/alters.js.
  await require('./migrations/alters').applyAlters(db);
  // Catálogo de países/ubicaciones (Canarias + provincias de Cuba). Idempotente.
  await require('./lib/geo').seedGeo(db);
}

module.exports = { db, initDb, isNew, DB_PATH };
