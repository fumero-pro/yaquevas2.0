'use strict';
// SMS transaccional vía Twilio (https://twilio.com) — API REST simple por HTTP, sin SDK ni
// dependencia nueva de npm (fetch nativo). Mismo patrón que lib/email.js, lib/payments.js e
// lib/identity.js: sin las variables de entorno configuradas, se simula (se registra en consola,
// nunca falla la petición que lo dispara) — ver docs/SMS_SETUP.md para conectar una cuenta real.

function isSmsConfigured() {
  return !!(process.env.SMS_ACCOUNT_SID && process.env.SMS_AUTH_TOKEN && process.env.SMS_FROM_NUMBER);
}

async function sendSms({ to, body }) {
  if (!isSmsConfigured()) {
    console.log(`[SMS SIMULADO] Para: ${to} | Texto: ${body}`);
    return { simulado: true };
  }
  const sid = process.env.SMS_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${process.env.SMS_AUTH_TOKEN}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: process.env.SMS_FROM_NUMBER, Body: body }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Error enviando SMS (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return { simulado: false, id: data.sid };
}

module.exports = { isSmsConfigured, sendSms };
