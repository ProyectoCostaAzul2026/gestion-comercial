'use client'

import { useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Trash2, Printer, MessageCircle, Package } from 'lucide-react'

interface ProductoSearch {
  id: string; nombre: string; codigo: string | null
  precio_venta: number; stock_almacen: number; tiene_iva: boolean
  iva_incluido: boolean; porcentaje_iva: number
}

interface ServicioSearch { id: string; nombre: string; descripcion: string | null; precio: number }

interface ItemCotizacion {
  key: string; producto_id: string; nombre: string
  precio_unitario: number; cantidad: number
  descuento_habilitado: boolean; descuento_porcentaje: number
  agotado: boolean
}

interface ServicioCotizacion {
  key: string; servicio_id: string | null; nombre_servicio: string
  precio_aplicado: number; descuento_habilitado: boolean; descuento_porcentaje: number
}

function redondear100(v: number) { return v % 100 === 0 ? v : Math.ceil(v / 100) * 100 }
function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-CO')}` }
function fmtFecha(f: string) {
  const [y, m, d] = f.split('-')
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d}/${meses[parseInt(m)-1]}/${y}`
}

const INPUT_CLS = 'border-white/10 bg-[#1a2430] text-white placeholder:text-steel-500 focus:border-brand-yellow/60'
const LABEL_CLS = 'text-[10px] font-bold uppercase tracking-widest text-steel-300'

export function CotizacionForm({ catalogo, config, maxDescuentoPct = 0.10 }: {
  catalogo: ServicioSearch[]
  config: any
  maxDescuentoPct?: number
}) {
  const supabase = createClient()
  const router = useRouter()

  const [nombreCotizante, setNombreCotizante] = useState('')
  const [telefonoCotizante, setTelefonoCotizante] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [validezDias, setValidezDias] = useState(30)

  const [carrito, setCarrito] = useState<ItemCotizacion[]>([])
  const [serviciosCarrito, setServiciosCarrito] = useState<ServicioCotizacion[]>([])
  const [queryProducto, setQueryProducto] = useState('')
  const [resultadosProducto, setResultadosProducto] = useState<ProductoSearch[]>([])

  const [descuentoHabilitado, setDescuentoHabilitado] = useState(false)
  const [descuentoTotalPct, setDescuentoTotalPct] = useState(5)
  const [descuentoTotalActivo, setDescuentoTotalActivo] = useState(false)
  const [editandoTotalManual, setEditandoTotalManual] = useState(false)
  const [totalManual, setTotalManual] = useState('')

  const buscarProductos = useCallback(async (q: string) => {
    if (!q.trim()) { setResultadosProducto([]); return }
    const { data } = await supabase.rpc('buscar_productos', { p_query: q.trim() })
    setResultadosProducto((data as any) ?? [])
  }, [supabase])

  const agregarProducto = (p: ProductoSearch) => {
    setResultadosProducto([]); setQueryProducto('')
    const idx = carrito.findIndex(i => i.producto_id === p.id)
    if (idx >= 0) {
      setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + 1 } : it))
      return
    }
    setCarrito(prev => [...prev, {
      key: `${p.id}-${Date.now()}`, producto_id: p.id, nombre: p.nombre,
      precio_unitario: p.precio_venta, cantidad: 1,
      descuento_habilitado: false, descuento_porcentaje: 0,
      agotado: p.stock_almacen <= 0,
    }])
  }

  const agregarServicio = (s: ServicioSearch) => {
    setServiciosCarrito(prev => [...prev, {
      key: `${s.id}-${Date.now()}`, servicio_id: s.id, nombre_servicio: s.nombre,
      precio_aplicado: s.precio, descuento_habilitado: false, descuento_porcentaje: 0,
    }])
  }

  // Cálculos
  const subtotalBruto = useMemo(() =>
    carrito.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0) +
    serviciosCarrito.reduce((s, sv) => s + sv.precio_aplicado, 0),
    [carrito, serviciosCarrito])

  const descuentosPorItem = useMemo(() =>
    carrito.reduce((s, i) => i.descuento_habilitado ? s + i.precio_unitario * i.cantidad * i.descuento_porcentaje / 100 : s, 0) +
    serviciosCarrito.reduce((s, sv) => sv.descuento_habilitado ? s + sv.precio_aplicado * sv.descuento_porcentaje / 100 : s, 0),
    [carrito, serviciosCarrito])

  const subtotalConItemDesc = subtotalBruto - descuentosPorItem

  const descuentoTotal = descuentoHabilitado && descuentoTotalActivo
    ? subtotalConItemDesc * descuentoTotalPct / 100 : 0

  const totalAntesRedondeo = editandoTotalManual && totalManual !== ''
    ? parseFloat(totalManual) || 0
    : subtotalConItemDesc - descuentoTotal

  const totalRedondeado = redondear100(totalAntesRedondeo)
  const descuentoAcumuladoPct = subtotalBruto > 0 ? (subtotalBruto - totalAntesRedondeo) / subtotalBruto : 0
  const minPagoPermitido = redondear100(subtotalBruto * (1 - maxDescuentoPct))

  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  const fechaVencimiento = (() => {
    const d = new Date(fechaHoy + 'T12:00:00')
    d.setDate(d.getDate() + validezDias)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  })()

  // Construir HTML de la cotización
  const buildCotizacionHTML = (formato: 'pos' | 'carta') => {
    const lineasItems = carrito.map(i => {
      const subtotal = i.precio_unitario * i.cantidad * (1 - (i.descuento_habilitado ? i.descuento_porcentaje / 100 : 0))
      return formato === 'carta'
        ? `<tr><td>${i.nombre}${i.agotado ? ' <em>(agotado)</em>' : ''}</td><td>${i.cantidad}</td><td>${fmt(i.precio_unitario)}</td><td>${i.descuento_habilitado ? `${i.descuento_porcentaje}%` : '—'}</td><td><strong>${fmt(subtotal)}</strong></td></tr>`
        : `<div class="item-name b">${i.nombre}${i.agotado ? ' (agotado)' : ''}</div><div class="row item-detail"><span>${i.cantidad} × ${fmt(i.precio_unitario)}${i.descuento_habilitado ? ` (-${i.descuento_porcentaje}%)` : ''}</span><span>${fmt(subtotal)}</span></div>`
    }).join('')

    const lineasServicios = serviciosCarrito.map(s => {
      const sub = s.precio_aplicado * (1 - (s.descuento_habilitado ? s.descuento_porcentaje / 100 : 0))
      return formato === 'carta'
        ? `<tr><td>${s.nombre_servicio} <em>(servicio)</em></td><td>1</td><td>${fmt(s.precio_aplicado)}</td><td>${s.descuento_habilitado ? `${s.descuento_porcentaje}%` : '—'}</td><td><strong>${fmt(sub)}</strong></td></tr>`
        : `<div class="row"><span>${s.nombre_servicio}</span><span>${fmt(sub)}</span></div>`
    }).join('')

    if (formato === 'pos') {
      return `
        <div class="c b" style="font-size:13px">${config?.nombre ?? 'Mi Negocio'}</div>
        ${config?.nit ? `<div class="c s">NIT: ${config.nit}</div>` : ''}
        ${config?.direccion ? `<div class="c s">${config.direccion}</div>` : ''}
        <hr class="hr"/>
        <div class="c b">COTIZACIÓN</div>
        <div class="c s">Fecha: ${fmtFecha(fechaHoy)}</div>
        <div class="c s">Válida hasta: ${fmtFecha(fechaVencimiento)}</div>
        <hr class="hr"/>
        ${nombreCotizante ? `<div>Para: <b>${nombreCotizante}</b></div>` : ''}
        ${telefonoCotizante ? `<div class="s">Tel: ${telefonoCotizante}</div>` : ''}
        <hr class="hr"/>
        ${lineasItems}
        ${lineasServicios}
        <hr class="hr"/>
        ${subtotalBruto !== totalRedondeado ? `<div class="row s"><span>Subtotal</span><span>${fmt(subtotalBruto)}</span></div>` : ''}
        ${descuentosPorItem + descuentoTotal > 0 ? `<div class="row s"><span>Descuentos</span><span>-${fmt(descuentosPorItem + descuentoTotal)}</span></div>` : ''}
        <hr class="hr"/>
        <div class="row b total"><span>TOTAL</span><span>${fmt(totalRedondeado)}</span></div>
        ${observaciones ? `<hr class="hr"/><div class="s">Obs: ${observaciones}</div>` : ''}
        ${config?.mensaje_pie ? `<hr class="hr"/><div class="pie">${config.mensaje_pie}</div>` : ''}
      `
    }

    return `
      <div class="header">
        ${config?.logo_url ? `<img src="${config.logo_url}" class="logo" alt="logo"/>` : '<div></div>'}
        <div class="business-info">
          <div class="business-name">${config?.nombre ?? 'Mi Negocio'}</div>
          ${config?.regimen ? `<div style="font-size:11px;color:#64748b">${config.regimen}</div>` : ''}
          ${config?.nit ? `<div style="font-size:11px">NIT: ${config.nit}</div>` : ''}
          ${config?.direccion ? `<div style="font-size:11px">${config.direccion}</div>` : ''}
          ${config?.telefono ? `<div style="font-size:11px">Tel: ${config.telefono}</div>` : ''}
        </div>
      </div>
      <hr class="hr"/>
      <div class="title">COTIZACIÓN</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Fecha</div><div>${fmtFecha(fechaHoy)}</div></div>
        <div class="info-item"><div class="info-label">Válida hasta</div><div>${fmtFecha(fechaVencimiento)} (${validezDias} días)</div></div>
        ${nombreCotizante ? `<div class="info-item"><div class="info-label">Para</div><div style="font-weight:600">${nombreCotizante}</div></div>` : ''}
        ${telefonoCotizante ? `<div class="info-item"><div class="info-label">Teléfono</div><div>${telefonoCotizante}</div></div>` : ''}
      </div>
      <hr class="hr-light"/>
      <table>
        <thead><tr><th>Producto / Servicio</th><th>Cant.</th><th>Precio unit.</th><th>Descuento</th><th>Subtotal</th></tr></thead>
        <tbody>${lineasItems}${lineasServicios}</tbody>
      </table>
      <div class="totals">
        ${subtotalBruto !== totalRedondeado ? `<div class="totals-row"><span style="color:#64748b">Subtotal</span><span>${fmt(subtotalBruto)}</span></div>` : ''}
        ${descuentosPorItem + descuentoTotal > 0 ? `<div class="totals-row green"><span>Descuentos</span><span>-${fmt(descuentosPorItem + descuentoTotal)}</span></div>` : ''}
        <div class="totals-row totals-total"><span>TOTAL COTIZADO</span><span>${fmt(totalRedondeado)}</span></div>
      </div>
      ${observaciones ? `<div style="margin-top:12px;font-size:11px;color:#475569;background:#f8fafc;padding:8px;border-radius:4px">Observaciones: ${observaciones}</div>` : ''}
      <div class="footer">${config?.mensaje_pie ?? ''}</div>
    `
  }

  const posCSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; padding: 4mm; }
    .c { text-align: center; } .b { font-weight: bold; } .s { font-size: 9px; }
    .hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 1px 0; }
    .item-name { margin-top: 4px; } .item-detail { padding-left: 8px; }
    .total { font-size: 14px; } .pie { text-align: center; font-size: 9px; margin-top: 8px; }
  `

  const cartaCSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; max-width: 700px; margin: 30px auto; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .logo { max-height: 70px; max-width: 160px; object-fit: contain; }
    .business-info { text-align: right; } .business-name { font-size: 18px; font-weight: bold; color: #0f172a; }
    .hr { border: none; border-top: 2px solid #0f172a; margin: 16px 0; }
    .hr-light { border: none; border-top: 1px solid #e2e8f0; margin: 10px 0; }
    .title { font-size: 15px; font-weight: bold; text-align: center; letter-spacing: 2px; margin: 16px 0; color: #0f172a; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
    .info-item { font-size: 11px; } .info-label { color: #64748b; font-size: 10px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
    th:last-child { text-align: right; } td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    td:last-child { text-align: right; } tr:nth-child(even) { background: #f8fafc; }
    .totals { margin-left: auto; width: 260px; margin-top: 12px; }
    .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
    .totals-total { font-size: 15px; font-weight: bold; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 4px; }
    .green { color: #15803d; } .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
  `

  const handleImprimir = (formato: 'pos' | 'carta') => {
    if (carrito.length === 0 && serviciosCarrito.length === 0) { toast.error('Agrega al menos un producto o servicio'); return }
    const ventana = window.open('', '_blank', 'width=900,height=700')
    if (!ventana) return
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Cotización</title><style>${formato === 'pos' ? posCSS : cartaCSS}</style></head><body>${buildCotizacionHTML(formato)}</body></html>`)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => { ventana.print(); ventana.close() }, 400)
  }

  const handleWhatsApp = () => {
    if (!telefonoCotizante) { toast.error('Ingresa el teléfono del cliente'); return }
    if (carrito.length === 0 && serviciosCarrito.length === 0) { toast.error('Agrega al menos un producto o servicio'); return }
    const tel = telefonoCotizante.replace(/\D/g, '')
    const lineas = [
      `📋 *COTIZACIÓN — ${config?.nombre ?? 'Mi Negocio'}*`,
      `📅 Fecha: ${fmtFecha(fechaHoy)} · Válida hasta: ${fmtFecha(fechaVencimiento)}`,
      nombreCotizante ? `👤 Para: ${nombreCotizante}` : '',
      ``,
      `*Productos y servicios:*`,
      ...carrito.map(i => {
        const sub = i.precio_unitario * i.cantidad * (1 - (i.descuento_habilitado ? i.descuento_porcentaje / 100 : 0))
        return `  • ${i.nombre}${i.agotado ? ' _(agotado)_' : ''} × ${i.cantidad} = ${fmt(sub)}${i.descuento_habilitado ? ` (-${i.descuento_porcentaje}%)` : ''}`
      }),
      ...serviciosCarrito.map(s => {
        const sub = s.precio_aplicado * (1 - (s.descuento_habilitado ? s.descuento_porcentaje / 100 : 0))
        return `  • ${s.nombre_servicio} (servicio) = ${fmt(sub)}`
      }),
      ``,
      descuentosPorItem + descuentoTotal > 0 ? `💚 Descuentos: -${fmt(descuentosPorItem + descuentoTotal)}` : '',
      `💰 *TOTAL COTIZADO: ${fmt(totalRedondeado)}*`,
      observaciones ? `\n📝 ${observaciones}` : '',
      config?.mensaje_pie ? `\n_${config.mensaje_pie}_` : '',
    ].filter(Boolean).join('\n')
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(lineas)}`, '_blank')
  }

  const validarDesc = (v: number) => Math.min(Math.max(0, v), 10)

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-5">

        {/* Header diagonal */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111820] px-4 pt-5 pb-4">
          <h1 className="font-display text-3xl font-bold text-white">Nueva <span className="text-brand-yellow">Cotización</span></h1>
          <p className="mt-0.5 text-xs text-steel-300">Productos, servicios y total para el cliente</p>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-28 overflow-hidden">
            <div className="absolute inset-y-0 right-0 w-20 -skew-x-12 translate-x-8 bg-brand-yellow/80" />
            <div className="absolute inset-y-0 right-0 w-7 -skew-x-12 translate-x-1 bg-brand-blue" />
          </div>
        </div>

        {/* Datos del cotizante */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
            <span className="h-5 w-1 rounded-full bg-brand-yellow" />Datos del cliente
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className={LABEL_CLS}>Nombre</Label>
              <Input value={nombreCotizante} className={INPUT_CLS} onChange={e => setNombreCotizante(e.target.value)} placeholder="Nombre del cliente…" />
            </div>
            <div className="space-y-1">
              <Label className={LABEL_CLS}>Celular (WhatsApp)</Label>
              <Input value={telefonoCotizante} className={INPUT_CLS} onChange={e => setTelefonoCotizante(e.target.value)} placeholder="573101234567" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className={LABEL_CLS}>Validez (días)</Label>
            <Input type="number" min={1} value={validezDias} className={`w-24 ${INPUT_CLS}`} onChange={e => setValidezDias(parseInt(e.target.value) || 30)} />
            <p className="text-xs text-steel-500">Válida hasta: {fmtFecha(fechaVencimiento)}</p>
          </div>
        </section>

        {/* Productos */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
            <span className="h-5 w-1 rounded-full bg-brand-yellow" />Productos
          </h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-500" />
            <Input value={queryProducto}
              onChange={async e => { setQueryProducto(e.target.value); await buscarProductos(e.target.value) }}
              placeholder="Buscar producto…" className={`h-12 pl-9 ${INPUT_CLS}`} />
            {resultadosProducto.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#111820] shadow-xl">
                {resultadosProducto.map((p: any) => (
                  <button key={p.id} type="button"
                    className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-white/5"
                    onClick={() => agregarProducto(p)}>
                    <span className="font-medium text-white">{p.nombre}{p.stock_almacen <= 0 ? <span className="ml-2 text-xs text-brand-yellow">(agotado)</span> : null}</span>
                    <span className="text-xs text-steel-300">{fmt(p.precio_venta)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {carrito.map((item, idx) => (
            <div key={item.key} className="space-y-2 rounded-xl border border-white/10 bg-[#1a2430] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{item.nombre}</p>
                  {item.agotado && <p className="text-xs text-brand-yellow">⚠ Producto agotado</p>}
                </div>
                <button type="button" onClick={() => setCarrito(prev => prev.filter((_, i) => i !== idx))}
                  className="text-steel-300 hover:text-brand-red">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Cantidad</label>
                  <Input type="number" min={1} value={item.cantidad} className="border-white/10 bg-[#111820] text-white"
                    onChange={e => setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: parseInt(e.target.value) || 1 } : it))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Precio</label>
                  <Input type="number" value={item.precio_unitario} className="border-white/10 bg-[#111820] text-white"
                    onChange={e => setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, precio_unitario: parseFloat(e.target.value) || 0 } : it))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-steel-300">Subtotal</label>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {fmt(item.precio_unitario * item.cantidad * (1 - (item.descuento_habilitado ? item.descuento_porcentaje / 100 : 0)))}
                  </p>
                </div>
              </div>
              {descuentoHabilitado && (
                <div className="flex items-center gap-2 border-t border-white/8 pt-2">
                  <Switch checked={item.descuento_habilitado}
                    onCheckedChange={v => setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, descuento_habilitado: v, descuento_porcentaje: v ? 5 : 0 } : it))} />
                  <span className="text-xs text-steel-300">Descuento</span>
                  {item.descuento_habilitado && (
                    <div className="ml-auto flex items-center gap-1">
                      <Input type="number" min={0} max={10} className="h-7 w-16 border-white/10 bg-[#111820] text-xs text-white" value={item.descuento_porcentaje}
                        onChange={e => setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, descuento_porcentaje: validarDesc(parseFloat(e.target.value) || 0) } : it))} />
                      <span className="text-xs text-steel-500">%</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {carrito.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Package className="size-12 text-brand-yellow/50" />
              <p className="text-sm text-steel-300">Busca un producto para agregarlo</p>
            </div>
          )}
        </section>

        {/* Servicios */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
            <span className="h-5 w-1 rounded-full bg-brand-yellow" />Servicios
          </h2>
          {catalogo.length > 0 && (
            <Select items={catalogo.map(s => ({ value: s.id, label: `${s.nombre} — ${fmt(s.precio)}` }))}
              onValueChange={v => { if (!v) return; const sv = catalogo.find(s => s.id === v); if (sv) agregarServicio(sv) }} value="">
              <SelectTrigger className="h-12 border-white/10 bg-[#1a2430] text-white"><SelectValue placeholder="Selecciona un servicio…" /></SelectTrigger>
              <SelectContent>
                {catalogo.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre} — {fmt(s.precio)}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {serviciosCarrito.map((s, idx) => (
            <div key={s.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1a2430] px-3 py-2">
              <span className="text-sm font-medium text-white">{s.nombre_servicio}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{fmt(s.precio_aplicado)}</span>
                <button type="button" onClick={() => setServiciosCarrito(prev => prev.filter((_, i) => i !== idx))}
                  className="text-steel-300 hover:text-brand-red">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Descuentos */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
              <span className="h-5 w-1 rounded-full bg-brand-yellow" />Descuentos
            </h2>
            <div className="flex items-center gap-2">
              <Switch checked={descuentoHabilitado} onCheckedChange={v => {
                setDescuentoHabilitado(v)
                if (!v) { setDescuentoTotalActivo(false); setEditandoTotalManual(false); setTotalManual('') }
              }} />
              <span className={`text-sm font-semibold ${descuentoHabilitado ? 'text-brand-yellow' : 'text-steel-300'}`}>{descuentoHabilitado ? 'Habilitado' : 'Deshabilitado'}</span>
            </div>
          </div>
          {descuentoHabilitado && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1a2430] p-3">
                <Switch checked={descuentoTotalActivo} onCheckedChange={v => { setDescuentoTotalActivo(v); if (v) setEditandoTotalManual(false) }} />
                <span className="text-sm text-white">Descuento sobre el total</span>
                {descuentoTotalActivo && (
                  <div className="ml-auto flex items-center gap-1">
                    <Input type="number" min={0} max={10} className="h-7 w-16 border-white/10 bg-[#111820] text-xs text-white" value={descuentoTotalPct}
                      onChange={e => setDescuentoTotalPct(validarDesc(parseFloat(e.target.value) || 0))} />
                    <span className="text-xs text-steel-500">%</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1a2430] p-3">
                <Switch checked={editandoTotalManual} onCheckedChange={v => {
                  setEditandoTotalManual(v)
                  if (v) { setDescuentoTotalActivo(false); setTotalManual(String(totalRedondeado)) }
                  else setTotalManual('')
                }} />
                <span className="text-sm text-white">Editar total manualmente</span>
                {editandoTotalManual && (
                  <div className="ml-auto flex items-center gap-1">
                    <span className="text-xs text-steel-300">$</span>
                    <Input type="number" className="h-7 w-32 border-white/10 bg-[#111820] text-xs text-white" value={totalManual}
                      onChange={e => setTotalManual(e.target.value)}
                      onBlur={() => {
                        const val = parseFloat(totalManual) || 0
                        if (val < minPagoPermitido) { toast.error(`Mínimo: ${fmt(minPagoPermitido)}`); setTotalManual(String(minPagoPermitido)) }
                      }} />
                  </div>
                )}
              </div>
              <div className="flex justify-between rounded-xl border border-white/10 bg-[#1a2430] px-3 py-2 text-xs">
                <span className="text-steel-300">Descuento acumulado: <strong className={descuentoAcumuladoPct > maxDescuentoPct ? 'text-brand-red' : 'text-white'}>{(descuentoAcumuladoPct * 100).toFixed(1)}%</strong> / {(maxDescuentoPct * 100).toFixed(0)}%</span>
                <span className="text-steel-300">Mín: <strong className="text-white">{fmt(minPagoPermitido)}</strong></span>
              </div>
            </div>
          )}
        </section>

        {/* Observaciones */}
        <section className="space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
            <span className="h-5 w-1 rounded-full bg-brand-yellow" />Observaciones
          </h2>
          <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Condiciones, notas especiales…" className={INPUT_CLS} />
        </section>

        {/* Botones */}
        <div className="flex flex-wrap gap-3 pb-8">
          <Button type="button" variant="outline" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() => handleImprimir('pos')}>
            <Printer className="mr-2 h-4 w-4" />POS 80mm
          </Button>
          <Button type="button" variant="outline" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() => handleImprimir('carta')}>
            <Printer className="mr-2 h-4 w-4" />Carta A4
          </Button>
          <Button type="button" variant="outline" className="border-emerald-500/40 bg-transparent font-semibold text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-400" onClick={handleWhatsApp}>
            <MessageCircle className="mr-2 h-4 w-4" />Enviar WhatsApp
          </Button>
          <Button type="button" variant="outline" className="border-white/10 bg-transparent text-steel-300 hover:bg-white/5 hover:text-white" onClick={() => router.push('/dashboard/ventas')}>
            Cancelar
          </Button>
        </div>
      </div>

      {/* Resumen sticky */}
      <div className="lg:w-72 lg:shrink-0">
        <div className="sticky top-4 space-y-3 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-brand-yellow">
            <span className="h-5 w-1 rounded-full bg-brand-yellow" />Resumen
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-steel-300">Subtotal bruto</dt>
              <dd className="text-white">{fmt(subtotalBruto)}</dd>
            </div>
            {descuentosPorItem > 0 && (
              <div className="flex justify-between text-emerald-400">
                <dt>Desc. por ítem</dt>
                <dd>-{fmt(descuentosPorItem)}</dd>
              </div>
            )}
            {descuentoTotal > 0 && (
              <div className="flex justify-between text-emerald-400">
                <dt>Desc. total ({descuentoTotalPct}%)</dt>
                <dd>-{fmt(descuentoTotal)}</dd>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-[#1a2430] px-3 py-2.5">
              <dt className="text-sm font-medium text-white">Total cotizado</dt>
              <dd className="font-display text-lg font-bold text-brand-yellow">{fmt(totalRedondeado)}</dd>
            </div>
          </dl>
          {nombreCotizante && <p className="text-xs text-steel-300">Para: <strong className="text-white">{nombreCotizante}</strong></p>}
          <p className="text-xs text-steel-500">Válida hasta: {fmtFecha(fechaVencimiento)}</p>
        </div>
      </div>
    </div>
  )
}