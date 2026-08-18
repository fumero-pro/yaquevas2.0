'use strict';
const { requireAdmin, requireRole, requireAuth } = require('../middleware/auth');
const { newId } = require('../lib/auth');
const { getConfig, setConfigValue } = require('../lib/config');

function auditLog(db, adminId, action, target, oldValue, newValue) {
  db.prepare(
    `INSERT INTO audit_log (id, admin_id, action, target, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(newId('audit'), adminId, action, target || null, oldValue != null ? String(oldValue) : null, newValue != null ? String(newValue) : null, new Date().toISOString());
}

function register(router, db) {
  // --- Dashboard / estadísticas (puntos 41-42) ---
  router.get('/api/admin/dashboard', async (req, res) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;

    const count = (sql, ...args) => db.prepare(sql).get(...args)?.c || 0;
    const sum = (sql, ...args) => db.prepare(sql).get(...args)?.s || 0;

    const stats = {
      usuarios_totales: count('SELECT COUNT(*) c FROM users'),
      viajeros_activos: count("SELECT COUNT(DISTINCT user_id) c FROM trips WHERE status = 'publicado'"),
      envios_totales: count('SELECT COUNT(*) c FROM shipments'),
      viajes_totales: count('SELECT COUNT(*) c FROM trips'),
      operaciones_completadas: count("SELECT COUNT(*) c FROM bookings WHERE status IN ('pago_liberado','finalizado')"),
      operaciones_en_curso: count("SELECT COUNT(*) c FROM bookings WHERE status NOT IN ('pago_liberado','finalizado','cancelado','rechazado')"),
      cancelaciones: count("SELECT COUNT(*) c FROM bookings WHERE status = 'cancelado'"),
      incidencias_abiertas: count("SELECT COUNT(*) c FROM disputes WHERE status IN ('abierta','en_revision','esperando_informacion')"),
      dinero_procesado: sum("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE type = 'cobro_remitente' AND status = 'completado'"),
      comision_yaquevas_total: sum("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE type = 'comision_yaquevas' AND status = 'completado'"),
      payouts_viajeros_total: sum("SELECT COALESCE(SUM(amount),0) s FROM payments WHERE type = 'payout_viajero' AND status = 'completado'"),
      pagos_pendientes: count("SELECT COUNT(*) c FROM bookings WHERE status = 'pago_realizado'"),
      reembolsos_totales: sum("SELECT COALESCE(SUM(amount),0) s FROM refunds WHERE status = 'completado'"),
    };

    const rutasPopulares = db
      .prepare(
        `SELECT origin_island || ' → ' || destination_island AS ruta, COUNT(*) AS total
         FROM shipments GROUP BY origin_island, destination_island ORDER BY total DESC LIMIT 5`
      )
      .all();

    res.json({ stats, rutas_mas_usadas: rutasPopulares });
  });

  // --- Configuración general (punto 44) ---
  router.get('/api/admin/config', async (req, res) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    res.json({ config: getConfig(db) });
  });

  router.put('/api/admin/config', async (req, res, body) => {
    const admin = requireRole(req, res, db, ['superadmin']);
    if (!admin) return;
    const before = getConfig(db);
    for (const [key, value] of Object.entries(body)) {
      setConfigValue(db, key, value, admin.id);
    }
    const after = getConfig(db);
    auditLog(db, admin.id, 'actualizar_configuracion', 'config', JSON.stringify(before), JSON.stringify(after));
    res.json({ config: after });
  });

  // --- Objetos prohibidos (punto 6) ---
  router.get('/api/admin/prohibited-items', async (req, res) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    res.json({ prohibited_items: db.prepare('SELECT * FROM prohibited_items ORDER BY category, name').all() });
  });

  router.post('/api/admin/prohibited-items', async (req, res, body) => {
    const admin = requireRole(req, res, db, ['superadmin', 'admin']);
    if (!admin) return;
    if (!body.name) return res.status(400).json({ error: 'El nombre del objeto es obligatorio.' });
    const id = newId('proh');
    db.prepare('INSERT INTO prohibited_items (id, name, category, note, active) VALUES (?, ?, ?, ?, 1)')
      .run(id, body.name, body.category || 'prohibido', body.note || '');
    auditLog(db, admin.id, 'crear_objeto_prohibido', id, null, body.name);
    res.status(201).json({ id });
  });

  router.put('/api/admin/prohibited-items/:id', async (req, res, body, params) => {
    const admin = requireRole(req, res, db, ['superadmin', 'admin']);
    if (!admin) return;
    const before = db.prepare('SELECT * FROM prohibited_items WHERE id = ?').get(params.id);
    if (!before) return res.status(404).json({ error: 'No encontrado.' });
    db.prepare('UPDATE prohibited_items SET name = ?, category = ?, note = ?, active = ? WHERE id = ?').run(
      body.name ?? before.name,
      body.category ?? before.category,
      body.note ?? before.note,
      body.active === undefined ? before.active : (body.active ? 1 : 0),
      params.id
    );
    auditLog(db, admin.id, 'editar_objeto_prohibido', params.id, JSON.stringify(before), JSON.stringify(body));
    res.json({ ok: true });
  });

  // --- Operaciones (para revisión administrativa) ---
  router.get('/api/admin/operations', async (req, res, body, params, query) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    let sql = 'SELECT * FROM bookings WHERE 1=1';
    const args = [];
    if (query.status) { sql += ' AND status = ?'; args.push(query.status); }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    res.json({ operations: db.prepare(sql).all(...args) });
  });

  router.get('/api/admin/disputes', async (req, res, body, params, query) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    let sql = 'SELECT * FROM disputes WHERE 1=1';
    const args = [];
    if (query.status) { sql += ' AND status = ?'; args.push(query.status); }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    res.json({ disputes: db.prepare(sql).all(...args) });
  });

  router.put('/api/admin/disputes/:id', async (req, res, body, params) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    const before = db.prepare('SELECT * FROM disputes WHERE id = ?').get(params.id);
    if (!before) return res.status(404).json({ error: 'Incidencia no encontrada.' });
    const now = new Date().toISOString();
    db.prepare('UPDATE disputes SET status = ?, admin_id = ?, updated_at = ? WHERE id = ?').run(
      body.status || before.status, admin.id, now, params.id
    );
    auditLog(db, admin.id, 'actualizar_incidencia', params.id, before.status, body.status);
    res.json({ ok: true });
  });

  // --- Usuarios y roles de administración (punto 46) ---
  router.get('/api/admin/users', async (req, res, body, params, query) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    let sql = 'SELECT id, name, surname, email, phone, role, identity_verified, active, created_at FROM users WHERE 1=1';
    const args = [];
    if (query.q) { sql += ' AND (name LIKE ? OR surname LIKE ? OR email LIKE ?)'; args.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`); }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    res.json({ users: db.prepare(sql).all(...args) });
  });

  router.put('/api/admin/users/:id/role', async (req, res, body, params) => {
    const admin = requireRole(req, res, db, ['superadmin']);
    if (!admin) return;
    const validRoles = ['user', 'admin', 'superadmin', 'soporte'];
    if (!validRoles.includes(body.role)) return res.status(400).json({ error: 'Rol no válido.' });
    const before = db.prepare('SELECT role FROM users WHERE id = ?').get(params.id);
    if (!before) return res.status(404).json({ error: 'Usuario no encontrado.' });
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(body.role, params.id);
    auditLog(db, admin.id, 'cambiar_rol_usuario', params.id, before.role, body.role);
    res.json({ ok: true });
  });

  router.put('/api/admin/users/:id/active', async (req, res, body, params) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    const before = db.prepare('SELECT active FROM users WHERE id = ?').get(params.id);
    if (!before) return res.status(404).json({ error: 'Usuario no encontrado.' });
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(body.active ? 1 : 0, params.id);
    auditLog(db, admin.id, 'activar_desactivar_usuario', params.id, before.active, body.active ? 1 : 0);
    res.json({ ok: true });
  });

  // --- Auditoría (punto 48) ---
  router.get('/api/admin/audit-log', async (req, res) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    res.json({ audit_log: db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 300').all() });
  });

  // --- Editor de textos legales (punto 45) ---
  router.post('/api/admin/legal-documents', async (req, res, body) => {
    const admin = requireRole(req, res, db, ['superadmin', 'admin']);
    if (!admin) return;
    const { doc_type, version, content } = body;
    if (!doc_type || !version || !content) return res.status(400).json({ error: 'Faltan doc_type, version o content.' });
    const id = newId('legal');
    db.prepare('INSERT INTO legal_documents (id, doc_type, version, content, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, doc_type, version, content, admin.id, new Date().toISOString());
    auditLog(db, admin.id, 'publicar_documento_legal', doc_type, null, version);
    res.status(201).json({ id });
  });

  router.get('/api/admin/legal-documents/:doc_type/history', async (req, res, body, params) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    res.json({ history: db.prepare('SELECT id, doc_type, version, created_by, created_at FROM legal_documents WHERE doc_type = ? ORDER BY created_at DESC').all(params.doc_type) });
  });

  // --- Muestras de precio de referencia (para el baremo del punto 16) ---
  router.post('/api/admin/pricing-samples', async (req, res, body) => {
    const admin = requireRole(req, res, db, ['superadmin', 'admin']);
    if (!admin) return;
    const { origin_island, destination_island, source, price } = body;
    if (!origin_island || !destination_island || !source || price == null) {
      return res.status(400).json({ error: 'Faltan campos: origin_island, destination_island, source, price.' });
    }
    const id = newId('psample');
    db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, `${origin_island}-${destination_island}`, source, Number(price), new Date().toISOString());
    auditLog(db, admin.id, 'anadir_muestra_precio', id, null, `${origin_island}-${destination_island}: ${price}€ (${source})`);
    res.status(201).json({ id });
  });

  // --- Exportación (punto 64) ---
  router.get('/api/admin/export/:entity', async (req, res, body, params) => {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    const allowed = { operaciones: 'bookings', usuarios: 'users', pagos: 'payments', incidencias: 'disputes' };
    const table = allowed[params.entity];
    if (!table) return res.status(400).json({ error: 'Entidad no exportable.' });
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 5000`).all();
    if (rows.length === 0) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.end('');
      return;
    }
    const headers = Object.keys(rows[0]).filter((h) => !['password_hash', 'password_salt'].includes(h));
    const csvLines = [headers.join(',')];
    for (const row of rows) {
      csvLines.push(headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${params.entity}.csv"`);
    res.end(csvLines.join('\n'));
  });
}

module.exports = { register };
