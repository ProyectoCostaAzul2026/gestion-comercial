/** Tema de la app: claro, oscuro o el del sistema del celular. Se guarda en una cookie para que el servidor pinte la
 * página ya con el tema correcto (sin destello). Por defecto, oscuro. */
export type Tema = 'claro' | 'oscuro' | 'sistema'

export const COOKIE_TEMA = 'tema'
export const COLOR_BARRA = { claro: '#eef1f4', oscuro: '#0c1621' } as const

export function leerTema(valor: string | undefined | null): Tema {
  return valor === 'claro' || valor === 'sistema' ? valor : 'oscuro'
}

/** Script que corre antes de pintar: con "sistema" decide el modo según el celular y lo sigue si cambia. */
export const SCRIPT_TEMA_SISTEMA = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');var c=document.cookie.match(/(?:^|; )tema=([^;]+)/);if(!c||c[1]!=='sistema')return;var f=function(){var o=m.matches;document.documentElement.classList.toggle('dark',o);var t=document.querySelector('meta[name="theme-color"]');if(t)t.setAttribute('content',o?'${COLOR_BARRA.oscuro}':'${COLOR_BARRA.claro}')};f();m.addEventListener('change',function(){var d=document.cookie.match(/(?:^|; )tema=([^;]+)/);if(d&&d[1]==='sistema')f()})}catch(e){}})()`

/** Cambia el tema en el navegador y lo recuerda un año. */
export function aplicarTema(tema: Tema) {
  document.cookie = `${COOKIE_TEMA}=${tema}; path=/; max-age=31536000; samesite=lax`
  const oscuro = tema === 'oscuro' || (tema === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', oscuro)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? COLOR_BARRA.oscuro : COLOR_BARRA.claro)
}
