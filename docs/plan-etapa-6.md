# Plan de las etapas 6 y 7

Fecha: 2026-11-19. Estado: en espera, como pendiente, hasta las respuestas del dueño (al final).

## Etapa 6. Factura electrónica

### Qué se pidió

Un botón en el sistema que genere la factura electrónica, una confirmación dentro del sistema de que la DIAN la aceptó,
y el envío al cliente por correo o WhatsApp. Gratis y sin intermediario.

### Correcciones y precisiones

1. **Puede que el negocio no esté obligado.** Según el artículo 8 de la Resolución DIAN 000165 de 2023, las personas
   naturales no responsables de IVA que cumplen las condiciones del artículo 437 del Estatuto Tributario no están
   obligadas a expedir factura. El sistema registra que el negocio no es responsable de IVA. Hay que confirmarlo con el
   contador antes de construir: si no hay obligación, la factura se haría solo para los clientes que la pidan (por ejemplo
   empresas que necesitan soportar el costo).
2. **"Gratis" y "sin intermediario" no se pueden tener los dos a la vez con un botón propio.**
   - La DIAN tiene una **solución gratuita** con certificado de firma incluido, pero es un portal web: se llena a mano y
     no se puede manejar desde un botón de otro sistema.
   - Para que el botón del sistema hable directo con la DIAN, sin proveedor tecnológico, el sistema debe habilitarse como
     **software propio**: pasar el set de pruebas de la DIAN y firmar cada documento con un **certificado de firma digital**
     de una entidad acreditada por ONAC. Ese certificado tiene costo (anual o bianual); el gratuito de la DIAN solo sirve
     para su portal. No hay costo por factura.
   - La alternativa sería un proveedor tecnológico con API (cobra por documento o mensualidad), que el pedido descarta.
3. **Las devoluciones y anulaciones necesitan nota crédito electrónica.** Si una venta con factura se devuelve, se anula
   o se cambia, el sistema debe emitir la nota crédito; no basta con anular en la app.
4. **Entrega al cliente.** Lo exigido es entregar el XML y su representación gráfica (PDF); el correo es el medio normal.
   El correo se puede mandar gratis con Gmail (contraseña de aplicación) o un servicio con plan gratuito. Por WhatsApp,
   la forma gratuita es un enlace `wa.me` que el empleado envía desde el celular del negocio con el PDF enlazado; enviarlo
   automático por la API de WhatsApp cuesta por mensaje (centavos de dólar) y exige verificar la empresa ante Meta.
5. **La numeración** (prefijo y rango) se pide gratis a la DIAN y el sistema debe respetarla y avisar antes de agotarse.

### Cómo se construiría (si se confirma)

1. **Datos fiscales**: tabla de resolución de numeración (prefijo, rango, vigencia, clave técnica), datos fiscales del
   negocio y de cada cliente (tipo y número de documento, correo para facturas). La venta ya tiene la casilla "factura
   electrónica".
2. **Motor de factura** en el servidor de la app (Route Handler en Vercel, nunca en el navegador): XML UBL 2.1 según el
   anexo técnico vigente, CUFE (SHA-384), firma XAdES con el certificado guardado como secreto en Vercel, envío al servicio
   web de la DIAN y lectura de la respuesta. Tabla `facturas_electronicas` con estado (por enviar, enviada, aceptada,
   rechazada con el motivo), CUFE, XML firmado y respuesta guardados al menos 5 años.
3. **Pantalla**: botón "Facturar" en el detalle de la venta, estado visible ("Aceptada por la DIAN", o el error para
   corregir), reintento, y la nota crédito al devolver o anular.
4. **PDF con QR** (representación gráfica) y envío: correo automático con XML y PDF; botón de WhatsApp con el enlace.
5. **Habilitación**: correr el set de pruebas de la DIAN en el ambiente de habilitación y pasar a producción.

Riesgos: es la pieza más delicada técnicamente (firma XAdES y anexo técnico) y la DIAN cambia el anexo de vez en cuando;
hay que mantenerlo. Se recomienda que el contador revise el primer lote real.

## Etapa 6. Mapa de la ferretería

### Qué se pidió

Un apartado con el plano del local y dónde está cada cosa. Primero un boceto; luego llegan las medidas y ubicaciones.

### Propuesta

- **Boceto** en el lienzo de diseño: plano visto desde arriba con zonas (mostrador, vitrinas, pasillos, estantes, bodega),
  y cómo se vería en el celular.
- **Datos**: hoy `productos.ubicacion` es texto libre ("Pasillo 3, Estante B"). Se crearía una tabla `ubicaciones`
  (zona, estante, nivel, posición en el plano) y `productos.ubicacion_id`, pasando los textos actuales a ubicaciones
  reales sin perderlos.
- **Pantalla**: plano interactivo dibujado con SVG a escala (con las medidas reales). Tocar un estante muestra lo que
  tiene; buscar un producto resalta dónde está. En Nueva venta y en el detalle del producto, "Ver en el mapa".
- **Conteo de inventario**: contar por estante desde el mapa.

## Etapa 6. Gráficos ampliables (hecho el 2026-11-19)

### Corrección

No se puede **obligar** a girar el celular: en iPhone el navegador no deja bloquear la orientación, y en Android solo se
puede en pantalla completa. Lo que sí funciona en todos: un botón "Ampliar" en cada gráfico que lo abre a pantalla
completa; si el celular está vertical, el gráfico se dibuja girado para ocupar el largo de la pantalla (y en Android se
pide además la orientación horizontal). Las tablas anchas se ampliarían igual.

## Etapa 7. Asistente de ventas por WhatsApp

### Lo que está bien planteado

El rol propio en la base, la vista pública con disponibilidad en tres niveles, las herramientas cerradas sin SQL libre,
el mensaje fijo fuera de tema, la confirmación humana, la autorización de datos (Ley 1581 de 2012) y la política de Meta
(desde el 15 de enero de 2026 se prohíben los asistentes de propósito general en la API de WhatsApp Business; los de
atención de un negocio siguen permitidos).

### Correcciones y precisiones

1. **"Precios con IVA incluido"**: el negocio no es responsable de IVA, así que no cobra IVA. Lo que exige el Estatuto
   del Consumidor (Ley 1480 de 2011, artículo 26) es informar el **precio total** al público; decir "IVA incluido" sería
   inexacto. El bot mostrará el precio final y la vigencia de la cotización.
2. **Cómo se aplica el rol propio**: el webhook no usará la clave de servicio. Usará un token firmado con el rol
   `bot_whatsapp`, que solo puede leer la vista pública y ejecutar las cuatro funciones (`buscar_producto`, `cotizar`,
   `crear_reserva`, `crear_pedido_domicilio`), con límites de cantidad y de mensajes por número.
3. **Reservas y disponibilidad**: una reserva debe apartar las unidades para que no se vendan a otro cliente mientras
   dura. Se descuenta de la disponibilidad que ve el bot (no del stock real) y vence sola a las 24 o 48 horas con una tarea
   programada de la base.
4. **Costos que no son cero**: la API de WhatsApp (respuestas dentro de la ventana de 24 horas a quien escribe primero
   son de bajo o ningún costo; los avisos que el negocio inicia, como "su reserva está lista", cobran por mensaje) y el
   modelo de lenguaje que entiende los mensajes (cobra por uso). Además se necesita un número dedicado y verificar la
   empresa ante Meta.
5. **Habeas data**: además de pedir la autorización, hay que guardarla (fecha, número y texto aceptado), publicar la
   política de tratamiento de datos y permitir retirarla con una palabra ("BAJA").

### Lo que se puede ir preparando desde la etapa 6

- **Guardar las cotizaciones** (tabla `cotizaciones` con renglones, total y vigencia). Hoy solo se genera el PDF; sirve ya
  para el mostrador y luego para el bot.
- **Reservas y pedidos a domicilio** con sus estados (pendiente, confirmada, lista, entregada, cancelada) y el **panel**
  donde el empleado los confirma. Sirven desde ya para pedidos que llegan por teléfono o por el WhatsApp normal.
- **Vista pública de productos** con disponibilidad en tres niveles (umbral: agotado si no hay stock, pocas unidades si
  está en o bajo el mínimo).

Después, en la etapa 7: el rol de la base, las cuatro funciones del bot, el webhook con verificación de firma de Meta,
la conversación y las pruebas de seguridad (intentos de engañar al bot).

## Skills buscadas

En el registro de skills (`npx skills find`) no hay nada para la factura electrónica de Colombia ni para planos de
locales. Sirven: `supabase/agent-skills` (oficial de Supabase; roles, RLS y funciones para el bot) y, para la etapa 7,
`meta/agentic-tools@whatsapp-business-integration` (pocas instalaciones; revisar antes de usar). Las de WhatsApp más
instaladas (`gokapso`) dependen de un intermediario, que el pedido descarta.

## Orden propuesto

1. Respuestas del dueño y concepto del contador sobre la factura.
2. Boceto del mapa (lienzo) mientras llegan las medidas.
3. Gráficos ampliables (rápido, sin base de datos).
4. Cotizaciones guardadas, reservas, pedidos y su panel (prepara la etapa 7).
5. Mapa con las medidas reales.
6. Factura electrónica: datos fiscales, motor, habilitación y nota crédito.
7. Etapa 7: asistente de WhatsApp.

## Preguntas para el dueño

1. ¿El negocio es persona natural no responsable de IVA? ¿Ya está inscrito como facturador electrónico ante la DIAN, con
   qué solución, y tiene resolución de numeración?
2. ¿La factura es por obligación o porque algunos clientes la piden?
3. ¿Aceptan pagar el certificado de firma digital para tener el botón propio, o prefieren seguir con el portal gratuito
   de la DIAN y que el sistema solo prepare los datos?
4. ¿Qué correo se usaría para mandar facturas (y luego los avisos)?
5. Mapa: ¿cuántas zonas hay (mostrador, vitrinas, pasillos, bodega) y la bodega va en el mismo plano o aparte?
