# Borrador de encaje legal, fiscal y de responsabilidad — YaQueVas

**Qué es este documento y qué NO es.** Esto es un borrador de trabajo, redactado poniéndome en el
lugar de un abogado mercantilista, un asesor fiscal y un juez, para darte un punto de partida
razonado — **no es asesoría legal ni fiscal real, y no sustituye a un profesional colegiado**. No
soy abogado ni asesor fiscal. Cada afirmación aquí debe confirmarse, matizarse o corregirse por un
profesional antes de operar con dinero real. Complementa (no sustituye) `REVISION_LEGAL_PARA_ABOGADO.md`,
que sigue siendo la lista de preguntas abiertas — este documento intenta ya dar una primera
respuesta razonada a algunas de ellas, con fuentes reales donde las hay.

---

## 1. Como abogado mercantilista: ¿en qué figura jurídica encaja YaQueVas?

**Tesis defendible: plataforma de intermediación de la sociedad de la información (Ley 34/2002,
LSSICE), no empresa de transporte.** El precedente más directo y favorable es el caso BlaBlaCar en
España: el Juzgado de lo Mercantil nº 2 de Madrid (sentencia 30/2017) desestimó la demanda de
Confebus por competencia desleal, razonando que BlaBlaCar **no organiza transporte terrestre, sino
que pone en contacto a particulares que ya iban a hacer un trayecto y reparten el gasto** — quedando
fuera de la Ley de Ordenación de los Transportes Terrestres (LOTT) y encajando como servicio de la
sociedad de la información. El tribunal fue explícito: poner en contacto con control de pago no
convierte la plataforma en transportista, mientras el conductor no obtenga lucro por la actividad en
sí (solo compensación de gastos). Fuente: [Sentencia caso BlaBlaCar — Lenguaje Jurídico](https://www.lenguajejuridico.com/textos-legales/resoluciones-judiciales/sentencia-del-juzgado-madrid-caso-blablacar/), [BlaBlaCar gana la demanda — Newsroom BlaBlaCar](https://newsroom.blablacar.es/noticias/blablacar-gana-demanda-presentada-por-confebus)

**Por qué YaQueVas encaja en el mismo patrón, con más fuerza incluso:**
- El viajero **ya tenía el trayecto decidido antes de conocer el envío** (a diferencia de un
  repartidor que planifica su ruta en función de los pedidos) — este es exactamente el hecho que
  el juzgado usó para descartar la calificación de transportista en el caso BlaBlaCar.
- YaQueVas no fija itinerarios, no asigna rutas, no controla horarios ni medios de transporte — el
  viajero elige su propio vuelo/ferry/coche por sus propios motivos, ajenos a la plataforma.
- El viajero conserva la última palabra: puede rechazar cualquier envío tras ver contenido, peso y
  fotos — no hay obligación de aceptar, a diferencia de un transportista profesional sujeto a
  contrato de transporte.

**El riesgo real que un abogado debe pesar, con honestidad**: el caso Uber (STJUE C-434/15, 2017)
resolvió justo lo contrario para UberPop — el Tribunal de Justicia de la UE consideró que Uber
**sí** era un servicio de transporte, no un mero intermediario, precisamente porque Uber **organizaba
y controlaba de forma decisiva** el servicio (fijaba el precio, seleccionaba conductores, controlaba
la calidad). La línea divisoria entre "BlaBlaCar" y "Uber" en la jurisprudencia es el **grado de
control** que ejerce la plataforma sobre la ejecución del servicio, no solo la intermediación en sí.
**Punto crítico para el abogado**: YaQueVas calcula el precio orientativo con un motor propio y cobra
una comisión fija del 12% — esto se parece más al cálculo de gastos "recomendado" de BlaBlaCar que
a la fijación de tarifa de Uber, pero es el punto exacto donde un juez podría matizar la calificación
si el margen de negociación del precio (hoy ±20%) se estrechara demasiado, o si se empezara a exigir
al viajero aceptar envíos sin poder rechazarlos. **Recomendación de diseño de producto, no solo
legal**: mantener siempre visible y real la capacidad del viajero de rechazar, y no convertir el
"precio orientativo" en un precio obligatorio de facto.

---

## 2. Como asesor fiscal: IGIC, DAC7 y la doble fiscalidad Canarias-Cuba

**IGIC, no IVA, sobre la comisión de YaQueVas.** Canarias tiene un régimen fiscal indirecto propio
(Régimen Económico y Fiscal de Canarias) — el Impuesto General Indirecto Canario (IGIC) sustituye
al IVA. Confirmado por consulta vinculante de la Agencia Tributaria Canaria (ATC 2195/2023): **la
intermediación de una plataforma digital vinculada a un servicio prestado en Canarias está sujeta a
IGIC**, y es la propia plataforma (no el usuario) quien debe repercutirlo en factura y liquidarlo —
sin que aplique inversión del sujeto pasivo aunque la empresa no esté establecida en Canarias.
Fuente: [Consulta ATC 2195/2023 — Iberley](https://www.iberley.es/resoluciones/consulta-atc-2195-igic-14-11-2023-11642996), [Guía IGIC — Declarando](https://declarando.es/blog/igic). **Pregunta crítica para el asesor**: si la comisión de YaQueVas está sujeta a IGIC por vincularse a un servicio prestado en/entre las islas, ¿aplica igual a la parte del trayecto que termina en Cuba (fuera del territorio IGIC) o solo a la porción interinsular? Es una pregunta real sin respuesta obvia que debe resolver un especialista en REF Canario.

**DAC7 — YaQueVas SÍ es una plataforma sujeta a reporte, con alta probabilidad.** España
traspuso la Directiva DAC7 (Ley 13/2023, Real Decreto 117/2024) exigiendo a las plataformas digitales
informar a Hacienda de los ingresos de sus usuarios-vendedores. El umbral de exención es bajo: **más
de 30 operaciones o más de 2.000 € de contraprestación al año** obliga al reporte del viajero
mediante el Modelo 238. Dado que YaQueVas paga directamente la compensación al viajero a través de la
plataforma, encaja en el perfil de "plataforma que facilita servicios personales/entrega de bienes"
que DAC7 obliga a reportar — muy probablemente desde el primer viajero activo con cierto volumen.
Fuente: [DAC7 y Modelo 238 2026 — Serficon](https://serficon.es/dac7-modelo-238-plataformas-digitales-wallapop-vinted-airbnb-2026/), [DAC7 explicado — Garanta](https://garanta.es/dac7-lo-que-hacienda-sabe-de-las-plataformas-y-como-afecta-a-pymes-y-autonomos/). **Implicación de producto directa, no solo legal**: hace falta capturar el NIF/NIE de cada viajero antes de superar esos umbrales (hoy el registro no lo pide) — es una pieza de producto real que depende de esta confirmación legal, no una formalidad menor.

**Fiscalidad del viajero — actividad esporádica vs. económica habitual.** Es la pregunta 8 de
`REVISION_LEGAL_PARA_ABOGADO.md`, todavía abierta. El propio marco DAC7 (30 operaciones/año como
umbral de reporte) sugiere un punto de referencia razonable para diferenciar "unas pocas veces al
año" de "actividad habitual que exige alta de autónomo" — pero esto lo debe confirmar un asesor
fiscal, no inferirse solo del umbral de reporte de información (reportar a Hacienda no equivale
automáticamente a "debes darte de alta como autónomo").

---

## 3. Como juez, razonando un caso hipotético de responsabilidad

**Escenario**: un envío se pierde o llega dañado. El remitente reclama contra YaQueVas.

Con los hechos actuales del producto (viajero ya iba a viajar, acepta libremente tras ver contenido
y fotos, YaQueVas no elige ni controla el medio de transporte, custodia el pago pero no el objeto
físico), el razonamiento más probable —siguiendo la lógica del caso BlaBlaCar— es que **YaQueVas
respondería como intermediario técnico de la sociedad de la información, no como transportista**:
su responsabilidad se limitaría a fallos de la propia plataforma (ej. un fallo del sistema de pago,
no verificar identidad cuando dice que lo hace), mientras que la responsabilidad por el objeto en
tránsito recaería sobre el viajero que aceptó transportarlo, dentro de los límites que se pacten en
las condiciones operativas — **exactamente lo que ya intenta reflejar el punto 6 de
`REVISION_LEGAL_PARA_ABOGADO.md`, todavía sin redacción definitiva validada**.

**El factor que un juez pesaría en contra de YaQueVas, y que hay que vigilar en el producto**: cuanto
más control ejerza la plataforma sobre la ejecución (fijar precio de forma rígida, exigir aceptación,
gestionar activamente la logística en vez de solo facilitar el contacto), más se acerca al patrón
Uber (transportista) y se aleja del patrón BlaBlaCar (intermediario). El escrow del pago (retenerlo
hasta confirmar entrega) es defendible como protección al consumidor, no como "control operativo del
transporte" — pero un abogado debe confirmar que la redacción de las condiciones lo dice así
explícitamente, no lo deja a interpretación.

---

## 4. Hallazgo nuevo, no cubierto todavía en `REVISION_LEGAL_PARA_ABOGADO.md`: aduana cubana

Investigación real (no estaba en el checklist legal anterior — se añade aquí como punto 25):

**Cuba distingue "equipaje acompañado" de "envíos/equipaje no acompañado", con límites muy distintos:**
- **Equipaje acompañado** (lo que lleva el propio viajero en su vuelo/ferry, que es exactamente el
  modelo de YaQueVas): hasta 1.000 USD en artículos de carácter no comercial: sin límite de valor
  para alimentos/aseo/medicamentos por la Resolución 9/2026.
- **Equipaje NO acompañado / envíos postales por persona natural** (courier tradicional tipo Correos/DHL):
  tope mucho más bajo, **200 USD o 20 kg**.

Fuente: [Directorio Cubano — límites 2026](https://www.directoriocubano.info/panorama/viajas-a-cuba-asi-quedan-el-equipaje-los-envios-y-los-limites-en-dolares-desde-febrero-de-2026/), [D-Cuba — nueva ley de aduana 2026](https://d-cuba.com/nueva-ley-de-aduana-en-cuba-2026-que-puedes-traer-y-que-no)

**Por qué esto es importante para el negocio, no solo para el abogado**: si YaQueVas se puede
calificar ante la aduana cubana como **equipaje acompañado del viajero** (porque literalmente lo es:
va en su maleta, factura), el límite aplicable sería el de 1.000 USD, muy superior al de un envío
postal tradicional (200 USD/20kg) — sería una ventaja competitiva real y legal frente a la
paquetería tradicional, no solo una ventaja de precio. **Pregunta crítica para el abogado/gestoría
aduanera**: confirmar si un envío gestionado y pagado a través de una plataforma digital (con
contrato de intermediación de por medio) sigue calificando como "equipaje acompañado personal" a
ojos de la aduana cubana, o si el hecho de mediar un pago por plataforma lo reclasifica como envío
comercial/postal con el límite más bajo. Es la pregunta que más valor puede aportar de todo este
documento si se confirma a favor.

---

## Resumen — lo más urgente para llevar a un profesional real

1. **Confirmar la calificación jurídica (intermediario vs. transportista)** con la lógica del caso
   BlaBlaCar como punto de partida — y revisar que las condiciones operativas lo reflejen así de
   explícito.
2. **IGIC**: confirmar si la comisión sobre tramos Canarias-Cuba tributa igual que la interinsular.
3. **DAC7**: implementar captura de NIF/NIE antes de que el volumen de cualquier viajero se acerque
   a 30 operaciones/2.000€ al año — con probabilidad alta de que ya aplique desde el principio.
4. **Aduana cubana**: confirmar con un gestor aduanero si el envío vía YaQueVas califica como
   "equipaje acompañado" (límite 1.000 USD) — puede ser una ventaja competitiva real, no solo legal.
5. El resto de puntos de `REVISION_LEGAL_PARA_ABOGADO.md` (seguros, RGPD, DSA, mercancías prohibidas
   por medio de transporte) siguen abiertos, sin cambios desde este documento.
