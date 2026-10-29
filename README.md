# Gestión Comercial — Ferreléctricos Costa Azul

Sistema de gestión para la ferretería Ferreléctricos Costa Azul (Bogotá): punto de venta, cotizaciones, créditos,
devoluciones y garantías; inventario con familias de productos; proveedores y facturas; clientes; caja, arqueo,
gastos y retiros; nómina, horario, reportes y contabilidad.

- **Producción:** https://gestion-comercial-alpha.vercel.app
- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL + Auth + RLS)

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar con los valores de Supabase
npm run dev                  # http://localhost:3000
```

Otros comandos: `npm run build`, `npm run lint`.

## Estructura

| Ruta | Contenido |
|---|---|
| `src/app/dashboard/<módulo>/` | Páginas de cada módulo (ventas, inventario, caja, nómina, …) |
| `src/components/modulos/` | Formularios y paneles con la lógica de cada módulo |
| `src/lib/` | Permisos por rol, cálculo de precios e IVA, textos de ayuda |
| `src/proxy.ts` | Sesión obligatoria en `/dashboard` y rutas solo para administradores |

## Documentación

- [`DATABASE.md`](DATABASE.md) — tablas, funciones (RPC), índices y políticas de seguridad (RLS).
- [`CLAUDE.md`](CLAUDE.md) — contexto completo del proyecto: convenciones de productos y familias, estado de los
  datos, reglas de trabajo y deuda técnica conocida.
