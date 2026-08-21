'use strict';
// Notificaciones internas (tabla `notifications`, ya mostradas en el icono de campana del
// frontend) + email real si la persona lo tiene activado en sus preferencias. Antes esta función
// estaba duplicada e idéntica en routes/bookings.js y routes/chat.js, y solo escribía en BD —
// notif_prefs.email podía estar activado sin que nunca se enviara un email de verdad.
const { newId } = require('./auth');
const { sendEmail } = require('./email');

function notificationEmailHtml(title, bodyText) {
  return `
    <div style="font-family:sans-serif; max-width:480px; margin:0 auto; color:#14181F;">
      <h1 style="color:#0B5FFF; font-size:20px;">${title}</h1>
      <p>${bodyText || ''}</p>
      <p style="margin-top:24px;"><a href="${process.env.PUBLIC_APP_URL || ''}/mi-cuenta.html" style="background:#FF6B4A;color:#14181F;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Ver en YaQueVas</a></p>
    </div>
  `;
}

async function notify(db, userId, type, title, bodyText, relatedId) {
  await db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, related_type, related_id, created_at)
     VALUES (?, ?, ?, ?, ?, 'booking', ?, ?)`
  ).run(newId('notif'), userId, type, title, bodyText || '', relatedId || null, new Date().toISOString());

  // Fire-and-forget, igual que el resto de envíos de email del proyecto (auth.js): un fallo de
  // email nunca debe romper el flujo (pago, entrega, chat...) que disparó la notificación.
  const user = await db.prepare('SELECT email, notif_prefs_json FROM users WHERE id = ?').get(userId);
  if (!user || !user.email) return;
  let prefs;
  try { prefs = JSON.parse(user.notif_prefs_json); } catch { prefs = {}; }
  if (!prefs.email) return;
  sendEmail({ to: user.email, subject: title, html: notificationEmailHtml(title, bodyText) })
    .catch((err) => console.error(`No se pudo enviar el email de notificación (${type}):`, err.message));
}

module.exports = { notify };
