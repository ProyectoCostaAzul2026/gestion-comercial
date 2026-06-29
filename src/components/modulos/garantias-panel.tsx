'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
  proveedores: { nombre: string } | null
  productos: { id: string } | null
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
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

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
    setRecibiendoId(garantia.id)
    try {
      const { error } = await (supabase.rpc as any)('recibir_garantia', {
        p_garantia_id: garantia.id,
        p_stock_destino: stock,
      })
      if (error) throw error
      toast.success(`Garantía recibida — ${garantia.nombre_producto} regresó al ${stock}`)
      setConfirmandoId(null)
      router.refresh()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setRecibiendoId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      {!soloProveedor && (
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Desde</label>
            <Input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Hasta</label>
            <Input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">Proveedor</label>
            <Select items={[{ value: 'todos', label: 'Todos' }, ...proveedores.map(p => ({ value: p.nombre, label: p.nombre }))]}
              value={filtroProveedor} onValueChange={v => v && setFiltroProveedor(v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {proveedores.map(p => <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Pendientes */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b bg-amber-50 flex items-center justify-between">
          <p className="font-semibold text-amber-800">Garantías pendientes ({pendientes.length})</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableRow key={g.id}>
                <TableCell className="text-sm text-slate-500">{g.fecha_registro}</TableCell>
                <TableCell className="font-medium text-sm">{g.nombre_producto}</TableCell>
                <TableCell className="text-sm text-slate-500">{g.proveedores?.nombre ?? '—'}</TableCell>
                <TableCell className="text-sm text-slate-500">{g.observaciones ?? '—'}</TableCell>
                <TableCell>
                  <select
                    value={destino[g.id] ?? 'almacen'}
                    onChange={e => setDestino(prev => ({ ...prev, [g.id]: e.target.value }))}
                    className="rounded border border-slate-200 px-2 py-1 text-xs"
                  >
                    <option value="almacen">Almacén</option>
                    <option value="bodega">Bodega</option>
                  </select>
                </TableCell>
                <TableCell className="text-right">
                  {confirmandoId === g.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-slate-600">¿Confirmar?</span>
                      <Button size="sm" onClick={() => handleRecibir(g)} disabled={recibiendoId === g.id}
                        className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs">
                        {recibiendoId === g.id ? 'Registrando…' : 'Sí'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmandoId(null)} className="h-7 text-xs">No</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setConfirmandoId(g.id)}
                      className="h-7 text-xs flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />Garantía recibida
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {pendientes.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-6">Sin garantías pendientes</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Recibidas */}
      {recibidas.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b bg-green-50">
            <p className="font-semibold text-green-800">Garantías recibidas ({recibidas.length})</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recibidas.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="text-sm text-slate-500">{g.fecha_registro}</TableCell>
                  <TableCell className="font-medium text-sm">{g.nombre_producto}</TableCell>
                  <TableCell className="text-sm text-slate-500">{g.proveedores?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-sm text-slate-500">{g.observaciones ?? '—'}</TableCell>
                  <TableCell><Badge variant="default" className="bg-green-600 text-xs">Recibida</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}