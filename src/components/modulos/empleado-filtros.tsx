'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'

interface EmpleadoFiltrosProps {
  desdeKey: string
  hastaKey: string
  desdeValue: string
  hastaValue: string
}

export function EmpleadoFiltros({ desdeKey, hastaKey, desdeValue, hastaValue }: EmpleadoFiltrosProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const actualizar = (clave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor) params.set(clave, valor)
    else params.delete(clave)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="space-y-1">
        <label className="text-xs font-bold text-steel-300">Desde</label>
        <Input
          type="date"
          value={desdeValue}
          onChange={e => actualizar(desdeKey, e.target.value)}
          className="h-8 w-36 border-linea bg-superficie-2 text-xs text-tinta"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold text-steel-300">Hasta</label>
        <Input
          type="date"
          value={hastaValue}
          onChange={e => actualizar(hastaKey, e.target.value)}
          className="h-8 w-36 border-linea bg-superficie-2 text-xs text-tinta"
        />
      </div>
    </div>
  )
}