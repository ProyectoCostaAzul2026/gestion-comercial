'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Empleado { id: string; nombre_completo: string }

interface VentasFiltrosProps {
  fechaInicio: string; fechaFin: string; tipoPago: string; estado: string
  empleadoId: string; empleados: Empleado[]; esAdmin: boolean
}

export function VentasFiltros({ fechaInicio, fechaFin, tipoPago, estado, empleadoId, empleados, esAdmin }: VentasFiltrosProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // En celular los filtros van plegados: lo primero que se ve es la lista de ventas
  const [abierto, setAbierto] = useState(false)
  const activos = [tipoPago, estado, empleadoId].filter(Boolean).length

  const actualizar = (clave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor && valor !== 'todos' && valor !== '') { params.set(clave, valor) }
    else { params.delete(clave) }
    router.push(`${pathname}?${params.toString()}`)
  }

  const labelCls = 'block text-[10px] font-bold uppercase tracking-widest text-steel-300'
  const triggerCls = 'h-11 border-white/10 bg-[#1a2430] text-white'

  return (
    <div className="mb-4">
      <button type="button" onClick={() => setAbierto(v => !v)} aria-expanded={abierto}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-[#111820] px-3 text-sm font-semibold text-white md:hidden">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-brand-yellow" aria-hidden />
          {fechaInicio === fechaFin ? fechaInicio : `${fechaInicio} a ${fechaFin}`}
          {activos > 0 && <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[11px] font-bold text-steel-900">{activos} filtro{activos === 1 ? '' : 's'}</span>}
        </span>
        <span className="text-xs text-brand-blue">{abierto ? 'Ocultar' : 'Cambiar'}</span>
      </button>
    <div className={`grid-cols-2 items-end gap-3 md:flex md:flex-wrap ${abierto ? 'mt-3 grid' : 'hidden'}`}>
      <div className="space-y-1">
        <label className={labelCls}>Desde</label>
        <Input type="date" value={fechaInicio} max={fechaFin} onChange={e => actualizar('fecha_inicio', e.target.value)} className="h-11 w-full border-white/10 bg-[#1a2430] text-white md:w-40" />
      </div>
      <div className="space-y-1">
        <label className={labelCls}>Hasta</label>
        <Input type="date" value={fechaFin} min={fechaInicio} onChange={e => actualizar('fecha_fin', e.target.value)} className="h-11 w-full border-white/10 bg-[#1a2430] text-white md:w-40" />
      </div>

      {esAdmin && (
        <div className="space-y-1">
          <label className={labelCls}>Empleado</label>
          <Select items={[{ value: 'todos', label: 'Todos' }, ...empleados.map(e => ({ value: e.id, label: e.nombre_completo }))]}
            onValueChange={v => v && actualizar('empleado_id', v)} value={empleadoId || 'todos'}>
            <SelectTrigger className={`w-full md:w-48 ${triggerCls}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre_completo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <label className={labelCls}>Tipo de pago</label>
        <Select items={[
          { value: 'todos', label: 'Todos' },
          { value: 'efectivo', label: 'Efectivo' },
          { value: 'nequi', label: 'Nequi' },
          { value: 'daviplata', label: 'Daviplata' },
          { value: 'tarjeta', label: 'Tarjeta' },
          { value: 'mixto', label: 'Mixto' },
          { value: 'credito', label: 'Crédito' },
        ]} onValueChange={v => v && actualizar('tipo_pago', v)} value={tipoPago || 'todos'}>
          <SelectTrigger className={`w-full md:w-40 ${triggerCls}`}><SelectValue /></SelectTrigger>
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
        <label className={labelCls}>Estado</label>
        <Select items={[
          { value: 'todos', label: 'Todos' },
          { value: 'completada', label: 'Completada' },
          { value: 'modificada', label: 'Modificada' },
          { value: 'anulada', label: 'Anulada' },
          { value: 'credito', label: 'Crédito' },
        ]} onValueChange={v => v && actualizar('estado', v)} value={estado || 'todos'}>
          <SelectTrigger className={`w-full md:w-40 ${triggerCls}`}><SelectValue /></SelectTrigger>
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
    </div>
  )
}