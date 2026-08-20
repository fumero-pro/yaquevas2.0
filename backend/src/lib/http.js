'use strict';
// Router minimalista basado únicamente en node:http, para no depender de "npm install"
// (este contenedor no tiene acceso a red). Si en producción se prefiere Express,
// las funciones (req, res) de cada ruta son fácilmente portables: solo cambia el registro.

function splitPath(p) {
  return p.split('?')[0].split('/').filter(Boolean);
}

function createRouter() {
  const routes = []; // {method, segments, handler}

  function register(method, pattern, handler) {
    routes.push({ method, segments: splitPath(pattern), handler });
  }

  function match(method, urlPath) {
    const segments = splitPath(urlPath);
    for (const route of routes) {
      if (route.method !== method) continue;
      if (route.segments.length !== segments.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < segments.length; i++) {
        const rs = route.segments[i];
        if (rs.startsWith(':')) {
          params[rs.slice(1)] = decodeURIComponent(segments[i]);
        } else if (rs !== segments[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return { handler: route.handler, params };
    }
    return null;
  }

  return {
    get: (p, h) => register('GET', p, h),
    post: (p, h) => register('POST', p, h),
    put: (p, h) => register('PUT', p, h),
    delete: (p, h) => register('DELETE', p, h),
    match,
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 10 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Cuerpo de la petición demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

// Cuerpo SIN parsear, para endpoints que necesitan los bytes exactos (verificación de firma
// de webhooks de Stripe: constructEvent recalcula el HMAC sobre el body tal cual llegó).
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) { req.destroy(); reject(new Error('Cuerpo de webhook demasiado grande')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function attachHelpers(res) {
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (obj) {
    const body = JSON.stringify(obj);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(body);
  };
  return res;
}

module.exports = { createRouter, readJsonBody, readRawBody, attachHelpers };
