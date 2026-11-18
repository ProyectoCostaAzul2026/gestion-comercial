// Libro de Excel para el contador: arma hojas con el mismo formato (Arial, títulos en azul, encabezados centrados,
// bordes negros, sin cuadrícula, todo desde B2) y fórmulas en los totales para que el contador pueda revisarlas.
import type { Workbook, Worksheet, Cell } from 'exceljs'

export const COLORES = {
  azul1: 'FF1F3864', // título de la hoja
  azul2: 'FF2F5597', // título de cada tabla
  azul3: 'FF9DC3E6', // encabezados de columna y nombres de datos sueltos
  gris1: 'FFBFBFBF', // totales
  gris2: 'FFE7E6E6', // etiquetas de fila
}

export type TipoColumna = 'texto' | 'dinero' | 'numero' | 'entero' | 'fecha' | 'porcentaje'

export interface Columna<T> {
  titulo: string
  tipo: TipoColumna
  /** Valor de la celda; se ignora si hay fórmula */
  valor?: (fila: T) => string | number | null | undefined
  /** Fórmula por fila; recibe la letra de cada columna (por título) y el número de fila */
  formula?: (col: (titulo: string) => string, fila: number) => string
  /** Cómo se totaliza la columna: suma, una fórmula propia o nada */
  total?: 'suma' | ((col: (titulo: string) => string, desde: number, hasta: number) => string)
  /** Nota que se pone en el encabezado (explicación del dato) */
  nota?: string
  ancho?: number
}

const FUENTE = 'Arial'
const borde = { style: 'thin' as const, color: { argb: 'FF000000' } }
const BORDES = { top: borde, left: borde, bottom: borde, right: borde }

const FORMATOS: Record<TipoColumna, string | undefined> = {
  texto: undefined,
  dinero: '"$"#,##0.00;[Red]-"$"#,##0.00',
  numero: '#,##0.00',
  entero: '#,##0',
  fecha: 'yyyy-mm-dd',
  porcentaje: '0.00%',
}

export function letra(n: number): string {
  let s = ''
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

function estiloTitulo(c: Cell, fondo: string, tamano: number, textoBlanco = true) {
  c.font = { name: FUENTE, size: tamano, bold: true, color: { argb: textoBlanco ? 'FFFFFFFF' : 'FF000000' } }
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } }
  c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  c.border = BORDES
}

/** Hoja nueva sin cuadrícula, con la fila 1 y la columna A libres */
export function nuevaHoja(libro: Workbook, nombre: string, titulo: string, anchoTitulo: number): Worksheet {
  const ws = libro.addWorksheet(nombre, { views: [{ showGridLines: false }] })
  ws.getColumn(1).width = 3
  ws.mergeCells(2, 2, 2, 1 + anchoTitulo)
  const c = ws.getCell(2, 2)
  c.value = titulo
  estiloTitulo(c, COLORES.azul1, 14)
  ws.getRow(2).height = 24
  return ws
}

/** Dato suelto: nombre a la izquierda (azul 3) y valor a la derecha. Devuelve la dirección del valor. */
export function datoSuelto(ws: Worksheet, fila: number, nombre: string, valor: string | number | { formula: string }, tipo: TipoColumna = 'texto', nota?: string): string {
  const n = ws.getCell(fila, 2)
  n.value = nombre
  estiloTitulo(n, COLORES.azul3, 10, false)
  n.alignment = { horizontal: 'left', vertical: 'middle' }
  const v = ws.getCell(fila, 3)
  v.value = valor as never
  v.font = { name: FUENTE, size: 10 }
  v.border = BORDES
  v.alignment = { horizontal: tipo === 'texto' ? 'left' : 'right', vertical: 'middle' }
  if (FORMATOS[tipo]) v.numFmt = FORMATOS[tipo]!
  if (nota) v.note = nota
  return `C${fila}`
}

/**
 * Tabla con título (azul 2), encabezados (azul 3), filas con bordes y una fila de totales (gris 1) con fórmulas.
 * Devuelve la fila siguiente libre y las direcciones de los totales por título de columna.
 */
export function agregarTabla<T>(ws: Worksheet, filaInicio: number, titulo: string, columnas: Columna<T>[], filas: T[]): {
  siguiente: number
  totales: Record<string, string>
  rango: (tituloColumna: string) => string
} {
  const colDe = (t: string) => {
    const i = columnas.findIndex(c => c.titulo === t)
    if (i < 0) throw new Error(`Columna ${t} no existe`)
    return letra(2 + i)
  }
  // Título de la tabla
  ws.mergeCells(filaInicio, 2, filaInicio, 1 + columnas.length)
  const t = ws.getCell(filaInicio, 2)
  t.value = titulo
  estiloTitulo(t, COLORES.azul2, 11)
  // Encabezados
  const filaEnc = filaInicio + 1
  columnas.forEach((c, i) => {
    const celda = ws.getCell(filaEnc, 2 + i)
    celda.value = c.titulo
    estiloTitulo(celda, COLORES.azul3, 10, false)
    if (c.nota) celda.note = c.nota
  })
  ws.getRow(filaEnc).height = 30
  // Datos
  const primera = filaEnc + 1
  filas.forEach((f, k) => {
    const r = primera + k
    columnas.forEach((c, i) => {
      const celda = ws.getCell(r, 2 + i)
      if (c.formula) celda.value = { formula: c.formula(colDe, r) }
      else {
        const v = c.valor?.(f)
        celda.value = v === undefined || v === null || v === '' ? null : (c.tipo === 'texto' || c.tipo === 'fecha' ? String(v) : Number(v))
        if (c.tipo === 'fecha' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) celda.value = new Date(v + 'T12:00:00Z')
      }
      celda.font = { name: FUENTE, size: 10 }
      celda.border = BORDES
      celda.alignment = { horizontal: c.tipo === 'texto' ? 'left' : 'right', vertical: 'middle' }
      if (FORMATOS[c.tipo]) celda.numFmt = FORMATOS[c.tipo]!
    })
  })
  const ultima = primera + Math.max(filas.length, 1) - 1
  if (filas.length === 0) {
    ws.mergeCells(primera, 2, primera, 1 + columnas.length)
    const c = ws.getCell(primera, 2)
    c.value = 'Sin registros en el periodo'
    c.font = { name: FUENTE, size: 10, italic: true }
    c.alignment = { horizontal: 'center' }
    c.border = BORDES
  }
  // Totales
  const filaTot = ultima + 1
  const totales: Record<string, string> = {}
  const hayTotales = columnas.some(c => c.total)
  if (hayTotales) {
    columnas.forEach((c, i) => {
      const celda = ws.getCell(filaTot, 2 + i)
      const l = letra(2 + i)
      if (i === 0) celda.value = 'Total'
      else if (c.total === 'suma') celda.value = { formula: `SUM(${l}${primera}:${l}${ultima})` }
      else if (typeof c.total === 'function') celda.value = { formula: c.total(colDe, primera, ultima) }
      celda.font = { name: FUENTE, size: 10, bold: true }
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORES.gris1 } }
      celda.border = BORDES
      celda.alignment = { horizontal: i === 0 ? 'center' : c.tipo === 'texto' ? 'left' : 'right', vertical: 'middle' }
      if (FORMATOS[c.tipo] && i > 0) celda.numFmt = FORMATOS[c.tipo]!
      if (c.total) totales[c.titulo] = `'${ws.name}'!${l}${filaTot}`
    })
  }
  // Ancho de columnas según el contenido más largo
  columnas.forEach((c, i) => {
    const col = ws.getColumn(2 + i)
    const largos = filas.slice(0, 500).map(f => String(c.valor?.(f) ?? '').length)
    const base = c.tipo === 'dinero' ? 16 : c.tipo === 'fecha' ? 12 : 10
    col.width = Math.max(col.width ?? 0, c.ancho ?? Math.min(48, Math.max(base, c.titulo.length + 2, ...largos.map(n => n + 2))))
  })
  return {
    siguiente: (hayTotales ? filaTot : ultima) + 2,
    totales,
    rango: (tituloColumna: string) => `'${ws.name}'!${colDe(tituloColumna)}${primera}:${colDe(tituloColumna)}${ultima}`,
  }
}

/** Congela el encabezado de la primera tabla (para desplazarse por filas largas) */
export function congelar(ws: Worksheet, fila: number) {
  ws.views = [{ state: 'frozen', ySplit: fila, xSplit: 0, showGridLines: false }]
}
