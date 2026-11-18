// Festivos oficiales de Colombia, calculados para cualquier año (Ley 51 de 1983, "Ley Emiliani").
// Antes era una lista escrita a mano de 2025 a 2030; ahora no hay que actualizarla.

/** Jornada de domingo o festivo: de 9:00 a 17:00 (7 horas pagadas, con 1 hora de almuerzo) */
export const JORNADA_FESTIVO = { inicio: '09:00', fin: '17:00', horas: 7 } as const
/** Jornada de lunes a sábado: de 8:00 a 19:00 (10 horas pagadas, con 1 hora de almuerzo) */
export const JORNADA_NORMAL = { inicio: '08:00', fin: '19:00', horas: 10 } as const

const iso = (d: Date) => d.toISOString().slice(0, 10)
const fechaUTC = (año: number, mes: number, dia: number) => new Date(Date.UTC(año, mes - 1, dia))
const masDias = (d: Date, dias: number) => new Date(d.getTime() + dias * 86400000)
/** Los festivos "trasladables" pasan al lunes siguiente si no caen en lunes */
const alLunes = (d: Date) => masDias(d, (8 - d.getUTCDay()) % 7)

/** Domingo de Pascua (algoritmo gregoriano anónimo) */
function pascua(año: number): Date {
  const a = año % 19, b = Math.floor(año / 100), c = año % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return fechaUTC(año, mes, dia)
}

const porAño = new Map<number, Map<string, string>>()

/** Festivos de un año: fecha AAAA-MM-DD → nombre */
export function festivosDelAño(año: number): Map<string, string> {
  const listo = porAño.get(año)
  if (listo) return listo
  const p = pascua(año)
  const lista: [Date, string][] = [
    // Fijos
    [fechaUTC(año, 1, 1), 'Año Nuevo'],
    [fechaUTC(año, 5, 1), 'Día del Trabajo'],
    [fechaUTC(año, 7, 20), 'Independencia de Colombia'],
    [fechaUTC(año, 8, 7), 'Batalla de Boyacá'],
    [fechaUTC(año, 12, 8), 'Inmaculada Concepción'],
    [fechaUTC(año, 12, 25), 'Navidad'],
    // Se trasladan al lunes
    [alLunes(fechaUTC(año, 1, 6)), 'Reyes Magos'],
    [alLunes(fechaUTC(año, 3, 19)), 'San José'],
    [alLunes(fechaUTC(año, 6, 29)), 'San Pedro y San Pablo'],
    [alLunes(fechaUTC(año, 8, 15)), 'Asunción de la Virgen'],
    [alLunes(fechaUTC(año, 10, 12)), 'Día de la Raza'],
    [alLunes(fechaUTC(año, 11, 1)), 'Todos los Santos'],
    [alLunes(fechaUTC(año, 11, 11)), 'Independencia de Cartagena'],
    // Según la Pascua
    [masDias(p, -3), 'Jueves Santo'],
    [masDias(p, -2), 'Viernes Santo'],
    [masDias(p, 43), 'Ascensión del Señor'],
    [masDias(p, 64), 'Corpus Christi'],
    [masDias(p, 71), 'Sagrado Corazón'],
  ]
  const mapa = new Map<string, string>()
  for (const [fecha, nombre] of lista) {
    const k = iso(fecha)
    // Dos festivos pueden caer el mismo lunes
    mapa.set(k, mapa.has(k) ? `${mapa.get(k)} y ${nombre}` : nombre)
  }
  porAño.set(año, mapa)
  return mapa
}

/** Nombre del festivo de una fecha 'YYYY-MM-DD', o null si no es festivo */
export function nombreFestivo(fecha: string): string | null {
  const año = Number(fecha.slice(0, 4))
  if (!año) return null
  return festivosDelAño(año).get(fecha) ?? null
}

/**
 * Devuelve true si la fecha dada es festivo oficial en Colombia.
 * @param fecha string en formato 'YYYY-MM-DD'
 */
export function esFestivoCol(fecha: string): boolean {
  return nombreFestivo(fecha) !== null
}

/**
 * Devuelve true si la fecha es domingo o festivo en Colombia.
 * Para efectos de liquidación con jornada reducida (9am-5pm, 7h pagadas).
 */
export function esDomingoOFestivo(fecha: string): boolean {
  const [a, m, d] = fecha.split('-').map(Number)
  return fechaUTC(a, m, d).getUTCDay() === 0 || esFestivoCol(fecha)
}

/**
 * Calcula las horas pagadas estándar para una fecha dada.
 * - Lunes a Sábado: 10 horas (8am-7pm menos 1h almuerzo)
 * - Domingo o Festivo: 7 horas (9am-5pm menos 1h almuerzo)
 */
export function horasPagarPorFecha(fecha: string): number {
  return esDomingoOFestivo(fecha) ? JORNADA_FESTIVO.horas : JORNADA_NORMAL.horas
}

/**
 * Turno que aplica en una fecha: en un festivo que cae entre semana, el turno habitual se recorta a la jornada de
 * festivo (9:00 a 17:00). El turno de domingo ya se asigna con su propio horario y no se toca.
 * Las horas llegan como 'HH:MM' o 'HH:MM:SS'.
 */
export function turnoEnFecha(fecha: string, horaInicio: string, horaFin: string): { inicio: string; fin: string; ajustado: boolean } {
  const inicio = horaInicio.slice(0, 5)
  const fin = horaFin.slice(0, 5)
  if (!esFestivoCol(fecha)) return { inicio, fin, ajustado: false }
  const i = inicio < JORNADA_FESTIVO.inicio ? JORNADA_FESTIVO.inicio : inicio
  const f = fin > JORNADA_FESTIVO.fin ? JORNADA_FESTIVO.fin : fin
  // Un turno que queda por fuera de la jornada de festivo (por ejemplo solo de 17:00 a 19:00) se deja como está
  if (i >= f) return { inicio, fin, ajustado: false }
  return { inicio: i, fin: f, ajustado: i !== inicio || f !== fin }
}

/**
 * Calcula el pago de un empleado para una fecha dada.
 * @param salarioBase  Salario base diario del empleado
 * @param fecha        Fecha en formato 'YYYY-MM-DD'
 * @param horasTrabajadas  Horas realmente trabajadas. Si es null/undefined,
 *                         se asume jornada completa y se devuelve salarioBase.
 */
export function calcularPagoDia(
  salarioBase: number,
  fecha: string,
  horasTrabajadas?: number | null
): number {
  const horasEstandar = horasPagarPorFecha(fecha)

  if (horasTrabajadas == null || horasTrabajadas >= horasEstandar) {
    return salarioBase
  }

  const valorHora = salarioBase / horasEstandar
  return Math.round(valorHora * horasTrabajadas)
}
