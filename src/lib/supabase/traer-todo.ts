import type { PostgrestError } from '@supabase/supabase-js'

/**
 * La API de Supabase (PostgREST) devuelve como máximo 1000 filas por petición (ajuste "Max rows" del
 * proyecto) y corta el resto sin avisar. Si ese ajuste se cambia en Supabase, hay que cambiarlo aquí también.
 */
const FILAS_POR_PAGINA = 1000

/**
 * Trae todas las filas de una consulta pidiéndolas por páginas con `.range(filaDesde, filaHasta)`.
 * La consulta debe terminar en un orden único (por ejemplo `.order('id')`) para que las páginas
 * no repitan ni salten filas.
 *
 *   const { data, error } = await traerTodo((filaDesde, filaHasta) =>
 *     supabase.from('productos').select('id, nombre').order('nombre').order('id').range(filaDesde, filaHasta)
 *   )
 */
export async function traerTodo<T>(
  consulta: (filaDesde: number, filaHasta: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const filas: T[] = []
  for (let filaDesde = 0; ; filaDesde += FILAS_POR_PAGINA) {
    const { data, error } = await consulta(filaDesde, filaDesde + FILAS_POR_PAGINA - 1)
    if (error) return { data: filas, error }
    filas.push(...(data ?? []))
    if ((data?.length ?? 0) < FILAS_POR_PAGINA) return { data: filas, error: null }
  }
}
