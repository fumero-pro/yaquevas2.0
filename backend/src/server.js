'use strict';
const http = require('http');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

const { db } = require('./db');
const { createRouter, readJsonBody, readRawBody, attachHelpers } = require('./lib/http');

const router = createRouter();
require('./routes/auth').register(router, db);
require('./routes/trips').register(router, db);
require('./routes/shipments').register(router, db);
require('./routes/matching').register(router, db);
require('./routes/bookings').register(router, db);
require('./routes/chat').register(router, db);
require('./routes/trust').register(router, db);
require('./routes/misc').register(router, db);
require('./routes/admin').register(router, db);
require('./routes/webhooks').register(router, db);

// Rutas que necesitan el cuerpo de la petición SIN parsear (verificación de firma de
// webhooks de Stripe, que se calcula sobre los bytes exactos recibidos).
const RAW_BODY_PATHS = new Set(['/api/webhooks/stripe']);

const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  let fullPath = path.join(FRONTEND_DIR, filePath);

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    // multi-page site: si no existe el archivo exacto, probamos con .html
    if (fs.existsSync(fullPath + '.html')) {
      fullPath = fullPath + '.html';
    } else {
      res.status(404);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<h1>404</h1><p>Página no encontrada.</p>');
      return;
    }
  }
  const ext = path.extname(fullPath);
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  fs.createReadStream(fullPath).pipe(res);
}

// Cabeceras de seguridad HTTP básicas (LAUNCH_CHECKLIST.md), aplicadas a toda respuesta.
// CSP permite 'unsafe-inline' en script/style porque el frontend actual usa <script> y
// style="" inline en las páginas HTML sin build; migrar a nonces es una mejora futura, no
// un motivo para dejar la cabecera sin poner. Google Fonts es el único origen externo real.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

const server = http.createServer(async (req, res) => {
  attachHelpers(res);
  res.setHeader('X-Powered-By', 'YaQueVas');
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);

  const fullUrl = new URL(req.url, 'http://localhost');
  const pathname = fullUrl.pathname;
  const query = Object.fromEntries(fullUrl.searchParams.entries());

  // Deep links (docs sección "compartir"): /operacion/123 -> /operacion.html?id=123, y lo
  // mismo para viaje/envío/perfil. Un enlace corto y legible que hoy resuelve a la web y
  // mañana puede interceptar una app nativa (universal links) sin cambiar la URL compartida.
  const DEEP_LINK_PAGES = { operacion: 'operacion', viaje: 'viaje', envio: 'envio', perfil: 'perfil' };
  const deepLinkMatch = pathname.match(/^\/(operacion|viaje|envio|perfil)\/([A-Za-z0-9_-]+)\/?$/);
  if (deepLinkMatch) {
    const [, kind, id] = deepLinkMatch;
    res.statusCode = 302;
    res.setHeader('Location', `/${DEEP_LINK_PAGES[kind]}.html?id=${encodeURIComponent(id)}`);
    res.end();
    return;
  }

  if (pathname.startsWith('/api/')) {
    const matched = router.match(req.method, pathname);
    if (!matched) {
      res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${pathname}` });
      return;
    }
    try {
      let body = {};
      if (RAW_BODY_PATHS.has(pathname)) {
        body = await readRawBody(req);
      } else if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        body = await readJsonBody(req);
      }
      await matched.handler(req, res, body, matched.params, query);
    } catch (err) {
      console.error('Error en', req.method, pathname, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error interno del servidor.', detalle: err.message });
      }
    }
    return;
  }

  serveStatic(req, res, pathname);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`YaQueVas backend escuchando en http://localhost:${PORT}`);
  console.log('Modo DEMOSTRACIÓN activo: pagos, KYC y WhatsApp están simulados.');
});
