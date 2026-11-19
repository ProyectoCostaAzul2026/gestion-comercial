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
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <label htmlFor={desdeKey} className="text-sm font-semibold text-suave">Desde</label>
        <Input
          id={desdeKey}
          type="date"
          value={desdeValue}
          onChange={e => actualizar(desdeKey, e.target.value)}
          className="h-11 w-full border-linea bg-superficie text-[15px] text-tinta"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={hastaKey} className="text-sm font-semibold text-suave">Hasta</label>
        <Input
          id={hastaKey}
          type="date"
          value={hastaValue}
          onChange={e => actualizar(hastaKey, e.target.value)}
          className="h-11 w-full border-linea bg-superficie text-[15px] text-tinta"
        />
      </div>
    </div>
  )
}