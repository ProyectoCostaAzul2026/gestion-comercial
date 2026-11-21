import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Las mismas letras de la app (Barlow para el texto y Barlow Condensed para las cifras), como archivos locales:
// el navegador del render no siempre puede descargarlas de Google.
export const LETRA = 'Barlow';
export const LETRA_CIFRAS = 'Barlow Condensed';
for (const peso of ['500', '600', '700', '800', '900']) {
  loadFont({ family: LETRA, url: staticFile(`fuentes/Barlow-${peso}-latin.woff2`), weight: peso });
}
for (const peso of ['600', '700', '800']) {
  loadFont({ family: LETRA_CIFRAS, url: staticFile(`fuentes/BarlowCondensed-${peso}-latin.woff2`), weight: peso });
}

// Colores de la app en modo claro
export const C = {
  fondo: '#eef1f4',
  tinta: '#12263a',
  suave: '#4f6274',
  azul: '#0368b6',
  azulOscuro: '#024f8c',
  amarillo: '#fedb03',
  verde: '#0f7b4c',
  rojo: '#c0261c',
  blanco: '#ffffff',
};

// 120 pulsos por minuto a 30 cuadros por segundo: un pulso son 15 cuadros (medio segundo)
export const FPS = 30;
export const PULSO = 15;
export const p = (pulsos: number) => Math.round(pulsos * PULSO);

// Capturas de la app (generadas con demo/capturar.js)
export const captura = (nombre: string) => `capturas/${nombre}.png`;
