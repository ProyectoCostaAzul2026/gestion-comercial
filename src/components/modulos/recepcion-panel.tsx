'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { ETIQUETA_ESTADO_RECEPCION } from '@/lib/recepcion'
import { RecepcionRenglones } from './recepcion-renglones'
import { RecepcionConteo } from './recepcion-conteo'
import { RecepcionPrecios } from './recepcion-precios'
import { RecepcionCierre } from './recepcion-cierre'
import { CLASE_ESTADO_RECEPCION, type DatosAdminRecepcion, type ProductoDelProveedor, type RecepcionVista, type RenglonVista } from './recepcion-tipos'

type Pestana = 'factura' | 'conteo' | 'precios' | 'cierre'

/** Detalle de una recepción: Factura (renglones), Precios (administrador, antes del conteo), Conteo y Cierre (administrador) */
export function RecepcionPanel({ recepcion, renglones, productosProveedor, esAdmin, datosAdmin }: {
  recepcion: RecepcionVista
  renglones: RenglonVista[]
  productosProveedor: ProductoDelProveedor[]
  esAdmin: boolean
  datosAdmin: DatosAdminRecepcion | null
}) {
  const router = useRouter()
  const contados = renglones.filter(r => r.cantidad_contada != null).length
  // Flujo: transcribir → aprobar precios (administrador) → contar → cerrar
  const faltaPrecio = renglones.some(r => r.producto_id && r.precio_aprobado == null)
  const inicial: Pestana = esAdmin && recepcion.estado !== 'abierta' ? 'cierre'
    : renglones.length === 0 ? 'factura'
    : esAdmin && datosAdmin && faltaPrecio ? 'precios' : 'conteo'
  const [pestana, setPestana] = useState<Pestana>(inicial)
  const [actualizando, setActualizando] = useState(false)

  const pestanas: { id: Pestana; etiqueta: string }[] = [
    { id: 'factura', etiqueta: `Factura (${renglones.length})` },
    ...(esAdmin && datosAdmin ? [{ id: 'precios' as const, etiqueta: faltaPrecio ? 'Precios •' : 'Precios' }] : []),
    { id: 'conteo', etiqueta: `Conteo (${contados}/${renglones.length})` },
    ...(esAdmin && datosAdmin ? [{ id: 'cierre' as const, etiqueta: 'Cierre' }] : []),
  ]

  const actualizar = () => {
    setActualizando(true)
    router.refresh()
    setTimeout(() => setActualizando(false), 800)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold text-white">{recepcion.proveedor_nombre}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CLASE_ESTADO_RECEPCION[recepcion.estado]}`}>
              {ETIQUETA_ESTADO_RECEPCION[recepcion.estado]}
            </span>
          </div>
          <p className="text-xs text-steel-300">
            {recepcion.numero_factura ? `Factura N° ${recepcion.numero_factura}` : 'Factura sin número'} · {recepcion.fecha_factura}
            {' '}· Costos {recepcion.costos_con_iva ? 'con IVA' : 'sin IVA'}
          </p>
        </div>
        <button type="button" onClick={actualizar} aria-label="Actualizar"
          className="shrink-0 rounded-xl border border-white/10 p-2 text-steel-300 hover:bg-white/5 hover:text-white">
          <RefreshCw className={`h-4 w-4 ${actualizando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#111820] p-1" role="tablist">
        {pestanas.map(p => (
          <button key={p.id} type="button" role="tab" aria-selected={pestana === p.id} onClick={() => setPestana(p.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${pestana === p.id ? 'bg-brand-yellow text-steel-900' : 'text-steel-300 hover:bg-white/5 hover:text-white'}`}>
            {p.etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'factura' && (
        <RecepcionRenglones recepcion={recepcion} renglones={renglones} productosProveedor={productosProveedor}
          esAdmin={esAdmin} unidades={datosAdmin?.unidades ?? []} />
      )}
      {pestana === 'conteo' && <RecepcionConteo recepcion={recepcion} renglones={renglones} esAdmin={esAdmin} />}
      {pestana === 'precios' && datosAdmin && (
        <RecepcionPrecios recepcion={recepcion} renglones={renglones} margenDefault={datosAdmin.margenDefault} />
      )}
      {pestana === 'cierre' && datosAdmin && (
        <RecepcionCierre recepcion={recepcion} renglones={renglones} totalFactura={datosAdmin.totalFactura} estadoPago={datosAdmin.estadoPago} />
      )}
    </div>
  )
}
