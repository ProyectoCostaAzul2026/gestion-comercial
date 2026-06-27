'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Empleado { id: string; nombre_completo: string }

interface VentasFiltrosProps {
  fecha: string; tipoPago: string; estado: string
  empleadoId: string; empleados: Empleado[]; esAdmin: boolean
}

export function VentasFiltros({ fecha, tipoPago, estado, empleadoId, empleados, esAdmin }: VentasFiltrosProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const actualizar = (clave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor && valor !== 'todos' && valor !== '') { params.set(clave, valor) }
    else { params.delete(clave) }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs text-steel-500">Fecha</label>
        <Input type="date" value={fecha} onChange={e => actualizar('fecha', e.target.value)} className="w-40" />
      </div>

      {esAdmin && (
        <div className="space-y-1">
          <label className="text-xs text-steel-500">Empleado</label>
          <Select items={[{ value: 'todos', label: 'Todos' }, ...empleados.map(e => ({ value: e.id, label: e.nombre_completo }))]}
            onValueChange={v => v && actualizar('empleado_id', v)} value={empleadoId || 'todos'}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-steel-500">Tipo de pago</label>
        <Select items={[
          { value: 'todos', label: 'Todos' },
          { value: 'efectivo', label: 'Efectivo' },
          { value: 'nequi', label: 'Nequi' },
          { value: 'daviplata', label: 'Daviplata' },
          { value: 'tarjeta', label: 'Tarjeta' },
          { value: 'mixto', label: 'Mixto' },
          { value: 'credito', label: 'Crédito' },
        ]} onValueChange={v => v && actualizar('tipo_pago', v)} value={tipoPago || 'todos'}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="efectivo">Efectivo</SelectItem>
            <SelectItem value="nequi">Nequi</SelectItem>
            <SelectItem value="daviplata">Daviplata</SelectItem>
            <SelectItem value="tarjeta">Tarjeta</SelectItem>
            <SelectItem value="mixto">Mixto</SelectItem>
            <SelectItem value="credito">Crédito</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-steel-500">Estado</label>
        <Select items={[
          { value: 'todos', label: 'Todos' },
          { value: 'completada', label: 'Completada' },
          { value: 'modificada', label: 'Modificada' },
          { value: 'anulada', label: 'Anulada' },
          { value: 'credito', label: 'Crédito' },
        ]} onValueChange={v => v && actualizar('estado', v)} value={estado || 'todos'}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
            <SelectItem value="modificada">Modificada</SelectItem>
            <SelectItem value="anulada">Anulada</SelectItem>
            <SelectItem value="credito">Crédito</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}