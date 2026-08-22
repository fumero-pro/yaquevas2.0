# Estudio de mercado + DAFO económico + requisitos de rentabilidad (2026-08-22)

Petición explícita del usuario: "haz un estudio exhaustivo del mercado y hazme un DAFO económico
y todos los requisitos para que sea rentable y ayúdame a hacerla rentable". Este documento NO
repite la investigación de marca/UX/seguridad ya hecha en `DAFO_YAQUEVAS.md` y
`DAFO_MAESTRO_CONSEJO.md` — es exclusivamente el ángulo económico/financiero/de mercado, con datos
reales investigados esta sesión (WebSearch, con fuentes citadas), no estimaciones genéricas.
Complementa `PLAN_RENTABILIDAD.md` (comisión, benchmark de take rate, volumen para 1,5M€/año) y
`PRECIO_INTERINSULAR.md` (motor de precios ya implementado: talla en Canarias, kg en Cuba,
distancia real en coche mismo-isla).

## Resumen ejecutivo — el hallazgo que cambia la prioridad

**La ruta Canarias-Cuba es real y tiene mejor margen por envío, pero su volumen está
estructuralmente limitado por el tamaño de la diáspora cubana en Canarias (~64.000 personas). El
volumen que de verdad puede llevar a YaQueVas a la rentabilidad tiene que salir del mercado
interinsular e intra-isla (2,28 millones de habitantes), no de Cuba.** Esto no estaba explícito en
el análisis anterior (que asumía un escenario de "30% de la mezcla desde Cuba" sin comprobar si esa
cuota es alcanzable dado el tamaño real de la población objetivo) — con los datos reales de esta
sesión, ese supuesto no aguanta el cálculo (ver sección 1.2).

---

## 1. Estudio de mercado (TAM / SAM / SOM), con fuentes reales

### 1.1 Interinsular + intra-isla (Canarias) — el mercado grande

- **Población de Canarias: 2.277.705 habitantes** (INE, a 1 de julio de 2026) — máximo histórico.
  Por isla: Tenerife 972.018, Gran Canaria 879.456, Fuerteventura 131.905 (INE, enero 2026).
  [Diario de Avisos](https://diariodeavisos.elespanol.com/2026/08/poblacion-canarias-julio-2026-ine/) ·
  [Idealista](https://www.idealista.com/news/vacacional/destinos-turisticos/2026/04/14/892892-cual-es-la-poblacion-de-tenerife-en-2026-este-es-su-numero-de-habitantes)
- El 23,9% de la población (545.225 personas) nació en el extranjero — un archipiélago con mucha
  movilidad de personas entre islas y con el exterior, terreno fértil para "alguien que ya va,
  lleva esto".
- **TAM razonado**: toda la población de Canarias es candidata a enviar algo entre islas alguna
  vez (mudanza parcial, olvido, regalo, recambio, documento). No existe una cifra pública de
  "volumen de paquetería interinsular" (Correos no publica el dato desagregado — búsqueda
  específica sin resultado, se documenta como no verificado, no como cifra inventada).
- **Novedad de esta sesión que amplía el TAM real**: el precio por distancia real en coche dentro
  de la misma isla (`misma_zona`, ver `PRECIO_INTERINSULAR.md`) abre un mercado que antes no
  existía como categoría propia — mensajería hiperlocal entre municipios de una misma isla
  (recogidas, olvidos, recados), un mercado de alta frecuencia potencial que no depende de nadie
  "yendo a otra isla", solo de alguien que ya iba en coche a otro municipio.

### 1.2 Corredor Canarias-Cuba — el mercado de mejor margen, pero pequeño

- **Cubanos residentes en Canarias: 63.837** (ISTAC, dato más reciente con cobertura en prensa de
  junio 2026 — "cifra más alta registrada"), segundo grupo migrante del archipiélago tras los
  venezolanos (+88.000). Reparto por provincia (dato de 2023, algo más antiguo): ~20.580 en
  Tenerife, ~18.015 en Las Palmas. [Cibercuba](https://www.cibercuba.com/noticias/2026-06-14-u1-e208512-s27061-nid332241-canarias-consolida-destino-migracion-cubana-casi-64) ·
  [14ymedio](https://www.14ymedio.com/cuba/establecen-canarias-63-800-cubanos_1_1127816.html)
- **Cubanos residentes en toda España: ~287.000-295.500** (estimaciones de distintas fuentes de
  prensa citando datos provisionales del INE a 1 de enero de 2026; 35.200 cubanos emigraron solo
  en 2025). [El Economista](https://www.eleconomista.es/economia/noticias/13777240/02/26/al-menos-35200-cubanos-emigraron-a-espana-durante-el-ano-2025-y-ya-suman-287490.html)
- **El mercado informal de envío a Cuba es real, grande y ya tiene comportamiento de pago
  establecido**: tras la re-inclusión de Cuba en la lista de EEUU de "estados patrocinadores del
  terrorismo", los canales formales de remesas se redujeron y creció el mercado informal de
  "mulas". Una fintech (Íkualo) que acaba de lanzar un canal formal España-Cuba estima canalizar
  **~22 millones de dólares en remesas en 2026** solo con su servicio, dentro de un volumen total
  estimado de ~44 millones de dólares/año en transacciones — y reconoce que buena parte del flujo
  real sigue circulando por canales informales que intenta capturar.
  [DiarioDeCuba](https://diariodecuba.com/cuba/1776287322_66431.html) · [elTOQUE](https://eltoque.com/nueva-via-permite-enviar-dinero-a-cuba-desde-espana)
- **Lectura honesta para YaQueVas**: esto confirma que SÍ existe un mercado dispuesto a pagar por
  hacer llegar algo (dinero o bultos) a Cuba fuera de los canales oficiales, con desconfianza real
  hacia la informalidad (motivo de negocio de Íkualo) — la misma oportunidad de confianza que
  YaQueVas ya explota con escrow/verificación. Pero es un mercado de remesas de DINERO, no
  necesariamente de bultos físicos — no hay que confundir el tamaño de ambos mercados.
- **Estimación de demanda de bultos físicos (razonada, no verificada — primera vez que se hace este
  cálculo para el proyecto)**: de los ~64.000 cubanos en Canarias, asumiendo que la mitad mantiene
  vínculo activo de envío a familiares (~32.000 personas) y que YaQueVas alcanza una penetración
  real del 2-5% en 1-2 años (nueva, sin marca conocida, compitiendo con familiares/mulas ya
  establecidos) → **640-1.600 usuarios activos**. Con una frecuencia estimada de 2-4 envíos/persona
  al año (razonado por analogía con patrones de remesas, no un dato de bultos verificado) →
  **~1.300-6.400 envíos/año solo del segmento diáspora cubana en Canarias**.
- **Comparado con el volumen necesario para 1,5M€/año ya calculado en `PLAN_RENTABILIDAD.md`
  (~51.200 envíos/año en el escenario de GMV, mezcla base) — el corredor Cuba, incluso a plena
  penetración razonable, aporta como mucho un 12% de ese volumen.** El resto tiene que salir de
  Canarias interinsular/intra-isla. Cuba sigue siendo un mercado real y de mejor ticket medio (por
  el precio en kg + recargo de avión), pero no es la palanca de volumen.

### 1.3 Competencia directa — quién más pelea por este mercado

- **Sherpa** (crowdshipping P2P, ya investigado en sesiones anteriores): confirmado activo hoy en
  Madrid, Barcelona, Valencia (`sherpapp.es`, "ahorros de hasta un 70%"), **sin presencia en
  Canarias ni en rutas internacionales**. Sin cifras públicas de usuarios/facturación — startup
  respaldada por Lanzadera, no cotiza ni publica cuentas.
  [sherpapp.es](https://sherpapp.es/)
- **Aviso de desambiguación real, encontrado al investigar**: existe una empresa distinta llamada
  "Sherpa.ai" (inteligencia artificial, ronda de financiación de 18M$ en 2026, participada por el
  Estado español) que NO tiene relación con Sherpa crowdshipping — fácil de confundir en búsquedas,
  documentado aquí para que no se cite por error en el futuro.
- **Correos/DHL** (paquetería tradicional): ya cuantificado el hueco de precio en
  `PRECIO_INTERINSULAR.md`/`PLAN_RENTABILIDAD.md` — no se repite aquí.
- **Nadie identificado hoy compite específicamente en "coche entre municipios de la misma isla"
  con precio por distancia real** — la pieza que se acaba de construir esta sesión no tiene un
  competidor P2P directo conocido en Canarias, solo mensajería profesional tradicional (más cara,
  sin el factor "ya iba de todas formas").

---

## 2. DAFO económico (solo dinero/mercado — el DAFO de producto/marca ya existe en otros docs)

### Fortalezas
1. **Coste fijo real ~0€/mes** (Render/Turso/Resend en capa gratuita) — cualquier euro de
   comisión que entra es margen real, no absorbido por infraestructura.
2. **Comisión (20%) validada por el rango real del sector** (Uber 20-28%, Glovo 20-30%, Deliveroo
   25-35%) — no es una cifra arriesgada, hay margen razonado para subir más si hiciera falta.
3. **Precio por talla en Canarias y por kg en Cuba, ambos calcados de comparadores reales** (Sherpa
   por talla, courier de nicho España-Cuba por kg) — no hay que inventar ni justificar el modelo
   de precio ante nadie, ya está validado por el mercado existente.
4. **Nueva pieza de coche-misma-isla por distancia real**, validada contra el coste real de
   gasolina (deja al viajero >3x el coste del combustible) — abre un mercado de alta frecuencia
   que hoy nadie cuantifica ni explota con este modelo P2P en Canarias.
5. **Comportamiento de pago ya existente en el mercado objetivo**: el corredor Cuba ya tiene un
   mercado real de personas pagando por hacer llegar algo fuera de los canales oficiales (remesas,
   mulas) — no hay que "educar" al mercado sobre si esto es algo por lo que se paga.

### Debilidades
1. **Sin Stripe Connect implementado** — hoy no se puede pagar de verdad a un viajero por Cuba ni
   por ninguna ruta; es un bloqueador real para monetizar cualquiera de los volúmenes calculados
   arriba, no solo un detalle técnico pendiente.
2. **Cero marca conocida frente a un mercado con canales informales muy arraigados** (familiares
   que viajan, mulas de confianza) — la penetración real puede ser más lenta que la del cálculo
   optimista de la sección 1.2, especialmente al principio.
3. **Un solo fundador, sin equipo de growth/marketing** — alcanzar los ~51.200 envíos/año
   calculados para 1,5M€ (GMV) exige adquisición de usuarios real, no solo que el producto exista.
4. **Sin dato propio de frecuencia de envío real** (cuántas veces al año una persona envía algo
   entre islas o a Cuba) — toda la sección 1.2 es una estimación razonada, no medida; el primer
   mes de datos reales de la plataforma debería usarse para corregirla.

### Oportunidades
1. **Squeeze regulatorio en remesas formales a Cuba (relisting de EEUU) está empujando volumen
   hacia canales informales que buscan formalizarse** (motivo de negocio explícito de la fintech
   Íkualo) — una plataforma con escrow/verificación real puede capturar parte de ese desplazamiento
   hacia "menos informal, más seguro", no solo competir en precio.
2. **Diáspora cubana en Canarias sigue creciendo** (35.200 cubanos más solo en 2025 a nivel
   nacional) — el mercado objetivo del corredor Cuba no es estático, crece cada año.
3. **Mercado de "coche entre municipios" sin competidor P2P directo conocido en Canarias** —
   ventana real de ser el primero, con un modelo de precio ya validado contra el coste real de
   gasolina.
4. **Sherpa no opera en Canarias ni internacionalmente** — sigue siendo una ventana de expansión
   antes de que el competidor más parecido llegue aquí (ya identificado en el DAFO maestro
   anterior, sigue vigente).

### Amenazas
1. **El volumen necesario para 1,5M€/año es alto para una plataforma de 8 islas + un corredor
   pequeño** — si la adquisición de usuarios no despega, el negocio puede quedarse en un tamaño
   mucho menor de forma sostenida, no solo temporalmente al principio.
2. **Complejidad regulatoria Cuba-EEUU (sanciones, GAESA) puede afectar la capacidad de formalizar
   pagos en esa ruta específica** — un riesgo que no depende de YaQueVas ni se puede mitigar solo
   con producto.
3. **Si la penetración real de la diáspora cubana resulta menor al 2% estimado**, el corredor Cuba
   aporta aún menos volumen del ya modesto cálculo de la sección 1.2 — el negocio dependería casi
   por completo del mercado interinsular/intra-isla.
4. **Un competidor de mensajería local (no necesariamente P2P) podría entrar al hueco de "coche
   misma isla" antes de que YaQueVas consiga tracción**, dado que no hay barrera de entrada técnica
   fuerte en ese modelo.

---

## 3. Requisitos concretos para que sea rentable (checklist, no aspiracional)

Cada punto es una condición necesaria, no un "sería bonito tener":

1. **Stripe Connect operativo** — sin esto no se puede pagar de verdad a ningún viajero, en ninguna
   ruta. Es el bloqueador más urgente de todos (`docs/STRIPE_SETUP.md` ya documenta lo que falta).
2. **Volumen real sostenido**: ~140 envíos/día (escenario base, GMV=1,5M€) o ~54/día (escenario de
   mezcla más madura hacia tamaños grandes) — ver `PLAN_RENTABILIDAD.md` sección de volumen.
3. **Adquisición de usuarios activa en dos segmentos distintos, con mensajes distintos**:
   - Comunidad cubana en Canarias (WhatsApp/Facebook groups, asociaciones de la diáspora,
     boca-oreja) — mensaje: "más seguro que una mula, más barato que una agencia formal".
   - Público general interinsular/intra-isla — mensaje: "ya que vas, gana" / recados hiperlocales.
4. **Alta como autónomo** (o SL si el volumen ya lo justifica) en el momento de activar Stripe en
   real — ver `PLAN_RENTABILIDAD.md` sección legal, ya resuelto en el análisis anterior.
5. **Captura de NIF/NIE del viajero** antes de que el volumen de cualquiera se acerque a los
   umbrales de DAC7 (30 operaciones/2.000€ al año) — pendiente de implementar, ya señalado.
6. **Medir la frecuencia de envío real desde el primer mes** para sustituir la estimación razonada
   de la sección 1.2 por un dato propio — sin esto, cualquier proyección sigue siendo una hipótesis.
7. **Vigilar el límite de uso de Nominatim** (1 petición/segundo) si el buscador de direcciones
   recibe tráfico real — ya mitigado con rate limiting en el servidor esta sesión, pero conviene
   revisar logs si el volumen de "coche misma isla" despega de verdad.

---

## 4. Plan de acción priorizado (para ayudar a hacerla rentable, no solo diagnosticar)

**Ya hecho esta sesión** (base necesaria antes de poder ejecutar nada de lo de abajo): precio por
talla/kg/distancia real, comisión al 20%, buscador de direcciones, validación de margen real sobre
gasolina — todo commiteado y pusheado (`06c3ef9`, `92aa05a`).

**Siguiente, por impacto real (no por facilidad de implementar)**:
1. **Stripe Connect** — sin esto, ningún volumen de los calculados se traduce en dinero real para
   nadie. Es la pieza que bloquea monetizar todo lo demás.
2. **Primer canal de adquisición en la comunidad cubana de Canarias** — no es una tarea de código;
   es contactar asociaciones/grupos reales de la diáspora (identificados como el segmento con
   comportamiento de pago ya establecido, sección 1.2/2). El producto ya está listo para recibirlos
   (precio por kg, recargo de avión, escrow, verificación).
3. **Instrumentar un evento propio de "envío completado" con isla origen/destino y si fue misma
   isla/interinsular/internacional**, para poder sustituir la estimación de la sección 1.2 por un
   dato real en cuanto haya 30-50 operaciones — sin esto, todo el resto de decisiones de precio
   sigue siendo una hipótesis razonada.
4. **Alta como autónomo** en el momento exacto de activar Stripe en real (no antes, no depende de
   una fecha del calendario — ver `PLAN_RENTABILIDAD.md`).
5. **Revisar el límite de Nominatim** si el uso del buscador de direcciones crece — hoy mitigado,
   pero vale la pena vigilar logs reales una vez haya tráfico.

## Qué NO se verificó (honestidad, no se inventó)

Volumen real de paquetería interinsular de Correos (no publicado, búsqueda específica sin
resultado). Frecuencia real de envío de bultos físicos por persona/año en el corredor Cuba (la
sección 1.2 usa una estimación razonada por analogía con patrones de remesas, no un dato medido).
Cifras de usuarios/facturación de Sherpa (startup sin cuentas públicas, ya documentado en sesiones
anteriores). El reparto exacto de los 63.837 cubanos por isla es de 2023 (algo desactualizado
frente al total de 2025) — se usa como orden de magnitud, no como cifra exacta actual.
