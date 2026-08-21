# Precio interinsular único (2026-08-21)

Petición explícita del usuario: "no me gusta que hagas distinción de precios entre islas de
interinsular larga o corto, haz la media de los precios y listo basándote en el precio medio de
las paqueteras y de las maletas facturadas, haz un análisis de mercado exhaustivo".

## Qué cambió

El motor de precios (`backend/src/lib/pricing.js`, `backend/src/lib/geo.js`) distinguía
`interinsular_corta` (15€ base) de `interinsular_larga` (25€ base) según si origen y destino
compartían "zona de distancia" (`locations.distance_zone`). Ahora hay una sola categoría
`interinsular` con un único precio base, sea cual sea el par de islas. `misma_zona` (8€) e
`internacional` (45€, ruta Cuba) no se tocan — el usuario no pidió cambiarlas.

## Investigación de mercado (fuentes reales, verificadas leyendo el documento/web original, no snippets de buscador)

**Correos, tarifa "Paq Estándar" interinsular (zona Z6), PDF oficial 2026:**
- Hasta 1 kg: 11,28 €
- De 1 a 5 kg: **14,13 €**
- Fuente: https://www.correos.es/content/dam/correos/documentos/atc/tarifas/2026/Tarifas_Correos_2026_Canarias.pdf

Importante: el dato que tenía el proyecto antes (5,41€/6,21€, "tarifas 2025") se comprobó
**incorrecto/desactualizado** al leer el PDF real — probablemente confundía "Paq Estándar" con un
producto de sobres/certificados distinto y más barato. Corregido en `backend/src/seed.js` y en
todas las páginas que citaban la cifra vieja.

**MRW y SEUR** (mensajería privada interinsular): ambas tienen servicio confirmado pero **no
publican tarifa 2026 verificable** en su web — no se usan como referencia numérica, solo como
confirmación de que el mercado de paquetería privada interinsular existe.

**Equipaje facturado, vuelos interinsulares (Binter Canarias, Canaryfly):** en ambas aerolíneas,
**la maleta facturada va incluida gratis hasta 20-23 kg en cualquier tarifa interinsular** —
Canaryfly cobra 1,40-2,00€/kg por encima de 23kg; Binter no publica tarifa de exceso específica
para interinsular (los cargos de 25-60€ que sí publica son para vuelos Península/internacional).
Fuentes: https://www.cestee.es/aerolinea/binter-canarias/equipajes ·
https://www.cestee.es/aerolinea/canaryfly/equipajes

**Implicación de negocio, no solo de precio**: para un envío de 2-5kg, el viajero no paga nada
extra por llevarlo (muy por debajo de la franquicia gratuita) — confirma que el modelo de YaQueVas
monetiza una capacidad que ya era gratis para el viajero, no un coste real de transporte que haya
que compensar. Casi todo el precio que paga el remitente se reparte entre compensación real al
viajero y margen de la plataforma.

**Sherpa (crowdshipping P2P, referencia de precio por tamaño), verificado en vivo en su web:**

| Talla | Descripción | Precio |
|---|---|---|
| S | Cartas, documentos | 4–8 € |
| M | Libros, ropa ligera | 8–15 € |
| L | Zapatos, electrónica | 15–30 € |
| XL | Maleta pequeña | 30–70 € |
| XXL | Maleta grande, voluminoso | 70–150 € |

Precio fijo por tamaño, no varía con la distancia — así lo dice la propia web de Sherpa. Sherpa no
opera en Canarias (solo 8 ciudades peninsulares), así que no hay una ruta equivalente exacta que
comparar; la extrapolación es por banda de tamaño.

## Cálculo del nuevo precio base

Envío de referencia: 2-5 kg (banda "M" de Sherpa).

- Correos (real, 2026): 14,13 €
- Punto medio de la banda M de Sherpa (real): (8+15)/2 = 11,5 €
- Media de ambas referencias: (14,13 + 11,5) / 2 = **12,82 € ≈ 12 €**

**Nuevo precio base interinsular: 12 €** (antes 15€/25€ según distancia).

Con el descuento del baremo ya configurado (30% por defecto, `config.baremo_discount_pct`), el
precio orientativo final que ve el usuario para un envío de hasta 5kg es **12 × 0,70 = 8,40 €** —
un **~40% más barato que Correos** (14,13€) y dentro de la banda de precio de Sherpa, validando
que es competitivo frente al crowdshipping de referencia en España, no solo frente a paquetería
tradicional.

## Por qué esto no perjudica el negocio

La comisión del 12% (6% remitente + 6% viajero) no se toca. Como el viajero no tiene coste real de
equipaje que compensar (ver más arriba), bajar el precio base no reduce margen "real" de la
plataforma de forma proporcional — el precio base y la comisión son variables independientes; se
puede seguir ajustando `commission_sender_pct`/`commission_traveler_pct` desde el panel de admin
si se necesita más margen, sin tocar el precio base que ve el remitente.

## Qué NO se verificó (honestidad, no se inventó)

Tarifas 2026 de MRW/SEUR para interinsular Canarias, exceso de peso por kg de Binter en vuelos
interinsulares, y si la comisión del 6% al remitente de Sherpa (además del 6% al viajero, que sí
está confirmado literal en su web) es exacta — reportada por una fuente indirecta, no confirmada
letra por letra.
