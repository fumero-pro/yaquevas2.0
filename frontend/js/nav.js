// Inyecta la barra de navegación, el banner de modo demo y el pie de página
// en cualquier página que incluya #yqv-nav / #yqv-footer y cargue este script.
(function () {
  function renderNav() {
    const mount = document.getElementById('yqv-nav');
    if (!mount) return;
    const user = YQV.getUser();
    const isAdmin = YQV.isAdmin();

    mount.innerHTML = `
      <div class="badge-demo-banner">MODO DEMOSTRACIÓN — datos, pagos y verificación simulados. Ninguna operación es real.</div>
      <div class="topbar">
        <div class="topbar-inner">
          <a class="logo" href="/index.html">Ya<span class="dot">Que</span>Vas</a>
          <button class="btn btn-outline nav-toggle" id="navToggleBtn" aria-label="Abrir menú">☰</button>
          <nav class="nav-links" id="navLinks">
            <a href="/como-funciona.html">Cómo funciona</a>
            <a href="/enviar.html">Enviar algo</a>
            <a href="/ya-voy.html">Ya voy / tengo espacio</a>
            <a href="/buscar.html">Buscar</a>
            <a href="/faq.html">Ayuda</a>
            ${user ? `<a href="/mi-cuenta.html">Mi cuenta (${user.name})</a>` : `<a href="/login.html">Acceder</a>`}
            ${user ? `<a href="#" id="logoutLink">Salir</a>` : `<a href="/registro.html" class="btn btn-primary" style="padding:10px 18px;">Crear cuenta</a>`}
            ${isAdmin ? `<a href="/admin.html">Administración</a>` : ''}
          </nav>
        </div>
      </div>
    `;
    const toggle = document.getElementById('navToggleBtn');
    const links = document.getElementById('navLinks');
    if (toggle) toggle.addEventListener('click', () => links.classList.toggle('open'));
    const logout = document.getElementById('logoutLink');
    if (logout) logout.addEventListener('click', (e) => {
      e.preventDefault();
      YQV.clearSession();
      window.location.href = '/index.html';
    });
  }

  function renderFooter() {
    const mount = document.getElementById('yqv-footer');
    if (!mount) return;
    mount.innerHTML = `
      <footer>
        <div class="container footer-grid">
          <div>
            <div class="logo" style="margin-bottom:10px;">Ya<span class="dot">Que</span>Vas</div>
            <p>Si ya vas, puedes llevarlo. YaQueVas conecta viajes que ya se iban a hacer con envíos legales entre las Islas Canarias, con una compensación justa para quien viaja.</p>
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

  document.addEventListener('DOMContentLoaded', () => {
    renderNav();
    renderFooter();
  });
})();
