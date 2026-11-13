@AGENTS.md

# Contexto del proyecto — Gestión Comercial Ferreléctricos Costa Azul

> Claude Code carga este archivo en cada sesión. Mantenerlo al día cuando cambie algo importante
> (esquema de la BD, convenciones, estado de los datos). Última revisión: 2026-11-13.

## Qué es

Sistema de gestión para **Ferreléctricos Costa Azul**, ferretería en Bogotá. Cubre punto de venta (ventas,
cotizaciones, créditos, devoluciones, cambios, garantías), inventario con familias de productos, proveedores y
sus facturas, recepción de mercancía, clientes, caja (caja menor/mayor, arqueo, gastos, retiros), nómina, horario, reportes y
contabilidad. Interfaz *mobile-first*, tema oscuro, todo en español.

Roles: `administrador` (todo) y `empleado` (ventas, inventario, recepción de mercancía, clientes, horario y su propia
nómina).

## Stack

- Next.js 16.2 (App Router) + React 19.2 + TypeScript. **Leer `node_modules/next/dist/docs/` antes de escribir
  código de Next** (ver AGENTS.md). El middleware vive en `src/proxy.ts` (convención de Next 16).
- Tailwind CSS v4 y componentes shadcn sobre `@base-ui/react` en `src/components/ui/`. Colores de marca:
  `brand-yellow`, `brand-blue`, `brand-red`, `steel-*`.
- Supabase (PostgreSQL 17 + Auth + RLS + funciones RPC) con `@supabase/ssr`: `src/lib/supabase/client.ts`
  (navegador), `server.ts` (servidor), tipos en `database.types.ts`.
- Prisma 7 está instalado pero **la app no lo usa**: `prisma/` solo guarda la migración inicial (2026-06-19);
  el esquema real evolucionó directamente en Supabase.
- zod, react-hook-form, recharts, jspdf (recibos y cotizaciones en PDF), sonner, lucide-react.
- Sin tests ni CI. Comandos: `npm run dev`, `npm run build`, `npm run lint`.

## Infraestructura y acceso

- **Supabase**: proyecto `gestion-comercial`, ref `qmeegynucijohagywdcr`, región sa-east-1, plan gratuito:
  **se pausa tras unos 7 días sin uso** y la app deja de funcionar. Se reactiva con `restore_project` del
  conector o desde el panel de Supabase (tarda unos minutos).
- **Acceso a la BD desde Claude**: conector MCP de Supabase (`execute_sql`, `list_tables`, `apply_migration`,
  `get_advisors`, `list_migrations`, `generate_typescript_types`). No hay `DATABASE_URL` local.
- **Vercel**: proyecto `proyecto-costa-azul2026/gestion-comercial`, producción
  https://gestion-comercial-alpha.vercel.app. El repo local está enlazado (`.vercel/`, ignorado por git). Las
  variables están marcadas como *Sensitive*: `vercel env pull` solo trae marcadores `[SENSITIVE]`. El
  `.env.local` local tiene la URL y la anon key públicas (suficiente para `npm run dev` y `npm run build`); la
  clave de servicio sigue como marcador. Plantilla en `.env.example`.
- Repositorio: GitHub `ProyectoCostaAzul2026/gestion-comercial`, rama principal `main`.
- Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` (solo servidor, en `src/app/actions/empleados.ts`), `DATABASE_URL` y
  `DIRECT_URL` (solo Prisma).

## Reglas de trabajo

- La BD es **producción** con datos reales. Consultar libremente; **antes de cualquier escritura**
  (INSERT/UPDATE/DELETE) o cambio de esquema, mostrar el SQL exacto y esperar la confirmación del usuario.
- Cambios de esquema con `apply_migration`, nunca DDL suelto. Después, correr `get_advisors` y actualizar
  `DATABASE.md` y `src/lib/supabase/database.types.ts`.
- No romper la lógica existente: proponer las mejoras primero y hacer los cambios grandes en una rama propia.
- Responder en español.

## Sesiones en la nube (Claude Code en la web)

- El repositorio de GitHub es **público**: no subir secretos (claves, `.env*`), datos de clientes ni cifras o
  identificadores del negocio (NIT, saldos, números de factura). Esos datos viven solo en la BD.
- Las sesiones en la nube parten de un clon de GitHub (rama `main` salvo que se elija otra): lo que no esté subido no
  lo ven. Cada sesión trabaja en su propia rama y abre un PR; nunca hace push a `main`.
- `.claude/settings.json` tiene un hook `SessionStart` que corre `scripts/install_pkgs.sh`: instala las dependencias
  con `npm ci` solo en la nube (`CLAUDE_CODE_REMOTE=true`) y se salta la instalación mientras `package.json` y
  `package-lock.json` no cambien. En local no hace nada.
- `npm run build` necesita `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en las variables del entorno
  de nube (son valores públicos; la clave de servicio nunca va ahí). Si faltan, verificar con `npm run lint` y
  `npx tsc --noEmit`.
- La BD solo se toca con el conector de Supabase de claude.ai y con las mismas reglas de arriba (producción: mostrar
  el SQL y esperar confirmación). Si el conector no está disponible en la sesión, dejar el SQL en la descripción del PR.

## Estructura del código

- `src/app/dashboard/<módulo>/`: páginas (Server Components que consultan Supabase y pasan datos a
  componentes cliente). Módulos: `ventas` (nueva, cotización, servicios, recibo), `inventario` (navegación por tarjetas: categoría, familia, grupo de medidas; nuevo, editar,
  familia, agotados, desactivados, garantías), `recepcion` (detalle y producto nuevo de un renglón), `clientes`,
  `proveedores` (facturas, pagos), `empleados`,
  `caja`, `contabilidad`, `nomina`, `horario`, `reportes`, `configuracion`, `instrucciones`, `mi-perfil`.
- `src/components/modulos/`: formularios y paneles cliente; aquí vive la lógica de negocio del front.
- `src/lib/`: `permissions.ts` (permisos por rol y `RUTAS_SOLO_ADMIN`), `precio-utils.ts` (margen e IVA),
  `escala-precios.ts` (motor de precios por medida: orden de medidas, redondeo, sugeridos, costos estimados y alertas),
  `peso.ts` (cuentas del peso por unidad), `precios-cantidad.ts` (precios por cantidad: tramo que aplica, validación y
  sugeridos), `recepcion.ts` (recepción de mercancía: costo con o sin IVA, diferencias del conteo y lo que falta para
  cerrar), `temas-ayuda.ts` (textos del panel Instrucciones), `festivos-colombia.ts`.
- `src/components/layout/NavigationShell.tsx`: barra inferior en celular (Inicio, Ventas, Vender, Inventario, Más) con el
  menú completo en un panel que sube desde abajo, y menú lateral fijo desde `lg`. El menú sale de `navItems` en
  `permissions.ts` (con `grupo`); `rutaActiva` marca el módulo también en sus subpáginas. Las subpáginas con encabezado
  fijo usan `-m-4 md:-m-6` y `sticky top-[calc(3.5rem+env(safe-area-inset-top))] lg:top-0` (quedan bajo la barra superior).
- La app **solo tiene tema oscuro** (`<html className="dark">`): no volver a depender del tema del sistema.
- **Fechas**: "hoy" siempre con `hoyBogota()` / `bogotaEnDias()` de `src/lib/fechas.ts`. Nunca
  `new Date().toISOString().slice(0, 10)` (es UTC: desde las 7 p. m. de Bogotá ya es mañana).
- `src/app/manifest.ts` e íconos `public/icono-*.png`: la app se puede instalar en la pantalla de inicio del celular.
- `src/proxy.ts`: exige sesión en `/dashboard`, cierra la sesión si el perfil está inactivo y manda a los
  empleados fuera de las rutas de administrador.
- `DATABASE.md`: tablas, RPC, índices y políticas RLS (al día al 2026-11-07). Mantenerlo actualizado.

## Base de datos: piezas clave

- Las operaciones de dinero y stock pasan por **funciones RPC `SECURITY DEFINER`**: `registrar_venta`,
  `registrar_venta_credito`, `anular_venta`, `devolver_productos`, `cambiar_productos`,
  `registrar_abono_credito`, `actualizar_fecha_pago_credito`, `registrar_gasto_caja`, `registrar_retiro`,
  `registrar_pago_factura`, `registrar_nomina`, `abrir_caja`, `cerrar_caja_arqueo`, `transferir_entre_fondos`,
  `actualizar_denominaciones`, `mover_stock_bodega_almacen`, `recibir_garantia`, `buscar_productos`,
  `buscar_clientes`, `calcular_rotacion_productos`. Las de administrador validan `profiles.rol` por dentro.
- Cada RPC debe tener **una sola versión**: si se agrega un parámetro, borrar la firma vieja en la misma migración, o
  PostgREST responde 300 `PGRST203` y la llamada falla desde la app. `anular_venta`, `devolver_productos` y
  `cambiar_productos` son solo para administrador y reciben el medio por el que sale o entra el dinero; sus reglas están
  en `DATABASE.md` y la vista previa de `venta-acciones.tsx` las replica en `src/lib/ajustes-venta.ts` (cambiar las dos).
  En una venta a crédito ajustan primero la deuda (`ventas_credito.saldo_pendiente` y el saldo `credito`) y solo el resto
  pasa por caja; un crédito cuya venta se anula o se devuelve completa queda `anulado`. `devoluciones.ajuste_credito`
  guarda lo que cambió la deuda y `repartirAjusteCredito` replica el reparto en la vista previa.
- **Inventario por tarjetas** (`inventario-navegador.tsx`, lógica en `src/lib/inventario-arbol.ts`): categorías →
  familias → grupos de medidas → lista de medidas con la imagen del grupo; el nivel va en la dirección (`?cat=&fam=&g=`,
  con `window.history.pushState`). Un producto nuevo **solo se crea dentro de una categoría, familia y grupo** (tarjetas
  "Nueva categoría / familia / grupo" y "Agregar medida"); `inventario/nuevo` sin ese contexto manda al inventario. Mover,
  sacar del grupo y desactivar están en `acciones-inventario.tsx` (menú de tres puntos y detalle del producto) y usan la
  RPC `mover_productos` (`SECURITY DEFINER`, administrador y empleado; conserva código, stock y precios).
- **Unir grupos arrastrando** (`src/lib/usar-arrastre.ts`, `src/lib/unir-grupos.ts`, `unir-grupos-medidas.tsx`): en la lista
  de grupos de una familia, mantener presionada una tarjeta (400 ms con el dedo; con el ratón, arrastrar) y soltarla sobre
  otra abre una confirmación. Las medidas del origen toman la característica (con `mover_productos`) y la marca (update
  directo) del destino. `planearUnion` valida antes de guardar: medidas repetidas (se quedan en su grupo; si todas se
  repiten, no deja unir), marcas distintas (avisa) y el orden de los dos pasos para no chocar con un tercer grupo. Si el
  segundo paso falla se devuelve el primero, y el aviso de éxito trae "Deshacer". Los botones de la tarjeta llevan
  `data-sin-arrastre`. Pendiente: una RPC `unir_grupos_medidas` que haga los dos pasos en una sola transacción.
- **Editar tarjetas** (`editar-tarjeta-inventario.tsx`, lápiz de la tarjeta o botón "Editar" del nivel): nombre e imagen
  (URL). Categoría: update directo. Familia: RPC `editar_familia` (renombra sus productos a `familia - característica`;
  la imagen es solo de la tarjeta). Grupo: RPC `editar_grupo_medidas` (cambia la característica y, si se cambió la
  imagen, la pone en **todas** sus medidas). La imagen de un solo producto se cambia en "Editar producto" y solo afecta a
  ese producto.
- El guardado de productos y familias va por `guardar_producto` y `guardar_familia` (`SECURITY INVOKER`, una sola
  transacción). `producto-form.tsx` y `familia-medidas-panel.tsx` las llaman con `supabase.rpc`.
- **Recepción de mercancía** (`recepciones`, `recepcion_items`): todo pasa por RPC (`crear_recepcion`,
  `guardar_renglon_recepcion`, `quitar_renglon_recepcion`, `contar_renglon_recepcion`, `crear_miembro_familia_renglon`,
  `aprobar_precios_recepcion`, `cerrar_recepcion`, `resolver_reclamacion_recepcion`). Flujo: los empleados transcriben →
  el administrador aprueba precios → se cuenta (un renglón sin producto o sin precio aprobado no se puede contar; conteo
  ciego que sí muestra el precio) repartiendo las buenas entre almacén (`cantidad_almacen`) y bodega → el administrador
  cierra. El stock entra al marcar cada renglón, con un movimiento por lugar. Abrir, crear productos, aprobar precios y
  cerrar son del administrador. `src/lib/recepcion.ts` replica sus reglas (si cambias una, cambia la otra). Reglas en
  `DATABASE.md` (notas 14 y 19).
- **Permisos** (`permisos_empleado`, `permisos-empleados.tsx` en Horario): el empleado saca el día que no asiste (desde
  hoy); el administrador lo registra para cualquiera. Alerta en el Inicio del administrador (hoy a 7 días) y marca en la
  vista semanal.
- **Alta rápida** (Nueva venta): el producto nace con `productos.por_completar = true` y sale en Inventario › Por
  completar y en las alertas del Inicio. El trigger `trg_revisar_por_completar` lo apaga cuando tiene categoría, familia y
  proveedor con costo (`src/lib/por-completar.ts` replica la regla). "Editar producto" pone en su familia a un producto sin
  familia cuyo nombre sigue "Familia - Característica".
- **Solo un administrador cambia precios de venta** (`precio_venta`, `precio_por_unidad_medida`) de un producto existente:
  lo exige el trigger `trg_proteger_precios_productos` y el formulario bloquea esos campos a los empleados; crear un
  producto con su precio sigue permitido. Cada cambio queda en `historial_precios` (trigger, solo lo leen los admin).
- Ninguna RPC de negocio se puede ejecutar sin sesión. Al crear una RPC nueva: `revoke execute ... from public, anon` y
  `grant execute ... to authenticated, service_role`.
- Ninguna tabla se puede leer sin sesión. Las políticas usan `(select auth.uid())` / `(select is_admin())`.
- La API de Supabase devuelve como máximo **1000 filas por consulta** y corta el resto sin avisar. Toda lista que
  pueda pasar de 1000 filas (productos, ventas, ítems, pagos, movimientos, clientes) se trae con `traerTodo()` de
  `src/lib/supabase/traer-todo.ts`, que pide páginas con `.range()`; la consulta debe terminar en un orden único
  (`.order('id')`).
- El trigger `trg_proteger_campos_sensibles_profiles` impide que quien no es admin cambie `rol`, `salario_base` o `activo`.
- `is_admin()` alimenta las políticas RLS. Todas las RPC usan la zona horaria `America/Bogota`.
- Triggers: `productos.stock_actual = stock_bodega + stock_almacen`; `productos.precio_costo_base` toma el
  costo del proveedor marcado `es_costo_base_manual` o, si no hay, el menor de `producto_proveedores`.
- `configuracion_negocio` es un registro único: datos del negocio, logo, `margen_default` (0.40),
  `max_descuento_porcentaje` (0.10) y montos base de caja.

## Modelo de productos y familias

- Una **familia** (`producto_familias.nombre_base`) agrupa variantes. Cada combinación
  **Característica + Medida + Marca** es un producto independiente, con su propio stock y precio.
- `productos.nombre` = `"<nombre_base> - <caracteristica>"`: **guion corto** con un espacio a cada lado
  (constante `SEPARADOR_FAMILIA` en `producto-form.tsx`). Ej: `Codo - PVC Presion`. Evitar `" - "` dentro del nombre
  base o de la característica (usar `/`). `productos.caracteristica` guarda la característica sola y
  `productos.marca` la marca (`Generica` cuando no tiene).
- Estilo de los nombres: palabras con mayúscula inicial y **sin tildes** (el buscador de Ventas `buscar_productos`
  usa `ilike`/trigramas sin `unaccent`, así que las tildes empeoran la búsqueda). La `ñ` sí se usa.
- `productos.unidad_medida` = `"<medida> <Unidad>"`. La unidad es la **última palabra** y debe existir en
  `unidades_medida` (Pulgada, Pie, Yarda, mm, cm, Metro, Libra, Onza, Kg, g, Tonelada, mL, L, Galón, A, W, V,
  Unidad, Caja, Docena, Par, Rollo, Calibre, Circuitos, Talla, DPP, Dientes, Newton, Ref). La medida es todo lo
  anterior: `1/2`, `1-1/4`, `3/8x2`, `1/2x1/2x40`, sin espacios alrededor de la `x`. `Ref` se usa para
  referencias de tamaño (remaches `4-2`, cable `RG6`/`Cat 6`, llantas `3.50-8`). Ver `parseUnidadMedida`.
- Al crear una familia, el producto de origen pasa a ser el primer miembro y sigue activo. Los demás nacen
  **inactivos**, con stock 0 y costo 0, y heredan categoría, IVA, proveedores, imagen y demás datos generales.
  Se activan solos la primera vez que se guardan en "Editar producto" (o con "Activar" en Desactivados).
- Índice único `idx_productos_unicos_nombre_marca_medida`: no puede haber dos productos **activos** con el mismo
  `lower(trim(nombre))` + marca + unidad_medida.
- `codigo` es único incluso entre inactivos. Es corto: 3 letras de la familia (lo que va antes de " - ") y un
  consecutivo, `COD-0012`. Si un producto llega sin código, lo asigna el trigger `trg_asignar_codigo_producto`
  (funciones `prefijo_codigo_producto` y `siguiente_codigo_producto`); un código escrito a mano se respeta y al editar
  sin código se conserva el anterior. El front ya no arma códigos (se quitó `generarSKU()`).
- El formulario "Editar producto" acepta la medida en texto libre, igual que el panel de familias
  (`MEDIDA_REGEX` solo exige una medida, sin `;`). Antes era más estricto y bloqueaba decimales y rangos.
- Un empleado no ve productos inactivos (RLS de SELECT), así que en el panel de familias solo ve los miembros activos.
- Un **grupo de medidas** son los productos de una familia con la misma característica y marca, que solo cambian de
  medida. No tiene tabla: se arma con `familia_id` + `caracteristica` + `marca` (página `inventario/[id]/grupo`, vista
  "por grupos" en Inventario). Las medidas se ordenan por tamaño (calibre o diámetro y luego largo) o por
  `productos.orden_medida` (orden manual, RPC `ordenar_medidas`). La escala de precios del grupo (solo admin) sugiere
  precios con un margen y el redondeo de `escala-precios.ts` ($50 bajo $1.000, $100 desde $1.000) y guarda con
  `aplicar_escala_precios`. Es una tabla con alertas (se quitó la gráfica el 2026-11-07).
- **Peso por unidad** (`productos.peso_unitario_g`, gramos, opcional y solo informativo): con él la app calcula cuánto
  deben pesar N unidades y cuántas unidades hay en un peso, en Nueva venta, en Editar producto ("Contar por peso" en
  bodega y almacén: peso total menos el recipiente, dividido por el peso de una unidad; al guardar, ese stock queda y
  `guardar_producto` deja el movimiento `ajuste` "Conteo por peso") y por medida en el grupo
  (`guardar_pesos_unitarios`). Las cuentas están en `src/lib/peso.ts` y los componentes en `peso-por-unidad.tsx`.
  `guardar_producto` solo cambia el peso si la petición trae la clave `peso_unitario_g` (null lo quita).
- **Precios por cantidad** (`precios_cantidad`, hasta 5 por producto): desde N unidades del mismo producto, cada unidad
  vale menos. Solo un administrador los define, en Editar producto (escribe el precio del paquete y la app muestra el
  unitario), y se guardan con `guardar_precios_cantidad`. Los aplican `registrar_venta`, `registrar_venta_credito` y
  `cambiar_productos` (lo agregado, salvo en una venta con descuento global); esa línea no admite descuento y la venta no
  admite descuento global ni total editado. No aplica a productos por fracción. La lógica del front está en
  `src/lib/precios-cantidad.ts` y replica la de las RPC (si cambias una, cambia la otra); los componentes, en
  `precios-cantidad.tsx`. Reglas completas en `DATABASE.md` (Notas importantes).
- Para guardar un producto se exige al menos un proveedor con costo > 0 y un precio de venta > 0.
- Precio sugerido (`precio-utils.ts`): `costo_neto × (1 + IVA) / (1 − margen)`. Por defecto IVA 19 % y el
  IVA no viene incluido en el costo.
- El IVA de una venta es informativo y es el **contenido en el precio**: `precio − precio / (1 + IVA)` ($11.900 al 19 %
  → $1.900); nunca se suma al total. `iva_incluido` se refiere al costo, así que no cambia ese cálculo. Lo aplican
  `calcularIvaUnitario` en el front y las RPC `registrar_venta`, `registrar_venta_credito` y `cambiar_productos`.

## Estado de los datos (2026-10-31)

- **Catálogo real**, sacado de las facturas de proveedores (38 PDF de CamScanner en
  `C:\Users\USUARIO\Desktop\Facturas Proveedores`, 240 documentos transcritos): **3115 productos activos en 369
  familias** y 33 proveedores. Reemplazó al catálogo de prueba del 2026-10-29 (3064 productos), que quedó en
  `respaldo.*_20261031` y en `Facturas Proveedores\Resultados\Catalogo anterior (respaldo 2026-10-30).xlsx`. Los
  nombres siguen las convenciones de arriba y se reutilizó el nombre del catálogo anterior cuando la coincidencia era obvia.
- Costo, referencia del proveedor y stock salen de la **compra más reciente** de cada producto (todo el stock en
  `stock_almacen`, con su movimiento `carga_inicial`). Los empaques de artículos iguales se pasaron a unidad (161, con
  nota en `producto_proveedores`); los kits cuentan como una unidad. 87 rollos y productos por peso (cable, manguera,
  angeo, alambre, cadena, soldadura) se venden por fracción (metro o kg).
- IVA según el documento: 19 % (2357 productos), 0 % cuando el documento no cobra IVA (743: régimen simplificado, POS,
  manuscritos) y 5 % (15). Precio de venta = costo × (1 + IVA) / 0.60 redondeado hacia arriba a la centena (margen
  40 %); 3 productos conservan el precio escrito a mano en la factura. `stock_minimo` y `prioridad` calculados por
  producto (227 quedan en o bajo el mínimo porque se compraron 1 o 2 unidades).
- Código: todos los productos activos tienen el código corto desde el arreglo del catálogo (2026-11-05).
- **Arreglo del catálogo por lotes** (desde el 2026-11-05): por cada lote se corrigen nombres, familias, grupos de
  medidas, categorías, medidas y descripciones, se agregan las medidas intermedias comunes (activas, stock 0, costo
  estimado entre vecinas y nota "Costo estimado" en `producto_proveedores`) y se asigna el código corto. Antes del
  primero se copió el catálogo en `respaldo.*_20261105`. **Lotes 1 a 6 aplicados** (todo el catálogo): quedan 3134
  productos activos en 433 familias, con 19 medidas nuevas de costo estimado. Galvanizado es una familia propia (accesorios
  de hierro galvanizado); Inafer es marca de cerraduras; canaletas y vidrios de careta conservan sus medidas. Los
  productos repetidos que quedaron con la característica terminada en "Duplicado" se unieron el 2026-11-06 (ver abajo). El mapa de cada lote está en `respaldo.catalogo_lote_*` (nota 16 de
  `DATABASE.md`). Reglas: familia = tipo de producto (Codo, Tee, Tubo);
  característica = sistema y variante (PVC Presion, PVC Sanitario CxC, CPVC); la medida va en `unidad_medida`; la
  descripción dice función y características, sin datos del proveedor. Los duplicados se reportan, no se unen.
- 20 productos tienen dos proveedores: el de la compra más reciente es el principal y está marcado `es_costo_base_manual`.
- **Webs de proveedores (2026-11-06)**: la imagen va por grupo de medidas (familia + característica + marca) y se enlaza
  desde la web del proveedor cuando la referencia coincide: Sumatec (GraphQL de Magento en sumatec.co/graphql),
  Importadora Superior, Ferremakros y Normaplas (Store API de WooCommerce, `/wp-json/wc/store/v1/products`, con
  `type=variation` para el SKU de cada medida) y Boccherini (VTEX, `/api/catalog_system/pub/products/search`). 1005
  productos (229 grupos) tienen foto del proveedor. En una segunda fase se buscó por nombre en Easy Colombia (VTEX,
  `easy.com.co/api/catalog_system/pub/products/search?ft=`) y en esos catálogos, con revisión foto por foto: 282 grupos
  más (carga en `respaldo.web_img2_20261106`), 175 de una tercera tanda (`respaldo.web_img3_20261106`) y 12 de Uyustools
  por código. Después, 39 grupos de Plastgrifos e Induma tomaron la foto de la web del fabricante (WooCommerce), en lugar
  de la de Easy o Wikimedia. Quedan 1840 productos con foto específica (572 de ellos con foto de Easy), 1027 con la de
  Wikimedia por familia y 458 sin imagen. Se
  agregaron 236 medidas intermedias que esos proveedores venden dentro del rango de cada grupo (activas, stock 0, costo
  estimado entre vecinas con nota en `producto_proveedores`). Se unieron los 39 "Duplicado" y los grupos equivalentes
  "Drywall Negro" → "Drywall" y "Hexagonal Grado 2 Zincado UNC" → "Hexagonal Grado 2 Zincado": el stock pasó al producto
  que queda (movimiento `ajuste`), el proveedor del repetido quedó como adicional y el repetido está inactivo. Quedan
  3325 productos activos; 46 tienen dos proveedores. Respaldo en `respaldo.*_20261106`.
- Categorías (20 de 21; "Tanques y Recipientes" no tiene productos activos) y familias (329 de 433) tienen `imagen_url` propia para su tarjeta en Inventario; 13
  proveedores tienen `logo_url` y `sitio_web`.
- `facturas_proveedor`: 233 documentos (facturas, remisiones, pedidos, cuentas de cobro y cotizaciones de dos
  proveedores que fueron compras reales). Los vencidos al 2026-10-31 quedaron como pagados (215) sin filas en
  `pagos_factura_proveedor` ni movimientos de caja; 17 pendientes y 1 parcial. No se registraron 7 documentos sin
  fecha o sin total. Tres proveedores tienen nombre provisional (`Proveedor sin nombre - ...`).
- NIT del negocio corregido en `configuracion_negocio`. Se borraron las 2 ventas de prueba y los saldos de medios de
  pago están en 0.
- Ventas, caja y demás tablas operativas están vacías. Hay 6 perfiles: 5 administradores y 1 empleado.
- 2026-11-07 (migración `mejoras_inventario_recepcion_horario`): tablas y columnas nuevas `permisos_empleado`,
  `productos.por_completar` y `recepcion_items.cantidad_almacen` / `ingresado_bodega` / `ingresado_almacen` (reemplazan a
  `destino`).
- El `logo_url` de `configuracion_negocio` apunta a una URL temporal de Facebook que ya expiró (HTTP 403).

## Corregido el 2026-10-29

- Seguridad: un empleado podía hacerse administrador (trigger nuevo); las RPC y siete tablas se podían usar o leer
  sin sesión (revocado / exigen sesión); `search_path` fijo en las funciones de trigger.
- Rendimiento: políticas RLS con `(select ...)`, 40 índices de claves foráneas, índice duplicado de `ventas` eliminado.
- Calidad: guardado atómico de productos y familias (RPC), asignación de proveedores en "Editar Datos" en una sola
  llamada, SKU sin `useMemo` con efectos, validación de medida igual que en familias, guion corto en los nombres,
  README y `.env.example`. Los empleados ya pueden crear miembros de familia (antes el `INSERT ... RETURNING` de un
  producto inactivo les fallaba por RLS).

## Deuda técnica conocida (pendiente)

- Activar la protección de contraseñas filtradas en Supabase Auth (requiere plan Pro).
- `pg_trgm` sigue en el esquema `public` (moverla puede romper `buscar_productos`).
- Plan gratuito de Supabase: el proyecto se pausa tras ~7 días sin uso y no hay copias de seguridad diarias.
- Reemplazar el logo expirado por uno alojado en Supabase Storage.
- Catálogo desde facturas: regenerar el Excel de revisión (`Resultados\Catalogo nuevo desde facturas (revision
  2026-10-31).xlsx`) con los SKU y precios de la BD; buscar imágenes (154 familias sin imagen) y completar datos en las
  webs de los proveedores; confirmar los nombres de los 3 proveedores provisionales.
- Borrar las tablas del esquema `respaldo` cuando el catálogo nuevo esté validado.
- Imágenes por grupo: unos 1190 grupos siguen sin foto específica (sobre todo de Logística Ferretera, J&L y Naty's, y
  marcas como Plastgrifos, Grival, Pavco, Mercury, Induma y Kaudal); las fotos de Easy
  se pueden cambiar por las del fabricante cuando su web tenga catálogo (Truper solo publica miniaturas; Ecoled limita las
  consultas). Las fotos de Easy son de productos equivalentes de la tienda, no siempre de la misma marca. Las imágenes enlazadas pueden romperse si el proveedor cambia su web; algunas de Ferremakros pesan
  más de 1 MB. Confirmar con la primera compra el costo de las medidas nuevas (19 del 2026-11-05 y 236 del 2026-11-06). Quedan por confirmar algunos términos del lote 1 que pueden ser marcas y la medida de dos piezas Kaudal.
- El advisor de seguridad marca `is_admin()` y `rls_auto_enable()` como ejecutables por `anon`.
- El repositorio de GitHub es público: valorar hacerlo privado. Si se hace, instalar la app de Claude en GitHub
  (github.com/apps/claude) para que las sesiones en la nube puedan clonarlo.
- La búsqueda del inventario filtra en el navegador (bien con ~3000 productos; pasar a búsqueda en el servidor si crece).
- Garantías desde una devolución o un cambio: en `venta-acciones.tsx` no se puede elegir el proveedor (la lista no se
  carga), la cantidad va fija en 1 y no se guarda `devolucion_id`; además la RPC reintegra el stock y `recibir_garantia`
  lo vuelve a sumar.
- Devolver o anular una línea fraccionada no deja movimiento en `movimientos_inventario`, y `anular_venta` suma la
  fracción al remanente sin pasarla a unidades.
- Editar una factura de proveedor no guarda: `facturas_proveedor` no tiene política de UPDATE (la app dice "Factura
  actualizada" sin cambiar nada) y el formulario pondría el saldo igual al total aunque haya pagos.
- Recepción de mercancía: quedan para después adjuntar la foto o el PDF de la factura y repartir fletes y descuentos en
  el costo de los renglones.
- Listas que en celular siguen siendo tablas con desplazamiento lateral (Ventas y Clientes ya tienen tarjetas): nómina,
  servicios, agotados, desactivados, garantías, productos por proveedor, caja, contabilidad y reportes.
- El lint tiene unos 315 errores heredados (casi todos `any`); no bloquean el build.
- Verificación visual sin tocar producción: un servidor local que imita a Supabase (auth y pocas tablas) con
  `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` y la cookie `sb-localhost-auth-token`; el host real de Supabase no
  está en la lista de red del entorno de nube.
- No hay tests ni CI.
