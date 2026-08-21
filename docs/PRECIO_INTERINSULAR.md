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

## Actualización 2026-08-21: precio por talla, no por kg

Corrección explícita del usuario: **"es por tamaño no por kg"** — el motor cobraba el precio base
de arriba (12€/8€/45€ según distancia) más un recargo de `price_per_kg_extra` (0,80€/kg) por
encima de 5kg. Eso es exactamente el modelo de Correos, no el de Sherpa/YaQueVas — y significaba
que un objeto voluminoso (ej. una tabla de surf, 140L pero solo 8kg) pagaba lo mismo que una
maleta pequeña de 8kg, pese a ocupar 3× más espacio de la maleta del viajero.

**Cambio aplicado en `backend/src/lib/pricing.js`:** el precio ya no depende del peso declarado.
Cada talla (S/M/L/XL/XXL/XXXL, mismo catálogo que `tetris.js`/`misc.js`) tiene un multiplicador
fijo sobre el precio base de la distancia (misma_zona/interinsular/internacional).

**Revisión el mismo día (petición explícita del usuario): "el XL no puede ser más barato que el L,
copia los precios de Sherpa, haz el negocio muy rentable".** La primera versión de esta tabla
usaba el *punto medio* de cada banda de Sherpa, lo que en la práctica seguía dejando poco margen.
Se sustituyó por el **extremo superior** de cada banda real (más rentable, y sigue siendo un precio
que el mercado ya paga de verdad, no uno inventado):

| Talla | Tipo de bulto | Banda Sherpa (real) | Extremo superior | Multiplicador vs. M |
|---|---|---|---|---|
| S | sobre | 4–8 € | 8 € | 0,53× |
| M | caja_mediana | 8–15 € | 15 € | 1× (ancla) |
| L | maleta_pequena | 15–30 € | 30 € | 2× |
| XL | maleta_grande | 30–70 € | 70 € | 4,67× |
| XXL | objeto_voluminoso | 70–150 € | 150 € | 10× |
| XXXL | bulto_extra_grande | *(Sherpa no tiene esta talla)* | — | 21× (extrapolado) |

XXXL no existe en Sherpa (YaQueVas la añadió para bultos como equipaje muy voluminoso o un
electrodoméstico pequeño) — su multiplicador extrapola el mismo ratio de crecimiento que ya se
observa entre los extremos superiores consecutivos de Sherpa (S→M ×1,88, M→L ×2, L→XL ×2,33,
XL→XXL ×2,14, media ~2,1×). Es una estimación razonada, no un dato verificado — pendiente de
contrastar con un proveedor real en cuanto haya volumen en esa talla.

**Precio base por talla M actualizado también:** `misma_zona` 8€→10€, `interinsular` 12€→15€ (el
extremo superior de la banda M de Sherpa). `internacional` (Cuba) se mantiene en 45€ sin cambios —
sigue fundamentado aparte frente a DHL (~184€ por 5kg), no derivado de Sherpa.

Con el descuento de baremo (30%), el precio orientativo interinsular por talla queda: S 5,57€ ·
M 10,50€ · L 21,00€ · XL 49,04€ · XXL 105,00€ · XXXL 220,50€. Internacional (Cuba) llega hasta
661,50€ en talla XXXL. El precio máximo configurado (`max_price`) se subió de 200€ a **700€** para
que estas combinaciones grandes/internacionales no se recorten y se pierda el margen que se acaba
de ganar (ver `backend/src/lib/config.js`).

**Bug real encontrado y corregido al verificar en navegador:** las muestras reales de
`pricing_reference_samples` (precios de mercado que el admin introduce a mano) devolvían un precio
plano, ignorando la talla por completo — un fallo que haría que en cuanto hubiera datos reales de
un proveedor para una ruta, todas las tallas de esa ruta cobrasen lo mismo. Corregido: el precio
unitario (de muestras reales o de la estimación demo) se multiplica siempre por la talla, nunca al
revés (ver `referenceUnitPrice` en `pricing.js`).

**Comisión subida de 6%/6% a 10%/10% (20% total)** el mismo día, a petición explícita del usuario,
con el objetivo de una facturación de referencia de 1,5M€/año — ver el análisis de volumen y la
comparativa con la comisión real de Uber/Glovo/Deliveroo en `docs/PLAN_RENTABILIDAD.md`.

El campo `price_per_kg_extra` se retiró de `backend/src/lib/config.js` y del panel de admin (ya no
hacía nada). El peso declarado (`shipment.weight_kg`) se conserva como dato informativo del envío,
pero ni el precio ni el ajuste de capacidad del viaje (`fitsInTrip`, que ya usaba los bultos
declarados) dependen de él.

**Importante para quien retome esto:** la base de datos Turso en producción ya tenía filas
explícitas de `commission_sender_pct`/`commission_traveler_pct` (6/6) y `max_price` (200) desde el
primer sembrado — cambiar los valores por defecto en el código no actualiza un sitio ya desplegado.
Hace falta subir estos valores también desde el panel de administración (Comisiones y baremo) tras
desplegar, o resembrar.

## Actualización 2026-08-21 (más tarde): Cuba por kg + avión/barco + coche entre municipios por distancia real

Tres peticiones explícitas del usuario en la misma sesión:

**1. "A Cuba SI debe ir por kg, creo que cobran unos 18 euros por kg."** La ruta internacional
(Cuba) deja de usar el precio por talla y pasa a cobrarse por peso real de los bultos declarados
(`itemsToUsage(items).kg`), a 18€/kg por defecto (`config.internacional_price_per_kg`) — coincide
con el comparador ya investigado más arriba: un courier especializado en la ruta España-Cuba cobra
~75-90€ por 5kg (≈15-18€/kg), frente a los ~184€/5kg (≈37€/kg) de DHL. Canarias (misma_zona,
interinsular) sigue por talla, sin cambios.

**2. "Debemos diferenciar precios de avión y de barco, avión siempre un poco más caro."** Solo
afecta a la ruta internacional. Recargo del 15% (`config.avion_price_premium_pct`) si
`transport_mode === 'avion'`, sin recargo en barco. Dentro de Canarias el medio de transporte no
cambia el precio (ya se probó con un test explícito). El viaje concreto (con su medio de
transporte ya fijado) se conoce en `bookings.js` y en `/api/matching/for-trip`; en
`/api/matching/for-shipment` (sin viaje elegido todavía) se muestra el precio "desde" en barco
como cabecera, y cada match de la lista lleva su propio precio real según el medio de transporte
de ESE viaje.

**3. "Los coches de la misma isla de despliegue entre los municipios... precio rentable, puede
haber más movimiento diario."** Investigación real (WebSearch): Moto Envío Madrid cobra desde
4,5€ por dirección + 0,5€/km fuera de la zona central — tarifa real de mensajería urbana en
España, no inventada. Aplicado a `misma_zona` (origen y destino en la misma isla): si el envío
tiene coordenadas reales (buscadas con el nuevo buscador de direcciones, ver más abajo) para
origen y destino, el precio pasa a ser `(4€ + 0,5€/km × distancia real) × multiplicador de talla`
en vez del ancla plana de 10€. La distancia se calcula con la fórmula de Haversine (línea recta,
no ruta real por carretera — documentado como estimación). Sin coordenadas (el remitente no buscó
una dirección exacta), sigue aplicando el ancla plana de siempre — no rompe envíos existentes ni
obliga a usar el buscador. **Verificado de extremo a extremo en el navegador real** (no solo con
tests): un envío de Santa Cruz de Tenerife a Los Cristianos, Arona, dio 65,39km reales (Haversine)
y un precio de 13,61€ — el cálculo completo, no una simulación.

**Buscador de direcciones reales** (`backend/src/lib/geocode.js`, endpoint público
`GET /api/geo/search-address`): vía Nominatim/OpenStreetMap, **gratis, sin cuenta que crear**
(decisión explícita del usuario frente a Google Places, que sí requiere cuenta de Google Cloud con
facturación). Limitado a España y Cuba (`countrycodes=es,cu`). Respeta la política de uso de
Nominatim: User-Agent identificando la app, sin geocodificación masiva, atribución
"© OpenStreetMap contributors" mostrada en la UI. Integrado en `enviar.html` como buscador
opcional bajo el punto de encuentro genérico de siempre (Aeropuerto/Puerto/Acordar directamente),
que sigue siendo obligatorio y funcional sin usar el buscador.

**Migración de esquema**: 4 columnas nuevas nullable en `shipments`
(`origin_lat`/`origin_lon`/`destination_lat`/`destination_lon`), añadidas de forma idempotente en
`backend/src/migrations/alters.js` — se aplican solas la próxima vez que arranque el servidor
(incluida la base de datos compartida en Turso), sin necesidad de resembrar.

**Bug real encontrado de paso, no relacionado con lo anterior**: `backend/src/routes/shipments.js`
tenía su propia lista de tipos de bulto válidos, desactualizada (solo 4 de las 6 tallas) — un
envío de talla XXL o XXXL (objeto_voluminoso, bulto_extra_grande) fallaba al publicarse con "Tipo
de bulto no válido", aunque el resto del sistema (tetris.js, misc.js, motor de precios) ya los
soportaba desde la sesión anterior. Corregido: ahora deriva del mismo catálogo único que usa
`tetris.js`, para que nunca se vuelvan a desincronizar.

Tests nuevos: 6 en `pricing.test.js` (Cuba por kg, avión más caro que barco, transporte no afecta
dentro de Canarias, coche por distancia real, fallback sin coordenadas, coordenadas ignoradas en
interinsular) + 3 en `geocode.test.js` (Haversine). Suite completa: **72/72 en verde.**

## Actualización 2026-08-21 (más tarde todavía): validado contra el coste real de gasolina

Petición explícita del usuario: **"calculando el precio de km, gasolina y demás... para que lo
haga la gente"** — si el precio por km no deja margen real sobre el coste de conducir, nadie
acepta estos envíos y toda la pieza de "coche misma isla" no sirve de nada.

Datos reales investigados (WebSearch, no inventados):
- Gasolina 95 en Canarias, media de agosto 2026: **1,45 €/L** (Canarias7, Moncloa/Istac).
- Consumo medio de un coche en España: **7,2 L/100km** (cifra general citada en prensa del motor).
- Coste real de gasolina ≈ 1,45 × 7,2 ÷ 100 ≈ **0,10 €/km**.

Con el precio ya fijado (0,50€/km antes de descuento) el viajero cobra, tras el 30% de descuento
y la comisión del 10%, unos **0,315€/km netos** — más de 3 veces el coste real de gasolina. La
tarifa de mensajería urbana que ya se había usado como referencia (Moto Envío Madrid) resulta,
sin haberlo buscado a propósito, dejar un margen real generoso — no solo cubre el depósito, deja
para el tiempo y el desgaste del coche. Nuevo config `misma_zona_fuel_cost_per_km` (0,10€ por
defecto) — es solo una referencia para mostrar el margen, nunca determina el precio cobrado.

**Mostrado ahora también al viajero**, no solo calculado internamente: en `ya-voy.html`
("Puedes ganar +X€"), cada envío compatible en coche dentro de la misma isla muestra además
"X km · cubre de sobra el combustible real (~Y€)" — transparencia activa, no solo un número, para
que el viajero vea por qué le compensa aceptar.

Test nuevo: verifica que el neto del viajero sea más del doble del coste real de gasolina estimado
para la ruta Santa Cruz de Tenerife → Los Cristianos (~65km). Suite completa: **73/73 en verde.**

## Qué NO se verificó (honestidad, no se inventó)

Tarifas 2026 de MRW/SEUR para interinsular Canarias, exceso de peso por kg de Binter en vuelos
interinsulares, y si la comisión del 6% al remitente de Sherpa (además del 6% al viajero, que sí
está confirmado literal en su web) es exacta — reportada por una fuente indirecta, no confirmada
letra por letra.
