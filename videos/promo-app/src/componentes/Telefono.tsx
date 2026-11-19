import React from 'react';
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Sonido } from './Sonido';
import { C, captura, LETRA } from '../tema';

// Medidas del celular de la app: 390 x 844 puntos. La barra de estado ocupa 44 puntos arriba.
export const ANCHO_PT = 390;
export const ALTO_PT = 844;
export const BARRA_PT = 44;

const ContextoEscala = React.createContext(1);

/**
 * Marco de celular con la pantalla de la app adentro. `ancho` es el ancho de la pantalla en píxeles del video;
 * todo lo de adentro (capturas, toques) se mide en puntos de la app (390 de ancho).
 */
export const Telefono: React.FC<{
  ancho?: number;
  oscuro?: boolean;
  barra?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ ancho = 600, oscuro = false, barra, children, style }) => {
  const k = ancho / ANCHO_PT;
  // La pantalla es la app completa (844 puntos) más la barra de estado encima
  const alto = (ALTO_PT + BARRA_PT) * k;
  const borde = 0.045 * ancho;
  const radio = 0.15 * ancho;
  const tinta = oscuro ? '#ecf1f6' : C.tinta;
  return (
    <div
      style={{
        position: 'relative',
        width: ancho + borde * 2,
        height: alto + borde * 2,
        borderRadius: radio + borde,
        background: 'linear-gradient(145deg, #2a3442, #0d131b 45%, #1f2833)',
        padding: borde,
        boxShadow: '0 60px 120px rgba(18,38,58,0.28), 0 18px 40px rgba(18,38,58,0.18), inset 0 0 0 3px rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: ancho, height: alto, borderRadius: radio, overflow: 'hidden', background: barra ?? (oscuro ? '#0f1c2a' : '#ffffff') }}>
        <ContextoEscala.Provider value={k}>
          <div style={{ position: 'absolute', left: 0, top: BARRA_PT * k, width: ancho, height: ALTO_PT * k, overflow: 'hidden' }}>{children}</div>
        </ContextoEscala.Provider>
        {/* Barra de estado */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: ancho, height: BARRA_PT * k, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${28 * k}px`, fontFamily: LETRA, fontWeight: 700, fontSize: 15 * k, color: tinta }}>
          <span>9:41</span>
          <span style={{ display: 'flex', gap: 5 * k, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', gap: 2 * k, alignItems: 'flex-end' }}>
              {[5, 7, 9, 11].map(h => <span key={h} style={{ width: 3 * k, height: h * k, borderRadius: k, background: tinta }} />)}
            </span>
            <span style={{ width: 24 * k, height: 11 * k, borderRadius: 3 * k, border: `${1.3 * k}px solid ${tinta}`, position: 'relative', opacity: 0.9 }}>
              <span style={{ position: 'absolute', left: 1.5 * k, top: 1.5 * k, bottom: 1.5 * k, width: '70%', borderRadius: 1.5 * k, background: tinta }} />
            </span>
          </span>
        </div>
        {/* Isla */}
        <div style={{ position: 'absolute', top: 10 * k, left: '50%', width: 110 * k, height: 30 * k, marginLeft: -55 * k, borderRadius: 20 * k, background: '#05080c' }} />
        {/* Reflejo suave */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(255,255,255,0.10), transparent 35%)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
};

/** Escala de la pantalla actual (píxeles del video por punto de la app) */
export const useEscala = () => React.useContext(ContextoEscala);

/**
 * Una captura de la app dentro del celular. `desplazar` mueve la página hacia arriba (puntos), como al bajar con el dedo.
 * Entra deslizándose desde la derecha si `entra` es 'derecha', o aparece si es 'fundido'.
 */
export const Pantalla: React.FC<{
  src: string;
  desplazar?: number | [number, number, number, number];
  entra?: 'derecha' | 'abajo' | 'fundido' | 'nada';
  desde?: number;
  girada?: boolean;
  children?: React.ReactNode;
}> = ({ src, desplazar = 0, entra = 'nada', desde = 0, girada = false, children }) => {
  const f = useCurrentFrame();
  const k = useEscala();
  const ancho = ANCHO_PT * k;
  const t = interpolate(f, [desde, desde + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.9, 0.2, 1) });
  // desplazar: valor fijo o [cuadro inicio, cuadro fin, puntos inicio, puntos fin]
  const y = Array.isArray(desplazar)
    ? interpolate(f, [desplazar[0], desplazar[1]], [desplazar[2], desplazar[3]], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.2, 1) })
    : desplazar;
  const estilo: React.CSSProperties = {
    position: 'absolute', inset: 0,
    translate: entra === 'derecha' ? `${(1 - t) * ancho}px 0` : entra === 'abajo' ? `0 ${(1 - t) * 300 * k}px` : undefined,
    opacity: entra === 'fundido' || entra === 'abajo' ? t : 1,
  };
  if (girada) {
    // Captura horizontal (844 x 390) mostrada dentro del celular girado
    const altoPantalla = ALTO_PT * k;
    return (
      <div style={estilo}>
        <Img src={staticFile(captura(src))} style={{ position: 'absolute', width: altoPantalla, height: ancho, left: (ancho - altoPantalla) / 2, top: (altoPantalla - ancho) / 2, rotate: '90deg', objectFit: 'cover', objectPosition: 'top' }} />
      </div>
    );
  }
  return (
    <div style={estilo}>
      <Img src={staticFile(captura(src))} style={{ position: 'absolute', left: 0, top: -y * k, width: ancho }} />
      {children}
    </div>
  );
};

/** Toque del dedo en (x, y) puntos de la pantalla, en el cuadro `en` */
export const Toque: React.FC<{ x: number; y: number; en: number }> = ({ x, y, en }) => {
  const f = useCurrentFrame();
  const k = useEscala();
  const sonido = <Sonido nombre="toque" en={en} vol={0.5} />;
  if (f < en - 6 || f > en + 18) return sonido;
  const aparece = interpolate(f, [en - 6, en], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const onda = interpolate(f, [en, en + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  return (
    <>
      <div style={{ position: 'absolute', left: x * k, top: y * k, width: 46 * k, height: 46 * k, marginLeft: -23 * k, marginTop: -23 * k, borderRadius: '50%', background: 'rgba(18,38,58,0.22)', border: `${2 * k}px solid rgba(255,255,255,0.9)`, opacity: aparece * (1 - onda * 0.8), scale: String(1 - onda * 0.2) }} />
      <div style={{ position: 'absolute', left: x * k, top: y * k, width: 46 * k, height: 46 * k, marginLeft: -23 * k, marginTop: -23 * k, borderRadius: '50%', border: `${2 * k}px solid ${C.azul}`, opacity: 1 - onda, scale: String(1 + onda * 1.6) }} />
      {sonido}
    </>
  );
};
