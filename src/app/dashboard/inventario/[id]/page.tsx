import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { BotonAtras } from '@/components/ui/boton-atras'
import { AlertTriangle, Boxes, Check, Package, Pencil, Ruler, X } from 'lucide-react'
import { ListaPreciosCantidad } from '@/components/modulos/precios-cantidad'
import { BotonAccionesProducto } from '@/components/modulos/acciones-inventario'
import { traerTodo } from '@/lib/supabase/traer-todo'
import { esAdmin } from '@/lib/permissions'

export default async function DetalleProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: producto, error } = await supabase
    .from('productos')
    .select(`
      id, nombre, descripcion, codigo, marca, ubicacion,
      precio_venta, precio_costo_base, margen_calculado,
      tiene_iva, iva_incluido, porcentaje_iva,
      stock_bodega, stock_almacen, stock_actual, stock_minimo,
      prioridad, unidad_medida, imagen_url, familia_id, caracteristica, categoria_id,
      categorias_producto(nombre)
    `)
    .eq('id', id)
    .single()

  if (error || !producto) notFound()

  // Últimos cambios de precio: la tabla solo la pueden leer los administradores (RLS), así que a un empleado le llega vacía
  const [{ data: cambiosPrecio }, { data: tramos }, { data: categorias }, { data: familias }, { data: perfil }] = await Promise.all([
    supabase
      .from('historial_precios')
      .select('id, campo, cantidad_minima, precio_anterior, precio_nuevo, origen, created_at, usuario:profiles(nombre_completo)')
      .eq('producto_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('precios_cantidad').select('cantidad_minima, precio_unitario').eq('producto_id', id).order('cantidad_minima'),
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
    traerTodo((desde, hasta) => supabase.from('producto_familias').select('id, nombre_base').order('id').range(desde, hasta)),
    supabase.from('profiles').select('rol').eq('id', user.id).single(),
  ])
  const preciosCantidad = (tramos ?? []).map(t => ({ cantidad_minima: t.cantidad_minima, precio_unitario: Number(t.precio_unitario) }))
  const ETIQUETA_CAMPO: Record<string, string> = { precio_venta: 'Precio de venta', precio_por_unidad_medida: 'Precio por fracción' }
  const ETIQUETA_ORIGEN: Record<string, string> = { escala: 'Escala de precios', grupo: 'Grupo de medidas', producto: 'Producto' }

  const categoriaNombre = (producto.categorias_producto as { nombre: string } | null)?.nombre ?? '—'

  const admin = esAdmin(perfil?.rol)
  const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`
  const precio = Number(producto.precio_venta)
  const costo = producto.precio_costo_base != null ? Number(producto.precio_costo_base) : null
  const stock = Number(producto.stock_actual)
  const minimo = Number(producto.stock_minimo)
  const estado = stock <= 0
    ? { texto: 'Agotado', clase: 'bg-[color-mix(in_oklab,var(--sale)_12%,transparent)] text-sale', Icono: X }
    : stock <= minimo
      ? { texto: 'Bajo el mínimo', clase: 'bg-[color-mix(in_oklab,var(--aviso)_14%,transparent)] text-aviso', Icono: AlertTriangle }
      : { texto: 'Bien surtido', clase: 'bg-[color-mix(in_oklab,var(--entra)_13%,transparent)] text-entra', Icono: Check }
  // Barra de existencias: la escala llega a tres veces el mínimo (o al stock si es mayor)
  const tope = Math.max(stock, minimo * 3, 1)
  const primerTramo = preciosCantidad.find(t => t.precio_unitario < precio)
  const datos: [string, string][] = [
    ['Categoría', categoriaNombre],
    ['Ubicación', producto.ubicacion ?? 'Sin ubicación'],
    ['IVA', producto.tiene_iva ? `${producto.porcentaje_iva}%, ${producto.iva_incluido ? 'incluido en el costo' : 'aparte del costo'}` : 'No aplica'],
    ['Prioridad de pedido', String(producto.prioridad)],
  ]
  const TITULO = 'text-lg font-bold text-tinta'

  return (
    <div className="-m-4 md:-m-6">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 flex items-center gap-1 bg-fondo/95 px-2 py-2 backdrop-blur lg:top-0 md:px-4">
        <BotonAtras href="/dashboard/inventario" />
        <span className="truncate text-[15px] text-suave">Inventario</span>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-8 md:px-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <span className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-inset ring-[#12263a]/10">
              {producto.imagen_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={producto.imagen_url} alt={producto.nombre} className="h-full w-full object-contain p-1.5" />
                : <Package className="size-14 text-brand-blue" strokeWidth={1.5} aria-label="Sin foto" />}
            </span>
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-bold leading-tight text-tinta">{producto.nombre}</h1>
              <p className="text-[15px] text-suave">
                {[producto.unidad_medida, producto.marca, producto.codigo].filter(Boolean).join(', ')}
              </p>
              <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold ${estado.clase}`}>
                <estado.Icono className="size-3.5" strokeWidth={2.5} aria-hidden />{estado.texto}
              </span>
            </div>
          </div>

          <section className="flex items-end justify-between gap-3 rounded-2xl bg-superficie p-4">
            <div>
              <p className="text-sm font-semibold text-suave">Precio de venta</p>
              <p className="cifra text-[44px] font-bold leading-none text-tinta">{pesos(precio)}</p>
            </div>
            {primerTramo && (
              <div className="text-right">
                <p className="text-sm text-suave">Desde {primerTramo.cantidad_minima} unidades</p>
                <p className="cifra text-[22px] font-bold text-tinta">{pesos(primerTramo.precio_unitario)} c/u</p>
              </div>
            )}
          </section>

          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className={TITULO}>Existencias</h2>
              <p className="text-[15px] text-suave"><span className="cifra text-[22px] font-bold text-tinta">{stock}</span> unidades</p>
            </div>
            <div className="relative h-3 rounded-full bg-realce" role="img" aria-label={`${stock} unidades, mínimo ${minimo}`}>
              <div className={`h-3 rounded-full ${stock <= minimo ? 'bg-aviso' : 'bg-enlace'}`} style={{ width: `${Math.min(100, (stock / tope) * 100)}%` }} />
              {minimo > 0 && <span aria-hidden className="absolute -top-1 h-5 w-0.5 bg-tinta" style={{ left: `${(minimo / tope) * 100}%` }} />}
            </div>
            <p className="text-sm text-suave">La raya marca el mínimo: {minimo} unidades.</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[14px] bg-superficie px-3.5 py-3">
                <p className="text-sm text-suave">Almacén</p>
                <p className="cifra text-[28px] font-bold leading-tight text-tinta">{producto.stock_almacen}</p>
              </div>
              <div className="rounded-[14px] bg-superficie px-3.5 py-3">
                <p className="text-sm text-suave">Bodega</p>
                <p className="cifra text-[28px] font-bold leading-tight text-tinta">{producto.stock_bodega}</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-3 gap-2">
            {[
              { href: `/dashboard/inventario/${producto.id}/editar`, texto: 'Editar', Icono: Pencil },
              { href: `/dashboard/inventario/${producto.id}/familia`, texto: 'Familia', Icono: Boxes },
              { href: `/dashboard/inventario/${producto.id}/grupo`, texto: 'Medidas', Icono: Ruler },
            ].map(({ href, texto, Icono }) => (
              <Link key={href} href={href}
                className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-[14px] bg-superficie text-[15px] font-semibold text-tinta hover:bg-superficie-2">
                <Icono className="size-[22px] text-enlace" strokeWidth={1.75} aria-hidden />{texto}
              </Link>
            ))}
          </div>
          <BotonAccionesProducto
            producto={{
              id: producto.id, nombre: producto.nombre, familia_id: producto.familia_id, caracteristica: producto.caracteristica,
              marca: producto.marca, categoria_id: producto.categoria_id, unidad_medida: producto.unidad_medida,
            }}
            categorias={categorias ?? []}
            familias={familias ?? []}
            esAdmin={admin}
          />
        </div>

        <div className="space-y-5">
          {admin && (
            <section className="space-y-2.5">
              <h2 className={TITULO}>Costo y ganancia</h2>
              <dl className="overflow-hidden rounded-2xl bg-superficie">
                <div className="flex items-center justify-between border-b border-linea px-4 py-3"><dt className="text-[15px] text-tinta">Costo base</dt><dd className="cifra text-xl font-bold text-tinta">{costo != null ? pesos(costo) : 'Sin costo'}</dd></div>
                {costo != null && <div className="flex items-center justify-between border-b border-linea px-4 py-3"><dt className="text-[15px] text-tinta">Ganancia por unidad</dt><dd className={`cifra text-xl font-bold ${precio - costo >= 0 ? 'text-entra' : 'text-sale'}`}>{pesos(precio - costo)}</dd></div>}
                <div className="flex items-center justify-between px-4 py-3"><dt className="text-[15px] text-tinta">Margen</dt><dd className="cifra text-xl font-bold text-tinta">{producto.margen_calculado != null ? `${Number(producto.margen_calculado).toFixed(1)}%` : 'Sin dato'}</dd></div>
              </dl>
            </section>
          )}

          {preciosCantidad.length > 0 && (
            <section className="space-y-2.5">
              <h2 className={TITULO}>Precios por cantidad</h2>
              <ListaPreciosCantidad tramos={preciosCantidad} precioVenta={precio} />
            </section>
          )}

          <section className="space-y-2.5">
            <h2 className={TITULO}>Datos</h2>
            <dl className="overflow-hidden rounded-2xl bg-superficie">
              {datos.map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex justify-between gap-4 border-b border-linea px-4 py-3 last:border-0">
                  <dt className="text-[15px] text-suave">{etiqueta}</dt>
                  <dd className="text-right text-[15px] font-semibold text-tinta">{valor}</dd>
                </div>
              ))}
            </dl>
            {producto.descripcion && <p className="px-1 text-[15px] leading-relaxed text-suave">{producto.descripcion}</p>}
          </section>

          {(cambiosPrecio ?? []).length > 0 && (
            <section className="space-y-2.5">
              <h2 className={TITULO}>Últimos cambios de precio</h2>
              <ul className="overflow-hidden rounded-2xl bg-superficie">
                {cambiosPrecio!.map(c => {
                  const usuario = c.usuario as { nombre_completo: string } | null
                  return (
                    <li key={c.id} className="border-b border-linea px-4 py-3 last:border-0">
                      <p className="text-[15px] text-tinta">
                        {c.campo === 'precio_cantidad' ? `Precio desde ${c.cantidad_minima ?? '?'} unidades` : ETIQUETA_CAMPO[c.campo] ?? c.campo}:{' '}
                        <span className="cifra text-base">{c.precio_anterior != null ? pesos(Number(c.precio_anterior)) : 'sin precio'}</span> a{' '}
                        <span className="cifra text-base font-bold">{c.precio_nuevo != null ? pesos(Number(c.precio_nuevo)) : 'sin precio'}</span>
                      </p>
                      <p className="text-sm text-suave">
                        {new Date(c.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })}
                        , {(ETIQUETA_ORIGEN[c.origen] ?? c.origen).toLowerCase()}
                        {usuario?.nombre_completo ? `, ${usuario.nombre_completo}` : ''}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
