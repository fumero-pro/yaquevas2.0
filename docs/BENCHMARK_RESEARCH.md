# Investigación de referentes — YaQueVas

> Generado 2026-08-19. Investigación con fuentes reales (búsqueda web) sobre marketplaces,
> movilidad, paquetería P2P, viajes, fintech, comunicación y retención, más un deep-dive en
> Grabr (referencia más cercana al modelo de YaQueVas) y un benchmark de operadores reales de
> paquetería Canarias/España → Cuba. Ver limitaciones al final de cada sección: los precios y
> datos de terceros cambian con frecuencia y deben reverificarse antes de usarse como baremo real.

## 1. Benchmark de 4 dimensiones (Utilidad · Psicología · Marketing · Ventas/Negocio)

| Empresa | Mejor idea a aprender | Peor problema/error a evitar | Lección concreta para YaQueVas |
|---|---|---|---|
| Amazon/eBay | Confianza "prestada" del marketplace (buyer protection) reduce fricción de la primera compra | Reseñas falsas erosionan confianza a largo plazo | Reseñas verificadas ligadas a envío real, no autoreportadas |
| Alibaba/AliExpress/Mercado Libre | Reputación con métricas objetivas (reclamos, cancelaciones, retrasos) visible antes de transaccionar | Quejas de que soporte "no actúa" ante fraude reportado | Reputación con métricas duras, no solo estrellas |
| Etsy | Nicho + comunidad genera lealtad más allá del precio | — | Fomentar comunidad Canarias↔Cuba con identidad propia |
| Vinted | Pago retenido en plataforma hasta confirmación de recepción reduce estafas | ~41% de usuarios de marketplaces P2P reportan intentos de estafa (60% en 18-24 años); phishing vía chat interno es el vector más común | Escrow obligatorio + advertencias explícitas contra compartir datos fuera del chat |
| Wallapop | Flexibilidad (en persona + envío) amplía casos de uso | Trato en persona sin custodia de pago = más fraude que Vinted | Reforzar la entrega en persona con verificación de identidad fuerte |
| Uber/Lyft | Rating bidireccional + filtrado de quejas fraudulentas antes de penalizar | Desactivaciones injustas sin transparencia | Proceso disciplinario transparente, con derecho a réplica |
| Bolt/Cabify/Grab/Gojek | Localización agresiva de precios y "super-app" genera lock-in | — | Empezar hiperlocal (Canarias-Cuba); el conocimiento local es la ventaja |
| BlaBlaCar | Verificación ID + teléfono + rating de afinidad social genera confianza entre desconocidos | ~17% reportan cancelaciones/info engañosa; comisión percibida como alta (10-21%) | Verificación obligatoria desde el día 1; comisión transparente y moderada |
| Airbnb | Reseñas doble-ciego (ninguna parte ve la del otro hasta que ambas envían o pasan 14 días) evita represalias | Incidentes de seguridad dañan la marca desproporcionadamente | Reseñas doble-ciego remitente↔viajero |
| Booking/Expedia | — | Dark patterns (urgencia falsa, cargos ocultos) generan multas y desconfianza | Nunca urgencia falsa ni cargos ocultos en el precio final |
| Google Maps | UX de confianza mediante datos en tiempo real | — | Mostrar trayecto real (origen-destino-fecha) sin ambigüedad |
| Grabr | Escrow + verificación de identidad + matching por oferta | Soporte lento/inconsistente, reembolsos poco claros, app inestable | Ver sección 2 |
| Roadie/GoShare/CitizenShipper/uShip | Prueba de entrega con fotos aumenta confianza | Documentación de entrega "a discreción del transportista" → inconsistencia | Prueba de entrega con foto obligatoria, no opcional |
| PiggyBee | Seguro de terceros sobre el envío da tranquilidad adicional al escrow | Seguro limitado deja fuera envíos de alto valor | Alianza con aseguradora para envíos de valor declarado alto |
| Revolut/PayPal | Onboarding rápido con verificación biométrica de documento | Congelación de fondos por fraude automatizado sin explicación clara | Cualquier retención debe tener SLA de resolución y canal humano |
| Wise/Stripe | Transparencia total de tarifas (calculadora antes de pagar) | — | Desglose de comisión visible antes de confirmar |
| WhatsApp | Simplicidad radical + cifrado por defecto = confianza instantánea | — | Chat interno tan simple como WhatsApp |
| Telegram | Moderación granular para comunidades grandes | Cifrado opcional (no por defecto) | Cifrar por defecto conversaciones remitente-viajero |
| Duolingo | Loss aversion (rachas) es el mecanismo de retención más potente conocido; "Streak Freeze" redujo el abandono un 21% | Rachas sin perdón generan ansiedad y uso compulsivo vacío | Gamificación de reputación con "red de seguridad", no ansiedad tóxica |

## 2. Grabr en profundidad

- **Matching:** subasta inversa — el remitente publica un "grab" y los viajeros ofertan una
  recompensa; el remitente elige. La mayoría empareja en 72h.
- **Recompensas:** viajero gana ~15-25% del valor del artículo (mínimo 5$); Grabr cobra al
  remitente ~7% de comisión de servicio + fees de pago.
- **Pagos:** escrow, liberado solo tras confirmación de entrega. SLA declarado 3-15 días
  laborables, con quejas recurrentes de esperas de ~14 días sin explicación. Pago vía ACH
  (EE.UU.); "GrabrFi" para viajeros internacionales sin residencia en EE.UU. añade fricción.
- **Verificación:** identidad obligatoria vía Stripe Identity (documento + biometría) antes de
  la primera oferta, + verificación en 2 pasos email/SMS.
- **Chat:** mensajería interna, recomienda citarse en sitios públicos para la entrega.
- **Fricciones reportadas (Trustpilot, foros, reseñas de app store):** soporte lento/inexistente
  (casos de 3 días sin respuesta), pagos atrasados sin explicación, políticas de reembolso
  confusas (devoluciones a wallet interno en vez de método original), verificación percibida
  como invasiva, casos de fraude de viajero (marcar "comprado" sin comprar), notificaciones
  rotas, app inestable.

**Cómo lo simplificamos en YaQueVas:**
1. Sin subasta: el trayecto del viajero ya existe, así que el remitente reserva directo a
   tarifa transparente (no ciclo de ofertas/contraofertas).
2. Escrow con SLA de liberación corto y **publicado** (p.ej. 48h tras confirmación).
3. Verificación de identidad única y no repetitiva — nunca se vuelve a pedir por chat.
4. Prueba de entrega obligatoria (foto + confirmación de ambas partes).
5. Soporte humano con SLA público, aunque limitado en horario.
6. Comisión transparente desde el primer paso, sin ambigüedad.
7. Reseñas doble-ciego en vez del sistema simple de Grabr.

## 3. Paquetería Canarias/España → Cuba (benchmark de mercado, no tarifas propias)

| Operador | Precio verificado | Tiempos | Recogida a domicilio | Fuente |
|---|---|---|---|---|
| Liberty Express | Misceláneos/duraderos 11,99 €/kg + 3€ despacho aduanal; electrónicos 11,99 €/kg + 3€ + 5€/artículo; marítimo 7,90 €/kg (mín. 10kg) o promo caja 20kg = 140€ (≈7€/kg); recargo 20€ fuera de La Habana/Holguín; seguro opcional 3% del valor declarado | No especificado | No confirmado | libertyexpress.com |
| Directo a Cuba | Desde 10€/kg aéreo; marítimo más barato | No especificado | Sí | directoacuba.es |
| LPX Pack | Desde 6,80€/kg (La Habana, 2+ cajas 20kg); 7,50€/kg provincias | No especificado | Sí, puerta a puerta | lpxpack.com |
| Cubakilos | ~10 USD/kg misceláneas; 3kg primeros exentos, resto 30% de la tarifa | Express 24-48h / estándar N/E | Sí, gratis | cubakilos.com |
| Paketea | 5,25€/kg o 15€/kg volumétrico (el mayor) | 72h Habana, 2-12 días provincias | Sí (TIPSA/CTT) | eu.paketea.com |
| Aeroenvío | Marítimo desde 2,99$/lb; aéreo regular 5,00$/lb; exprés 10,00$/lb | No especificado | No confirmado | aeroenvio.com (cubre Habana, Santiago, Holguín, Camagüey, Villa Clara, Matanzas + resto) |
| Cuballama | Desde 1,69-2,99$/lb aéreo | 2-10 semanas provincias, 2-6 Habana | No confirmado desde España | cuballama.com |
| Packlink | Sin precio numérico público (agregador) | — | Depende del courier | packlink.es |
| Destino Cuba / Cuba Envío | "Tarifas planas" sin cifra pública verificable | No especificado | Sí | destinocuba.es, cubaenvio.es |

**Contexto aduanero (Cuba):** nuevo Decreto-Ley 108 "De Aduanas", publicado 21/1/2026, en vigor
desde 21/4/2026. Alimentos/medicinas/aseo hasta 500 USD o 50 kg exentos (verificar vigencia
actual). Misceláneas no comerciales libres hasta 25kg; por encima de 500 USD de valor declarado,
aranceles progresivos hasta el 100% en tramos altos. Prohibidos: drones sin autorización,
psicotrópicos, material pornográfico, entre otros. Fuentes: gotosend.com, d-cuba.com,
cubakilos.com/blog.

**Ancla de mercado (referencia para el motor de precios, no tarifa propia):** el rango observado entre
operadores formales para Canarias→Cuba es aproximadamente **7-12 €/kg**. Un viajero de YaQueVas podría
ofrecer un precio competitivo dentro o por debajo de ese rango y aun así dejar margen para la comisión
de la plataforma — esto es una referencia orientativa para calibrar `pricing_reference_samples` de la
ruta Cuba, nunca un precio hardcodeado.

**Qué NO se pudo verificar (no usar como dato):** precio por "maleta completa" (el mercado
cotiza casi siempre por kg, no por bulto — posible diferenciación de YaQueVas), pesos
máx/mín exactos en la mayoría de operadores, cobertura exacta por provincia salvo Aeroenvío,
precios en tiempo real (cambian con promociones y peso volumétrico). Ningún operador encontrado
opera como crowdshipping P2P — todos son paquetería tradicional, lo que confirma el hueco de
mercado de YaQueVas.

## 4. Diez principios de diseño priorizados por impacto

1. Escrow con SLA de liberación de pago corto y publicado.
2. Verificación de identidad única, robusta y no repetitiva.
3. Sin subasta: reserva directa a precio transparente (el trayecto ya existe).
4. Prueba de entrega obligatoria (foto + confirmación de ambas partes).
5. Transparencia total de comisión desde el primer paso.
6. Reseñas bidireccionales doble-ciego.
7. Chat interno cifrado, simple, con aviso explícito contra compartir datos fuera de la app.
8. Soporte humano con SLA público, aunque limitado.
9. Reputación con métricas duras (a tiempo, cancelaciones, incidencias), no solo estrellas.
10. Gamificación de fidelidad con "red de seguridad" (sin ansiedad tóxica tipo racha punitiva).

## Limitaciones honestas

Los datos de comisión/recompensa de Grabr y los precios de operadores Cuba provienen de blogs
de terceros y webs comerciales, no de fuentes primarias auditadas — pueden estar desactualizados
o ser promocionales. No hay un solo operador Canarias→Cuba con tarifa por "maleta" cerrada (todos
cotizan por kg). No se encontró volumen relevante de discusión sobre Grabr en Reddit (la sección
de fricciones se apoya más en Trustpilot/reseñas web que en foros de usuarios sin filtrar).
Reverificar precios antes de usarlos como baremo real de `tariff_benchmarks` (nunca hardcodear).
