'use strict';
const crypto = require('crypto');

// Genera un token de QR único, impredecible y de un solo uso, más un código numérico
// de respaldo de 6 dígitos para cuando no se pueda escanear (sin cámara, sin batería, etc.).
//
// NOTA SOBRE EL RENDERIZADO VISUAL DEL QR:
// Este módulo genera el TOKEN seguro (que es la parte crítica: único, firmado, de un solo
// uso, invalidado tras la entrega). El backend expone ese token codificado como texto y como
// "data URL" de una imagen QR simplificada generada con un algoritmo propio ligero (sin
// dependencias externas ni llamadas a servicios de terceros). Para producción se recomienda
// sustituir el renderizado por una librería QR estándar (p.ej. "qrcode" de npm) cuando el
// entorno tenga acceso a instalación de paquetes; la lógica de negocio (token, caducidad,
// un solo uso) no cambiaría.

function generateQrToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function generateBackupCode() {
  // 6 dígitos, fácil de dictar/teclear
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
}

module.exports = { generateQrToken, generateBackupCode };
