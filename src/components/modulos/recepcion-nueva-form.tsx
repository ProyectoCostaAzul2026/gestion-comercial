'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { INPUT_CLS, LABEL_CLS } from './producto-form'

/**
 * Abre una recepción (crear_recepcion): crea la factura del proveedor, como "Nueva factura" en Proveedores, y la deja
 * lista para transcribir y contar. Solo administrador.
 */
export function RecepcionNuevaForm({ proveedores, hoy }: { proveedores: { id: string; nombre: string }[]; hoy: string }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [proveedorId, setProveedorId] = useState('')
  const [numero, setNumero] = useState('')
  const [fecha, setFecha] = useState(hoy)
  const [vence, setVence] = useState('')
  const [total, setTotal] = useState('')
  const [conIva, setConIva] = useState(false)
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  const abrir = async () => {
    const monto = Number(total)
    if (!proveedorId) { toast.error('Elige el proveedor'); return }
    if (!(monto > 0)) { toast.error('Escribe el total de la factura'); return }
    if (!fecha) { toast.error('Escribe la fecha de la factura'); return }
    setGuardando(true)
    const { data, error } = await supabase.rpc('crear_recepcion', {
      p_proveedor_id: proveedorId,
      p_fecha_emision: fecha,
      p_monto_total: monto,
      p_costos_con_iva: conIva,
      p_numero_factura: numero.trim() || undefined,
      p_fecha_vencimiento: vence || undefined,
      p_notas: notas.trim() || undefined,
    })
    setGuardando(false)
    if (error) { toast.error(error.message); return }
    toast.success('Recepción abierta')
    router.push(`/dashboard/recepcion/${data}`)
  }

  if (!abierto) {
    return (
      <Button type="button" onClick={() => setAbierto(true)} className="h-11 bg-brand-yellow font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
        <Plus className="mr-1 h-4 w-4" />Nueva recepción
      </Button>
    )
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-white">Nueva recepción</h2>
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-steel-300 hover:text-white"><X className="h-5 w-5" /></button>
      </div>
      <p className="text-xs text-steel-300">Crea la factura en Proveedores (los pagos van por allá, como siempre) y la deja lista para que los empleados la transcriban y cuenten.</p>
      <div className="space-y-1">
        <Label className={LABEL_CLS}>Proveedor</Label>
        <Select value={proveedorId} onValueChange={v => v && setProveedorId(v)} items={proveedores.map(p => ({ value: p.id, label: p.nombre }))}>
          <SelectTrigger className="h-11 w-full border-white/10 bg-[#1a2430] text-white"><SelectValue placeholder="Elige el proveedor…" /></SelectTrigger>
          <SelectContent>{proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="recepcion-numero" className={LABEL_CLS}>N° factura</Label>
          <Input id="recepcion-numero" value={numero} onChange={e => setNumero(e.target.value)} className={`h-11 ${INPUT_CLS}`} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="recepcion-total" className={LABEL_CLS}>Total de la factura</Label>
          <Input id="recepcion-total" type="number" inputMode="decimal" min={0} step="0.01" value={total} onChange={e => setTotal(e.target.value)} className={`h-11 ${INPUT_CLS}`} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="recepcion-fecha" className={LABEL_CLS}>Fecha</Label>
          <Input id="recepcion-fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={`h-11 ${INPUT_CLS}`} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="recepcion-vence" className={LABEL_CLS}>Vence</Label>
          <Input id="recepcion-vence" type="date" value={vence} onChange={e => setVence(e.target.value)} className={`h-11 ${INPUT_CLS}`} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="recepcion-con-iva" checked={conIva} onCheckedChange={v => setConIva(v)} />
        <Label htmlFor="recepcion-con-iva" className="text-sm text-white">Los costos de los renglones vienen con IVA</Label>
      </div>
      <div className="space-y-1">
        <Label htmlFor="recepcion-notas" className={LABEL_CLS}>Notas</Label>
        <Textarea id="recepcion-notas" rows={2} value={notas} onChange={e => setNotas(e.target.value)}
          className="border-white/10 bg-[#1a2430] text-white placeholder:text-steel-500 focus:border-brand-yellow/60" />
      </div>
      <Button type="button" onClick={abrir} disabled={guardando}
        className="h-12 w-full bg-brand-yellow text-base font-bold text-steel-900 hover:bg-brand-yellow hover:brightness-105">
        {guardando ? 'Abriendo…' : 'Abrir recepción'}
      </Button>
    </div>
  )
}
