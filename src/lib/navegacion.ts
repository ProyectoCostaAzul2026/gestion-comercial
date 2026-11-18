'use client'

// Navegación "atrás" coherente en todo el sistema.
// Se lleva una pila de las páginas visitadas dentro del dashboard (en sessionStorage, por pestaña). Con ella:
//  - el botón Atrás vuelve a la página anterior si se llegó desde la app, o a la sección superior si se entró directo
//    por un enlace (no saca al usuario de la app);
//  - después de guardar un formulario se vuelve a donde se estaba, sin dejar el formulario en el historial.
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

const PILA = 'nav-pila'
const REEMPLAZO = 'nav-reemplazo'
const REFRESCAR = 'nav-refrescar'

function leer(): string[] {
  try { return JSON.parse(window.sessionStorage.getItem(PILA) ?? '[]') } catch { return [] }
}
function guardar(pila: string[]) {
  try { window.sessionStorage.setItem(PILA, JSON.stringify(pila.slice(-50))) } catch { /* sin almacenamiento */ }
}

/** Lo llama el marco de la app cada vez que cambia la página */
export function registrarRuta(ruta: string) {
  const pila = leer()
  let reemplazar = false
  try { reemplazar = window.sessionStorage.getItem(REEMPLAZO) === '1'; window.sessionStorage.removeItem(REEMPLAZO) } catch { /* nada */ }
  if (pila.at(-1) === ruta) return
  if (reemplazar && pila.length > 0) pila[pila.length - 1] = ruta
  else if (pila.at(-2) === ruta) pila.pop() // se volvió a la página anterior
  else pila.push(ruta)
  guardar(pila)
}

/** true si hay que pedir datos frescos al llegar (se volvió atrás después de guardar algo) */
export function tomarRefresco(): boolean {
  try {
    const si = window.sessionStorage.getItem(REFRESCAR) === '1'
    window.sessionStorage.removeItem(REFRESCAR)
    return si
  } catch { return false }
}

/**
 * Funciones para moverse sin ensuciar el historial:
 *  - volver(respaldo): a la página anterior de la app; si no la hay, a `respaldo`. Con `refrescar`, la página a la
 *    que se vuelve trae los datos de nuevo (por ejemplo, después de guardar).
 *  - reemplazar(ruta): ir a otra página quitando la actual del historial (del formulario a lo que se acaba de crear).
 */
export function useNavegacion() {
  const router = useRouter()

  const volver = useCallback((respaldo: string, opciones?: { refrescar?: boolean }) => {
    if (leer().length > 1) {
      if (opciones?.refrescar) { try { window.sessionStorage.setItem(REFRESCAR, '1') } catch { /* nada */ } }
      router.back()
      return
    }
    try { window.sessionStorage.setItem(REEMPLAZO, '1') } catch { /* nada */ }
    router.replace(respaldo)
    if (opciones?.refrescar) router.refresh()
  }, [router])

  const reemplazar = useCallback((ruta: string) => {
    try { window.sessionStorage.setItem(REEMPLAZO, '1') } catch { /* nada */ }
    router.replace(ruta)
  }, [router])

  return { volver, reemplazar }
}
