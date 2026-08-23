'use strict';
// Validación de fotos compartida (bultos de un envío, prueba de entrega). Guardadas como
// data URI embebido en SQLite en esta versión de demostración — ver
// docs/LAUNCH_CHECKLIST.md ("almacenamiento en la nube pendiente de conectar").
const MAX_PHOTO_CHARS = 1.5 * 1024 * 1024; // ~1.5MB de texto base64 por foto

// Ancla TODA la cadena (prefijo Y payload), no solo el principio — un regex sin `$` al final
// dejaba colar cualquier cosa después del prefijo válido (ej. `data:image/png;base64,"><script>...`),
// que luego se guardaba tal cual y se interpolaba sin escapar en operacion.html: XSS almacenado
// con robo de sesión real. Bug real encontrado y corregido en la auditoría de seguridad.
const PHOTO_DATA_URI_RE = /^data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/;

function validatePhoto(photo) {
  if (!photo) return { ok: true, value: null };
  if (typeof photo !== 'string' || !PHOTO_DATA_URI_RE.test(photo)) {
    return { ok: false, error: 'Formato de foto no válido (debe ser PNG, JPG o WEBP).' };
  }
  if (photo.length > MAX_PHOTO_CHARS) {
    return { ok: false, error: 'La foto es demasiado grande (máximo ~1MB por foto).' };
  }
  return { ok: true, value: photo };
}

module.exports = { validatePhoto, MAX_PHOTO_CHARS };
