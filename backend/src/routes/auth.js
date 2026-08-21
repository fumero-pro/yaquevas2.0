'use strict';
const { hashPassword, verifyPassword, signToken, newId } = require('../lib/auth');
const { requireAuth } = require('../middleware/auth');
const { rateLimiter } = require('../lib/rateLimit');
const { isIdentityConfigured, createVerificationSession } = require('../lib/identity');
const { generateReferralCode, resolveReferrer, peekAvailableDiscount } = require('../lib/referral');
const { getConfigValue } = require('../lib/config');
const { sendEmail, welcomeEmailHtml } = require('../lib/email');
const { createResetToken, findValidResetToken, consumeResetToken } = require('../lib/passwordReset');
const { createVerificationToken, consumeVerificationToken } = require('../lib/emailVerification');
const { isSmsConfigured, sendSms } = require('../lib/sms');
const { createPhoneCode, verifyPhoneCode } = require('../lib/phoneVerification');

// Mitiga fuerza bruta de credenciales (LAUNCH_CHECKLIST.md): 10 intentos de login o registro
// por IP cada 5 minutos. No distingue email correcto/incorrecto para no filtrar qué cuentas existen.
const loginLimiter = rateLimiter({ windowMs: 5 * 60_000, max: 10, keyPrefix: 'login' });
const registerLimiter = rateLimiter({ windowMs: 5 * 60_000, max: 10, keyPrefix: 'register' });
// Cada sesión de Stripe Identity real tiene coste — sin límite, una cuenta autenticada podría
// generar sesiones en bucle. 5 cada 10 min es de sobra para un uso legítimo (se corta en cuanto
// identity_verified pasa a 1, así que esto solo protege el rato antes de verificarse).
const identityLimiter = rateLimiter({ windowMs: 10 * 60_000, max: 5, keyPrefix: 'identity' });
const forgotPasswordLimiter = rateLimiter({ windowMs: 15 * 60_000, max: 5, keyPrefix: 'forgot_password' });
const resendVerificationLimiter = rateLimiter({ windowMs: 15 * 60_000, max: 5, keyPrefix: 'resend_verification' });
// Cada código de SMS real tiene coste con Twilio configurado — igual de estricto que identityLimiter.
const phoneCodeLimiter = rateLimiter({ windowMs: 10 * 60_000, max: 5, keyPrefix: 'phone_code' });

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
    referral_code: u.referral_code,
    created_at: u.created_at,
  };
}

function register(router, db) {
  router.post('/api/auth/register', async (req, res, body) => {
    if (!registerLimiter(req)) {
      return res.status(429).json({ error: 'Demasiados intentos de registro. Inténtalo de nuevo en unos minutos.' });
    }
    const { name, surname, email, phone, password, country, accepted_terms, referral_code } = body;
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
    // Quien invitó a esta persona (si vino de un enlace de referido válido) — la recompensa no
    // se paga aquí, solo se guarda quién invitó a quién. Se paga al completar la primera
    // operación real (ver lib/referral.js), nunca en el registro (lección del fraude de bots
    // de PayPal, ver docs/VIRALIDAD_REFERIDOS.md).
    const referrer = resolveReferrer(db, referral_code);
    const myReferralCode = generateReferralCode(name);
    db.prepare(
      `INSERT INTO users (id, name, surname, email, phone, password_hash, password_salt, country, role, referral_code, referred_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?, ?)`
    ).run(id, name, surname, email.toLowerCase(), phone || null, hash, salt, country || 'ES', myReferralCode, referrer ? referrer.id : null, now);

    // Registrar aceptación de términos con versión (punto 45/35)
    const termsDoc = db.prepare("SELECT version FROM legal_documents WHERE doc_type = 'terminos' ORDER BY created_at DESC LIMIT 1").get();
    db.prepare(
      `INSERT INTO legal_acceptances (id, user_id, doc_type, version, accepted_at) VALUES (?, ?, 'terminos', ?, ?)`
    ).run(newId('acc'), id, termsDoc ? termsDoc.version : 'v1', now);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = signToken({ sub: id, role: user.role });
    // Fire-and-forget: un fallo de email nunca debe bloquear ni romper el registro en sí. Un solo
    // email de bienvenida que incluye ya el enlace de confirmación (antes eran ideas separadas,
    // pero mandar dos emails en el mismo minuto a alguien recién registrado es peor experiencia).
    const verifyToken = createVerificationToken(db, id);
    const verifyUrl = `${process.env.PUBLIC_APP_URL || req.headers.origin || ''}/verificar-email.html?token=${verifyToken}`;
    sendEmail({ to: user.email, subject: '¡Bienvenido a YaQueVas! Confirma tu email', html: welcomeEmailHtml(user.name, verifyUrl) })
      .catch((err) => console.error('No se pudo enviar el email de bienvenida:', err.message));
    res.status(201).json({ token, user: publicUser(user) });
  });

  // Confirma el email a partir del enlace de la sección anterior. Público (el propio token,
  // largo y de un solo uso, es la prueba de identidad — igual que reset-password).
  router.post('/api/auth/verify-email', async (req, res, body) => {
    const { token } = body;
    if (!token) return res.status(400).json({ error: 'Falta el token de confirmación.' });
    const row = consumeVerificationToken(db, token);
    if (!row) return res.status(400).json({ error: 'Este enlace no es válido o ha caducado. Pide uno nuevo desde tu cuenta.' });
    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(row.user_id);
    res.json({ ok: true, mensaje: 'Email confirmado.' });
  });

  router.post('/api/auth/resend-verification', async (req, res) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    if (!resendVerificationLimiter(req)) {
      return res.status(429).json({ error: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' });
    }
    if (user.email_verified) return res.json({ ya_verificado: true });
    const verifyToken = createVerificationToken(db, user.id);
    const verifyUrl = `${process.env.PUBLIC_APP_URL || req.headers.origin || ''}/verificar-email.html?token=${verifyToken}`;
    sendEmail({
      to: user.email, subject: 'Confirma tu email de YaQueVas',
      html: `
        <div style="font-family:sans-serif; max-width:480px; margin:0 auto; color:#14181F;">
          <h1 style="color:#0B5FFF; font-size:20px;">Confirma tu email</h1>
          <p>Hola ${user.name}, pulsa el botón para confirmar tu email. El enlace caduca en 48 horas.</p>
          <p style="margin-top:24px;"><a href="${verifyUrl}" style="background:#FF6B4A;color:#14181F;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Confirmar email</a></p>
        </div>
      `,
    }).catch((err) => console.error('No se pudo reenviar el email de confirmación:', err.message));
    res.json({ ok: true, mensaje: 'Te hemos enviado un email de confirmación.' });
  });

  // Verificación de teléfono por código de 6 dígitos (SMS real con Twilio configurado, si no,
  // modo simulado — se ve en los logs del servidor, igual que el resto de integraciones).
  router.post('/api/me/phone/send-code', async (req, res) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    if (!phoneCodeLimiter(req)) {
      return res.status(429).json({ error: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' });
    }
    if (!user.phone) return res.status(400).json({ error: 'Añade primero un número de teléfono en tu perfil.' });
    if (user.phone_verified) return res.json({ ya_verificado: true });
    const code = createPhoneCode(db, user.id, user.phone);
    await sendSms({ to: user.phone, body: `Tu código de verificación de YaQueVas es: ${code} (caduca en 10 minutos).` })
      .catch((err) => console.error('No se pudo enviar el SMS de verificación:', err.message));
    res.json({ ok: true, modo_demo: !isSmsConfigured(), mensaje: 'Te hemos enviado un código por SMS.' });
  });

  router.post('/api/me/phone/verify-code', async (req, res, body) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const { code } = body;
    if (!code) return res.status(400).json({ error: 'Introduce el código que te hemos enviado.' });
    const result = verifyPhoneCode(db, user.id, user.phone, code);
    if (result === 'ok') {
      db.prepare('UPDATE users SET phone_verified = 1 WHERE id = ?').run(user.id);
      return res.json({ ok: true, mensaje: 'Teléfono confirmado.' });
    }
    const messages = {
      invalido: 'Código incorrecto.',
      caducado: 'Este código ha caducado. Pide uno nuevo.',
      demasiados_intentos: 'Demasiados intentos con este código. Pide uno nuevo.',
    };
    res.status(400).json({ error: messages[result] || 'No se ha podido confirmar el código.' });
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
    let user = requireAuth(req, res, db);
    if (!user) return;
    // Backfill para cuentas creadas antes de que existiera el programa de referidos (la
    // migración solo añade la columna, no rellena un código para quien ya existía).
    if (!user.referral_code) {
      const code = generateReferralCode(user.name);
      db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }
    res.json({ user: publicUser(user) });
  });

  router.get('/api/me/referral', async (req, res) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const referred = db.prepare(
      `SELECT u.id, u.name, u.surname, u.created_at,
              rr.discount_pct, rr.status, rr.created_at AS reward_at
       FROM users u LEFT JOIN referral_rewards rr ON rr.referred_id = u.id
       WHERE u.referred_by = ? ORDER BY u.created_at DESC`
    ).all(user.id);
    const creditosPendientes = db.prepare(
      "SELECT COUNT(*) AS n FROM referral_rewards WHERE referrer_id = ? AND referrer_redeemed = 0 AND discount_pct IS NOT NULL"
    ).get(user.id).n;
    res.json({
      referral_code: user.referral_code,
      reward_pct: Number(getConfigValue(db, 'referral_reward_pct') || 5),
      descuento_disponible_pct: peekAvailableDiscount(db, user.id),
      creditos_pendientes: creditosPendientes,
      invitados: referred.map((r) => ({
        nombre: `${r.name} ${r.surname}`.trim(),
        se_unio: r.created_at,
        completo_primera_operacion: !!r.status,
        descuento_pct: r.discount_pct || null,
      })),
    });
  });

  // Recuperación de contraseña. Respuesta genérica siempre (exista o no la cuenta) para no
  // filtrar qué emails están registrados — mismo criterio que login/register.
  router.post('/api/auth/forgot-password', async (req, res, body) => {
    if (!forgotPasswordLimiter(req)) {
      return res.status(429).json({ error: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' });
    }
    const { email } = body;
    const generic = { ok: true, mensaje: 'Si existe una cuenta con ese email, hemos enviado un enlace para restablecer la contraseña.' };
    if (!email) return res.status(400).json({ error: 'Email requerido.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(String(email).toLowerCase());
    if (!user) return res.json(generic); // misma respuesta exista o no, a propósito

    const rawToken = createResetToken(db, user.id);
    const resetUrl = `${process.env.PUBLIC_APP_URL || req.headers.origin || ''}/restablecer.html?token=${rawToken}`;
    sendEmail({
      to: user.email,
      subject: 'Restablece tu contraseña de YaQueVas',
      html: `
        <div style="font-family:sans-serif; max-width:480px; margin:0 auto; color:#14181F;">
          <h1 style="color:#0B5FFF;">Restablece tu contraseña</h1>
          <p>Hola ${user.name},</p>
          <p>Pulsa el botón de abajo para elegir una contraseña nueva. El enlace caduca en 1 hora
          y solo se puede usar una vez.</p>
          <p style="margin-top:24px;"><a href="${resetUrl}" style="background:#FF6B4A;color:#14181F;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Elegir nueva contraseña</a></p>
          <p style="margin-top:24px; color:#5B6472; font-size:0.85rem;">Si no has pedido esto, ignora este email — tu contraseña actual sigue funcionando igual.</p>
        </div>
      `,
    }).catch((err) => console.error('No se pudo enviar el email de recuperación:', err.message));

    res.json(generic);
  });

  router.post('/api/auth/reset-password', async (req, res, body) => {
    const { token, password } = body;
    if (!token || !password) return res.status(400).json({ error: 'Faltan datos.' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });

    const reset = findValidResetToken(db, token);
    if (!reset) return res.status(400).json({ error: 'Este enlace no es válido o ha caducado. Pide uno nuevo.' });

    const { hash, salt } = hashPassword(password);
    db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(hash, salt, reset.user_id);
    consumeResetToken(db, reset.id);
    res.json({ ok: true, mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión con la nueva.' });
  });

  // Verificación de identidad (DNI/pasaporte + biometría). Con STRIPE_SECRET_KEY configurada
  // crea una sesión real de Stripe Identity (modo test = sin coste) y devuelve la URL alojada
  // por Stripe donde el usuario sube su documento; el estado se confirma por webhook, nunca
  // aquí mismo. Sin esa variable, sigue el modo simulado de siempre: verificación instantánea,
  // etiquetada como demo, tal y como ya hacía el seed de datos de ejemplo.
  router.post('/api/me/identity/start', async (req, res, body) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    if (!identityLimiter(req)) {
      return res.status(429).json({ error: 'Demasiados intentos de verificación. Inténtalo de nuevo en unos minutos.' });
    }
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
