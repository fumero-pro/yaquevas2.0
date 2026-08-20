# YaQueVas — Benchmark de competencia

Solo referencias investigadas de verdad (no relleno genérico). Se amplía cuando haya una razón concreta para mirar otra plataforma, no por completismo.

| Empresa | Mejor idea | Peor problema | Lección para YaQueVas |
|---|---|---|---|
| **Grabr** | Precio y comisión visibles antes de publicar; doble propuesta de valor en una frase ("Shop Anywhere, Travel Everywhere") | Pagos a viajeros con retrasos de 15+ días, a veces sin llegar nunca (queja #1 en Trustpilot) | Nuestro pago se libera automáticamente al confirmar entrega — convertirlo en mensaje de marketing explícito, no solo en funcionalidad silenciosa |
| **Correos (tarifa oficial Z6 interinsular)** | Transparencia total de precio público, consultable por cualquiera | — (no es competencia directa, es la referencia de mercado que usamos) | Nuestra tabla comparativa de precios debe citar la fuente igual de claro, para que el usuario pueda verificarlo él mismo |
| **Sherpa (sherpapp.es)** | Categorías de tamaño simples (S–XXL) en vez de tipos de objeto; tono "simple, fiable y sostenible" | No se pudo auditar en profundidad (web no siempre accesible) | Mantener el lenguaje igual de directo; evitar jerga logística |
| **Grabr (ampliación 2026-08-19)** | Verificación de identidad obligatoria antes de operar (Stripe Identity: documento + biometría) | Verificación repetida/invasiva pedida de nuevo por chat en casos de disputa, sin explicar por qué — usuarios que se negaron vieron la cuenta bloqueada | Verificar una sola vez y no volver a pedir documentos sensibles por chat bajo ningún concepto (principio 3) |
| **Grabr — modelo de matching** | Matching por oferta (subasta inversa) da flexibilidad de precio | Genera demora y fricción (ciclo de ofertas/contraofertas) cuando el remitente solo quiere reservar | En YaQueVas el trayecto ya existe (no se busca destino): reserva directa a tarifa transparente, sin subasta |
| **Roadie / GoShare** | Prueba de entrega con foto integrada en el flujo, no opcional | uShip / CitizenShipper: prueba de entrega "a discreción del transportista" → inconsistencia y disputas | La confirmación de entrega debe exigir foto, no ser un paso que el viajero pueda saltarse |
| **Airbnb** | Reseñas doble-ciego (ninguna parte ve la del otro hasta que ambas puntúan o pasan 14 días) evita represalias | — | Aplicar el mismo mecanismo a las reseñas remitente↔viajero en vez de reseña visible inmediata |
| **BlaBlaCar** | Verificación de identidad + teléfono obligatoria genera confianza entre desconocidos que comparten trayecto | Comisión percibida como alta y poco transparente (10-21% según fuente), ~17% de usuarios reportan cancelaciones/info engañosa | La comisión debe mostrarse desglosada antes de confirmar, siempre — nunca como sorpresa al pagar |
| **Vinted / Wallapop** | Pago retenido en la plataforma hasta confirmar recepción reduce estafas | ~41% de usuarios de marketplaces P2P reportan intento de estafa; el vector más común es phishing por chat interno pidiendo datos fuera de la app; Wallapop además pierde usuarios que se mueven a WhatsApp fuera del chat protegido, sin protección real en disputas | El chat debe avisar activamente (no solo callar) contra compartir datos de pago/contacto fuera de la plataforma, y detectar/alertar intentos de moverse fuera |
| **Grabr (ampliación 2026-08-20)** | — | Reembolsos devueltos a un "wallet" interno en vez del método de pago original, sin que el usuario lo pidiera | Cualquier reembolso vuelve siempre al método de pago original, con plazo visible desde el primer momento — nunca un saldo interno forzado |
| **BlaBlaCar — framework D.R.E.A.M.S.** | Modelo de confianza explícito con 6 capas: Declared, Rated, Engaged, Activity, Moderated, Social — no solo "verificado + rating" | — | El perfil de confianza debe mostrar más de 2 señales: identidad declarada y verificada, valoración, actividad reciente, moderación activa, señales sociales — no solo un badge y una estrella |
| **Airbnb — foto de perfil** | Foto de perfil real obligatoria; se consulta en ~50% de las reservas y dispara confianza medible | — | Foto real (no avatar genérico) y una bio corta del viajero/remitente, obligatoria, no opcional |
| **CitizenShipper** | Puja transparente + comprobación de antecedentes del transportista | Comisión del ~30% escondida en letra pequeña (uShip, en cambio, la muestra clara) | La comisión de YaQueVas se muestra siempre antes de aceptar la operación, nunca en letra pequeña — principio ya recogido, aquí el contraejemplo concreto que lo confirma |
| **Roadie** | Entrega same-day | Calificación F en Better Business Bureau, 87 quejas en 12 meses, robos reportados sin trazabilidad | La prueba de entrega con foto (ya implementada) y un seguro/trazabilidad claros no son opcionales — es la diferencia entre confianza real y solo velocidad |
| **Amazon** | Recomendación contextual ("esto encaja con lo que ya haces/compras") sube conversión de forma medible | — | Un envío compatible con un viaje debe presentarse como "este envío encaja con tu viaje", no como listado genérico — ya es lo que hace el matching, cuidar que el copy lo diga así |

## Paquetería Canarias/España → Cuba (referencia de mercado, no tarifa propia)
Investigación de operadores reales (Liberty Express, Directo a Cuba, LPX Pack, Cubakilos, Paketea,
Aeroenvío, Cuballama, Packlink) con precios y fuentes verificadas: ver `docs/BENCHMARK_RESEARCH.md`
sección 3. Dato relevante para producto: **ningún operador encontrado cotiza por "maleta cerrada"**,
todos cotizan por kg — posible punto de diferenciación de YaQueVas si se ofrece precio por maleta.
Tampoco existe ningún operador que funcione como crowdshipping P2P (todos son paquetería
tradicional/agencia) — confirma el hueco de mercado.

## Pendiente de investigar (con razón concreta, no por llenar tabla)
- **PiggyBee**: seguro de terceros sobre el envío, relevante solo si se evalúa asegurar envíos de alto valor declarado.

Investigación amplia de referentes generales (Amazon, Uber, Booking, Duolingo, WhatsApp, fintech,
etc.) pedida explícitamente por el prompt maestro de marca 2026-08-19: ver `docs/BENCHMARK_RESEARCH.md`.
Se mantiene fuera de esta tabla canónica porque son patrones de UX/negocio generales, no de este
mercado específico — esta tabla solo incorpora lo que cambia una decisión de producto concreta, no
como ejercicio de benchmarking exhaustivo.
