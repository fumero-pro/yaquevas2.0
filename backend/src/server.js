'use strict';
const http = require('http');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

const { db } = require('./db');
const { createRouter, readJsonBody, attachHelpers } = require('./lib/http');

const router = createRouter();
require('./routes/auth').register(router, db);
require('./routes/trips').register(router, db);
require('./routes/shipments').register(router, db);
require('./routes/matching').register(router, db);
require('./routes/bookings').register(router, db);
require('./routes/chat').register(router, db);
require('./routes/misc').register(router, db);
require('./routes/admin').register(router, db);

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

const server = http.createServer(async (req, res) => {
  attachHelpers(res);
  res.setHeader('X-Powered-By', 'YaQueVas');

  const fullUrl = new URL(req.url, 'http://localhost');
  const pathname = fullUrl.pathname;
  const query = Object.fromEntries(fullUrl.searchParams.entries());

  if (pathname.startsWith('/api/')) {
    const matched = router.match(req.method, pathname);
    if (!matched) {
      res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${pathname}` });
      return;
    }
    try {
      let body = {};
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
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
