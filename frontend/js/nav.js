// Inyecta la barra de navegación, el banner de modo demo y el pie de página
// en cualquier página que incluya #yqv-nav / #yqv-footer y cargue este script.
(function () {
  // Símbolo original: las 8 islas Canarias conectadas por una ruta (vuelto a pedir por el
  // usuario tras probar una alternativa — ver memoria del proyecto, no volver a cambiarlo
  // sin que lo pida explícitamente de nuevo).
  const ISLANDS_MARK = '<circle cx="50" cy="50" r="50" fill="{{BLUE}}"/><polyline points="26,69 28,46 34,60 46,50 55,60 66,50 71,31 70,23" stroke="{{YELLOW}}" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="26" cy="69" r="5.3" fill="{{YELLOW}}" stroke="{{BLUE}}" stroke-width="1"/><circle cx="28" cy="46" r="5.6" fill="{{YELLOW}}" stroke="{{BLUE}}" stroke-width="1"/><circle cx="34" cy="60" r="5.3" fill="{{YELLOW}}" stroke="{{BLUE}}" stroke-width="1"/><circle cx="46" cy="50" r="7.4" fill="{{YELLOW}}" stroke="{{BLUE}}" stroke-width="1"/><circle cx="55" cy="60" r="6.7" fill="{{YELLOW}}" stroke="{{BLUE}}" stroke-width="1"/><circle cx="66" cy="50" r="6" fill="{{YELLOW}}" stroke="{{BLUE}}" stroke-width="1"/><circle cx="71" cy="31" r="5.3" fill="{{YELLOW}}" stroke="{{BLUE}}" stroke-width="1"/><circle cx="70" cy="23" r="3.9" fill="{{YELLOW}}" stroke="{{BLUE}}" stroke-width="0.8"/>';
  const LOGO_SVG = '<span class="logo-mark"><svg width="30" height="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + ISLANDS_MARK.replace(/\{\{BLUE\}\}/g, '#0A3D8F').replace(/\{\{YELLOW\}\}/g, '#FFC72C') + '</svg></span>';

  function injectFavicon() {
    if (document.getElementById('yqv-favicon')) return;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + ISLANDS_MARK.replace(/\{\{BLUE\}\}/g, '%230A3D8F').replace(/\{\{YELLOW\}\}/g, '%23FFC72C') + '</svg>';
    const link = document.createElement('link');
    link.id = 'yqv-favicon';
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'data:image/svg+xml,' + svg;
    document.head.appendChild(link);
  }

  // PWA: manifest + icono de iOS + color de la barra del navegador, inyectados aquí en vez de
  // en las 20 páginas HTML una a una. El service worker solo cachea CSS/JS/iconos (nunca HTML
  // ni /api/, que son datos en vivo) — ver frontend/service-worker.js.
  function injectPwaMeta() {
    if (document.getElementById('yqv-manifest')) return;
    const manifestLink = document.createElement('link');
    manifestLink.id = 'yqv-manifest';
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);

    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = '/icons/apple-touch-icon.png';
    document.head.appendChild(appleTouchIcon);

    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#14181F';
    document.head.appendChild(themeColor);

    const appleCapable = document.createElement('meta');
    appleCapable.name = 'apple-mobile-web-app-capable';
    appleCapable.content = 'yes';
    document.head.appendChild(appleCapable);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Si falla (p. ej. servidor local sin HTTPS en algún entorno), la web sigue funcionando
      // igual — el service worker es solo una mejora de velocidad, nunca un requisito.
    });
  }

  // Detecta si el navegador puede instalar la PWA de verdad (Chrome/Edge/Android) para que el
  // botón "Descargar app" del home dispare la instalación nativa en vez de solo avisar que
  // "está en desarrollo" — ver el listener del botón en frontend/index.html.
  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });
  // Colgado del mismo objeto YQV que expone api.js (cargado antes que este script en todas las
  // páginas) para que index.html pueda llamar YQV.getInstallPrompt() desde su propio <script>.
  YQV.getInstallPrompt = () => deferredInstallPrompt;
  YQV.clearInstallPrompt = () => { deferredInstallPrompt = null; };

  function renderNav() {
    injectFavicon();
    const mount = document.getElementById('yqv-nav');
    if (!mount) return;
    const user = YQV.getUser();
    const isAdmin = YQV.isAdmin();

    mount.innerHTML = `
      <a href="#" class="skip-link" id="skipLink">Saltar al contenido</a>
      <div class="badge-demo-banner">MODO DEMOSTRACIÓN — datos, pagos y verificación simulados. Ninguna operación es real.</div>
      <div class="topbar">
        <div class="topbar-inner">
          <a class="logo" href="/index.html">${LOGO_SVG}<span class="logo-text"><span class="hash">#</span>Ya<span class="dot">Que</span>Vas</span></a>
          <button class="btn btn-outline nav-toggle" id="navToggleBtn" aria-label="Abrir menú" aria-expanded="false" aria-controls="navLinks">${YQVIcons.svg('menu', { size: 18 })}</button>
          <nav class="nav-links" id="navLinks">
            <a href="/como-funciona.html">Cómo funciona</a>
            <a href="/precios.html">Precios y tamaños</a>
            <a href="/enviar.html">Enviar algo</a>
            <a href="/ya-voy.html">Ya voy / tengo espacio</a>
            <a href="/buscar.html">Buscar</a>
            <a href="/faq.html">Ayuda</a>
            ${user ? `<div class="notif-bell-wrap" id="notifBellWrap">
              <button class="notif-bell" id="notifBellBtn" aria-label="Notificaciones" aria-haspopup="true" aria-expanded="false" aria-controls="notifDropdown">${YQVIcons.svg('bell', { size: 19 })}<span class="notif-count" id="notifCount" style="display:none;">0</span></button>
              <div class="notif-dropdown" id="notifDropdown">
                <div class="notif-dropdown-header">Notificaciones</div>
                <div class="notif-list" id="notifList"><div class="notif-empty">Cargando…</div></div>
              </div>
            </div>` : ''}
            ${user ? `<a href="/mi-cuenta.html">Mi cuenta (${user.name})</a>` : `<a href="/login.html">Acceder</a>`}
            ${user ? `<a href="#" id="logoutLink">Salir</a>` : `<a href="/registro.html" class="btn btn-primary" style="padding:10px 18px;">Crear cuenta</a>`}
            ${isAdmin ? `<a href="/admin.html">Administración</a>` : ''}
          </nav>
        </div>
      </div>
    `;
    // "Saltar al contenido" enfoca la primera sección real de la página (justo después de este
    // montaje) en vez de depender de un id="main" que habría que añadir a mano en las 20
    // páginas — así funciona en todas sin tocarlas una a una.
    const skipLink = document.getElementById('skipLink');
    if (skipLink) skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const main = mount.nextElementSibling;
      if (!main) return;
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      main.focus();
      main.scrollIntoView();
    });
    const toggle = document.getElementById('navToggleBtn');
    const links = document.getElementById('navLinks');
    if (toggle) toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    const logout = document.getElementById('logoutLink');
    if (logout) logout.addEventListener('click', (e) => {
      e.preventDefault();
      YQV.clearSession();
      window.location.href = '/index.html';
    });
    if (user) initNotifBell();
  }

  function notifTargetUrl(n) {
    if (n.related_type === 'booking' && n.related_id) return `/operacion.html?id=${n.related_id}`;
    return '/mi-cuenta.html';
  }

  async function initNotifBell() {
    const btn = document.getElementById('notifBellBtn');
    const dropdown = document.getElementById('notifDropdown');
    const countEl = document.getElementById('notifCount');
    const listEl = document.getElementById('notifList');
    if (!btn) return;

    let notifs = [];
    async function loadNotifs() {
      try {
        const data = await YQV.api('/api/notifications');
        notifs = data.notifications || [];
        renderList();
      } catch { /* silencioso: no bloquear la navegación por esto */ }
    }
    function renderList() {
      const unreadCount = notifs.filter((n) => !n.read).length;
      countEl.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
      countEl.style.display = unreadCount > 0 ? 'flex' : 'none';
      listEl.innerHTML = notifs.length === 0
        ? '<div class="notif-empty">No tienes notificaciones todavía.</div>'
        : notifs.slice(0, 12).map((n) => `
          <button class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
            <div class="notif-item-title">${YQV.escapeHtml(n.title)}</div>
            ${n.body ? `<div class="notif-item-body">${YQV.escapeHtml(n.body)}</div>` : ''}
            <div class="notif-item-time">${YQV.fmtDateTime(n.created_at)}</div>
          </button>
        `).join('');
      listEl.querySelectorAll('.notif-item').forEach((el) => {
        el.addEventListener('click', async () => {
          const n = notifs.find((x) => x.id === el.dataset.id);
          if (!n) return;
          if (!n.read) {
            try { await YQV.api(`/api/notifications/${n.id}/read`, { method: 'POST' }); } catch {}
          }
          window.location.href = notifTargetUrl(n);
        });
      });
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== btn) {
        dropdown.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    await loadNotifs();
  }

  function renderFooter() {
    const mount = document.getElementById('yqv-footer');
    if (!mount) return;
    mount.innerHTML = `
      <footer>
        <div class="container footer-grid">
          <div>
            <div class="logo" style="margin-bottom:10px;">${LOGO_SVG}<span class="logo-text"><span class="hash">#</span>Ya<span class="dot">Que</span>Vas</span></div>
            <p>Ya que vas, gana. Ya que alguien va, ahorra. YaQueVas conecta viajes que ya se iban a hacer con envíos legales entre las Islas Canarias, con una compensación justa para quien viaja.</p>
            <p class="muted">YaQueVas no es una empresa de transporte ni de paquetería: facilita la conexión, el pago y la entrega entre particulares que ya viajaban.</p>
          </div>
          <div>
            <strong>Legal</strong>
            <p><a href="/legal.html?doc=terminos">Términos y condiciones</a><br>
            <a href="/legal.html?doc=privacidad">Privacidad</a><br>
            <a href="/legal.html?doc=cookies">Cookies</a><br>
            <a href="/legal.html?doc=aviso_legal">Aviso legal</a></p>
          </div>
          <div>
            <strong>Ayuda</strong>
            <p><a href="/faq.html">Preguntas frecuentes</a><br>
            <a href="/como-funciona.html">Cómo funciona</a><br>
            <a href="/contacto.html">Contacto</a></p>
          </div>
        </div>
        <div class="container muted" style="margin-top:24px; font-size:0.8rem;">
          © ${new Date().getFullYear()} YaQueVas. Proyecto en fase de demostración — pendiente de validación legal y fiscal definitiva.
        </div>
      </footer>
    `;
  }

  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return; // sin soporte: el contenido ya es visible por defecto, no se pierde nada
    const targets = document.querySelectorAll('.card, .section > .container > h2, .photo-feature');
    if (!targets.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((el) => {
      el.classList.add('reveal-init');
      observer.observe(el);
    });
  }

  // Cifras grandes (home: +30%, 12%, 8 islas...) cuentan desde 0 al entrar en pantalla, en vez
  // de aparecer estáticas — patrón "stat card" que confirma la investigación de Sherpa/Apple.
  function initCountUp() {
    const targets = document.querySelectorAll('[data-count-to]');
    if (!targets.length) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const setFinal = (el) => { el.textContent = (el.dataset.prefix || '') + el.dataset.countTo + (el.dataset.suffix || ''); };
    if (reduceMotion || !('IntersectionObserver' in window)) { targets.forEach(setFinal); return; }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        const to = parseFloat(el.dataset.countTo);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const duration = 900;
        const start = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.round(to * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    targets.forEach((el) => observer.observe(el));
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderNav();
    renderFooter();
    initScrollReveal();
    initCountUp();
    injectPwaMeta();
    registerServiceWorker();
  });
})();
