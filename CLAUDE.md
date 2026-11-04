@AGENTS.md

# Contexto del proyecto — Gestión Comercial Ferreléctricos Costa Azul

> Claude Code carga este archivo en cada sesión. Mantenerlo al día cuando cambie algo importante
> (esquema de la BD, convenciones, estado de los datos). Última revisión: 2026-11-04.

## Qué es

Sistema de gestión para **Ferreléctricos Costa Azul**, ferretería en Bogotá. Cubre punto de venta (ventas,
cotizaciones, créditos, devoluciones, cambios, garantías), inventario con familias de productos, proveedores y
sus facturas, clientes, caja (caja menor/mayor, arqueo, gastos, retiros), nómina, horario, reportes y
contabilidad. Interfaz *mobile-first*, tema oscuro, todo en español.

Roles: `administrador` (todo) y `empleado` (ventas, inventario, clientes, horario y su propia nómina).

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
  componentes cliente). Módulos: `ventas` (nueva, cotización, servicios, recibo), `inventario` (nuevo, editar,
  familia, agotados, desactivados, garantías), `clientes`, `proveedores` (facturas, pagos), `empleados`,
  `caja`, `contabilidad`, `nomina`, `horario`, `reportes`, `configuracion`, `instrucciones`, `mi-perfil`.
- `src/components/modulos/`: formularios y paneles cliente; aquí vive la lógica de negocio del front.
- `src/lib/`: `permissions.ts` (permisos por rol y `RUTAS_SOLO_ADMIN`), `precio-utils.ts` (margen e IVA),
  `temas-ayuda.ts` (textos del panel Instrucciones), `festivos-colombia.ts`.
- `src/proxy.ts`: exige sesión en `/dashboard`, cierra la sesión si el perfil está inactivo y manda a los
  empleados fuera de las rutas de administrador.
- `DATABASE.md`: tablas, RPC, índices y políticas RLS (al día al 2026-10-31). Mantenerlo actualizado.

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
- El guardado de productos y familias va por `guardar_producto` y `guardar_familia` (`SECURITY INVOKER`, una sola
  transacción). `producto-form.tsx` y `familia-medidas-panel.tsx` las llaman con `supabase.rpc`.
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
- `codigo` (SKU) es único incluso entre inactivos. `generarSKU()` arma `NOM+CAR-CAT-MAR-<medida><UNI>` (3
  letras por parte) y devuelve vacío si falta categoría, marca, medida o unidad.
- El formulario "Editar producto" acepta la medida en texto libre, igual que el panel de familias
  (`MEDIDA_REGEX` solo exige una medida, sin `;`). Antes era más estricto y bloqueaba decimales y rangos.
- Un empleado no ve productos inactivos (RLS de SELECT), así que en el panel de familias solo ve los miembros activos.
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
- SKU: el de `generarSKU()` más un sufijo de 5 caracteres (md5 de `nombre|marca|unidad_medida`) para que sea único.
- 20 productos tienen dos proveedores: el de la compra más reciente es el principal y está marcado `es_costo_base_manual`.
- Imágenes: 2445 productos (215 familias) heredaron la imagen de Wikimedia de la familia del mismo nombre del
  catálogo anterior; 670 productos (154 familias) no tienen imagen.
- `facturas_proveedor`: 233 documentos (facturas, remisiones, pedidos, cuentas de cobro y cotizaciones de dos
  proveedores que fueron compras reales). Los vencidos al 2026-10-31 quedaron como pagados (215) sin filas en
  `pagos_factura_proveedor` ni movimientos de caja; 17 pendientes y 1 parcial. No se registraron 7 documentos sin
  fecha o sin total. Tres proveedores tienen nombre provisional (`Proveedor sin nombre - ...`).
- NIT del negocio corregido en `configuracion_negocio`. Se borraron las 2 ventas de prueba y los saldos de medios de
  pago están en 0.
- Ventas, caja y demás tablas operativas están vacías. Hay 6 perfiles: 5 administradores y 1 empleado.
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
- El advisor de seguridad marca `is_admin()` y `rls_auto_enable()` como ejecutables por `anon`.
- El repositorio de GitHub es público: valorar hacerlo privado. Si se hace, instalar la app de Claude en GitHub
  (github.com/apps/claude) para que las sesiones en la nube puedan clonarlo.
- La búsqueda del inventario filtra en el navegador (bien con ~3000 productos; pasar a búsqueda en el servidor si crece).
- Garantías desde una devolución o un cambio: en `venta-acciones.tsx` no se puede elegir el proveedor (la lista no se
  carga), la cantidad va fija en 1 y no se guarda `devolucion_id`; además la RPC reintegra el stock y `recibir_garantia`
  lo vuelve a sumar.
- Devolver o anular una línea fraccionada no deja movimiento en `movimientos_inventario`, y `anular_venta` suma la
  fracción al remanente sin pasarla a unidades.
- No hay tests ni CI.
