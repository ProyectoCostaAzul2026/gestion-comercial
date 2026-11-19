# Plan de la etapa 8. Página web de la ferretería

Fecha: 2026-11-19. Estado: pendiente (va después de las etapas 6 y 7, o antes de la 7 si se prefiere; ver "Orden").

## Qué se pidió

Una página web pública de la ferretería que se alimente de la base de datos del sistema, tomando el concepto de diseño
de la tienda de Ranger (ranger.com.co) con un toque propio.

## Qué se toma de Ranger y qué no

Se toma la **estructura**, no el contenido ni la apariencia:

- Inicio con un banner principal, accesos grandes a las líneas de productos y productos destacados o nuevos.
- Catálogo navegable por niveles (en Ranger: catálogo, sección, categoría, subcategoría; aquí: categoría, familia, grupo
  de medidas y medida, que ya existe en el inventario).
- Buscador siempre visible, ficha de producto con galería, productos relacionados y botón de compra o pedido.
- Páginas de contacto, ubicación y documentos legales al pie.

No se copian sus imágenes, textos ni marca: su política de uso de contenidos lo prohíbe sin permiso escrito.

**Toque propio**: la identidad del sistema (amarillo de letrero, azul y rojo de la marca, cifras en Barlow Condensed), el
selector de medidas por grupo (elegir la medida y ver el precio, como en el mostrador) y el pedido por WhatsApp en lugar
de un carrito con pago.

## Viabilidad

Es viable y aprovecha casi todo lo que ya existe: la base, las fotos, las categorías, familias y grupos, y la misma app
de Next.js. Los puntos que deciden el resultado no son técnicos:

1. **Fotos con derecho de uso.** Dentro del sistema las fotos enlazadas de Easy y de webs de proveedores son de
   referencia; en una página pública y comercial son un riesgo de derechos de autor y a veces muestran otra marca. Opciones:
   pedir permiso a los proveedores (suelen darlo a sus distribuidores), tomar fotos propias de lo más vendido, y mostrar
   en la web solo productos con foto autorizada o la foto de la familia. Además, conviene copiar las fotos autorizadas a
   Supabase Storage para que no se rompan si el proveedor cambia su web.
2. **Nombres para el público.** Los nombres del sistema van sin tildes para que el buscador funcione ("Espatula",
   "Bisturi"). En la web se verían mal: hace falta un nombre para mostrar (columna o diccionario de tildes) y descripciones
   revisadas. El orden del catálogo con la referencia de Ranger ayuda aquí.
3. **Precios y disponibilidad.** La web muestra el precio final (Ley 1480, artículo 26) y la disponibilidad en tres
   niveles (disponible, pocas unidades, agotado), nunca el stock exacto ni el costo. Hay que decidir qué productos se
   publican (por ejemplo, solo activos con foto y precio).
4. **Planes gratuitos.** El plan gratuito de Supabase se pausa tras 7 días sin uso y limita el tráfico; el plan Hobby de
   Vercel es para uso personal no comercial. Para una web pública del negocio conviene pasar a planes pagos (Supabase Pro
   cerca de USD 25 al mes, que además trae copias de seguridad diarias; Vercel Pro cerca de USD 20 al mes) o alojar la web
   en otro servicio que permita uso comercial gratis. Las páginas se generan por adelantado y se renuevan cada cierto
   tiempo, así la web sigue arriba aunque la base esté lenta y casi no gasta consultas.
5. **Dominio**: un `.com.co` o `.co` cuesta del orden de COP 100.000 al año.
6. **Venta en línea con pago** (opcional, fase posterior): exige pasarela (Wompi, ePayco, Mercado Pago; cobran comisión por
   transacción), política de devoluciones y derecho de retracto (Ley 1480, artículos 47 y 50), despachos y facturación.
   Por eso la primera versión es **catálogo con pedido por WhatsApp**: el cliente arma su lista y la envía al número del
   negocio con el mensaje ya escrito.

## Qué hay que hacer

1. **Datos** (base de datos, con el SQL a la vista antes de aplicar):
   - Vista pública de solo lectura para el rol anónimo: nombre para mostrar, descripción, categoría, familia, grupo,
     medida, marca, foto, precio final y nivel de disponibilidad. Nada de costos, proveedores ni stock exacto. Es la misma
     vista que pide la etapa 7 para el asistente de WhatsApp.
   - Marca de "publicar en la web" por producto o por familia, nombre para mostrar y productos destacados.
   - Datos del negocio para la web (dirección, horario, WhatsApp, redes, mapa) en `configuracion_negocio`.
2. **Diseño**: lienzo con la propuesta (inicio, catálogo, grupo con selector de medida, ficha, contacto) en celular y
   computador, para aprobar antes de construir.
3. **Construcción** en la misma app, en un grupo de rutas público (`src/app/(tienda)/`): la raíz deja de mandar al login
   y el sistema sigue en `/dashboard` (o el sistema pasa a un subdominio). Inicio, catálogo por niveles, buscador, ficha y
   grupo de medidas, lista de pedido por WhatsApp, contacto con mapa, páginas legales (tratamiento de datos, términos,
   devoluciones y garantías).
4. **Buscadores y redes**: metadatos por página, sitemap, datos estructurados de producto, vista previa al compartir por
   WhatsApp, y perfil de Google del negocio enlazado a la web.
5. **Publicación**: dominio, revisión de velocidad en celular, prueba con el personal y lanzamiento.

## Cuánto demora

Trabajo técnico, en jornadas de trabajo con Claude, sin contar las esperas por respuestas, fotos o permisos:

| Parte | Jornadas |
| --- | --- |
| Datos: vista pública, publicar, nombres para mostrar | 2 a 3 |
| Diseño en lienzo y ajustes | 1 a 2 |
| Construcción de las páginas | 4 a 6 |
| Buscadores, legales, dominio y publicación | 1 a 2 |
| **Total** | **8 a 13** (unas 2 a 3 semanas) |

Lo que más puede alargarlo es el material: fotos autorizadas, nombres y descripciones revisados y los textos legales. La
venta con pago en línea sería otra fase de 1 a 2 semanas más el trámite con la pasarela.

## Orden

Conviene hacer primero el **orden del catálogo** (nombres, categorías y descripciones con la referencia de Ranger), porque
la web lo muestra tal cual. La web puede ir antes que el asistente de WhatsApp: comparten la vista pública, y el
asistente podría mandar el enlace de cada producto.

## Preguntas para el dueño

1. ¿La web es solo catálogo con pedido por WhatsApp, o desde el inicio quieren pago en línea?
2. ¿Se publican todos los productos o solo una selección (lo más vendido, con foto propia)?
3. ¿Se muestra el precio en la web?
4. ¿Hay dominio o nombre de dominio preferido, y redes sociales del negocio?
5. ¿Aceptan pagar los planes de Supabase y Vercel (o equivalentes) cuando la web salga al público?
