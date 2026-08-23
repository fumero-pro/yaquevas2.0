'use strict';
// Borradores legales legibles de YaQueVas — estructura inspirada en cómo organizan sus
// condiciones plataformas de crowdshipping comparables (ver docs/BENCHMARK_COMPETENCIA.md),
// contenido escrito desde cero a partir de cómo funciona YaQueVas realmente (no se copia
// texto de ningún tercero).
//
// Revisión 2026-08-23: a petición explícita del usuario ("las decisiones legales tómalas para
// que cumpla la normativa y adáptalas"), la mayoría de los puntos que estaban marcados como
// PENDIENTE se han resuelto adoptando la posición más protectora/conservadora de entre las
// razonablemente defendibles, siguiendo el mismo patrón que usan plataformas P2P comparables
// (BlaBlaCar, Wallapop, Glovo) — ver docs/REVISION_LEGAL_PARA_ABOGADO.md para el razonamiento
// completo punto por punto y docs/BORRADOR_ENCAJE_LEGAL.md para las fuentes citadas. Esto NO es
// asesoría legal formal ni sustituye la revisión de un abogado colegiado — es la mejor
// aproximación razonada posible sin serlo. Quedan explícitamente señalados como pendientes solo
// los puntos que de verdad no se pueden resolver sin datos que hoy no existen (la sociedad
// todavía no está constituida) o sin una decisión profesional que no es mía (seguro, licencias).
// Antes de mover dinero real (activar Stripe Connect con volumen), un abogado debe confirmar por
// escrito los puntos marcados aquí como "recomendado confirmar antes de escalar".

const PENDIENTE = '<span class="pending">[PENDIENTE — requiere datos que aún no existen: constitución de la sociedad]</span>';
const REVISAR_ANTES_DE_ESCALAR = '<span class="pending">[Recomendado confirmar con un abogado antes de operar con volumen/dinero real]</span>';

const terminos = `
<h2>1. Qué es YaQueVas</h2>
<p>YaQueVas es una plataforma digital que pone en contacto a dos tipos de personas: quienes ya
tienen previsto un viaje (<strong>viajeros</strong>) y disponen de espacio libre en su equipaje, y
quienes necesitan hacer llegar un envío a otra persona (<strong>remitentes</strong>). YaQueVas
facilita el contacto, el cálculo de un precio orientativo, el cobro, la retención del pago hasta
que se confirma la entrega y su liberación al viajero — pero <strong>no transporta nada
directamente</strong>: quien transporta el envío es siempre el viajero, en un trayecto que ya iba
a hacer por su cuenta.</p>
<p>YaQueVas opera como <strong>intermediario tecnológico</strong>, no como operador de transporte:
no fija rutas, no tiene flota propia, no cobra por kilómetro ni por trayecto, y el viajero
mantiene en todo momento la decisión final de qué acepta llevar. Esta posición se refuerza
activamente en cómo funciona el producto (el viajero publica un viaje que ya tenía decidido hacer,
antes de saber si habrá algún envío compatible) y es el mismo criterio que usan plataformas de
carpooling y crowdshipping comparables. ${REVISAR_ANTES_DE_ESCALAR}</p>

<h2>2. Definiciones</h2>
<ul>
  <li><strong>Viaje:</strong> un trayecto que un viajero publica, con origen, destino, fecha y
  espacio disponible.</li>
  <li><strong>Envío:</strong> lo que un remitente publica que necesita hacer llegar, con su
  contenido declarado, peso, fotografías y destino.</li>
  <li><strong>Operación:</strong> la relación concreta entre un envío y un viaje concretos, desde
  que el remitente solicita hasta que se confirma la entrega y se libera el pago.</li>
  <li><strong>Compensación:</strong> la cantidad que recibe el viajero por aceptar llevar un envío
  en un trayecto que ya realizaba. Se trata como <strong>contraprestación por un servicio</strong>
  (no como mero reparto de gastos): el importe se calcula por el tamaño del bulto y la ruta, no en
  proporción al coste real del trayecto del viajero, así que no encaja en la figura de
  "cost-sharing" que exime del IVA/IRPF a modelos de carpooling puro. Un viajero que use YaQueVas
  de forma puntual y esporádica normalmente entra dentro de la actividad no habitual (sin
  obligación de alta como autónomo); si repite con frecuencia y volumen relevante, la actividad
  puede calificarse como económica habitual y generar obligación de alta y de declarar el
  rendimiento en IRPF — es responsabilidad de cada viajero valorar su propia situación.
  ${REVISAR_ANTES_DE_ESCALAR}</li>
</ul>

<h2>3. Registro y cuenta</h2>
<p>Para publicar un viaje, un envío, o aceptar una operación es necesario registrarse con nombre,
apellidos, email y contraseña, y aceptar estas condiciones. Cada persona es responsable de la
veracidad de los datos que proporciona y de mantener su contraseña en secreto. La verificación de
identidad (documento + biometría) es obligatoria antes de poder aceptar transportar un envío o
publicar uno; en la versión de demostración esta verificación está simulada.</p>

<h2>4. Cómo funciona una operación</h2>
<p>El remitente publica un envío. YaQueVas calcula automáticamente qué viajes son compatibles y
muestra un porcentaje de compatibilidad y un precio orientativo. El remitente solicita a un viaje
concreto. El viajero revisa el contenido declarado, el peso, las fotografías y el valor declarado, y
solo puede aceptar tras confirmar explícitamente que lo ha revisado — esa confirmación queda
registrada junto con una copia exacta de lo que vio en ese momento. Tras el pago, el viajero recoge
el envío, lo lleva en su trayecto, y confirma la entrega mediante un código QR de un solo uso o un
código de respaldo. El pago queda retenido por YaQueVas desde el cobro hasta la confirmación de
entrega, momento en el que se libera al viajero.</p>

<h2>5. Condiciones económicas</h2>
<p>YaQueVas cobra una comisión sobre cada operación: actualmente un 10% adicional al remitente sobre
el precio acordado y un 10% descontado de lo que recibe el viajero (20% total para YaQueVas). Estos
porcentajes son configurables por YaQueVas y se muestran siempre antes de confirmar una operación —
nunca se aplican de forma oculta. El precio orientativo que ve el remitente antes de publicar se
calcula a partir de referencias de mercado (ver <code>docs/BENCHMARK_RESEARCH.md</code>) y de un
descuento configurable; es orientativo, no vinculante, hasta que se confirma la operación.</p>
<p>El cobro se gestiona a través de Stripe (entidad de pago/dinero electrónico autorizada en la
Unión Europea), usando su modalidad de plataforma de pagos ("Connect"): el dinero del remitente
entra en la cuenta de Stripe de YaQueVas y se transfiere al viajero solo cuando se confirma la
entrega — YaQueVas nunca custodia el dinero fuera del sistema de Stripe ni lo mueve por sus
propios medios. Es el mismo modelo que usan otras plataformas P2P comparables (Wallapop, Vinted)
para no tener que ser ellas mismas una entidad de pago autorizada. ${REVISAR_ANTES_DE_ESCALAR}</p>
<p>Sobre fiscalidad: YaQueVas declara la normativa de información de plataformas digitales (DAC7,
Ley 13/2023) le resulta aplicable en cuanto se alcancen los umbrales de actividad que marca la
ley, y recogerá el identificador fiscal (NIF/NIE) de los viajeros que generen ingresos reportables
a través del propio proceso de alta de la cuenta de cobro (gestionado por Stripe). La comisión que
cobra YaQueVas está sujeta a IVA conforme a la normativa general; el tratamiento fiscal exacto de
la compensación del viajero depende de su situación individual (ver definición de "Compensación"
arriba). En la versión de demostración, todo pago está simulado y así se indica explícitamente en
cada pantalla.</p>

<h2>6. Cancelaciones y derecho de desistimiento</h2>
<p>Cualquiera de las dos partes puede cancelar una operación antes de que el viajero confirme la
recogida del envío: el importe se devuelve íntegro al remitente. Una vez recogido el envío, la
cancelación deja de estar disponible como acción automática — cualquier incidencia a partir de ese
punto se gestiona como reclamación (ver más abajo), revisada caso a caso por el equipo de
YaQueVas.</p>
<p>Como consumidor, en general tendrías derecho a desistir de un contrato de servicios en un plazo
de 14 días naturales (art. 102 y siguientes del Real Decreto Legislativo 1/2007). Al solicitar una
operación y confirmar el pago, el remitente <strong>pide expresamente que el servicio empiece de
inmediato</strong> (sin esperar a que termine ese plazo) — la plataforma recoge este consentimiento
de forma explícita en el propio momento del pago, con fecha y hora. De acuerdo con el artículo
103.a) del mismo texto legal, una vez el servicio se ha ejecutado completamente con ese
consentimiento previo y expreso, el derecho de desistimiento se extingue: no aplica ya sobre una
entrega que ya se ha completado. Si la operación se cancela antes de completarse, el remitente
recupera su dinero por la vía de cancelación descrita arriba, no por la de desistimiento.</p>

<h2>7. Contenido permitido</h2>
<p>Solo se puede enviar contenido lícito. YaQueVas mantiene una lista de objetos prohibidos y de
objetos que requieren aceptación expresa del viajero antes de transportarlos — incluye, como
mínimo, drogas ilegales, armas, explosivos, mercancías peligrosas, efectivo, animales vivos,
restos humanos, materiales radiactivos y productos falsificados (siempre prohibidos), además de
perfumes, medicamentos y baterías de litio sueltas (permitidos solo con aceptación expresa del
viajero, por restricciones reales de transporte aéreo). Esta lista es más estricta cuanto más
restrictivo sea el medio de transporte elegido para esa operación. El remitente declara bajo su
responsabilidad que el contenido descrito es veraz y legal; el viajero tiene siempre la última
palabra sobre qué acepta transportar tras ver el contenido declarado. Para envíos internacionales
(Cuba), además se aplica un límite de valor declarado (180€) y peso (20 kg) por operación, acorde
al límite aduanero cubano para equipaje no acompañado — ver <code>docs/BORRADOR_ENCAJE_LEGAL.md</code>.
${REVISAR_ANTES_DE_ESCALAR}</p>

<h2>8. Papel de YaQueVas</h2>
<p>YaQueVas es un intermediario tecnológico: facilita el contacto, el cálculo del precio, el cobro,
la retención y liberación del pago, y la confirmación de entrega. YaQueVas no garantiza la
veracidad de lo que declara cada usuario, ni la seguridad del contenido transportado, ni que un
viaje o un envío publicado vaya a encontrar una operación compatible. La responsabilidad de
YaQueVas por cualquier incidencia relacionada con una operación concreta se limita, salvo dolo o
culpa grave por parte de YaQueVas, al importe de la comisión que YaQueVas cobró en esa operación
— el transporte físico del envío es responsabilidad del viajero que lo acepta, y la veracidad del
contenido declarado es responsabilidad del remitente. ${REVISAR_ANTES_DE_ESCALAR}, en particular
si conviene contratar algún seguro adicional a medida que crezca el volumen de operaciones.</p>

<h2>9. Tecnología y disponibilidad</h2>
<p>YaQueVas no garantiza disponibilidad ininterrumpida de la plataforma. La versión actual está en
<strong>modo demostración</strong>: los pagos, la verificación de identidad y algunas notificaciones
están simulados, y así se indica de forma visible en cada pantalla afectada. Ninguna operación
realizada en modo demostración es real.</p>

<h2>10. Protección de datos</h2>
<p>El tratamiento de los datos personales se describe en la <a href="/legal.html?doc=privacidad">
Política de privacidad</a>, que forma parte de estas condiciones.</p>

<h2>11. Responsabilidad de los usuarios</h2>
<p>Cada usuario responde de la veracidad de la información que publica, del contenido que declara
enviar, y de cumplir la normativa aplicable a lo que transporta. El viajero responde de transportar
el envío en las condiciones que aceptó; el remitente responde de que el contenido declarado
coincide con lo que entrega.</p>

<h2>12. Reclamaciones</h2>
<p>Cualquier incidencia puede reportarse desde la propia operación o mediante el <a
href="/contacto.html">centro de ayuda</a>. YaQueVas revisa cada incidencia desde el panel de
administración y se compromete a responder en un plazo máximo de 30 días. Como usuario consumidor
en la Unión Europea, también puedes acudir a la <a
href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">plataforma europea de
resolución de litigios en línea</a> si la reclamación no se resuelve satisfactoriamente por esta
vía. ${PENDIENTE} La hoja de reclamaciones oficial (obligatoria para negocios que atienden
consumidores en Canarias) se pondrá a disposición del público en cuanto la sociedad esté
constituida y tenga domicilio fiscal registrado.</p>

<h2>13. Modificación de estas condiciones</h2>
<p>YaQueVas puede modificar estas condiciones. Cada versión queda registrada con su fecha, y se
pedirá una nueva aceptación cuando el cambio sea relevante. Las operaciones ya aceptadas se rigen
por la versión vigente en el momento de la aceptación, que queda guardada junto con esa operación.</p>

<h2>14. Ley aplicable y jurisdicción</h2>
<p>Estas condiciones se rigen por la legislación española. Si actúas como consumidor, tienes
derecho a acudir a los juzgados y tribunales de tu propio domicilio, con independencia de lo que
diga cualquier otra cláusula — es un derecho que la normativa española de protección de
consumidores no permite renunciar por contrato.</p>

<h2>15. Contacto</h2>
<p>${PENDIENTE} Datos identificativos completos de la empresa (razón social, CIF, domicilio,
registro mercantil) pendientes de incorporar — ver también el Aviso legal.</p>
`;

const privacidad = `
<h2>1. Quién trata tus datos</h2>
<p>${PENDIENTE} Razón social, CIF, domicilio y datos de contacto del responsable del tratamiento
pendientes de incorporar — ver Aviso legal.</p>

<h2>2. Qué datos tratamos</h2>
<ul>
  <li><strong>Datos de registro:</strong> nombre, apellidos, email, teléfono, contraseña (guardada
  siempre cifrada, nunca en texto plano), país.</li>
  <li><strong>Datos de verificación de identidad:</strong> documento de identidad y biometría, a
  través de un proveedor externo de verificación. YaQueVas no almacena el documento en sí, solo una
  referencia técnica de que la verificación se realizó.</li>
  <li><strong>Datos de viajes y envíos:</strong> origen, destino, fechas, contenido declarado,
  peso, fotografías de los bultos, valor declarado.</li>
  <li><strong>Datos de pago:</strong> gestionados por el proveedor de pagos externo; YaQueVas no
  almacena los datos completos de la tarjeta.</li>
  <li><strong>Datos de uso:</strong> mensajes entre viajero y remitente dentro de una operación,
  valoraciones, notificaciones, tickets de soporte.</li>
</ul>

<h2>3. Para qué usamos tus datos</h2>
<p>Para poder ofrecer el servicio (crear tu cuenta, calcular precios y compatibilidad, gestionar
pagos, permitir el contacto entre viajero y remitente dentro de una operación, confirmar entregas),
para cumplir obligaciones legales, y para prevenir fraude y usos indebidos de la plataforma. La base jurídica de cada tratamiento es,
según el caso: <strong>ejecución del contrato</strong> (crear tu cuenta, gestionar una operación,
calcular precios), <strong>obligación legal</strong> (conservar registros fiscales, atender
solicitudes de las autoridades), <strong>interés legítimo</strong> (prevenir fraude, mantener la
seguridad de la plataforma) o <strong>consentimiento</strong> (por ejemplo, si en el futuro se
activaran comunicaciones comerciales opcionales). ${REVISAR_ANTES_DE_ESCALAR}</p>

<h2>4. Con quién compartimos tus datos</h2>
<p>Con los proveedores que hacen posible el servicio, actuando como encargados de tratamiento —
ninguno usa tus datos para sus propios fines, solo para prestarnos el servicio que contratamos con
ellos:</p>
<ul>
  <li><strong>Stripe</strong> (pagos y verificación de identidad) — entidad de pago autorizada en
  la UE, con sede en Irlanda (Stripe Payments Europe Ltd.) y transferencias a EE. UU. cubiertas por
  sus propias cláusulas contractuales tipo.</li>
  <li><strong>Turso</strong> (base de datos en la nube, incluidas las fotografías, guardadas como
  parte de la base de datos, no en un servicio de almacenamiento aparte).</li>
  <li><strong>Resend</strong> (envío de emails transaccionales).</li>
  <li><strong>OpenStreetMap / Nominatim</strong> (búsqueda de direcciones) — solo recibe el texto
  que escribes al buscar una dirección, sin ninguna otra información de tu cuenta.</li>
</ul>
<p>${REVISAR_ANTES_DE_ESCALAR}, en concreto si hace falta firmar contratos de encargado de
tratamiento formales con cada uno (más allá de sus condiciones estándar ya públicas) antes de
escalar el volumen de datos tratado.</p>

<h2>5. Cuánto tiempo conservamos tus datos</h2>
<p>Mientras tu cuenta esté activa, conservamos tus datos para poder prestarte el servicio. Los
datos de una operación completada (importes, comisiones, quién intervino) se conservan durante
<strong>6 años</strong> desde su finalización, por obligación legal en materia fiscal y contable
(artículo 30 del Código de Comercio). Si cierras tu cuenta y no tienes operaciones con
obligaciones legales pendientes de conservar, tus datos de perfil se eliminan o anonimizan en un
plazo máximo de 12 meses. Los mensajes de chat y las fotografías asociadas a una operación se
conservan mientras se conserve la propia operación, por si hace falta resolver una incidencia.</p>

<h2>6. Tus derechos</h2>
<p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación del tratamiento y
portabilidad de tus datos escribiendo a <strong>privacidad@yaquevas.es</strong>. Responderemos en
un plazo máximo de <strong>un mes</strong> desde tu solicitud, tal como exige el artículo 12.3 del
RGPD (ampliable dos meses más en casos especialmente complejos, informándote del motivo). Si no
quedas satisfecho con la respuesta, puedes reclamar ante la Agencia Española de Protección de
Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>). ${PENDIENTE} La
figura del delegado de protección de datos (si el volumen de tratamiento llega a exigirlo) se
designará y se publicará aquí en cuanto la sociedad esté constituida.</p>

<h2>7. Seguridad</h2>
<p>Las contraseñas se guardan cifradas con un algoritmo diseñado para ser lento frente a ataques de
fuerza bruta (scrypt), nunca en texto plano. El acceso a datos administrativos está limitado por
rol. Toda acción administrativa sensible queda registrada en un registro de auditoría.</p>
`;

const cookies = `
<h2>1. Qué usamos hoy</h2>
<p>YaQueVas guarda la sesión (el token que te mantiene identificado tras iniciar sesión) en el
almacenamiento local de tu navegador, no en una cookie. Es estrictamente necesario para poder
usar la plataforma estando conectado: sin él tendrías que volver a iniciar sesión en cada pantalla.
Hoy YaQueVas no utiliza cookies ni almacenamiento local de analítica, publicidad o seguimiento de
terceros.</p>

<h2>2. Si esto cambia</h2>
<p>Si en el futuro se incorpora analítica, publicidad o cualquier tecnología de seguimiento, se
pedirá tu consentimiento explícito antes de activarla y se actualizará este documento con el
detalle de cada cookie/tecnología, su finalidad y su duración.</p>
<p>El token de sesión en almacenamiento local se considera técnicamente equivalente a una cookie
estrictamente necesaria bajo la normativa de "cookies y tecnologías similares" (artículo 22.2
LSSI): al ser imprescindible para que funcione el servicio que has pedido expresamente (mantener
tu sesión iniciada), está exento de la obligación de pedir consentimiento previo — igual que
ocurre con las cookies técnicas de cualquier web con inicio de sesión.</p>
`;

const avisoLegal = `
<h2>1. Datos identificativos</h2>
<p>${PENDIENTE} Razón social, NIF/CIF, domicilio social, datos de inscripción registral y de
contacto pendientes de incorporar antes de producción — ver punto 14 de
<code>REVISION_LEGAL_PARA_ABOGADO.md</code> (LSSI).</p>

<h2>2. Objeto</h2>
<p>Este aviso legal regula el acceso y uso del sitio web y la aplicación de YaQueVas, plataforma que
conecta a viajeros con capacidad libre en un trayecto ya planificado con remitentes que necesitan
hacer llegar un envío a otra persona.</p>

<h2>3. Condiciones de uso del sitio</h2>
<p>El acceso al sitio es gratuito. El uso de las funcionalidades que requieren registro se rige por
las <a href="/legal.html?doc=terminos">Condiciones generales de uso</a>.</p>

<h2>4. Propiedad intelectual</h2>
<p>Los contenidos propios del sitio (marca, diseño, textos, código) pertenecen a YaQueVas o cuentan
con licencia para su uso. El contenido publicado por cada usuario (descripciones, fotografías) sigue
siendo de su propiedad; al publicarlo, autoriza a YaQueVas a mostrarlo dentro de la plataforma para
el funcionamiento del servicio.</p>

<h2>5. Comunicaciones comerciales</h2>
<p>YaQueVas solo envía comunicaciones transaccionales necesarias para el servicio (confirmaciones,
avisos de estado de una operación, notificaciones de seguridad). Si en el futuro se activa el
envío de comunicaciones comerciales o promocionales, se pedirá tu consentimiento explícito antes
de la primera, y cada envío incluirá una forma clara y gratuita de darte de baja en cualquier
momento, conforme al artículo 21 de la LSSI.</p>
`;

const condicionesOperativas = `
<h2>Lo que aceptas al aceptar transportar un envío</h2>
<p>Antes de poder aceptar un envío, revisas su contenido declarado, peso, dimensiones, fotografías,
valor declarado y cualquier observación del remitente. Al marcar la casilla de confirmación estás
declarando expresamente que:</p>
<ul>
  <li>Has revisado toda la información disponible sobre el contenido del envío.</li>
  <li>Aceptas transportarlo en las condiciones descritas, dentro del trayecto que ya tenías
  planificado.</li>
  <li>Entiendes que el contenido declarado por el remitente es responsabilidad del remitente, pero
  que tú decides libremente si lo aceptas o no tras verlo.</li>
  <li>Sabes que el envío no puede contener nada de la lista de objetos prohibidos de YaQueVas, y que
  cualquier objeto que requiera aceptación expresa ya te ha sido señalado antes de poder aceptar.</li>
</ul>
<p>YaQueVas guarda una copia exacta de lo que viste en el momento de aceptar (contenido, peso,
fotografías, valor declarado) junto con la versión de estas condiciones que aceptaste, para que
ambas partes tengan constancia de en qué condiciones se aceptó la operación.</p>
<p>Si el envío se pierde, se daña o llega con retraso, la responsabilidad es del viajero que aceptó
transportarlo — es quien tiene el envío en su poder durante el trayecto. YaQueVas revisa cada
incidencia reportada y puede mediar entre ambas partes, pero la responsabilidad de YaQueVas se
limita al importe de su comisión en esa operación concreta, salvo dolo o culpa grave (ver
"Papel de YaQueVas" en las condiciones generales). ${REVISAR_ANTES_DE_ESCALAR}, en particular si
conviene ofrecer algún tipo de cobertura de seguro adicional para envíos de mayor valor.</p>
`;

module.exports = { terminos, privacidad, cookies, avisoLegal, condicionesOperativas };
