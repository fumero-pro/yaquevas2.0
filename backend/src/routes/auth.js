'use strict';
const { hashPassword, verifyPassword, signToken, newId } = require('../lib/auth');
const { requireAuth } = require('../middleware/auth');
const { rateLimiter } = require('../lib/rateLimit');
const { isIdentityConfigured, createVerificationSession } = require('../lib/identity');

// Mitiga fuerza bruta de credenciales (LAUNCH_CHECKLIST.md): 10 intentos de login o registro
// por IP cada 5 minutos. No distingue email correcto/incorrecto para no filtrar qué cuentas existen.
const loginLimiter = rateLimiter({ windowMs: 5 * 60_000, max: 10, keyPrefix: 'login' });
const registerLimiter = rateLimiter({ windowMs: 5 * 60_000, max: 10, keyPrefix: 'register' });

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    surname: u.surname,
    email: u.email,
    phone: u.phone,
    role: u.role,
    email_verified: !!u.email_verified,
    phone_verified: !!u.phone_verified,
    identity_verified: !!u.identity_verified,
    notif_prefs: JSON.parse(u.notif_prefs_json),
    created_at: u.created_at,
  };
}

function register(router, db) {
  router.post('/api/auth/register', async (req, res, body) => {
    if (!registerLimiter(req)) {
      return res.status(429).json({ error: 'Demasiados intentos de registro. Inténtalo de nuevo en unos minutos.' });
    }
    const { name, surname, email, phone, password, country, accepted_terms } = body;
    if (!name || !surname || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, apellidos, email, contraseña.' });
    }
    if (!accepted_terms) {
      return res.status(400).json({ error: 'Debes aceptar los términos y la política de privacidad.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    }
    const { hash, salt } = hashPassword(password);
    const id = newId('usr');
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, name, surname, email, phone, password_hash, password_salt, country, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', ?)`
    ).run(id, name, surname, email.toLowerCase(), phone || null, hash, salt, country || 'ES', now);

    // Registrar aceptación de términos con versión (punto 45/35)
    const termsDoc = db.prepare("SELECT version FROM legal_documents WHERE doc_type = 'terminos' ORDER BY created_at DESC LIMIT 1").get();
    db.prepare(
      `INSERT INTO legal_acceptances (id, user_id, doc_type, version, accepted_at) VALUES (?, ?, 'terminos', ?, ?)`
    ).run(newId('acc'), id, termsDoc ? termsDoc.version : 'v1', now);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = signToken({ sub: id, role: user.role });
    res.status(201).json({ token, user: publicUser(user) });
  });

  router.post('/api/auth/login', async (req, res, body) => {
    if (!loginLimiter(req)) {
      return res.status(429).json({ error: 'Demasiados intentos de acceso. Inténtalo de nuevo en unos minutos.' });
    }
    const { email, password } = body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos.' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
    if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }
    if (!user.active) return res.status(403).json({ error: 'Cuenta desactivada.' });
    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: publicUser(user) });
  });

  router.get('/api/me', async (req, res) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    res.json({ user: publicUser(user) });
  });

  // Verificación de identidad (DNI/pasaporte + biometría). Con STRIPE_SECRET_KEY configurada
  // crea una sesión real de Stripe Identity (modo test = sin coste) y devuelve la URL alojada
  // por Stripe donde el usuario sube su documento; el estado se confirma por webhook, nunca
  // aquí mismo. Sin esa variable, sigue el modo simulado de siempre: verificación instantánea,
  // etiquetada como demo, tal y como ya hacía el seed de datos de ejemplo.
  router.post('/api/me/identity/start', async (req, res, body) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    if (user.identity_verified) return res.json({ ya_verificado: true });

    if (isIdentityConfigured()) {
      const baseUrl = `${req.headers.origin || ''}`;
      const { url } = await createVerificationSession(user, { returnUrl: `${baseUrl}/mi-cuenta.html?verificacion=completada` });
      return res.json({ modo_demo: false, verification_url: url });
    }

    db.prepare("UPDATE users SET identity_verified = 1, identity_provider_ref = ? WHERE id = ?").run(`DEMO-${newId('kyc')}`, user.id);
    res.json({ modo_demo: true, ya_verificado: true, aviso: 'Verificación simulada (MODO DEMOSTRACIÓN). Pendiente de conectar proveedor real.' });
  });

  router.put('/api/me/notifications', async (req, res, body) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const prefs = { push: !!body.push, email: !!body.email, whatsapp: !!body.whatsapp };
    db.prepare('UPDATE users SET notif_prefs_json = ? WHERE id = ?').run(JSON.stringify(prefs), user.id);
    res.json({ ok: true, notif_prefs: prefs });
  });
}

module.exports = { register, publicUser };
