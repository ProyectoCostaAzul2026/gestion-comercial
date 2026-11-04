'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Layers, Link2, PackagePlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { convertirEmpaque } from '@/lib/recepcion'
import { INPUT_CLS, LABEL_CLS } from './producto-form'
import { BuscadorProducto, type ProductoElegido } from './recepcion-buscador'
import { RecepcionFamiliaForm } from './recepcion-familia-form'
import { nombreConMedida, pesos, type ProductoDelProveedor, type RecepcionVista, type RenglonVista } from './recepcion-tipos'

const numero = (texto: string) => (texto.trim() === '' ? NaN : Number(texto))

/** Agregar o corregir un renglón de la factura */
function FormularioRenglon({ recepcion, productosProveedor, renglon, onListo }: {
  recepcion: RecepcionVista
  productosProveedor: ProductoDelProveedor[]
  renglon?: RenglonVista
  onListo: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const prod = renglon?.producto
  const [producto, setProducto] = useState<ProductoElegido | null>(prod
    ? { id: prod.id, nombre: prod.nombre, unidad_medida: prod.unidad_medida, marca: prod.marca, codigo: prod.codigo, referencia: renglon?.referencia ?? null, costo: renglon?.costo_anterior ?? null }
    : null)
  const [esNuevo, setEsNuevo] = useState(!!renglon && !renglon.producto_id)
  const [descripcion, setDescripcion] = useState(renglon && !renglon.producto_id ? renglon.descripcion : '')
  const [referencia, setReferencia] = useState(renglon?.referencia ?? '')
  const [cantidad, setCantidad] = useState(renglon ? String(renglon.cantidad_facturada) : '')
  const [costo, setCosto] = useState(renglon ? String(renglon.costo_unitario) : '')
  const [porEmpaque, setPorEmpaque] = useState(false)
  const [empaques, setEmpaques] = useState('')
  const [porEmpaqueUnidades, setPorEmpaqueUnidades] = useState('')
  const [costoEmpaque, setCostoEmpaque] = useState('')
  const [guardando, setGuardando] = useState(false)
  const conMercancia = (renglon?.stock_ingresado ?? 0) > 0
  const prefijo = renglon ? `renglon-${renglon.id}` : 'renglon-nuevo'

  const conversion = porEmpaque ? convertirEmpaque(numero(empaques), numero(porEmpaqueUnidades), numero(costoEmpaque)) : null
  const cantidadFinal = porEmpaque ? conversion?.cantidad ?? NaN : numero(cantidad)
  const costoFinal = porEmpaque ? conversion?.costoUnitario ?? NaN : numero(costo)
  const ivaTexto = recepcion.costos_con_iva ? 'con IVA' : 'sin IVA'

  const elegir = (p: ProductoElegido) => {
    setProducto(p)
    setEsNuevo(false)
    if (p.referencia) setReferencia(p.referencia)
  }

  const guardar = async () => {
    if (!esNuevo && !producto) { toast.error('Busca y elige el producto, o márcalo como producto nuevo'); return }
    if (esNuevo && !descripcion.trim()) { toast.error('Escribe la descripción como viene en la factura'); return }
    if (!Number.isInteger(cantidadFinal) || cantidadFinal <= 0) { toast.error('La cantidad debe ser un número entero mayor que cero'); return }
    if (!(costoFinal >= 0)) { toast.error('Escribe el costo'); return }
    setGuardando(true)
    const { error } = await supabase.rpc('guardar_renglon_recepcion', {
      p_recepcion_id: recepcion.id,
      p_renglon: {
        id: renglon?.id ?? null,
        producto_id: esNuevo ? null : producto?.id ?? null,
        descripcion: esNuevo ? descripcion.trim() : null,
        referencia: referencia.trim() || null,
        cantidad_facturada: cantidadFinal,
        costo_unitario: costoFinal,
      },
    })
    setGuardando(false)
    if (error) { toast.error(error.message); return }
    toast.success(renglon ? 'Renglón actualizado' : 'Renglón agregado')
    if (!renglon) {
      setProducto(null); setDescripcion(''); setReferencia(''); setCantidad(''); setCosto('')
      setEmpaques(''); setPorEmpaqueUnidades(''); setCostoEmpaque(''); setPorEmpaque(false); setEsNuevo(false)
    }
    onListo()
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {!conMercancia && (
        <div className="flex items-center justify-between gap-2">
          <p className={LABEL_CLS}>Producto</p>
          <button type="button" onClick={() => { setEsNuevo(v => !v); setProducto(null) }}
            className="text-xs font-semibold text-brand-blue hover:underline">
            {esNuevo ? 'Buscar en el sistema' : 'No está en el sistema'}
          </button>
        </div>
      )}

      {esNuevo ? (
        <div className="space-y-1">
          <Input id={`${prefijo}-descripcion`} value={descripcion} onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción como viene en la factura" className={`h-11 ${INPUT_CLS}`} />
          <p className="text-xs text-steel-500">Queda pendiente: el administrador crea el producto y lo asocia a este renglón.</p>
        </div>
      ) : producto ? (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-[#1a2430] p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{nombreConMedida(producto)}</p>
            <p className="text-xs text-steel-300">
              {[producto.marca, producto.codigo, producto.costo != null ? `Costo anterior ${pesos(producto.costo)}` : 'Nuevo con este proveedor'].filter(Boolean).join(' · ')}
            </p>
          </div>
          {!conMercancia && (
            <button type="button" onClick={() => setProducto(null)} aria-label="Cambiar producto" className="text-steel-300 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <BuscadorProducto id={`${prefijo}-buscar`} productosProveedor={productosProveedor} onElegir={elegir} />
      )}
      {conMercancia && (
        <p className="text-xs text-steel-500">Su mercancía ya entró al inventario: para cambiar el producto, corrige primero el conteo a 0.</p>
      )}

      <div className="space-y-1">
        <Label htmlFor={`${prefijo}-referencia`} className={LABEL_CLS}>Referencia del proveedor</Label>
        <Input id={`${prefijo}-referencia`} value={referencia} onChange={e => setReferencia(e.target.value)}
          placeholder="Opcional" className={INPUT_CLS} />
      </div>

      <div className="flex items-center gap-2">
        <Switch id={`${prefijo}-empaque`} checked={porEmpaque} onCheckedChange={v => setPorEmpaque(v)} />
        <Label htmlFor={`${prefijo}-empaque`} className="text-sm text-white">Viene por empaque (caja, paquete)</Label>
      </div>

      {porEmpaque ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`${prefijo}-empaques`} className={LABEL_CLS}>Empaques</Label>
              <Input id={`${prefijo}-empaques`} type="number" inputMode="numeric" min={1} step={1} value={empaques} onChange={e => setEmpaques(e.target.value)} className={INPUT_CLS} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${prefijo}-por-empaque`} className={LABEL_CLS}>Unid. c/u</Label>
              <Input id={`${prefijo}-por-empaque`} type="number" inputMode="numeric" min={1} step={1} value={porEmpaqueUnidades} onChange={e => setPorEmpaqueUnidades(e.target.value)} className={INPUT_CLS} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${prefijo}-costo-empaque`} className={LABEL_CLS}>Costo c/u</Label>
              <Input id={`${prefijo}-costo-empaque`} type="number" inputMode="decimal" min={0} step="0.01" value={costoEmpaque} onChange={e => setCostoEmpaque(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
          <p className="text-xs text-steel-300">
            {conversion
              ? <>Son <span className="font-semibold text-white">{conversion.cantidad} unidades a {pesos(conversion.costoUnitario)}</span> c/u ({ivaTexto}).</>
              : 'Escribe cuántos empaques, cuántas unidades trae cada uno y el costo de cada empaque.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor={`${prefijo}-cantidad`} className={LABEL_CLS}>Cantidad facturada</Label>
            <Input id={`${prefijo}-cantidad`} type="number" inputMode="numeric" min={1} step={1} value={cantidad} onChange={e => setCantidad(e.target.value)} className={INPUT_CLS} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${prefijo}-costo`} className={LABEL_CLS}>Costo unitario ({ivaTexto})</Label>
            <Input id={`${prefijo}-costo`} type="number" inputMode="decimal" min={0} step="0.01" value={costo} onChange={e => setCosto(e.target.value)} className={INPUT_CLS} />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" onClick={guardar} disabled={guardando}
          className="h-11 flex-1 bg-brand-yellow font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
          {guardando ? 'Guardando…' : renglon ? 'Guardar renglón' : 'Agregar renglón'}
        </Button>
        {renglon && (
          <Button type="button" variant="outline" onClick={onListo} className="h-11 border-white/10 bg-transparent text-steel-300 hover:bg-white/5">
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}

/** Pestaña "Factura": los renglones transcritos y, para los pendientes, cómo resolverlos */
export function RecepcionRenglones({ recepcion, renglones, productosProveedor, esAdmin, unidades }: {
  recepcion: RecepcionVista
  renglones: RenglonVista[]
  productosProveedor: ProductoDelProveedor[]
  esAdmin: boolean
  unidades: string[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const abierta = recepcion.estado === 'abierta'
  const [editando, setEditando] = useState<string | null>(null)
  const [accion, setAccion] = useState<{ renglon: string; tipo: 'asociar' | 'familia' } | null>(null)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const pendientes = renglones.filter(r => !r.producto_id).length

  const quitar = async (r: RenglonVista) => {
    if (!window.confirm(`¿Quitar "${r.descripcion}" de la recepción?`)) return
    setTrabajando(r.id)
    const { error } = await supabase.rpc('quitar_renglon_recepcion', { p_renglon_id: r.id })
    setTrabajando(null)
    if (error) { toast.error(error.message); return }
    toast.success('Renglón quitado')
    router.refresh()
  }

  const asociar = async (r: RenglonVista, p: ProductoElegido) => {
    setTrabajando(r.id)
    const { error } = await supabase.rpc('guardar_renglon_recepcion', {
      p_recepcion_id: recepcion.id,
      p_renglon: {
        id: r.id, producto_id: p.id, referencia: r.referencia, cantidad_facturada: r.cantidad_facturada, costo_unitario: r.costo_unitario,
      },
    })
    setTrabajando(null)
    if (error) { toast.error(error.message); return }
    toast.success(r.cantidad_contada != null ? 'Producto asociado: lo contado entró al inventario' : 'Producto asociado')
    setAccion(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {abierta && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h3 className="flex items-center gap-2 font-display font-bold text-white"><Plus className="h-4 w-4 text-brand-yellow" />Agregar renglón</h3>
          <FormularioRenglon recepcion={recepcion} productosProveedor={productosProveedor} onListo={() => {}} />
        </div>
      )}

      {pendientes > 0 && (
        <p className="rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-3 text-sm text-brand-yellow">
          {pendientes === 1 ? 'Hay 1 producto pendiente: no está en el sistema.' : `Hay ${pendientes} productos pendientes: no están en el sistema.`}{' '}
          {esAdmin ? 'Créalos o asócialos para que su mercancía entre al inventario.' : 'Si ya existen, asócialos; si no, el administrador los crea.'}
        </p>
      )}

      {renglones.length === 0 ? (
        <p className="text-sm text-steel-500">Todavía no hay renglones. Agrega los productos de la factura.</p>
      ) : (
        <ul className="space-y-2">
          {renglones.map(r => {
            const pendiente = !r.producto_id
            const nombre = r.producto ? nombreConMedida(r.producto) : r.descripcion
            return (
              <li key={r.id} className={`space-y-3 rounded-2xl border p-3 ${pendiente ? 'border-brand-yellow/30 bg-brand-yellow/5' : 'border-white/10 bg-[#111820]'}`}>
                {editando === r.id ? (
                  <FormularioRenglon recepcion={recepcion} productosProveedor={productosProveedor} renglon={r} onListo={() => setEditando(null)} />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{nombre}</p>
                        {pendiente && <span className="rounded-full border border-brand-yellow/40 px-2 py-0.5 text-[10px] font-semibold text-brand-yellow">Pendiente</span>}
                        {r.producto && !r.producto.activo && <span className="rounded-full border border-brand-blue/40 px-2 py-0.5 text-[10px] font-semibold text-brand-blue">Nuevo</span>}
                      </div>
                      <p className="text-xs text-steel-300">
                        {[r.producto?.marca, r.referencia ? `Ref. ${r.referencia}` : null].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-xs text-steel-300">
                        {r.cantidad_facturada} × {pesos(r.costo_unitario)} = <span className="text-white">{pesos(r.cantidad_facturada * r.costo_unitario)}</span>
                        {r.cantidad_contada != null ? ' · Contado' : ' · Sin contar'}
                      </p>
                    </div>
                    {abierta && (
                      <div className="flex shrink-0 gap-1">
                        <button type="button" onClick={() => setEditando(r.id)} aria-label="Corregir renglón"
                          className="rounded-lg p-2 text-steel-300 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>
                        {r.stock_ingresado === 0 && (
                          <button type="button" onClick={() => quitar(r)} disabled={trabajando === r.id} aria-label="Quitar renglón"
                            className="rounded-lg p-2 text-steel-300 hover:bg-white/5 hover:text-brand-red"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {abierta && pendiente && editando !== r.id && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setAccion(a => a?.renglon === r.id && a.tipo === 'asociar' ? null : { renglon: r.id, tipo: 'asociar' })}
                        className="border-white/10 bg-transparent text-white hover:bg-white/5"><Link2 className="mr-1 h-4 w-4" />Ya existe: asociar</Button>
                      {esAdmin && (
                        <>
                          <Link href={`/dashboard/recepcion/${recepcion.id}/nuevo-producto?renglon=${r.id}`}
                            className="inline-flex items-center rounded-lg border border-brand-yellow/60 px-3 py-1.5 text-sm font-semibold text-brand-yellow hover:bg-brand-yellow/10">
                            <PackagePlus className="mr-1 h-4 w-4" />Crear producto
                          </Link>
                          <Button type="button" variant="outline" size="sm" onClick={() => setAccion(a => a?.renglon === r.id && a.tipo === 'familia' ? null : { renglon: r.id, tipo: 'familia' })}
                            className="border-brand-blue/50 bg-transparent text-brand-blue hover:bg-brand-blue/10"><Layers className="mr-1 h-4 w-4" />Agregar a una familia o grupo</Button>
                        </>
                      )}
                    </div>
                    {accion?.renglon === r.id && accion.tipo === 'asociar' && (
                      <BuscadorProducto id={`asociar-${r.id}`} productosProveedor={productosProveedor} autoFocus
                        onElegir={p => asociar(r, p)} placeholder="Busca el producto que corresponde" />
                    )}
                    {accion?.renglon === r.id && accion.tipo === 'familia' && esAdmin && (
                      <RecepcionFamiliaForm renglonId={r.id} descripcion={r.descripcion} productosProveedor={productosProveedor}
                        unidades={unidades} onListo={() => setAccion(null)} />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
