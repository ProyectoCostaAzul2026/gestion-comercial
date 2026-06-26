'use client'

import { useRef } from 'react'
import { Printer, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata',
  tarjeta: 'Tarjeta', mixto: 'Mixto', credito: 'Crédito',
}

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-CO')}` }
function fmtFecha(fecha: string) {
  const [y, m, d] = fecha.split('-')
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d}/${meses[parseInt(m)-1]}/${y}`
}

interface ReciboViewProps {
  venta: {
    id: string; numero_ticket: number; fecha: string; hora: string
    total: number; subtotal: number; total_descuentos: number; total_iva: number
    tipo_pago: string; observaciones: string | null
    clientes: { nombre: string; telefono: string | null; nit_cc: string | null } | null
    empleado: { nombre_completo: string } | null
    factura_electronica?: boolean
  }
  items: {
    id: string; nombre_producto: string; precio_unitario: number; cantidad: number
    descuento_linea: number; subtotal_linea: number
    es_fraccionado: boolean; cantidad_fraccion: number | null
  }[]
  servicios: { id: string; nombre_servicio: string; precio_aplicado: number }[]
  pagos: { id: string; metodo: string; monto: number }[]
  config: {
    nombre: string; nit: string | null; direccion: string | null
    telefono: string | null; email: string | null; ciudad: string | null
    regimen: string | null; mensaje_pie: string | null
    logo_url?: string | null; whatsapp_negocio?: string | null
  } | null
}

export function ReciboView({ venta, items, servicios, pagos, config }: ReciboViewProps) {
  const cliente = venta.clientes
  const hora = venta.hora?.slice(0, 5) ?? ''
  const fecha = fmtFecha(venta.fecha)

  const posCSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 11px; width: 72mm; padding: 4mm; }
    .c { text-align: center; }
    .b { font-weight: bold; }
    .s { font-size: 9px; }
    .hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; align-items: baseline; margin: 1px 0; }
    .item-name { margin-top: 4px; }
    .item-detail { padding-left: 8px; }
    .total { font-size: 14px; font-weight: bold; }
    .green { color: #1a7a1a; }
    .pie { text-align: center; font-size: 9px; margin-top: 8px; }
  `

  const cartaCSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; max-width: 700px; margin: 30px auto; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .logo { max-height: 70px; max-width: 160px; object-fit: contain; }
    .business-info { text-align: right; }
    .business-name { font-size: 18px; font-weight: bold; color: #0f172a; }
    .hr { border: none; border-top: 2px solid #0f172a; margin: 16px 0; }
    .hr-light { border: none; border-top: 1px solid #e2e8f0; margin: 10px 0; }
    .title { font-size: 15px; font-weight: bold; text-align: center; letter-spacing: 2px; margin: 16px 0; color: #0f172a; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
    .info-item { font-size: 11px; }
    .info-label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
    th:last-child { text-align: right; }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    td:last-child { text-align: right; }
    tr:nth-child(even) { background: #f8fafc; }
    .totals { margin-left: auto; width: 260px; margin-top: 12px; }
    .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
    .totals-total { font-size: 15px; font-weight: bold; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 4px; }
    .pagos-section { margin-top: 12px; }
    .pago-row { display: flex; justify-content: space-between; font-size: 11px; color: #475569; padding: 2px 0; }
    .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
    .green { color: #15803d; }
    .badge { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: bold; }
  `

  const buildPOSContent = () => `
    <div class="c">
      <div class="b" style="font-size:13px">${config?.nombre ?? 'Mi Negocio'}</div>
      ${config?.regimen ? `<div class="s">${config.regimen}</div>` : ''}
      ${config?.nit ? `<div class="s">NIT: ${config.nit}</div>` : ''}
      ${config?.direccion ? `<div class="s">${config.direccion}</div>` : ''}
      ${config?.ciudad ? `<div class="s">${config.ciudad}</div>` : ''}
      ${config?.telefono ? `<div class="s">Tel: ${config.telefono}</div>` : ''}
    </div>
    <hr class="hr"/>
    <div class="c b">RECIBO DE VENTA</div>
    <div class="c" style="font-size:13px">Ticket #${String(venta.numero_ticket).padStart(4, '0')}</div>
    <div class="c s">${fecha} &nbsp; ${hora}</div>
    <hr class="hr"/>
    <div>Cliente: <span class="b">${cliente?.nombre ?? 'Cliente General'}</span></div>
    ${cliente?.nit_cc ? `<div class="s">CC/NIT: ${cliente.nit_cc}</div>` : ''}
    <div class="s">Atendió: ${venta.empleado?.nombre_completo ?? '—'}</div>
    <hr class="hr"/>
    ${items.map(i => `
      <div class="item-name b">${i.nombre_producto}</div>
      <div class="row item-detail">
        <span class="s">${i.es_fraccionado ? `${i.cantidad_fraccion} und.` : `${i.cantidad} × ${fmt(i.precio_unitario)}`}</span>
        <span>${fmt(Number(i.subtotal_linea))}</span>
      </div>
      ${Number(i.descuento_linea) > 0 ? `<div class="row item-detail s green"><span>Descuento</span><span>-${fmt(Number(i.descuento_linea))}</span></div>` : ''}
    `).join('')}
    ${servicios.length > 0 ? `
      <hr class="hr"/>
      ${servicios.map(s => `
        <div class="row">
          <span>${s.nombre_servicio}</span>
          <span>${fmt(Number(s.precio_aplicado))}</span>
        </div>
      `).join('')}
    ` : ''}
    <hr class="hr"/>
    ${Number(venta.subtotal) !== Number(venta.total) ? `
      <div class="row s"><span>Subtotal</span><span>${fmt(Number(venta.subtotal))}</span></div>
    ` : ''}
    ${Number(venta.total_descuentos) > 0 ? `
      <div class="row s green"><span>Descuentos</span><span>-${fmt(Number(venta.total_descuentos))}</span></div>
    ` : ''}
    <hr class="hr"/>
    <div class="row total"><span>TOTAL</span><span>${fmt(Number(venta.total))}</span></div>
    <hr class="hr"/>
    ${pagos.map(p => `
      <div class="row"><span>${METODO_LABEL[p.metodo] ?? p.metodo}</span><span>${fmt(Number(p.monto))}</span></div>
    `).join('')}
    ${venta.observaciones ? `<hr class="hr"/><div class="s">Obs: ${venta.observaciones}</div>` : ''}
    ${config?.mensaje_pie ? `<hr class="hr"/><div class="pie">${config.mensaje_pie}</div>` : ''}
  `

  const buildCartaContent = () => `
    <div class="header">
      ${config?.logo_url ? `<img src="${config.logo_url}" class="logo" alt="logo"/>` : '<div></div>'}
      <div class="business-info">
        <div class="business-name">${config?.nombre ?? 'Mi Negocio'}</div>
        ${config?.regimen ? `<div style="font-size:11px;color:#64748b">${config.regimen}</div>` : ''}
        ${config?.nit ? `<div style="font-size:11px">NIT: ${config.nit}</div>` : ''}
        ${config?.direccion ? `<div style="font-size:11px">${config.direccion}</div>` : ''}
        ${config?.ciudad ? `<div style="font-size:11px">${config.ciudad}</div>` : ''}
        ${config?.telefono ? `<div style="font-size:11px">Tel: ${config.telefono}</div>` : ''}
        ${config?.email ? `<div style="font-size:11px">${config.email}</div>` : ''}
      </div>
    </div>
    <hr class="hr"/>
    <div class="title">RECIBO DE VENTA</div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Ticket</div><div style="font-size:14px;font-weight:bold">#${String(venta.numero_ticket).padStart(4,'0')}</div></div>
      <div class="info-item"><div class="info-label">Fecha</div><div>${fecha} ${hora}</div></div>
      <div class="info-item"><div class="info-label">Cliente</div><div style="font-weight:600">${cliente?.nombre ?? 'Cliente General'}</div>${cliente?.nit_cc ? `<div style="font-size:10px;color:#64748b">CC/NIT: ${cliente.nit_cc}</div>` : ''}</div>
      <div class="info-item"><div class="info-label">Atendió</div><div>${venta.empleado?.nombre_completo ?? '—'}</div></div>
    </div>
    <hr class="hr-light"/>
    <table>
      <thead><tr><th>Producto / Servicio</th><th>Cant.</th><th>Precio unit.</th><th>Descuento</th><th>Subtotal</th></tr></thead>
      <tbody>
        ${items.map(i => `
          <tr>
            <td>${i.nombre_producto}</td>
            <td>${i.es_fraccionado ? i.cantidad_fraccion : i.cantidad}</td>
            <td>${fmt(Number(i.precio_unitario))}</td>
            <td class="green">${Number(i.descuento_linea) > 0 ? `-${fmt(Number(i.descuento_linea))}` : '—'}</td>
            <td><strong>${fmt(Number(i.subtotal_linea))}</strong></td>
          </tr>
        `).join('')}
        ${servicios.map(s => `
          <tr>
            <td>${s.nombre_servicio} <span style="font-size:9px;color:#94a3b8">(servicio)</span></td>
            <td>1</td>
            <td>${fmt(Number(s.precio_aplicado))}</td>
            <td>—</td>
            <td><strong>${fmt(Number(s.precio_aplicado))}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="totals">
      ${Number(venta.subtotal) !== Number(venta.total) ? `<div class="totals-row"><span style="color:#64748b">Subtotal</span><span>${fmt(Number(venta.subtotal))}</span></div>` : ''}
      ${Number(venta.total_descuentos) > 0 ? `<div class="totals-row green"><span>Descuentos</span><span>-${fmt(Number(venta.total_descuentos))}</span></div>` : ''}
      <div class="totals-row totals-total"><span>TOTAL</span><span>${fmt(Number(venta.total))}</span></div>
    </div>
    <div class="pagos-section">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Forma de pago</div>
      ${pagos.map(p => `<div class="pago-row"><span>${METODO_LABEL[p.metodo] ?? p.metodo}</span><span>${fmt(Number(p.monto))}</span></div>`).join('')}
    </div>
    ${venta.observaciones ? `<div style="margin-top:12px;font-size:11px;color:#475569;background:#f8fafc;padding:8px;border-radius:4px">Obs: ${venta.observaciones}</div>` : ''}
    <div class="footer">${config?.mensaje_pie ?? ''}</div>
  `

  const handleImprimir = (formato: 'pos' | 'carta') => {
    const ventana = window.open('', '_blank', 'width=900,height=700')
    if (!ventana) return
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Recibo #${venta.numero_ticket}</title><style>${formato === 'pos' ? posCSS : cartaCSS}</style></head><body>${formato === 'pos' ? buildPOSContent() : buildCartaContent()}</body></html>`)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => { ventana.print(); ventana.close() }, 400)
  }

  const buildWhatsAppTexto = () => {
    const lineasItems = items.map(i =>
      i.es_fraccionado
        ? `  • ${i.nombre_producto} × ${i.cantidad_fraccion} und. = ${fmt(Number(i.subtotal_linea))}`
        : `  • ${i.nombre_producto} × ${i.cantidad} = ${fmt(Number(i.subtotal_linea))}${Number(i.descuento_linea) > 0 ? ` (desc. -${fmt(Number(i.descuento_linea))})` : ''}`
    ).join('\n')

    const lineasServicios = servicios.length > 0
      ? '\n\n*Servicios:*\n' + servicios.map(s => `  • ${s.nombre_servicio} = ${fmt(Number(s.precio_aplicado))}`).join('\n')
      : ''

    const lineasPagos = pagos.map(p => `  ${METODO_LABEL[p.metodo] ?? p.metodo}: ${fmt(Number(p.monto))}`).join('\n')

    return [
      `🏪 *${config?.nombre ?? 'Mi Negocio'}*`,
      `📄 Recibo #${String(venta.numero_ticket).padStart(4, '0')} — ${fecha} ${hora}`,
      ``,
      `👤 Cliente: ${cliente?.nombre ?? 'Cliente General'}`,
      `🧑 Atendió: ${venta.empleado?.nombre_completo ?? '—'}`,
      ``,
      `*Productos:*`,
      lineasItems,
      lineasServicios,
      ``,
      Number(venta.total_descuentos) > 0 ? `💚 Descuentos: -${fmt(Number(venta.total_descuentos))}` : '',
      `💰 *TOTAL: ${fmt(Number(venta.total))}*`,
      ``,
      `*Pago:*`,
      lineasPagos,
      venta.observaciones ? `\n📝 ${venta.observaciones}` : '',
      ``,
      config?.mensaje_pie ? `_${config.mensaje_pie}_` : '',
    ].filter(l => l !== undefined && l !== '').join('\n')
  }

  const handleWhatsAppCliente = () => {
    const telefono = cliente?.telefono?.replace(/\D/g, '')
    if (!telefono) { alert('Este cliente no tiene teléfono registrado'); return }
    const texto = buildWhatsAppTexto()
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const handleWhatsAppNegocio = () => {
    const numero = config?.whatsapp_negocio?.replace(/\D/g, '')
    if (!numero) { alert('Configura el número de WhatsApp del negocio en Configuración'); return }
    const texto = buildWhatsAppTexto()
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3 print:hidden">
        <Button type="button" variant="outline" onClick={() => handleImprimir('pos')}>
          <Printer className="mr-2 h-4 w-4" />POS 80mm
        </Button>
        <Button type="button" variant="outline" onClick={() => handleImprimir('carta')}>
          <Printer className="mr-2 h-4 w-4" />Carta A4
        </Button>
        <Button type="button" variant="outline" onClick={handleWhatsAppCliente}>
          <MessageCircle className="mr-2 h-4 w-4" />WhatsApp cliente
        </Button>
        {config?.whatsapp_negocio && (
          <Button type="button" variant="outline" onClick={handleWhatsAppNegocio}>
            <MessageCircle className="mr-2 h-4 w-4" />Factura electrónica
          </Button>
        )}
      </div>

      {/* Vista previa recibo POS */}
      <div className="mx-auto max-w-xs rounded-lg border bg-white p-4 font-mono text-xs">
        <div className="text-center space-y-0.5 mb-3">
          <p className="font-bold text-sm">{config?.nombre ?? 'Mi Negocio'}</p>
          {config?.regimen && <p className="text-slate-500">{config.regimen}</p>}
          {config?.nit && <p className="text-slate-500">NIT: {config.nit}</p>}
          {config?.direccion && <p className="text-slate-500">{config.direccion}</p>}
          {config?.ciudad && <p className="text-slate-500">{config.ciudad}</p>}
          {config?.telefono && <p className="text-slate-500">Tel: {config.telefono}</p>}
        </div>

        <div className="border-t border-dashed my-2" />

        <div className="text-center space-y-0.5 mb-2">
          <p className="font-bold">RECIBO DE VENTA</p>
          <p className="text-sm font-bold">Ticket #{String(venta.numero_ticket).padStart(4, '0')}</p>
          <p className="text-slate-500">{fecha} · {hora}</p>
        </div>

        <div className="border-t border-dashed my-2" />

        <div className="space-y-0.5 mb-2">
          <p>Cliente: <span className="font-medium">{cliente?.nombre ?? 'Cliente General'}</span></p>
          {cliente?.nit_cc && <p className="text-slate-400">CC/NIT: {cliente.nit_cc}</p>}
          <p className="text-slate-400">Atendió: {venta.empleado?.nombre_completo ?? '—'}</p>
        </div>

        <div className="border-t border-dashed my-2" />

        <div className="space-y-1 mb-2">
          {items.map(i => (
            <div key={i.id}>
              <p className="font-medium">{i.nombre_producto}</p>
              <div className="flex justify-between pl-2 text-slate-600">
                <span>{i.es_fraccionado ? `${i.cantidad_fraccion} und.` : `${i.cantidad} × ${fmt(Number(i.precio_unitario))}`}</span>
                <span>{fmt(Number(i.subtotal_linea))}</span>
              </div>
              {Number(i.descuento_linea) > 0 && (
                <div className="flex justify-between pl-2 text-green-700">
                  <span>Descuento</span>
                  <span>-{fmt(Number(i.descuento_linea))}</span>
                </div>
              )}
            </div>
          ))}
          {servicios.map(s => (
            <div key={s.id} className="flex justify-between">
              <span>{s.nombre_servicio}</span>
              <span>{fmt(Number(s.precio_aplicado))}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed my-2" />

        {Number(venta.subtotal) !== Number(venta.total) && (
          <div className="flex justify-between text-slate-500 mb-1">
            <span>Subtotal</span><span>{fmt(Number(venta.subtotal))}</span>
          </div>
        )}
        {Number(venta.total_descuentos) > 0 && (
          <div className="flex justify-between text-green-700 mb-1">
            <span>Descuentos</span><span>-{fmt(Number(venta.total_descuentos))}</span>
          </div>
        )}

        <div className="border-t border-dashed my-2" />

        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL</span><span>{fmt(Number(venta.total))}</span>
        </div>

        <div className="border-t border-dashed my-2" />

        {pagos.map(p => (
          <div key={p.id} className="flex justify-between text-slate-600">
            <span>{METODO_LABEL[p.metodo] ?? p.metodo}</span>
            <span>{fmt(Number(p.monto))}</span>
          </div>
        ))}

        {venta.observaciones && (
          <>
            <div className="border-t border-dashed my-2" />
            <p className="text-slate-500">Obs: {venta.observaciones}</p>
          </>
        )}

        {config?.mensaje_pie && (
          <>
            <div className="border-t border-dashed my-2" />
            <p className="text-center text-slate-500">{config.mensaje_pie}</p>
          </>
        )}
      </div>
    </div>
  )
}