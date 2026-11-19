'use client'

import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ShieldCheck } from 'lucide-react'
import { TEMAS_AYUDA } from '@/lib/temas-ayuda'

export function InstruccionesPanel({ esAdmin }: { esAdmin: boolean }) {
  const temasDisponibles = useMemo(
    () => TEMAS_AYUDA.filter(t => esAdmin || !t.soloAdmin),
    [esAdmin]
  )
  const [temaId, setTemaId] = useState(temasDisponibles[0]?.id ?? '')
  const tema = temasDisponibles.find(t => t.id === temaId) ?? temasDisponibles[0]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Label className="text-xs font-bold text-steel-300">Elige un tema</Label>
        <Select value={tema?.id} onValueChange={v => v && setTemaId(v)}>
          <SelectTrigger className="h-12 w-full border-linea bg-superficie-2 text-[15px] text-tinta">
            <SelectValue placeholder="Selecciona un tema…" />
          </SelectTrigger>
          <SelectContent>
            {temasDisponibles.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.categoria} — {t.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tema && (
        <div className="space-y-5 rounded-2xl border border-linea bg-superficie p-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-brand-yellow">{tema.categoria}</p>
              {tema.soloAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/15 px-2 py-0.5 text-xs font-bold text-enlace">
                  <ShieldCheck className="h-3 w-3" />Admin
                </span>
              )}
            </div>
            <h2 className="mt-1 font-display text-xl font-bold text-tinta">{tema.titulo}</h2>
          </div>

          {tema.secciones.map((sec, i) => (
            <div key={i} className="space-y-2">
              {sec.subtitulo && <p className="text-sm font-semibold text-enlace">{sec.subtitulo}</p>}
              <ol className="space-y-2">
                {sec.pasos.map((paso, j) => (
                  <li key={j} className="flex gap-3 text-sm text-steel-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-velo/10 text-xs font-bold text-tinta">
                      {j + 1}
                    </span>
                    <span className="pt-0.5">{paso}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}