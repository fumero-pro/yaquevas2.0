// YaQueVas — cliente de API compartido por todas las páginas.
// Usa localStorage para guardar la sesión (esto es una web app normal
// servida por nuestro propio backend, no un artifact de Claude, así que
// localStorage funciona con normalidad en el navegador del usuario).

const YQV = (() => {
  const TOKEN_KEY = 'yqv_token';
  const USER_KEY = 'yqv_user';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function isLoggedIn() { return !!getToken(); }
  function isAdmin() {
    const u = getUser();
    return u && ['admin', 'superadmin', 'soporte'].includes(u.role);
  }

  async function api(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && getToken()) headers['Authorization'] = `Bearer ${getToken()}`;
    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => null);
    }
    if (!res.ok) {
      const message = (data && data.error) ? data.error : `Error ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // Conservado por compatibilidad de código antiguo; los formularios ya no usan este array
  // fijo, consumen el catálogo real del backend (ver fetchLocationGroups/populateLocationSelects)
  // para que Cuba (y cualquier país futuro) aparezca sin tocar el frontend.
  const ISLANDS = ['Tenerife', 'Gran Canaria', 'La Palma', 'La Gomera', 'El Hierro', 'Fuerteventura', 'Lanzarote', 'La Graciosa'];

  let _locationGroupsCache = null;
  async function fetchLocationGroups() {
    if (_locationGroupsCache) return _locationGroupsCache;
    const [countriesRes, locationsRes] = await Promise.all([
      api('/api/geo/countries', { auth: false }),
      api('/api/geo/locations', { auth: false }),
    ]);
    const byCountry = {};
    for (const loc of locationsRes.locations) {
      (byCountry[loc.country_id] = byCountry[loc.country_id] || []).push(loc);
    }
    _locationGroupsCache = countriesRes.countries
      .filter((c) => byCountry[c.id] && byCountry[c.id].length)
      .map((c) => ({ country: c, locations: byCountry[c.id] }));
    return _locationGroupsCache;
  }

  function locationOptionsHtml(groups) {
    return groups.map((g) => `<optgroup label="${escapeHtml(g.country.name)}">${
      g.locations.map((l) => `<option value="${escapeHtml(l.name)}">${escapeHtml(l.name)}</option>`).join('')
    }</optgroup>`).join('');
  }

  // Rellena uno o varios <select> con el catálogo real (islas de Canarias + provincias de
  // Cuba, agrupadas por país). append=true conserva las <option> ya presentes en el HTML
  // (p.ej. un "Todas" inicial en los filtros de búsqueda).
  async function populateLocationSelects(selects, { append = false } = {}) {
    const groups = await fetchLocationGroups();
    const html = locationOptionsHtml(groups);
    selects.forEach((sel) => { sel.innerHTML = append ? sel.innerHTML + html : html; });
    return groups;
  }
  const TRANSPORT_LABELS = {
    get avion() { return `${YQVIcons.svg('plane', { size: 15 })} Avión`; },
    get barco() { return `${YQVIcons.svg('ship', { size: 15 })} Barco`; },
    get coche() { return `${YQVIcons.svg('car', { size: 15 })} Coche`; },
  };
  const STATUS_LABELS = {
    borrador: 'Borrador', publicado: 'Publicado', buscando_viajero: 'Buscando viajero',
    solicitud_recibida: 'Solicitud recibida', solicitado: 'Solicitado', aceptado: 'Aceptado',
    pago_realizado: 'Pago realizado', preparado: 'Preparado', recogido: 'Recogido',
    en_transito: 'En tránsito', listo_entrega: 'Listo para entrega', entregado: 'Entregado',
    pago_liberado: 'Pago liberado', finalizado: 'Finalizado', rechazado: 'Rechazado',
    cancelado: 'Cancelado', incidencia: 'Incidencia', disputa: 'En disputa', bloqueado: 'Bloqueado',
  };

  function fmtEur(n) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }
  function fmtDate(d) {
    try { return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }
  function fmtDateTime(d) {
    try { return new Date(d).toLocaleString('es-ES'); } catch { return d; }
  }

  // Escapa contenido de usuario antes de interpolarlo en innerHTML (evita XSS almacenado).
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const child of [].concat(children)) {
      if (child == null) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function toast(msg, type = 'info') {
    let box = document.getElementById('yqv-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'yqv-toast';
      box.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:999;display:flex;flex-direction:column;gap:8px;align-items:center;';
      document.body.appendChild(box);
    }
    const colors = { info: '#0B5FFF', error: '#DC3545', ok: '#16A34A' };
    const item = document.createElement('div');
    item.textContent = msg;
    item.style.cssText = `background:${colors[type] || colors.info};color:white;padding:12px 18px;border-radius:10px;font-family:Inter,sans-serif;font-size:0.9rem;box-shadow:0 6px 18px rgba(0,0,0,0.2);max-width:90vw;`;
    box.appendChild(item);
    setTimeout(() => item.remove(), 4200);
  }

  async function share({ title, text, url }) {
    const fullUrl = url || window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, text, url: fullUrl }); return; } catch (e) { /* usuario canceló, no hacer nada */ return; }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${fullUrl}`);
      toast('Enlace copiado. Pégalo donde quieras compartirlo.', 'ok');
    } catch (e) {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${fullUrl}`)}`, '_blank');
    }
  }

  function requireLoginOrRedirect() {
    if (!isLoggedIn()) {
      window.location.href = `/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return false;
    }
    return true;
  }

  return {
    api, getToken, getUser, setSession, clearSession, isLoggedIn, isAdmin,
    ISLANDS, TRANSPORT_LABELS, STATUS_LABELS, fmtEur, fmtDate, fmtDateTime, el, toast, share, escapeHtml,
    requireLoginOrRedirect, fetchLocationGroups, locationOptionsHtml, populateLocationSelects,
  };
})();
