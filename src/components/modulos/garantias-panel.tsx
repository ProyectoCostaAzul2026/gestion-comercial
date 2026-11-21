'use client'

import Link from 'next/link'
import { MiniaturaProducto, ProductoConFoto, EnlaceA } from '@/components/ui/producto-miniatura'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/avisos'
import { confirmar } from '@/components/ui/confirmar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ShieldCheck } from 'lucide-react'

interface Garantia {
  id: string
  nombre_producto: string
  cantidad: number
  observaciones: string | null
  fecha_registro: string
  estado: string
  proveedores: { id?: string; nombre: string } | null
  productos: { id: string; imagen_url?: string | null } | null
}

interface GarantiasPanelProps {
  garantias: Garantia[]
  proveedores: { id: string; nombre: string }[]
  soloProveedor?: string
}

export function GarantiasPanel({ garantias, proveedores, soloProveedor }: GarantiasPanelProps) {
  const supabase = createClient()
  const router = useRouter()
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroProveedor, setFiltroProveedor] = useState(soloProveedor ?? 'todos')
  const [recibiendoId, setRecibiendoId] = useState<string | null>(null)
  const [destino, setDestino] = useState<Record<string, string>>({})

  const filtradas = garantias.filter(g => {
    if (filtroDesde && g.fecha_registro < filtroDesde) return false
    if (filtroHasta && g.fecha_registro > filtroHasta) return false
    if (filtroProveedor !== 'todos' && g.proveedores?.nombre !== filtroProveedor) return false
    return true
  })

  const pendientes = filtradas.filter(g => g.estado === 'pendiente')
  const recibidas = filtradas.filter(g => g.estado === 'recibida')

  const handleRecibir = async (garantia: Garantia) => {
    const stock = destino[garantia.id] ?? 'almacen'
    const ok = await confirmar({
      titulo: '¿Registrar la garantía como recibida?',
      mensaje: `El proveedor devolvió "${garantia.nombre_producto}". La unidad vuelve a entrar al stock.`,
      detalle: [
        { etiqueta: 'Proveedor', valor: garantia.proveedores?.nombre ?? '—' },
        { etiqueta: 'Entra a', valor: stock === 'bodega' ? 'Bodega' : 'Almacén', fuerte: true },
      ],
      textoConfirmar: 'Registrar recibida',
    })
    if (!ok) return
    setRecibiendoId(garantia.id)
    try {
      const { error } = await (supabase.rpc as any)('recibir_garantia', {
        p_garantia_id: garantia.id,
        p_stock_destino: stock,
      })
      if (error) throw error
      toast.success('Garantía recibida', { description: `${garantia.nombre_producto} volvió al stock de ${stock === 'bodega' ? 'bodega' : 'almacén'}.` })
      router.refresh()
    } catch (err: any) {
      toast.error('No se pudo registrar la garantía', { description: err.message })
    } finally {
      setRecibiendoId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      {!soloProveedor && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_2fr]">
          <div className="space-y-1">
            <label htmlFor="gar-desde" className="block text-sm font-semibold text-suave">Desde</label>
            <Input id="gar-desde" type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="h-11 w-full border-linea bg-superficie-2 text-tinta" />
          </div>
          <div className="space-y-1">
            <label htmlFor="gar-hasta" className="block text-sm font-semibold text-suave">Hasta</label>
            <Input id="gar-hasta" type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="h-11 w-full border-linea bg-superficie-2 text-tinta" />
          </div>
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <label className="block text-sm font-semibold text-suave">Proveedor</label>
            <Select items={[{ value: 'todos', label: 'Todos' }, ...proveedores.map(p => ({ value: p.nombre, label: p.nombre }))]}
              value={filtroProveedor} onValueChange={v => v && setFiltroProveedor(v)}>
              <SelectTrigger className="h-11 w-full border-linea bg-superficie-2 text-tinta"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {proveedores.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Pendientes */}
      <div className="overflow-hidden rounded-2xl bg-superficie">
        <div className="flex items-center justify-between border-b border-linea bg-brand-yellow/10 px-4 py-3">
          <p className="flex items-center gap-2 font-display font-bold text-brand-yellow">
            <ShieldCheck className="h-4 w-4" />Garantías pendientes ({pendientes.length})
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead>Destino al recibir</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendientes.map(g => (
                <TableRow key={g.id} className="border-linea hover:bg-velo/5">
                  <TableCell className="text-xs text-steel-300">{g.fecha_registro}</TableCell>
                  <TableCell><ProductoConFoto id={g.productos?.id} nombre={g.nombre_producto} url={g.productos?.imagen_url} tam="xs" className="text-sm" /></TableCell>
                  <TableCell className="text-sm text-suave">{g.proveedores?.id ? <Link href={`/dashboard/proveedores/${g.proveedores.id}`} className="underline-offset-2 hover:text-enlace hover:underline">{g.proveedores.nombre}</Link> : (g.proveedores?.nombre ?? '—')}</TableCell>
                  <TableCell className="text-xs text-steel-300">{g.observaciones ?? '—'}</TableCell>
                  <TableCell>
                    <select
                      value={destino[g.id] ?? 'almacen'}
                      onChange={e => setDestino(prev => ({ ...prev, [g.id]: e.target.value }))}
                      className="rounded-lg border border-linea bg-superficie-2 px-2 py-1 text-xs text-tinta"
                    >
                      <option value="almacen">Almacén</option>
                      <option value="bodega">Bodega</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => handleRecibir(g)} disabled={recibiendoId === g.id}
                      className="flex h-9 items-center gap-1 border-emerald-500/40 bg-transparent text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" />{recibiendoId === g.id ? 'Registrando…' : 'Garantía recibida'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pendientes.length === 0 && (
                <TableRow className="border-linea"><TableCell colSpan={6} className="py-6 text-center text-steel-500">Sin garantías pendientes</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Recibidas */}
      {recibidas.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-superficie">
          <div className="border-b border-linea bg-emerald-500/10 px-4 py-3">
            <p className="font-display font-bold text-emerald-400">Garantías recibidas ({recibidas.length})</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-superficie-2 hover:bg-superficie-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-suave">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recibidas.map(g => (
                  <TableRow key={g.id} className="border-linea hover:bg-velo/5">
                    <TableCell className="text-xs text-steel-300">{g.fecha_registro}</TableCell>
                    <TableCell><ProductoConFoto id={g.productos?.id} nombre={g.nombre_producto} url={g.productos?.imagen_url} tam="xs" className="text-sm" /></TableCell>
                    <TableCell className="text-sm text-suave">{g.proveedores?.id ? <Link href={`/dashboard/proveedores/${g.proveedores.id}`} className="underline-offset-2 hover:text-enlace hover:underline">{g.proveedores.nombre}</Link> : (g.proveedores?.nombre ?? '—')}</TableCell>
                    <TableCell className="text-xs text-steel-300">{g.observaciones ?? '—'}</TableCell>
                    <TableCell><span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">Recibida</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}