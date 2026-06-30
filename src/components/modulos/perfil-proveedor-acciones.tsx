'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { FacturaProveedorForm } from './factura-proveedor-form'

export function PerfilProveedorAcciones({ proveedorId }: { proveedorId: string }) {
  const [mostrar, setMostrar] = useState(false)

  return (
    <div>
      <Button type="button" variant="outline" size="sm" className="border-brand-yellow/60 bg-transparent font-semibold text-brand-yellow hover:bg-brand-yellow/10 hover:text-brand-yellow" onClick={() => setMostrar(v => !v)}>
        {mostrar ? <X className="mr-1 h-4 w-4" /> : <Plus className="mr-1 h-4 w-4" />}
        {mostrar ? 'Cancelar' : 'Nueva factura'}
      </Button>

      {mostrar && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#111820] p-4">
          <h3 className="mb-3 font-display font-bold text-white">Registrar nueva factura</h3>
          <FacturaProveedorForm
            proveedorId={proveedorId}
            onSuccess={() => setMostrar(false)}
          />
        </div>
      )}
    </div>
  )
}