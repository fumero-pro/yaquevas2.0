'use strict';
const { verifyToken } = require('../lib/auth');

async function getUserFromRequest(req, db) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.sub) return null;
  const user = await db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(payload.sub);
  return user || null;
}

async function requireAuth(req, res, db) {
  const user = await getUserFromRequest(req, db);
  if (!user) {
    res.status(401).json({ error: 'No autenticado. Inicia sesión.' });
    return null;
  }
  return user;
}

async function requireAdmin(req, res, db) {
  const user = await requireAuth(req, res, db);
  if (!user) return null;
  if (!['admin', 'superadmin', 'soporte'].includes(user.role)) {
    res.status(403).json({ error: 'No tienes permisos de administración.' });
    return null;
  }
  return user;
}

async function requireRole(req, res, db, roles) {
  const user = await requireAuth(req, res, db);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: 'No tienes permisos suficientes para esta acción.' });
    return null;
  }
  return user;
}

module.exports = { getUserFromRequest, requireAuth, requireAdmin, requireRole };
