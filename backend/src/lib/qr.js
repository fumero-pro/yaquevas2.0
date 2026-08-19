'use strict';
const crypto = require('crypto');
const QRCode = require('qrcode');

// Genera un token de QR único, impredecible y de un solo uso, más un código numérico
// de respaldo de 6 dígitos para cuando no se pueda escanear (sin cámara, sin batería, etc.).

function generateQrToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function generateBackupCode() {
  // 6 dígitos, fácil de dictar/teclear
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
}

// Genera un QR real y escaneable (PNG como data URL) para el token dado.
async function renderQrDataUrl(token) {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: { dark: '#0A3D8F', light: '#FFFFFF' },
  });
}

module.exports = { generateQrToken, generateBackupCode, renderQrDataUrl };
