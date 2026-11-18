// Periodos de análisis para Reportes y Contabilidad: día, semana (lunes a domingo), mes, año o rango libre,
// y el periodo anterior con el que se comparan.
// Todas las fechas son textos AAAA-MM-DD del calendario de Bogotá; las cuentas se hacen a mediodía UTC para que la
// zona horaria del servidor no corra los días.

export type TipoPeriodo = 'dia' | 'semana' | 'mes' | 'año' | 'rango'

export interface Periodo {
  tipo: TipoPeriodo
  /** Fecha que define el periodo (cualquier día dentro de él) */
  fecha: string
  desde: string
  hasta: string
  /** El periodo sigue en curso (termina después de hoy): se recortó a hoy */
  enCurso: boolean
  etiqueta: string
}

export interface Comparacion {
  actual: Periodo
  anterior: { desde: string; hasta: string; etiqueta: string }
}

export const TIPOS_PERIODO: { valor: TipoPeriodo; label: string }[] = [
  { valor: 'dia', label: 'Día' },
  { valor: 'semana', label: 'Semana' },
  { valor: 'mes', label: 'Mes' },
  { valor: 'año', label: 'Año' },
  { valor: 'rango', label: 'Rango' },
]

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const aFecha = (f: string) => new Date(f + 'T12:00:00Z')
const aTexto = (d: Date) => d.toISOString().slice(0, 10)
const esFecha = (f?: string | null): f is string => !!f && /^\d{4}-\d{2}-\d{2}$/.test(f) && !isNaN(aFecha(f).getTime())

export function sumarDiasFecha(f: string, n: number): string {
  const d = aFecha(f)
  d.setUTCDate(d.getUTCDate() + n)
  return aTexto(d)
}

/** Días entre dos fechas, contando ambas */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86400000) + 1
}

const finDeMes = (anio: number, mes0: number) => new Date(Date.UTC(anio, mes0 + 1, 0, 12)).getUTCDate()
const pad = (n: number) => String(n).padStart(2, '0')
const fechaDe = (anio: number, mes0: number, dia: number) => `${anio}-${pad(mes0 + 1)}-${pad(Math.min(dia, finDeMes(anio, mes0)))}`
const min = (a: string, b: string) => (a < b ? a : b)

function textoDia(f: string): string {
  const d = aFecha(f)
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
}
function textoCorto(f: string): string {
  const d = aFecha(f)
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)}`
}

/** Convierte lo que viene en la dirección (incluye los nombres viejos: hoy, mes_anterior) en un periodo */
export function leerPeriodo(
  sp: { periodo?: string; fecha?: string; desde?: string; hasta?: string },
  hoy: string,
  porDefecto: TipoPeriodo = 'mes',
): Periodo {
  const viejo: Record<string, TipoPeriodo> = { hoy: 'dia', mes_anterior: 'mes' }
  const valido = TIPOS_PERIODO.map(t => t.valor) as string[]
  const tipo = (viejo[sp.periodo ?? ''] ?? (valido.includes(sp.periodo ?? '') ? sp.periodo : porDefecto)) as TipoPeriodo
  const fecha = esFecha(sp.fecha) && sp.fecha <= hoy ? sp.fecha : hoy

  if (tipo === 'rango') {
    let desde = esFecha(sp.desde) ? sp.desde : fechaDe(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1, 1)
    let hasta = esFecha(sp.hasta) ? sp.hasta : hoy
    if (desde > hasta) [desde, hasta] = [hasta, desde]
    return { tipo, fecha: hasta, desde, hasta, enCurso: false, etiqueta: `${textoCorto(desde)} ${desde.slice(0, 4)} al ${textoCorto(hasta)} ${hasta.slice(0, 4)}` }
  }
  return calcularPeriodo(tipo, fecha, hoy)
}

export function calcularPeriodo(tipo: Exclude<TipoPeriodo, 'rango'>, fecha: string, hoy: string): Periodo {
  const d = aFecha(fecha)
  const anio = d.getUTCFullYear()
  const mes0 = d.getUTCMonth()
  let desde: string
  let finCompleto: string
  let etiqueta: string
  switch (tipo) {
    case 'dia':
      desde = fecha; finCompleto = fecha
      etiqueta = fecha === hoy ? `Hoy, ${textoDia(fecha)}` : textoDia(fecha)
      break
    case 'semana':
      desde = sumarDiasFecha(fecha, -((d.getUTCDay() + 6) % 7))
      finCompleto = sumarDiasFecha(desde, 6)
      etiqueta = `Semana del ${textoCorto(desde)} al ${textoCorto(finCompleto)} ${finCompleto.slice(0, 4)}`
      break
    case 'mes':
      desde = fechaDe(anio, mes0, 1); finCompleto = fechaDe(anio, mes0, 31)
      etiqueta = `${MESES[mes0][0].toUpperCase()}${MESES[mes0].slice(1)} ${anio}`
      break
    default:
      desde = `${anio}-01-01`; finCompleto = `${anio}-12-31`
      etiqueta = `Año ${anio}`
  }
  const hasta = min(finCompleto, hoy)
  const enCurso = hasta < finCompleto
  if (enCurso && tipo !== 'dia') etiqueta += ` (hasta el ${textoCorto(hasta)})`
  return { tipo, fecha, desde, hasta, enCurso, etiqueta }
}

/**
 * El periodo anterior para comparar. Si el actual va en curso, se compara contra los mismos días del anterior
 * (del 1 al 18 de noviembre contra del 1 al 18 de octubre), que es la comparación justa.
 */
export function periodoAnterior(p: Periodo): Comparacion['anterior'] {
  const largo = diasEntre(p.desde, p.hasta)
  if (p.tipo === 'dia' || p.tipo === 'semana') {
    const paso = p.tipo === 'dia' ? 1 : 7
    const desde = sumarDiasFecha(p.desde, -paso)
    const hasta = sumarDiasFecha(p.hasta, -paso)
    return { desde, hasta, etiqueta: p.tipo === 'dia' ? textoDia(desde) : `Semana del ${textoCorto(desde)} al ${textoCorto(hasta)}` }
  }
  if (p.tipo === 'mes' || p.tipo === 'año') {
    const d = aFecha(p.desde)
    const anio = d.getUTCFullYear() - (p.tipo === 'año' ? 1 : 0)
    const mes0 = p.tipo === 'mes' ? d.getUTCMonth() - 1 : 0
    const base = new Date(Date.UTC(anio, mes0, 1, 12))
    const desde = aTexto(base)
    const a = base.getUTCFullYear(); const m = base.getUTCMonth()
    const finCompleto = p.tipo === 'mes' ? fechaDe(a, m, 31) : `${a}-12-31`
    // Mismo número de días que lleva el actual (sin pasar del fin del periodo anterior)
    const hasta = p.enCurso
      ? (p.tipo === 'mes'
        ? fechaDe(a, m, aFecha(p.hasta).getUTCDate())
        : fechaDe(a, aFecha(p.hasta).getUTCMonth(), aFecha(p.hasta).getUTCDate()))
      : finCompleto
    const etiqueta = p.tipo === 'mes'
      ? `${MESES[m][0].toUpperCase()}${MESES[m].slice(1)} ${a}${p.enCurso ? ` (hasta el ${textoCorto(hasta)})` : ''}`
      : `Año ${a}${p.enCurso ? ` (hasta el ${textoCorto(hasta)})` : ''}`
    return { desde, hasta, etiqueta }
  }
  const hasta = sumarDiasFecha(p.desde, -1)
  const desde = sumarDiasFecha(hasta, -(largo - 1))
  return { desde, hasta, etiqueta: `${textoCorto(desde)} al ${textoCorto(hasta)} (${largo} días antes)` }
}

/** Fecha que define el periodo siguiente o anterior al moverse con las flechas */
export function moverFecha(p: Periodo, paso: 1 | -1): string {
  switch (p.tipo) {
    case 'dia': return sumarDiasFecha(p.fecha, paso)
    case 'semana': return sumarDiasFecha(p.desde, 7 * paso)
    case 'mes': {
      const d = aFecha(p.desde)
      return aTexto(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + paso, 1, 12)))
    }
    case 'año': return `${Number(p.desde.slice(0, 4)) + paso}-01-01`
    default: return p.fecha
  }
}

/** Variación porcentual contra el periodo anterior; null si antes era 0 (no se puede comparar) */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

/** Agrupar series por día o por mes según lo largo del periodo */
export function claveSerie(fecha: string, dias: number): string {
  return dias > 92 ? fecha.slice(0, 7) : fecha
}
