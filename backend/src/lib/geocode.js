'use strict';
// Búsqueda de direcciones (calle + número -> ubicación exacta con lat/lon), para que el
// remitente pueda fijar un punto de recogida/entrega real en vez de solo "Aeropuerto/Puerto/
// Acordar directamente" — petición explícita del usuario: "como si se compartiera ubicación en
// WhatsApp". Usa Nominatim (OpenStreetMap), gratis y sin cuenta que crear (decisión explícita del
// usuario frente a Google Places, que sí requiere una cuenta de Google Cloud con facturación).
//
// Política de uso de Nominatim (https://operations.osmfoundation.org/policies/nominatim/) que hay
// que respetar si esto se amplía en el futuro: máximo 1 petición/segundo, User-Agent identificando
// la app (obligatorio), nada de geocodificación masiva/sistemática sin permiso, y mostrar la
// atribución "© OpenStreetMap contributors" donde se use el resultado.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'YaQueVas/1.0 (contacto@yaquevas.es)';

// countrycodes limita la búsqueda a España y Cuba (los dos únicos mercados reales de la
// plataforma hoy) — evita resultados irrelevantes y reduce la carga sobre el servicio gratuito.
async function searchAddress(query) {
  if (!query || query.trim().length < 3) return [];
  const trimmed = query.trim();
  const url = new URL(NOMINATIM_URL);
  // Si la persona escribe solo dígitos (código postal), se usa la búsqueda estructurada de
  // Nominatim por `postalcode` en vez de texto libre — más fiable que esperar que "38001" por
  // sí solo encaje como texto libre (petición explícita: "buscar por código postal si se sabe").
  if (/^\d{4,5}$/.test(trimmed)) {
    url.searchParams.set('postalcode', trimmed);
  } else {
    url.searchParams.set('q', trimmed);
  }
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'es,cu');
  url.searchParams.set('limit', '6');

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es' } });
  if (!res.ok) throw new Error(`Error buscando dirección (${res.status})`);
  const rows = await res.json();
  return rows.map((r) => ({
    display_name: r.display_name,
    lat: Number(r.lat),
    lon: Number(r.lon),
  }));
}

// Distancia en línea recta (haversine) en km entre dos puntos — suficiente para un precio
// orientativo de un trayecto en coche dentro de la misma isla; no es la distancia real por
// carretera, así que se documenta como estimación en el desglose del precio.
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { searchAddress, haversineKm };
