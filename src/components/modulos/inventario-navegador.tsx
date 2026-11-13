'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { ChevronRight, EllipsisVertical, Hand, Merge, Package, Pencil, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  buscarProductos, claveCategoria, claveFamilia, claveGrupo, nivelCategorias, nivelFamilias, nivelGrupos, pesos,
  rangoPrecios, SIN, type NivelGrupo, type ProductoInventario, type Resumen,
} from '@/lib/inventario-arbol'
import { AccionesInventario, type ObjetivoAcciones } from './acciones-inventario'
import { CrearNivelInventario, type TipoNivel } from './crear-nivel-inventario'
import { EditarTarjetaInventario, type TarjetaEditable } from './editar-tarjeta-inventario'
import { UnirGruposMedidas } from './unir-grupos-medidas'
import { useArrastre } from '@/lib/usar-arrastre'

interface Props {
  productos: ProductoInventario[]
  categorias: { id: string; nombre: string; imagen_url?: string | null }[]
  familias: { id: string; nombre_base: string; imagen_url?: string | null }[]
  esAdmin: boolean
}

const RUTA = '/dashboard/inventario'
/** Cuántas tarjetas de búsqueda se muestran antes de "Mostrar más" */
const PAGINA_BUSQUEDA = 60

/** Imagen de una tarjeta, o un ícono si no tiene */
function Imagen({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-[#1a2430] ${className}`}>
        <Package className="h-10 w-10 text-brand-yellow/40" aria-hidden />
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" draggable={false} className={`bg-white object-contain ${className}`} />
}

function Estadisticas({ resumen, detalle }: { resumen: Resumen; detalle: string }) {
  return (
    <div className="space-y-0.5 text-[11px] text-steel-300">
      <p>{detalle}</p>
      <p>
        Stock <span className="font-bold text-brand-yellow">{resumen.stock}</span>
        {resumen.agotados > 0 && <span className="text-brand-red"> · {resumen.agotados} agotado{resumen.agotados === 1 ? '' : 's'}</span>}
      </p>
      <p className="text-white">{rangoPrecios(resumen)}</p>
    </div>
  )
}

/** Tarjeta para crear una categoría, familia o grupo nuevo */
function TarjetaNueva({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-yellow/40 p-3 text-center text-sm font-bold text-brand-yellow hover:border-brand-yellow hover:bg-brand-yellow/5">
      <Plus className="h-8 w-8" aria-hidden />
      {texto}
    </button>
  )
}

function Tarjeta({ titulo, imagen, children, onAbrir, onMenu, onEditar, arrastre, estado }: {
  titulo: string
  imagen: string | null
  children: React.ReactNode
  onAbrir: () => void
  onMenu?: () => void
  /** Editar el nombre y la imagen de la tarjeta (categoría, familia o grupo) */
  onEditar?: () => void
  /** Propiedades de useArrastre: la tarjeta se puede arrastrar sobre otra manteniéndola presionada */
  arrastre?: React.HTMLAttributes<HTMLDivElement>
  /** Mientras se arrastra: la tarjeta que se mueve o la que va a recibirla */
  estado?: 'origen' | 'destino'
}) {
  return (
    <div {...arrastre}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-[#111820] transition ${arrastre ? 'arrastrable' : ''} ${
        estado === 'destino' ? 'scale-[1.03] border-brand-yellow ring-2 ring-brand-yellow'
          : estado === 'origen' ? 'border-white/10 opacity-40'
            : 'border-white/10 hover:border-brand-yellow/50'
      }`}>
      <button type="button" onClick={onAbrir} className="flex flex-1 flex-col text-left">
        <Imagen src={imagen} alt={titulo} className="aspect-[4/3] w-full" />
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className={`line-clamp-2 text-sm font-bold text-white ${onMenu ? 'pr-6' : ''}`}>{titulo}</h3>
          {children}
        </div>
      </button>
      {estado === 'destino' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-1.5 bg-brand-yellow py-1.5 text-xs font-bold text-steel-900">
          <Merge className="h-3.5 w-3.5" aria-hidden /> Soltar para unir aquí
        </div>
      )}
      {onEditar && !estado && (
        <button type="button" onClick={onEditar} data-sin-arrastre aria-label={`Editar nombre e imagen de ${titulo}`}
          className="absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#111820]/85 text-steel-300 shadow hover:bg-[#111820] hover:text-brand-yellow">
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onMenu && (
        <button type="button" onClick={onMenu} data-sin-arrastre aria-label={`Acciones de ${titulo}`}
          className="absolute bottom-1 right-0.5 flex h-10 w-9 items-center justify-center rounded-lg text-steel-300 hover:bg-white/10 hover:text-white">
          <EllipsisVertical className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function InventarioNavegador({ productos, categorias, familias, esAdmin }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const cat = params.get('cat')
  const fam = cat ? params.get('fam') : null
  const g = fam ? params.get('g') : null

  const [query, setQuery] = useState('')
  const [limite, setLimite] = useState(PAGINA_BUSQUEDA)
  const [acciones, setAcciones] = useState<{ clave: string; objetivo: ObjetivoAcciones } | null>(null)
  const [crear, setCrear] = useState<TipoNivel | null>(null)
  const [editar, setEditar] = useState<TarjetaEditable | null>(null)
  const [unir, setUnir] = useState<{ origen: string; destino: string } | null>(null)
  // Cada apertura del menú monta el panel de nuevo, con los datos del producto o grupo elegido
  const aperturas = useRef(0)
  const marcas = useMemo(
    () => [...new Set(productos.map(p => p.marca).filter((m): m is string => !!m))].sort((a, b) => a.localeCompare(b, 'es')),
    [productos],
  )

  // El nivel queda en la dirección: el botón de atrás del celular vuelve al nivel anterior y el enlace se puede compartir.
  // pushState no vuelve a pedir la página al servidor (Next sincroniza useSearchParams).
  const consulta = (nivel: { cat?: string | null; fam?: string | null; g?: string | null }) => {
    const sp = new URLSearchParams()
    if (nivel.cat) sp.set('cat', nivel.cat)
    if (nivel.cat && nivel.fam) sp.set('fam', nivel.fam)
    if (nivel.cat && nivel.fam && nivel.g) sp.set('g', nivel.g)
    const texto = sp.toString()
    return texto ? `${RUTA}?${texto}` : RUTA
  }
  const ir = (nivel: { cat?: string | null; fam?: string | null; g?: string | null }) => {
    window.history.pushState(null, '', consulta(nivel))
    window.scrollTo({ top: 0 })
  }
  const rutaActual = consulta({ cat, fam, g })

  const nombreCategoria = (id: string) => id === SIN ? 'Sin categoría' : (categorias.find(c => c.id === id)?.nombre ?? 'Categoría')
  // Imagen propia de la categoría o familia (acorde a su nombre); si no tiene, la tarjeta usa la de un producto
  const imagenCategoria = (id: string) => categorias.find(c => c.id === id)?.imagen_url || null
  const imagenFamilia = (id: string) => familias.find(f => f.id === id)?.imagen_url || null
  const nombreFamilia = (id: string) => id === SIN ? 'Sin familia' : (familias.find(f => f.id === id)?.nombre_base ?? 'Familia')

  const resultados = useMemo(() => buscarProductos(productos, query), [productos, query])
  const listaCategorias = useMemo(() => nivelCategorias(productos, categorias), [productos, categorias])
  // Filtrar unas miles de filas por nivel es rápido: no hace falta memorizarlo
  const listaFamilias = cat ? nivelFamilias(productos, cat, familias) : []
  const listaGrupos = cat && fam ? nivelGrupos(productos, cat, fam) : []
  const grupo = g ? listaGrupos.find(x => x.clave === g) ?? null : null

  // Arrastrar un grupo sobre otro (manteniéndolo presionado) los une. Solo dentro de una familia y sin paneles abiertos.
  const puedeArrastrar = !!cat && !!fam && !g && fam !== SIN && listaGrupos.length > 1 && query.trim() === '' && !acciones && !crear && !editar && !unir
  const arrastre = useArrastre({ activo: puedeArrastrar, onSoltar: (origen, destino) => setUnir({ origen, destino }) })
  const grupoArrastrado = arrastre.estado ? listaGrupos.find(x => x.clave === arrastre.estado?.origen) ?? null : null
  const unirOrigen = unir ? listaGrupos.find(x => x.clave === unir.origen) ?? null : null
  const unirDestino = unir ? listaGrupos.find(x => x.clave === unir.destino) ?? null : null

  const abrirAcciones = (objetivo: ObjetivoAcciones) => {
    const clave = objetivo.tipo === 'producto' ? objetivo.producto.id : objetivo.productos.map(p => p.id).join(',')
    aperturas.current += 1
    setAcciones({ clave: `${clave}-${aperturas.current}`, objetivo })
  }
  const verGrupoDe = (p: { id: string }) => {
    const producto = productos.find(x => x.id === p.id)
    if (!producto) return
    setQuery('')
    ir({ cat: claveCategoria(producto), fam: claveFamilia(producto), g: claveGrupo(producto) })
  }

  const buscando = query.trim() !== ''

  // Ruta de navegación: Inventario › Categoría › Familia › Grupo
  const migas: { texto: string; nivel: { cat?: string | null; fam?: string | null; g?: string | null } }[] = [{ texto: 'Categorías', nivel: {} }]
  if (cat) migas.push({ texto: nombreCategoria(cat), nivel: { cat } })
  if (cat && fam) migas.push({ texto: nombreFamilia(fam), nivel: { cat, fam } })
  if (grupo) migas.push({ texto: [grupo.caracteristica, grupo.marca].filter(Boolean).join(' · ') || grupo.nombre, nivel: { cat, fam, g } })

  const BOTON_AGREGAR = 'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-brand-yellow/60 px-3 text-sm font-bold text-brand-yellow hover:bg-brand-yellow/10'
  const BOTON_EDITAR = 'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm font-bold text-white hover:bg-white/5'
  const volver = `volver=${encodeURIComponent(rutaActual)}`
  const tarjetaGrupo = (familiaId: string, x: NivelGrupo): TarjetaEditable => ({
    tipo: 'grupo', familiaId, familia: nombreFamilia(familiaId), caracteristica: x.caracteristica, marca: x.marca,
    imagen: x.resumen.imagen, medidas: x.items.length,
  })

  return (
    <div className="space-y-4">
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimite(PAGINA_BUSQUEDA) }}
          placeholder="Buscar por nombre, código, marca, medida o ubicación…"
          className="h-12 border-white/10 bg-[#1a2430] pl-9 pr-10 text-[16px] text-white placeholder:text-steel-500"
        />
        {buscando && (
          <button type="button" onClick={() => setQuery('')} aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-steel-300 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {buscando ? (
        <section className="space-y-3">
          <p className="text-xs text-steel-300">
            {resultados.length === 0 ? 'No se encontraron productos con esa búsqueda.' : `${resultados.length} producto${resultados.length === 1 ? '' : 's'}`}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {resultados.slice(0, limite).map(p => (
              <Tarjeta key={p.id} titulo={p.nombre} imagen={p.imagen_url}
                onAbrir={() => router.push(`${RUTA}/${p.id}`)}
                onMenu={() => abrirAcciones({ tipo: 'producto', producto: p })}>
                <div className="space-y-0.5 text-[11px] text-steel-300">
                  <p className="font-semibold text-white">{p.unidad_medida ?? '—'}{p.marca ? ` · ${p.marca}` : ''}</p>
                  <p className="font-mono text-brand-yellow">{p.codigo ?? '—'}</p>
                  <p>Stock <span className={`font-bold ${p.stock_actual <= 0 ? 'text-brand-red' : 'text-brand-yellow'}`}>{p.stock_actual}</span>{p.ubicacion ? ` · ${p.ubicacion}` : ''}</p>
                  <p className="text-white">{pesos(p.precio_venta)}</p>
                </div>
              </Tarjeta>
            ))}
          </div>
          {resultados.length > limite && (
            <button type="button" onClick={() => setLimite(l => l + PAGINA_BUSQUEDA)}
              className="h-11 w-full rounded-xl border border-white/15 text-sm font-bold text-white hover:bg-white/5">
              Mostrar más ({resultados.length - limite} restantes)
            </button>
          )}
        </section>
      ) : (
        <>
          <nav aria-label="Ruta del inventario" className="flex flex-wrap items-center gap-1 text-xs">
            {migas.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-steel-500" aria-hidden />}
                {i === migas.length - 1
                  ? <span className="font-semibold text-white">{m.texto}</span>
                  : <button type="button" onClick={() => ir(m.nivel)} className="text-brand-blue hover:underline">{m.texto}</button>}
              </span>
            ))}
          </nav>

          {/* Nivel 1: categorías */}
          {!cat && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {listaCategorias.map(c => (
                <Tarjeta key={c.id} titulo={c.nombre} imagen={imagenCategoria(c.id) ?? c.resumen.imagen} onAbrir={() => ir({ cat: c.id })}
                  onEditar={c.id === SIN ? undefined : () => setEditar({ tipo: 'categoria', id: c.id, nombre: c.nombre, imagen: imagenCategoria(c.id) })}>
                  <Estadisticas resumen={c.resumen} detalle={`${c.familias} familia${c.familias === 1 ? '' : 's'} · ${c.resumen.productos} productos`} />
                </Tarjeta>
              ))}
              <TarjetaNueva texto="Nueva categoría" onClick={() => setCrear('categoria')} />
            </div>
          )}

          {/* Nivel 2: familias de la categoría */}
          {cat && !fam && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-white">{nombreCategoria(cat)}</h2>
                {cat !== SIN && (
                  <button type="button" onClick={() => setEditar({ tipo: 'categoria', id: cat, nombre: nombreCategoria(cat), imagen: imagenCategoria(cat) })}
                    className={BOTON_EDITAR}><Pencil className="h-4 w-4" /> Editar</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {listaFamilias.map(f => (
                  <Tarjeta key={f.id} titulo={f.nombre} imagen={imagenFamilia(f.id) ?? f.resumen.imagen} onAbrir={() => ir({ cat, fam: f.id })}
                    onEditar={f.id === SIN ? undefined : () => setEditar({ tipo: 'familia', id: f.id, nombre: f.nombre, imagen: imagenFamilia(f.id) })}>
                    <Estadisticas resumen={f.resumen} detalle={`${f.grupos} grupo${f.grupos === 1 ? '' : 's'} · ${f.resumen.productos} productos`} />
                  </Tarjeta>
                ))}
                {cat !== SIN && <TarjetaNueva texto="Nueva familia" onClick={() => setCrear('familia')} />}
              </div>
              {listaFamilias.length === 0 && (
                <p className="text-center text-xs text-steel-500">Esta categoría aún no tiene productos activos: crea su primera familia.</p>
              )}
            </section>
          )}

          {/* Nivel 3: grupos de medidas de la familia */}
          {cat && fam && !g && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-white">{nombreFamilia(fam)}</h2>
                {fam !== SIN && (
                  <button type="button" onClick={() => setEditar({ tipo: 'familia', id: fam, nombre: nombreFamilia(fam), imagen: imagenFamilia(fam) })}
                    className={BOTON_EDITAR}><Pencil className="h-4 w-4" /> Editar</button>
                )}
              </div>
              {fam !== SIN && listaGrupos.length > 1 && (
                <p className="flex items-center gap-1.5 text-[11px] text-steel-500">
                  <Hand className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Mantén presionado un grupo y arrástralo sobre otro para unirlos.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {listaGrupos.map(x => (
                  <Tarjeta key={x.clave} titulo={fam === SIN ? x.nombre : (x.caracteristica ?? x.nombre)} imagen={x.resumen.imagen}
                    arrastre={arrastre.propsTarjeta(x.clave)}
                    estado={arrastre.estado?.origen === x.clave ? 'origen' : arrastre.estado?.destino === x.clave ? 'destino' : undefined}
                    onAbrir={() => ir({ cat, fam, g: x.clave })}
                    onEditar={fam === SIN ? undefined : () => setEditar(tarjetaGrupo(fam, x))}
                    onMenu={() => abrirAcciones(x.items.length === 1
                      ? { tipo: 'producto', producto: x.items[0] }
                      : { tipo: 'grupo', nombre: x.nombre, productos: x.items })}>
                    <Estadisticas resumen={x.resumen}
                      detalle={`${x.marca ?? 'Sin marca'} · ${x.items.length} medida${x.items.length === 1 ? '' : 's'}`} />
                  </Tarjeta>
                ))}
                {cat !== SIN && fam !== SIN && <TarjetaNueva texto="Nuevo grupo de medidas" onClick={() => setCrear('grupo')} />}
              </div>
              {listaGrupos.length === 0 && <SinResultados onVolver={() => ir({ cat })} texto="Esta familia ya no tiene productos en esta categoría." />}
            </section>
          )}

          {/* Nivel 4: el grupo de medidas con su imagen y la lista de productos */}
          {cat && fam && g && (grupo ? (
            <section className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111820] sm:flex">
                <Imagen src={grupo.resumen.imagen} alt={grupo.nombre} className="h-56 w-full sm:h-48 sm:w-64 sm:shrink-0" />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div>
                    <h2 className="font-display text-xl font-bold text-white">{grupo.nombre}</h2>
                    <p className="text-xs text-steel-300">
                      {grupo.marca ?? 'Sin marca'} · {grupo.items.length} medida{grupo.items.length === 1 ? '' : 's'} · Stock{' '}
                      <span className="font-bold text-brand-yellow">{grupo.resumen.stock}</span> · {rangoPrecios(grupo.resumen)}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href={`${RUTA}/nuevo?desde=${grupo.items[0].id}&${volver}`} className={BOTON_AGREGAR}>
                      <Plus className="h-4 w-4" /> Agregar medida
                    </Link>
                    {fam !== SIN && (
                      <button type="button" onClick={() => setEditar(tarjetaGrupo(fam, grupo))} className={BOTON_EDITAR}>
                        <Pencil className="h-4 w-4" /> Editar
                      </button>
                    )}
                    {fam !== SIN && (
                      <Link href={`${RUTA}/${grupo.items[0].id}/grupo`}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm font-bold text-white hover:bg-white/5">
                        <SlidersHorizontal className="h-4 w-4" /> Precios y orden
                      </Link>
                    )}
                    <button type="button"
                      onClick={() => abrirAcciones(grupo.items.length === 1
                        ? { tipo: 'producto', producto: grupo.items[0] }
                        : { tipo: 'grupo', nombre: grupo.nombre, productos: grupo.items })}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm font-bold text-white hover:bg-white/5">
                      <EllipsisVertical className="h-4 w-4" /> {grupo.items.length === 1 ? 'Acciones' : 'Mover grupo'}
                    </button>
                  </div>
                </div>
              </div>

              <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#111820]">
                {grupo.items.map(p => (
                  <li key={p.id} className="flex items-center gap-2 pr-1 hover:bg-white/5">
                    <button type="button" onClick={() => router.push(`${RUTA}/${p.id}`)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{p.unidad_medida ?? '—'}</p>
                        <p className="truncate text-[11px] text-steel-300">
                          <span className="font-mono text-brand-yellow">{p.codigo ?? '—'}</span>{p.ubicacion ? ` · ${p.ubicacion}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`font-display text-sm font-bold ${p.stock_actual <= 0 ? 'text-brand-red' : 'text-brand-yellow'}`}>{p.stock_actual}</p>
                        <p className="text-[11px] text-white">{pesos(p.precio_venta)}</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => abrirAcciones({ tipo: 'producto', producto: p })} aria-label={`Acciones de ${p.nombre} ${p.unidad_medida ?? ''}`}
                      className="shrink-0 rounded-lg p-2 text-steel-300 hover:bg-white/10 hover:text-white">
                      <EllipsisVertical className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <SinResultados onVolver={() => ir({ cat, fam })} texto="Este grupo de medidas ya no tiene productos (pudieron moverse a otro grupo)." />
          ))}
        </>
      )}

      {crear && (
        <CrearNivelInventario
          tipo={crear}
          onCerrar={() => setCrear(null)}
          categoriaId={cat ?? undefined}
          familia={fam ? nombreFamilia(fam) : undefined}
          categorias={categorias}
          familias={familias}
          marcas={marcas}
          gruposExistentes={new Map(listaGrupos.map(x => [`${x.caracteristica ?? ''}|${x.marca ?? ''}`.toLowerCase(), x.clave]))}
          rutaVolver={rutaActual}
          onCategoriaCreada={id => { router.refresh(); ir({ cat: id }) }}
          onIrGrupo={clave => ir({ cat, fam, g: clave })}
        />
      )}

      {editar && (
        <EditarTarjetaInventario
          tarjeta={editar}
          categorias={categorias}
          onCerrar={() => setEditar(null)}
          onGrupoRenombrado={clave => { if (g) ir({ cat, fam, g: clave }) }}
        />
      )}

      {/* Lo que se lleva en el dedo mientras se arrastra un grupo */}
      {arrastre.estado && grupoArrastrado && (
        <div aria-hidden className="pointer-events-none fixed z-50 w-40 -translate-x-1/2 overflow-hidden rounded-xl border-2 border-brand-yellow bg-[#111820] shadow-2xl shadow-black"
          style={{ left: arrastre.estado.x, top: arrastre.estado.y - 118 }}>
          <Imagen src={grupoArrastrado.resumen.imagen} alt="" className="h-16 w-full" />
          <p className="truncate px-2 pt-1 text-xs font-bold text-white">{grupoArrastrado.caracteristica ?? grupoArrastrado.nombre}</p>
          <p className="truncate px-2 pb-1.5 text-[10px] text-steel-300">
            {arrastre.estado.destino ? 'Suelta para unir' : 'Llévalo sobre otro grupo'}
          </p>
        </div>
      )}

      {unir && unirOrigen && unirDestino && fam && (
        <UnirGruposMedidas
          familia={nombreFamilia(fam)}
          origen={unirOrigen}
          destino={unirDestino}
          grupos={listaGrupos}
          onCerrar={() => setUnir(null)}
        />
      )}

      {acciones && (
        <AccionesInventario
          key={acciones.clave}
          objetivo={acciones.objetivo}
          onCerrar={() => setAcciones(null)}
          categorias={categorias}
          familias={familias}
          esAdmin={esAdmin}
          rutaVolver={rutaActual}
          onVerGrupo={verGrupoDe}
        />
      )}
    </div>
  )
}

function SinResultados({ texto, onVolver }: { texto: string; onVolver: () => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111820] p-8 text-center text-sm text-steel-500">
      <p>{texto}</p>
      <button type="button" onClick={onVolver} className="mt-2 text-brand-blue hover:underline">Volver</button>
    </div>
  )
}
