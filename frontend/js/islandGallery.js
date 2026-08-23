// Carrusel de fotos reales de las 8 islas (playas, montes, paisajes) — pedido explícito del
// usuario: "que fueran pasando fotos de las 8 islas cada x tiempo, como un reservorio que
// fuera cambiando". Lee `frontend/images/islands/manifest.json` en vez de tener la lista
// hardcodeada aquí, para no tener que tocar este archivo cada vez que se añada/cambie una foto.
//
// Solo se cargan 2 imágenes a la vez (la visible + la siguiente, en dos <img> que se turnan),
// nunca las 16 de golpe — importante para conexiones lentas (ver docs/DAFO_COMPETENCIA_DIRECTA_DISENO.md,
// el corredor a Cuba es exactamente el caso que esto evita).
(function () {
  const ROTATE_MS = 5000;
  const PAUSE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  const PLAY_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

  async function initIslandGallery(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let manifest;
    try {
      const res = await fetch('/images/islands/manifest.json');
      if (!res.ok) throw new Error('manifest no disponible');
      manifest = await res.json();
    } catch {
      return; // sin manifest, no rompemos la página: el hueco simplemente queda vacío
    }
    if (!Array.isArray(manifest) || manifest.length === 0) return;

    container.innerHTML = `
      <img class="island-gallery-img active" id="${containerId}ImgA">
      <img class="island-gallery-img" id="${containerId}ImgB">
      <span class="island-gallery-caption" id="${containerId}Caption"></span>
      <button type="button" class="island-gallery-pause" id="${containerId}Pause" aria-label="Pausar el pase de fotos">${PAUSE_ICON}</button>
    `;
    const imgA = document.getElementById(`${containerId}ImgA`);
    const imgB = document.getElementById(`${containerId}ImgB`);
    const captionEl = document.getElementById(`${containerId}Caption`);
    const pauseBtn = document.getElementById(`${containerId}Pause`);

    function setImage(imgEl, item) {
      imgEl.src = `/images/islands/${item.file}`;
      imgEl.alt = item.alt;
    }

    let index = 0;
    setImage(imgA, manifest[0]);
    captionEl.textContent = manifest[0].isla;
    if (manifest.length < 2) { pauseBtn.remove(); return; }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) { pauseBtn.remove(); return; } // se queda en la primera foto, fija, sin rotación automática

    let showingA = true;
    function advance() {
      if (document.hidden) return; // no gastar ciclos ni datos con la pestaña en segundo plano
      index = (index + 1) % manifest.length;
      const nextImg = showingA ? imgB : imgA;
      const curImg = showingA ? imgA : imgB;
      setImage(nextImg, manifest[index]);
      nextImg.classList.add('active');
      curImg.classList.remove('active');
      captionEl.textContent = manifest[index].isla;
      showingA = !showingA;
    }

    // Botón real de pausa (WCAG 2.2.2: contenido que se mueve solo más de 5s necesita una
    // forma de pararlo, no basta con "se para si dejas de mirar el ratón encima") — hallazgo
    // real de la auditoría de accesibilidad.
    let timer = setInterval(advance, ROTATE_MS);
    let paused = false;
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      if (paused) {
        clearInterval(timer);
        pauseBtn.innerHTML = PLAY_ICON;
        pauseBtn.setAttribute('aria-label', 'Reanudar el pase de fotos');
      } else {
        timer = setInterval(advance, ROTATE_MS);
        pauseBtn.innerHTML = PAUSE_ICON;
        pauseBtn.setAttribute('aria-label', 'Pausar el pase de fotos');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => initIslandGallery('islandGallery'));
})();
