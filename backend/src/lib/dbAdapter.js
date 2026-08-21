'use strict';
// Envuelve un DatabaseSync (node:sqlite, local) o un cliente libSQL/Turso (remoto) para exponer
// siempre la MISMA interfaz — `db.prepare(sql).get/all/run(...params)` y `db.exec(sql)`, todas
// async — así el resto del código (rutas, lib/*) no necesita saber cuál de los dos hay detrás,
// solo usar `await`. Local (sin TURSO_DATABASE_URL) para desarrollo y tests, sin red; Turso en
// producción para que los datos sobrevivan a los redeploys (ver docs/TURSO_SETUP.md).

function wrapSyncDb(rawDb) {
  return {
    raw: rawDb,
    async exec(sql) { return rawDb.exec(sql); },
    prepare(sql) {
      const stmt = rawDb.prepare(sql);
      return {
        async get(...params) { return stmt.get(...params); },
        async all(...params) { return stmt.all(...params); },
        async run(...params) { return stmt.run(...params); },
      };
    },
  };
}

function wrapTursoClient(client) {
  return {
    raw: client,
    async exec(sql) { return client.executeMultiple(sql); },
    prepare(sql) {
      return {
        async get(...params) {
          const rs = await client.execute({ sql, args: params });
          return rs.rows[0];
        },
        async all(...params) {
          const rs = await client.execute({ sql, args: params });
          return rs.rows;
        },
        async run(...params) {
          const rs = await client.execute({ sql, args: params });
          return { changes: Number(rs.rowsAffected), lastInsertRowid: rs.lastInsertRowid };
        },
      };
    },
  };
}

module.exports = { wrapSyncDb, wrapTursoClient };
