'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { FacturaProveedorForm } from './factura-proveedor-form'

export function PerfilProveedorAcciones({ proveedorId }: { proveedorId: string }) {
  const [mostrar, setMostrar] = useState(false)

  return (
    <div>
      <Button type="button" variant="outline" size="sm" onClick={() => setMostrar(v => !v)}>
        {mostrar ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
        {mostrar ? 'Cancelar' : 'Nueva factura'}
      </Button>

      {mostrar && (
        <div className="mt-4 rounded-lg border p-4 bg-slate-50">
          <h3 className="font-medium text-slate-900 mb-3">Registrar nueva factura</h3>
          <FacturaProveedorForm
            proveedorId={proveedorId}
            onSuccess={() => setMostrar(false)}
          />
        </div>
      )}
    </div>
  )
}