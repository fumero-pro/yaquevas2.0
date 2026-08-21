# Plan de rentabilidad — investigación de modelo de negocio (2026-08-20)

Investigación con fuentes reales (Trustpilot, comunicados de resultados, prensa financiera) sobre
cómo ganan dinero de verdad Grabr, BlaBlaCar, Vinted, Wallapop, Sherpa, Uber y paquetería tradicional
(DHL/Correos), y qué dicen las opiniones reales de usuarios sobre dinero. Complementa
`BENCHMARK_COMPETENCIA.md` (lecciones de producto) y los DAFO de diseño ya escritos hoy — este es el
ángulo de negocio/rentabilidad que pediste explícitamente.

## Hallazgos por empresa (resumen, fuentes completas en el historial de la sesión)

- **Sherpa** (competidor más idéntico): **misma comisión exacta que YaQueVas ya tiene fijada — 12%
  total, 6%/6%**. Sin quejas de dinero encontradas. Confirma que el modelo de comisión de YaQueVas no
  es un riesgo, es un punto de precio ya validado en el mercado español real.
- **BlaBlaCar**: rentable en EBITDA y beneficio neto desde abril 2022. Facturación €253M (2023, +29%).
  Queja de dinero dominante: reembolsos solo en "voucher", no devolución real.
- **Vinted**: la más rentable del lote — beneficio neto €76,7M (2024, +330%), €62M (2025) sobre
  facturación de más de €1.000M. Modelo: gratis al vendedor, fee de "protección" obligatoria al
  comprador. Queja dominante: la protección no siempre cubre cuando hace falta.
- **Wallapop**: pérdidas grandes y sostenidas (€50M en 2022, €30,4M en 2023) pese a crecer con fuerza.
  Queja dominante: su fee de "protección" se percibe como comisión disfrazada.
- **Grabr**: sin cifras públicas de rentabilidad fiables. Queja #1, la más grave de todo el estudio:
  **impago o retraso de pago al viajero** (un caso: &gt;$14.500 sin cobrar, más de un mes de espera).
- **Uber**: 2024 récord — beneficio neto $9.860M (+422%). Pero su "upfront pricing" oculta el desglose
  de comisión al conductor — la queja no es "es alta", es "ya no sé cuánto me quitan".
- **DHL vs. especialista de nicho en la ruta Cuba**: DHL cobra ~€184 por 5kg a Cuba; un courier
  especializado en el corredor España-Cuba cobra ~€75-90 — 50-60% más barato solo por especializarse
  en la ruta. Ese hueco de precio es el espacio real donde YaQueVas puede competir con margen.

## Recomendaciones concretas para YaQueVas

Todas compatibles con los principios ya fijados (comisión siempre visible, cero sorpresas, cero dark
patterns, cero gamificación de dinero real — `PRINCIPIOS_DE_DISENO.md`).

1. **No tocar la comisión 12% (6/6) por inseguridad** — está validada por el mercado (Sherpa) y por
   negocios rentables con comisiones de rango similar o mayor (BlaBlaCar). El riesgo no está en el %.
2. **El mayor riesgo reputacional real es el retraso de pago al viajero**, no la comisión — es la queja
   #1 contra Grabr. Acción concreta: definir y cumplir un SLA de pago publicado (p.ej. "liberado en
   menos de 24h tras confirmar entrega") y convertirlo en argumento de marketing, no solo en
   funcionalidad silenciosa.
3. **Nunca disfrazar un cargo adicional de "seguro" si no se puede cumplir al 100%** — es la queja
   repetida contra Wallapop Protect y Vinted. Cualquier seguro futuro debe ser opcional, marcado como
   tal, con cobertura y reclamación que se cumplan siempre.
4. **La transparencia de precio es un argumento de venta, no solo un principio interno** (contraste con
   Uber) — mostrar en cada reserva "Tú pagas X · el viajero recibe Y · comisión Z (6%+6%)" de forma
   explícita, no solo tenerlo calculado internamente.
5. **Palancas de ingresos adicionales que no rompen la confianza ya construida**:
   - Seguro de envío opcional y transparente (up-sell in-app claramente marcado, modelo BlaBlaCar).
   - Verificación reforzada opcional para envíos de mayor valor declarado.
   - Suscripción para viajeros frecuentes de la ruta Canarias-Cuba (comisión reducida a cambio de
     cuota fija) — ingresos recurrentes predecibles.
   - Comisión variable por volumen con tabla pública de tramos (remitentes/viajeros de alto volumen).
   - Posicionar el precio frente a DHL (no frente a Sherpa) como argumento comercial: el hueco de
     ~€100 por 5kg entre paquetería tradicional y un especialista de nicho es donde está el margen real.
6. **Vigilar a Sherpa como competidor de expansión, no de precio** — mismo modelo de comisión exacto,
   respaldo serio (Lanzadera/Juan Roig), sin presencia internacional todavía. Si se expande a rutas
   internacionales, sería el rival más peligroso por partir del mismo modelo ya probado.

## Actualización 2026-08-21: comisión subida a 20% + objetivo de 1,5M€/año

Petición explícita del usuario: subir la comisión ("10%y10%" en vez de 6%/6%) y/o precios más
altos, "debe ser rentable", con un objetivo de facturación de referencia de **1,5M€/año**.
Aplicado: comisión subida a 10%/10% (20% total) y precio por talla recalculado sobre el extremo
superior de las bandas de Sherpa (ver `docs/PRECIO_INTERINSULAR.md`).

**¿Es 20% razonable frente al sector?** Investigación real (WebSearch, cifras publicadas):

| Empresa | Comisión/take rate real | Fuente |
|---|---|---|
| Sherpa | 12% (6%+6%) | ya verificado, ver arriba |
| **YaQueVas (nuevo)** | **20% (10%+10%)** | — |
| Uber | 20-28% (take rate global, informes 10-K) | prensa financiera especializada |
| Glovo | 20-30% de comisión a restaurantes | guías de gestión de restaurantes 2026 |
| Deliveroo (Reino Unido) | 25-35% de comisión a restaurantes | guías de gestión de restaurantes 2026 |

YaQueVas al 20% queda en el extremo **bajo** del rango que el sector de plataformas (reparto y
movilidad) ya cobra de verdad — Uber y Glovo empiezan justo donde YaQueVas termina. Esto da
margen razonado para subir más si el objetivo de 1,5M€/año lo exige, sin salirse del rango que
el mercado ya acepta pagar. Nota de honestidad: los rangos de Glovo/Deliveroo son anchos porque
varían por país/restaurante/volumen — tratados como orientativos, no como una cifra única y exacta.

**Volumen necesario para 1,5M€/año**, con el nuevo precio por talla y comisión al 20% (cálculo
completo con el desglose por talla en el análisis financiero — ver artefacto de rentabilidad):
"facturación" es ambiguo en un marketplace, así que se calculan las dos lecturas posibles.

| Escenario | Ticket medio | Comisión/envío | Envíos/año si "facturación" = comisión neta | Envíos/año si "facturación" = GMV |
|---|---|---|---|---|
| Base (mezcla de hoy: 80% interinsular, mayoría S-L) | 29,28 € | 5,86 € | ~256.000 (~702/día) | ~51.200 (~140/día) |
| Madurez (30% Cuba, más peso XL-XXXL) | 75,56 € | 15,11 € | ~99.300 (~272/día) | ~19.850 (~54/día) |

**Conclusión honesta**: ni la comisión ni el precio por sí solos resuelven el objetivo de 1,5M€ a
corto plazo — el escenario "base" exige un volumen que un marketplace de dos islas no alcanza
pronto. La palanca real es la **mezcla**: empujar hacia la ruta Cuba (ticket medio ~3× mayor) y
hacia los tamaños grandes (XL-XXXL, que son exactamente los que más comisión dejan tras la subida
de precio de hoy) recorta el volumen necesario a una cuarta parte. Competir solo por sobres y
cajas pequeñas en Canarias nunca llega a 1,5M€ con un volumen realista.

**Pendiente real, no resuelto todavía**: la base de datos de producción en Turso ya tenía sembrada
la comisión antigua (6%/6%) de forma explícita — el cambio de código no la actualiza sola, hay
que subirla desde el panel de administración (Comisiones y baremo) tras desplegar este cambio.

## Limitaciones honestas
Cifras de Grabr (ARR, valoración) vienen de estimaciones de terceros (Getlatka), no de la empresa —
tratadas con reserva explícita. Sherpa no tiene cifras públicas de facturación/beneficio (startup
reciente en Lanzadera). El resto de cifras (BlaBlaCar, Vinted, Uber) vienen de comunicados oficiales
o prensa financiera citada, más fiables.
