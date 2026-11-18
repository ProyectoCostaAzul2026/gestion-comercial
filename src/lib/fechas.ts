// Fechas del negocio: siempre en la hora de Bogotá.
// `new Date().toISOString()` da la fecha en UTC, que desde las 7 p. m. de Bogotá ya es "mañana".
import { sumarDias } from './permisos'

/** Fecha de hoy en Bogotá como AAAA-MM-DD */
export function hoyBogota(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

/** Fecha de Bogotá dentro de N días (negativo: hace N días) */
export function bogotaEnDias(dias: number): string {
  return sumarDias(hoyBogota(), dias)
}
