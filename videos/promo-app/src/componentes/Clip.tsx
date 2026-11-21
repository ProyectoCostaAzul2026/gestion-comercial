import { OffthreadVideo, staticFile, useVideoConfig } from 'remotion';
import eventos from '../eventos.json';
import { Sonido } from './Sonido';
import { ALTO_PT, ANCHO_PT, useEscala } from './Telefono';

// Sonido y volumen de cada acción anotada al grabar (demo/grabar.js -> src/eventos.json)
const SONIDOS: Record<string, { vol: number; adelanto: number }> = {
  tecla: { vol: 0.32, adelanto: 0 },
  toque: { vol: 0.5, adelanto: 0.06 },
  cobro: { vol: 0.85, adelanto: 0.06 },
  check: { vol: 0.6, adelanto: 0.06 },
};

/** Sonidos de los toques y las teclas de una grabación, ya ajustados a su inicio y su velocidad */
const SonidosDeClip: React.FC<{ nombre: string; desde: number; velocidad: number }> = ({ nombre, desde, velocidad }) => {
  const { fps } = useVideoConfig();
  const lista = (eventos as Record<string, { tipo: string; t: number }[]>)[nombre] ?? [];
  let tecla = 0;
  return (
    <>
      {lista.map((e, i) => {
        const s = SONIDOS[e.tipo];
        if (!s) return null;
        const cuadro = ((e.t - s.adelanto - desde) / velocidad) * fps;
        if (cuadro < 0) return null;
        const archivo = e.tipo === 'tecla' ? `tecla${(tecla++ % 4) + 1}` : e.tipo;
        return <Sonido key={i} nombre={archivo} en={cuadro} vol={s.vol} />;
      })}
    </>
  );
};

/**
 * Una grabación de la app (demo/grabar.js) dentro del celular. `desde` es el segundo de la grabación en que empieza y
 * `velocidad` cuánto se acelera. `girada` es para las grabaciones horizontales dentro del celular girado.
 */
export const Clip: React.FC<{ nombre: string; desde?: number; velocidad?: number; girada?: boolean; sinSonido?: boolean }> = ({ nombre, desde = 0, velocidad = 1, girada = false, sinSonido = false }) => {
  const { fps } = useVideoConfig();
  const k = useEscala();
  const ancho = ANCHO_PT * k;
  const alto = ALTO_PT * k;
  const video = (estilo: React.CSSProperties) => (
    <OffthreadVideo src={staticFile(`grabaciones/${nombre}.mp4`)} muted playbackRate={velocidad} trimBefore={Math.round(desde * fps)} style={estilo} />
  );
  const sonidos = sinSonido ? null : <SonidosDeClip nombre={nombre} desde={desde} velocidad={velocidad} />;
  if (girada) {
    return <>{video({ position: 'absolute', width: alto, height: ancho, left: (ancho - alto) / 2, top: (alto - ancho) / 2, rotate: '90deg' })}{sonidos}</>;
  }
  return <>{video({ position: 'absolute', left: 0, top: 0, width: ancho, height: alto })}{sonidos}</>;
};

/** Grabación del computador dentro de una pantalla con su base */
export const Monitor: React.FC<{ nombre: string; ancho?: number; desde?: number; velocidad?: number; style?: React.CSSProperties }> = ({ nombre, ancho = 960, desde = 0, velocidad = 1, style }) => {
  const { fps } = useVideoConfig();
  const alto = ancho * (1350 / 2160);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      <div style={{ padding: 18, borderRadius: 30, background: 'linear-gradient(145deg, #2a3442, #0d131b 50%, #1f2833)', boxShadow: '0 50px 110px rgba(18,38,58,0.30), 0 14px 34px rgba(18,38,58,0.16)' }}>
        <div style={{ width: ancho, height: alto, borderRadius: 12, overflow: 'hidden', background: '#fff', position: 'relative' }}>
          <OffthreadVideo src={staticFile(`grabaciones/${nombre}.mp4`)} muted playbackRate={velocidad} trimBefore={Math.round(desde * fps)} style={{ width: ancho, height: alto }} />
          <SonidosDeClip nombre={nombre} desde={desde} velocidad={velocidad} />
        </div>
      </div>
      <div style={{ width: 150, height: 90, background: 'linear-gradient(#c9d2dc, #aeb9c6)', clipPath: 'polygon(22% 0, 78% 0, 92% 100%, 8% 100%)' }} />
      <div style={{ width: 360, height: 18, borderRadius: 10, background: 'linear-gradient(#c3ccd6, #9eabb9)', boxShadow: '0 16px 30px rgba(18,38,58,0.18)' }} />
    </div>
  );
};
