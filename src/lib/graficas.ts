/**
 * Ayudas comunes para las gráficas (recharts) de Reportes y del flujo proyectado: el formato de los ejes y los estilos
 * que siguen el tema claro u oscuro.
 */

/**
 * Cifra corta para el eje de una gráfica de dinero: "$0", "$850", "$1,5K", "$45K", "$1,2M", "-$450K". Usa la coma
 * decimal y solo muestra decimales cuando hacen falta, así dos marcas seguidas nunca dicen lo mismo ("$2K $2K").
 */
export function ejeMoneda(valor: number): string {
  const v = Number(valor) || 0
  const signo = v < 0 ? '-' : ''
  const a = Math.abs(v)
  const corto = (n: number, sufijo: string) => {
    const decimales = n < 10 && !Number.isInteger(n) ? 1 : 0
    return `${n.toFixed(decimales).replace('.', ',').replace(/,0$/, '')}${sufijo}`
  }
  if (a >= 1_000_000) return `${signo}$${corto(a / 1_000_000, 'M')}`
  if (a >= 1_000) return `${signo}$${corto(a / 1_000, 'K')}`
  return `${signo}$${Math.round(a)}`
}

/** Pesos completos para el globo de la gráfica: "$1.234.500", "-$45.000" */
export function pesos(valor: number): string {
  const v = Math.round(Number(valor) || 0)
  return `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('es-CO')}`
}

/** Texto de los ejes: un poco más pequeño que el cuerpo y en tinta suave */
export const EJE = { fontSize: 11, fill: 'var(--suave)' }
/** Cuadrícula discreta: solo líneas horizontales, sin trazos */
export const CUADRICULA = { stroke: 'var(--linea)', vertical: false } as const
export const GLOBO = {
  backgroundColor: 'var(--sup2)',
  border: '1px solid var(--linea)',
  borderRadius: 12,
  color: 'var(--tinta)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgb(0 0 0 / 0.18)',
}
export const GLOBO_ETIQUETA = { color: 'var(--suave)', marginBottom: 4 }
/** Las cifras del globo van en tinta normal, no en el color de la serie */
export const GLOBO_ITEM = { color: 'var(--tinta)', padding: 0 }
/** Sombra suave bajo la barra que se está señalando */
export const CURSOR_BARRA = { fill: 'color-mix(in oklab, var(--velo) 6%, transparent)' }
/** Barras nunca más anchas que esto, aunque haya un solo dato */
export const ANCHO_MAX_BARRA = 44
