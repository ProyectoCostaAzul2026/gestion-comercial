// Festivos oficiales Colombia 2025–2030
// Fuente: proximofestivo.co (Ley Emiliani + Código Sustantivo del Trabajo)
// Actualizar este archivo cuando se acerque 2031

const FESTIVOS_CO = new Set([
  // 2025
  '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18',
  '2025-05-01', '2025-06-02', '2025-06-23', '2025-06-30',
  '2025-07-20', '2025-08-07', '2025-08-18', '2025-10-13',
  '2025-11-03', '2025-11-17', '2025-12-08', '2025-12-25',

  // 2026
  '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03',
  '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29',
  '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12',
  '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',

  // 2027
  '2027-01-01', '2027-01-11', '2027-03-22', '2027-03-25', '2027-03-26',
  '2027-05-01', '2027-05-10', '2027-05-31', '2027-06-07', '2027-07-05',
  '2027-07-20', '2027-08-07', '2027-08-16', '2027-10-18',
  '2027-11-01', '2027-11-15', '2027-12-08', '2027-12-25',

  // 2028
  '2028-01-01', '2028-01-10', '2028-03-20', '2028-04-13', '2028-04-14',
  '2028-05-01', '2028-05-29', '2028-06-19', '2028-06-26', '2028-07-03',
  '2028-07-20', '2028-08-07', '2028-08-21', '2028-10-16',
  '2028-11-06', '2028-11-13', '2028-12-08', '2028-12-25',

  // 2029
  '2029-01-01', '2029-01-08', '2029-03-19', '2029-03-29', '2029-03-30',
  '2029-05-01', '2029-05-14', '2029-06-04', '2029-06-11', '2029-07-02',
  '2029-07-20', '2029-08-07', '2029-08-20', '2029-10-15',
  '2029-11-05', '2029-11-12', '2029-12-08', '2029-12-25',

  // 2030
  '2030-01-01', '2030-01-07', '2030-03-25', '2030-04-18', '2030-04-19',
  '2030-05-01', '2030-06-03', '2030-06-24', '2030-07-01',
  '2030-07-20', '2030-08-07', '2030-08-19', '2030-10-14',
  '2030-11-04', '2030-11-11', '2030-12-08', '2030-12-25',
])

/**
 * Devuelve true si la fecha dada es festivo oficial en Colombia.
 * @param fecha string en formato 'YYYY-MM-DD'
 */
export function esFestivoCol(fecha: string): boolean {
  return FESTIVOS_CO.has(fecha)
}

/**
 * Devuelve true si la fecha es domingo o festivo en Colombia.
 * Para efectos de liquidación con jornada reducida (9am-5pm, 7h pagadas).
 */
export function esDomingoOFestivo(fecha: string): boolean {
  const d = new Date(fecha + 'T12:00:00')
  return d.getDay() === 0 || esFestivoCol(fecha)
}

/**
 * Calcula las horas pagadas estándar para una fecha dada.
 * - Lunes a Sábado: 10 horas (8am-7pm menos 1h almuerzo)
 * - Domingo o Festivo: 7 horas (9am-5pm menos 1h almuerzo)
 */
export function horasPagarPorFecha(fecha: string): number {
  return esDomingoOFestivo(fecha) ? 7 : 10
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