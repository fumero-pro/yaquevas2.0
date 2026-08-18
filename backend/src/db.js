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

// Ejecutar migración inicial siempre (usa CREATE TABLE IF NOT EXISTS, es idempotente)
const migrationSql = fs.readFileSync(path.join(__dirname, 'migrations', '001_init.sql'), 'utf8');
db.exec(migrationSql);

module.exports = { db, isNew, DB_PATH };
