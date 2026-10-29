@AGENTS.md

# Contexto del proyecto — Gestión Comercial Ferreléctricos Costa Azul

> Claude Code carga este archivo en cada sesión. Mantenerlo al día cuando cambie algo importante
> (esquema de la BD, convenciones, estado de los datos). Última revisión: 2026-10-29.

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
- `DATABASE.md`: tablas, RPC, índices y políticas RLS (al día al 2026-10-29). Mantenerlo actualizado.

## Base de datos: piezas clave

- Las operaciones de dinero y stock pasan por **funciones RPC `SECURITY DEFINER`**: `registrar_venta`,
  `registrar_venta_credito`, `anular_venta`, `devolver_productos`, `cambiar_productos`,
  `registrar_abono_credito`, `actualizar_fecha_pago_credito`, `registrar_gasto_caja`, `registrar_retiro`,
  `registrar_pago_factura`, `registrar_nomina`, `abrir_caja`, `cerrar_caja_arqueo`, `transferir_entre_fondos`,
  `actualizar_denominaciones`, `mover_stock_bodega_almacen`, `recibir_garantia`, `buscar_productos`,
  `buscar_clientes`, `calcular_rotacion_productos`. Las de administrador validan `profiles.rol` por dentro.
- El guardado de productos y familias va por `guardar_producto` y `guardar_familia` (`SECURITY INVOKER`, una sola
  transacción). `producto-form.tsx` y `familia-medidas-panel.tsx` las llaman con `supabase.rpc`.
- Ninguna RPC de negocio se puede ejecutar sin sesión. Al crear una RPC nueva: `revoke execute ... from public, anon` y
  `grant execute ... to authenticated, service_role`.
- Ninguna tabla se puede leer sin sesión. Las políticas usan `(select auth.uid())` / `(select is_admin())`.
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

## Estado de los datos (2026-10-29)

- Catálogo cargado desde el Excel del inventario (`Listado.xlsx`, 303 familias): **3064 productos en 303
  familias**, 3062 activos (2 duplicados de ducha quedaron inactivos). Las familias de la J en adelante se crearon
  desde el Excel; en las que ya existían (A–I) se respetó lo que se había cargado a mano y solo se corrigieron
  errores (espacios, ortografía, marcas `AVE`→`Ave`, `Boccherinni`→`Boccherini`, `Uyusa`→`Uyustools`).
- Las filas del Excel que solo traían el nombre quedaron como característica `Estandar`, `1 Unidad`, marca `Generica`.
- **Todo es de prueba**: costo estimado por familia (modelo por medida, característica y marca, a precio de mercado
  colombiano), precio de venta = costo × 1.19 / 0.60 redondeado a la centena (margen 40 %, IVA 19 % no incluido),
  stock aleatorio (≈5 % agotado y ≈8 % bajo el mínimo para probar alertas) con su movimiento `carga_inicial`,
  ubicación `Pasillo N, Estante X` y descripción automática. Los precios reales de Logística Ferretera están en su
  portal de pedidos (ecommerce.logisticaferretera.com.co), que exige usuario.
- Imágenes: una por familia, de Wikimedia Commons (licencia libre, URL de `thumb.wikimedia.org` /
  `upload.wikimedia.org`). 127 productos (24 familias) quedaron sin imagen por no haber una adecuada.
- Todos tienen categoría (las 21 de `categorias_producto`), código SKU de `generarSKU` (con sufijo `-2`, `-3`
  si se repite) y el proveedor "Logística Ferretera SAS" con el costo.
- Respaldo previo a la carga en el esquema privado `respaldo` (`*_20261029`).
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
- Precios de prueba: reemplazar por los costos reales del proveedor.
- La búsqueda del inventario filtra en el navegador (bien con ~3000 productos; pasar a búsqueda en el servidor si crece).
- No hay tests ni CI.
