# DAFO de diseño visual — competencia directa (2026-08-20)

Investigación con acceso real (capturas) a Sherpa, Grabr, BlaBlaCar (rebrand 2025), Vinted, Wallapop,
DHL y Correos — complementa `DAFO_REFERENCIAS_TOP.md` (referentes generales tipo Apple/Stripe) con el
ángulo que faltaba: cómo resuelven el DISEÑO VISUAL concreto los competidores directos de crowdshipping
y paquetería. PiggyBee está inoperativa desde 2020 (descartada, no inventado). Glovo no es comparable
(delivery local, no P2P internacional) — omitido en vez de rellenar.

## Patrones más aplicables encontrados (resumen, ver research completo en el historial de la sesión)

- **Sherpa** (competidor de modelo más idéntico): stat-cards gigantes icono+cifra+etiqueta corta
  ("100%" verificación, "70% más barato", "−100% CO₂") comunican confianza/ahorro sin párrafos —
  YaQueVas ya tiene algo parecido en la home (+30% / 12% / 40% / 8), confirma que el formato ya elegido
  es acertado. Toggle "Soy remitente / Soy viajero" para bifurcar el flujo de "cómo funciona".
- **Grabr**: contraste deliberado de color solo para el badge de incentivo (resto frío/neutro) — trata
  el incentivo como la única nota cálida de la página. Vídeo de fondo en el hero es mala idea para
  conexiones lentas (relevante para el tramo Cuba).
- **BlaBlaCar** (rebrand 2025, el más cercano en espíritu a la paleta actual de YaQueVas): formulario
  como tarjeta blanca flotante con el botón de acción integrado como cierre de la propia tarjeta, no
  suelto debajo. Separa cromáticamente "producto core" (azul) de "promoción" (verde) para que las
  ofertas puntuales no compitan visualmente con la marca.
- **Vinted**: precio en negrita al final de la tarjeta, sin tratamiento cromático especial — identificado
  como error (obliga a escanear letra por letra en un marketplace donde el precio es la decisión clave).
- **Wallapop**: precio ANTES que el título en las tarjetas de producto (jerarquía precio > objeto) —
  patrón directamente aplicable a tarjetas de viaje/envío. Badge de "envío disponible" como icono+texto
  de color sin caja, ligero.
- **DHL/Correos** (anti-referencia): fotografía genérica desconectada del servicio, texto denso sin
  jerarquía, todo compite por atención — confirma que la dirección "premium neutro" de YaQueVas
  (blanco, un acento, foco claro) va en la dirección contraria y correcta.

## DAFO de diseño — competencia directa

### Fortalezas del grupo (patrones adoptables)
- Jerarquía de precio resuelta en marketplaces P2P maduros (Wallapop: precio antes que título).
- Stat-cards gigantes para confianza/ahorro sin texto largo (Sherpa) — YaQueVas ya usa este formato.
- Tarjeta de formulario flotante con CTA integrado como cierre (BlaBlaCar).
- Separación cromática producto-core vs promoción (BlaBlaCar, Grabr).

### Debilidades del grupo (terreno libre para diferenciarse)
- Ningún competidor P2P directo (Grabr, Sherpa) usa una paleta "premium neutra" — todos van con colores
  saturados (magenta-violeta, teal, coral, lima). La paleta actual de YaQueVas (azul `#0B5FFF` sobrio
  sobre blanco/negro, tipo Stripe) la deja con un hueco de posicionamiento real: se lee más "fintech
  seria" que "app de recados entre particulares", justo cuando la mayoría del sector va hacia colores
  vibrantes. **No es un motivo para volver a cambiar la paleta** (decisión ya fijada dos veces por el
  usuario) — es una confirmación de que el hueco de mercado está donde ya se posicionó el sitio.
- Confianza comunicada casi siempre solo con texto ("100% verificado"), sin sistema de sellos visual
  consistente en toda la interfaz.

### Oportunidades (huecos que YaQueVas puede ocupar)
- Ningún competidor directo trata la ruta origen-destino como elemento visual central (todos usan un
  formulario genérico de "producto/viaje", no de "corredor"). Un componente visual de ruta (línea entre
  dos puntos con icono de avión/barco) sería diferenciador real — no implementado hoy, candidato para
  siguiente fase.
- Nadie del grupo resuelve bien el rendimiento en redes lentas (Grabr con vídeo de fondo es el peor
  caso) — una landing ligera y rápida es en sí misma ventaja competitiva para el tramo Cuba. YaQueVas ya
  cumple esto (sin vídeo, sin imágenes pesadas) — mantenerlo así conscientemente en cualquier cambio
  futuro, no es casualidad que hoy funcione bien.
- Jerarquía precio-primero (Wallapop) aplicada a las tarjetas de viaje/envío de la home — **implementado
  hoy** (ver cambios de código abajo).

### Amenazas (riesgos de diseño a vigilar)
- El rebrand 2025 de BlaBlaCar hacia "más humano, vibrante, emocional" indica que la categoría se aleja
  del minimalismo corporativo frío — si YaQueVas se queda demasiado "Stripe/Linear frío" sin calidez en
  ningún punto, puede leerse como distante en un producto que depende de confianza persona-a-persona.
  Vigilar en el copy (ya se refuerza hoy con el tono "conversación guiada" en verificación de identidad)
  más que en el color.
- Sherpa ya ocupa el espacio "crowdshipping en español, marca joven y vibrante" — si YaQueVas compite en
  seriedad/premium debe sostenerlo con consistencia real (tipografía, espaciado, ausencia de
  degradados), o se lee como una copia más discreta de Sherpa en vez de una alternativa con propuesta
  propia.

## Cambios ya aplicados en el código a raíz de este DAFO (2026-08-20)
1. `frontend/index.html`: tarjetas de "Ahora mismo en YaQueVas" reordenadas — el precio/ganancia ahora
   va PRIMERO (grande, en negrita) y la ruta debajo, siguiendo el patrón de jerarquía de Wallapop
   (precio > objeto), en vez de ruta primero y precio al final como estaba antes.
