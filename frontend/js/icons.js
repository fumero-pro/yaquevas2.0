// YaQueVas — sistema de iconos propio (línea, sin emoticonos).
// Estilo: trazo uniforme, esquinas redondeadas, hereda el color del texto (currentColor).
const YQVIcons = (() => {
  const PATHS = {
    // --- Objetos / categorías ---
    shirt: '<path d="M8 4 L4 7 L6.5 10 L8 9 V20 H16 V9 L17.5 10 L20 7 L16 4 L14 5.5 A2.2 2.2 0 0 1 10 5.5 Z"/>',
    pill: '<rect x="4" y="9" width="16" height="6" rx="3" transform="rotate(-32 12 12)"/><line x1="12" y1="7.2" x2="12" y2="16.8" transform="rotate(-32 12 12)"/>',
    plug: '<path d="M9 3v5M15 3v5M6.5 8h11v4a5.5 5.5 0 0 1-11 0V8Z"/><path d="M12 17.5V21"/>',
    document: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4"/><line x1="9.5" y1="12" x2="14.5" y2="12"/><line x1="9.5" y1="15.5" x2="14.5" y2="15.5"/>',
    gift: '<rect x="4" y="10" width="16" height="10" rx="1"/><line x1="4" y1="14" x2="20" y2="14"/><line x1="12" y1="10" x2="12" y2="20"/><path d="M12 10C10 6 6 6.5 6.5 8.5 7 10.3 12 10 12 10ZM12 10C14 6 18 6.5 17.5 8.5 17 10.3 12 10 12 10Z"/>',
    key: '<circle cx="8" cy="15" r="3.2"/><path d="M10.3 12.7 18 5"/><path d="M15.2 7.8 17.4 10M17.6 5.5 19.8 7.7"/>',
    wrench: '<path d="M16.5 3.5a4.5 4.5 0 0 0-6.1 5.3L4 15.2a2 2 0 0 0 2.8 2.8l6.4-6.4a4.5 4.5 0 0 0 5.3-6.1l-3 3-2.3-2.3Z"/>',
    wave: '<path d="M3 15c1.6-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/><path d="M3 19c1.6-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"/>',
    book: '<path d="M12 6.5C10.2 5 7 4.5 4 5v13c3-.5 6.2 0 8 1.5 1.8-1.5 5-2 8-1.5V5c-3-.5-6.2 0-8 1.5Z"/><line x1="12" y1="6.5" x2="12" y2="19.5"/>',
    shoe: '<path d="M3.5 17.5v-4c2-.2 3-1 4-2.3 1.3-1.7 2.6-2.2 4-2.2 1 0 1.5.5 1.5 1.3 0 1 1 1.7 2.5 1.7 1.8 0 3 .8 4.5 2.3.8.8 1 1.5 1 3.2H3.5Z"/><line x1="3.5" y1="15" x2="20" y2="15"/>',
    // --- Transporte ---
    plane: '<path d="M2 13.2 21 7l-3 4.5-8 2 2.6 4.7-2 .8-3.3-4.4-3 .5-1-1.9 2.7-1Z"/>',
    ship: '<path d="M5 13h14l-1.8 6H6.8Z"/><path d="M8 13V6h5l3 4"/><line x1="4" y1="19" x2="20" y2="19"/><line x1="12" y1="3" x2="12" y2="6"/>',
    car: '<path d="M4 16v-3.2c0-.5.3-1 .8-1.2L6.5 9.5A2 2 0 0 1 8.3 8.5h7.4c.8 0 1.5.4 1.8 1.1l1.3 2.7c.5.2.9.6.9 1.2V16"/><rect x="3.2" y="15.4" width="17.6" height="3" rx="1"/><circle cx="7.5" cy="18.6" r="1.6"/><circle cx="16.5" cy="18.6" r="1.6"/>',
    suitcase: '<rect x="3.5" y="8" width="17" height="12" rx="1.6"/><path d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8"/><line x1="3.5" y1="13" x2="20.5" y2="13"/>',
    package: '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9Z"/><path d="M4 7.5 12 12l8-4.5"/><line x1="12" y1="12" x2="12" y2="21"/>',
    // --- Acción / interfaz ---
    link: '<path d="M9.5 14.5 14.5 9.5"/><path d="M11 7.3 12.6 5.7a3.4 3.4 0 1 1 4.8 4.8L15.8 12"/><path d="M13 16.7 11.4 18.3a3.4 3.4 0 1 1-4.8-4.8L8.2 12"/>',
    camera: '<path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4Z"/><circle cx="12" cy="13.2" r="3.4"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><line x1="10.5" y1="18.2" x2="13.5" y2="18.2"/>',
    pin: '<path d="M12 21s6.5-6.2 6.5-11A6.5 6.5 0 0 0 5.5 10c0 4.8 6.5 11 6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    bell: '<path d="M6 17h12l-1.6-2.3V10a4.4 4.4 0 0 0-8.8 0v4.7Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>',
    menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
    sparkle: '<path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2"/>',
    check: '<path d="M5 12.5 9.5 17 19 6.5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M9.5 9.7a3 3 0 0 0 4.2 4.2"/><path d="M6.3 6.3C3.6 8 2 12 2 12s3.6 7 10 7c1.4 0 2.7-.3 3.8-.8"/><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-4.2 5.1"/>',
    shield: '<path d="M12 3.5 19 6.5V11c0 5-3 8.2-7 9.5-4-1.3-7-4.5-7-9.5V6.5Z"/><path d="M8.7 12 11 14.3 15.3 10"/>',
    userCheck: '<circle cx="9.5" cy="8.5" r="3.5"/><path d="M3.5 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><path d="M16.5 12.5 18.5 14.5 21.5 10.5"/>',
  };

  function svg(name, { size = 20, strokeWidth = 1.8, className = '' } = {}) {
    const inner = PATHS[name];
    if (!inner) return '';
    return `<svg class="yqv-icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  }

  function hydrate(root = document) {
    root.querySelectorAll('[data-yqv-icon]').forEach((el) => {
      const name = el.getAttribute('data-yqv-icon');
      const size = Number(el.getAttribute('data-yqv-icon-size')) || 18;
      el.innerHTML = svg(name, { size });
      el.style.display = 'inline-flex';
    });
  }
  document.addEventListener('DOMContentLoaded', () => hydrate());

  return { svg, hydrate };
})();
