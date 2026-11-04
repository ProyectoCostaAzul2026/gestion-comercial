'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Escala de precios de un grupo de medidas: una gráfica pequeña por serie (calibre o diámetro), con el largo en el eje X
// y el precio nuevo en el eje Y, todas con la misma escala de precios para poder compararlas. Van separadas porque
// series con los mismos precios se taparían en una sola gráfica. La tabla de la escala es la vista de datos.

const COLOR = '#3987e5' // azul de la paleta validada contra el fondo de las tarjetas (#111820)
const SUPERFICIE = '#111820'
const TINTA = '#f0efec'
const TINTA_SECUNDARIA = '#c3c2b7'
const TINTA_TENUE = '#9aa7b0'
const REJILLA = 'rgba(255,255,255,0.08)'
export const MAX_SERIES_GRAFICA = 6

export interface PuntoEscala {
  /** Clave de la serie (unidad + dimensiones menos la última) */
  serie: string
  /** Nombre visible de la serie, ej. "6x" */
  etiquetaSerie: string
  /** Posición en el eje X: la última dimensión, o el orden si la medida no es numérica */
  x: number
  /** Etiqueta del eje X, ej. "1-1/2" */
  etiquetaX: string
  /** Medida completa, ej. "6x1-1/2 Pulgada" */
  medida: string
  precio: number
}

const pesos = (v: number) => `$${Math.round(v).toLocaleString('es-CO')}`

/** Tope del eje Y común a todas las gráficas: el precio más alto, redondeado hacia arriba a un número limpio */
function topeEje(maximo: number): number {
  if (!(maximo > 0)) return 100
  const magnitud = 10 ** Math.floor(Math.log10(maximo))
  const paso = maximo / magnitud <= 2 ? magnitud / 4 : maximo / magnitud <= 5 ? magnitud / 2 : magnitud
  return Math.ceil(maximo / paso) * paso
}

function GraficaSerie({ titulo, puntos, tope, alto }: { titulo: string | null; puntos: PuntoEscala[]; tope: number; alto: string }) {
  const datos = [...puntos].sort((a, b) => a.x - b.x)
  const etiquetas = new Map(datos.map(p => [p.x, p.etiquetaX]))
  const medidas = new Map(datos.map(p => [p.x, p.medida]))
  return (
    <figure className="space-y-1">
      {titulo && <figcaption className="text-xs font-semibold" style={{ color: TINTA_SECUNDARIA }}>Serie {titulo}</figcaption>}
      <div className={`${alto} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 6, right: 12, bottom: 2, left: 0 }}>
            <CartesianGrid vertical={false} stroke={REJILLA} />
            <XAxis
              type="number"
              dataKey="x"
              domain={['dataMin', 'dataMax']}
              ticks={datos.map(p => p.x)}
              interval="preserveStartEnd"
              minTickGap={6}
              tickFormatter={(x: number) => etiquetas.get(x) ?? ''}
              tick={{ fontSize: 10, fill: TINTA_TENUE }}
              axisLine={{ stroke: REJILLA }}
              tickLine={false}
            />
            <YAxis
              width={52}
              domain={[0, tope]}
              tickCount={3}
              tickFormatter={(v: number) => pesos(v)}
              tick={{ fontSize: 10, fill: TINTA_TENUE }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-xl border border-white/10 px-3 py-2 text-xs shadow-lg" style={{ backgroundColor: '#1a2430' }}>
                    <p className="font-semibold" style={{ color: TINTA }}>{pesos(Number(payload[0].value))}</p>
                    <p style={{ color: TINTA_SECUNDARIA }}>{medidas.get(Number(label)) ?? ''}</p>
                  </div>
                )
              }}
            />
            <Line
              dataKey="precio"
              stroke={COLOR}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={{ r: 4, fill: COLOR, stroke: SUPERFICIE, strokeWidth: 2 }}
              activeDot={{ r: 5, fill: COLOR, stroke: SUPERFICIE, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

export function EscalaPreciosGrafica({ puntos }: { puntos: PuntoEscala[] }) {
  const conPrecio = puntos.filter(p => p.precio > 0)
  const series: { clave: string; etiqueta: string; puntos: PuntoEscala[] }[] = []
  for (const p of conPrecio) {
    const serie = series.find(s => s.clave === p.serie)
    if (serie) serie.puntos.push(p)
    else series.push({ clave: p.serie, etiqueta: p.etiquetaSerie, puntos: [p] })
  }
  const visibles = series.filter(s => s.puntos.length >= 2).slice(0, MAX_SERIES_GRAFICA)
  if (visibles.length === 0) return null
  const tope = topeEje(Math.max(...visibles.flatMap(s => s.puntos.map(p => p.precio))))
  const varias = visibles.length > 1

  return (
    <div className="space-y-2">
      <div className={varias ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : ''}>
        {visibles.map(s => (
          <GraficaSerie key={s.clave} titulo={varias ? s.etiqueta : null} puntos={s.puntos} tope={tope} alto={varias ? 'h-36' : 'h-56'} />
        ))}
      </div>
      {series.length > visibles.length && (
        <p className="text-[11px] text-steel-500">
          Las gráficas muestran {visibles.length} de {series.length} series (las que tienen al menos dos medidas con precio); la tabla tiene todas.
        </p>
      )}
    </div>
  )
}
