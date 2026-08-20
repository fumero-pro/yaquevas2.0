'use strict';
// Email transaccional vía Resend (https://resend.com) — API REST simple por HTTP, sin SDK ni
// dependencia nueva de npm (usa fetch nativo de Node ≥18, ya lo requiere el proyecto). Mismo
// patrón que lib/payments.js e lib/identity.js: sin la variable de entorno configurada, se
// simula (se registra en consola, nunca falla la petición que lo dispara) — ver
// docs/EMAIL_SETUP.md para cómo conectar una cuenta real gratuita.

function isEmailConfigured() {
  return !!(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM);
}

async function sendEmail({ to, subject, html }) {
  if (!isEmailConfigured()) {
    console.log(`[EMAIL SIMULADO] Para: ${to} | Asunto: ${subject}`);
    return { simulado: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Error enviando email (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return { simulado: false, id: data.id };
}

function welcomeEmailHtml(name) {
  return `
    <div style="font-family:sans-serif; max-width:480px; margin:0 auto; color:#14181F;">
      <h1 style="color:#0B5FFF;">Ya que vas, gana.</h1>
      <p>Hola ${name},</p>
      <p>Bienvenido/a a YaQueVas. Ya puedes publicar un viaje que ya tenías pensado hacer, o
      buscar quién te lleve un envío entre las Islas Canarias — y hacia Cuba.</p>
      <p>Un consejo: invita a alguien con tu enlace de referido desde "Mi cuenta" — cuando esa
      persona complete su primera operación, ganáis dinero real los dos.</p>
      <p style="margin-top:24px;"><a href="${process.env.PUBLIC_APP_URL || ''}" style="background:#FF6B4A;color:#14181F;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Entrar en YaQueVas</a></p>
    </div>
  `;
}

module.exports = { isEmailConfigured, sendEmail, welcomeEmailHtml };
