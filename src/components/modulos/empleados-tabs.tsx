'use client'

import { NominaTable } from './nomina-table'
import { HorarioSemanal } from './horario-semanal'

interface EmpleadosTabsProps {
  listaCompleta: React.ReactNode
  empleadosParaNomina: any[]
  historial: any[]
  turnos: any[]
  empleadosParaHorario: { id: string; nombre_completo: string }[]
  fechaHoy: string
  esAdmin: boolean
}

export function EmpleadosTabs({
  listaCompleta, empleadosParaNomina, historial,
  turnos, empleadosParaHorario, fechaHoy, esAdmin,
}: EmpleadosTabsProps) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Lista de empleados</h2>
        {listaCompleta}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Nómina</h2>
        <NominaTable
          empleados={empleadosParaNomina}
          historial={historial}
          fechaHoy={fechaHoy}
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Horario laboral</h2>
        <HorarioSemanal
          turnos={turnos}
          empleados={empleadosParaHorario}
          esAdmin={esAdmin}
          fechaHoy={fechaHoy}
        />
      </section>
    </div>
  )
}