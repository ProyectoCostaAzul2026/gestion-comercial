# Pendientes

Lista viva de lo que falta. Se actualiza al cerrar cada tarea. Última revisión: 2026-11-19.

## Dependen del dueño o del administrador

1. **Probar en producción el enlace de acceso**: crear un empleado de prueba, mandarle el enlace y entrar; luego generar
   el enlace de "cambiar la contraseña" desde su ficha. Si algo falla, copiar el mensaje de error.
2. **Correo propio en Supabase (opcional)**: para que "Olvidé mi contraseña" llegue por correo a cualquier persona hay
   que configurar un SMTP (Gmail con contraseña de aplicación, Brevo o Resend) y cambiar la plantilla "Reset Password".
   Mientras tanto, el enlace lo genera el administrador.
3. **Borrar los datos de prueba** (marca `PRUEBA SISTEMA`, clientes "Cliente Prueba" y "Proveedor Prueba Sistema")
   cuando todo el personal haya visto el sistema. Antes se muestra el SQL.
4. **Validar el catálogo** y, después, borrar las tablas del esquema `respaldo`.
5. **Confirmar datos del catálogo**: nombres de los 3 proveedores provisionales, costo de las medidas nuevas de costo
   estimado (se confirma con la primera compra), términos del lote 1 que pueden ser marcas y la medida de dos piezas Kaudal.
6. **Logo del negocio en la base**: `configuracion_negocio.logo_url` apunta a una dirección que ya expiró. La app usa el
   logo local, pero conviene subir el logo a Supabase Storage para recibos y documentos.
7. **Repositorio público**: valorar hacerlo privado (y entonces instalar la app de Claude en GitHub).
8. **Plan gratuito de Supabase**: se pausa tras unos 7 días sin uso y no tiene copias de seguridad diarias; la protección
   de contraseñas filtradas requiere el plan Pro.

## Técnicos

- Imágenes: unos 1190 grupos sin foto específica y 458 productos sin imagen; algunas fotos son de productos equivalentes.
- Recepción de mercancía: adjuntar la foto o el PDF de la factura y repartir fletes y descuentos en el costo de los renglones.
- Reportes en celular: las secciones de gráficos y tablas de productos son largas; separarlas en vistas propias.
- La búsqueda del inventario filtra en el navegador (bien con ~3300 productos; pasar al servidor si crece).
- `pg_trgm` sigue en el esquema `public` (moverla puede romper `buscar_productos`).
- Lint: unos 300 avisos de `any` heredados; no bloquean el build.
- No hay pruebas automáticas ni CI.

## Próximas etapas (en espera)

Quedan como pendientes hasta que el dueño responda las preguntas del final de `docs/plan-etapa-6.md`, donde está el plan
completo:

- **Etapa 6**: factura electrónica, mapa de la ferretería y gráficos ampliables.
- **Etapa 7**: asistente de ventas por WhatsApp (con preparativos que se pueden ir haciendo desde la etapa 6).

## Videos promocionales

Se harán con Remotion (videos escritos en React, el mismo lenguaje de la app); las skills `remotion-*` ya están instaladas
en `.claude/skills/`. Los videos se arman en una carpeta propia (`videos/`), fuera de la app, y el resultado (MP4) no se
sube al repositorio.

1. **Video de la ferretería (largo, unos 2 a 3 minutos)**: qué es Ferreléctricos Costa Azul, dónde está y qué vende,
   recorriendo las categorías del catálogo (eléctricos, plomería, tornillería, herramientas y demás) con las fotos de los
   productos, la atención en el mostrador y cómo contactarla (WhatsApp, dirección, horario). Formato horizontal para
   YouTube y Facebook, y una versión vertical para estados e Instagram.
2. **Video del sistema de información (corto, 30 a 45 segundos)**: muestra la app en el celular (vender, inventario con
   fotos, caja, reportes) con capturas hechas sobre datos de prueba, nunca con cifras reales. Formato vertical.

Antes de empezar se necesita del dueño: el logo en buena calidad, fotos o videos del local y del equipo, la música (con
licencia libre) y si el video lleva voz (grabada por alguien del negocio o generada). La licencia de Remotion es gratuita
para personas y empresas de hasta 3 empleados; si el negocio tiene más, confirmar si aplica la licencia de empresa.
