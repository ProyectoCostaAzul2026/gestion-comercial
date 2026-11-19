import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, LETRA, LETRA_CIFRAS } from '../tema';

const suave = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * Título que entra palabra por palabra (desenfoque y subida). En cada línea, *palabra* va en azul y _palabra_ resaltada
 * en amarillo. `hasta` hace que se vaya; sin él, se queda.
 */
export const Titulo: React.FC<{
  lineas: string[];
  desde?: number;
  hasta?: number;
  tam?: number;
  cada?: number;
  color?: string;
  acento?: string;
  alinear?: 'center' | 'left';
  style?: React.CSSProperties;
}> = ({ lineas, desde = 0, hasta, tam = 112, cada = 4, color = C.tinta, acento = C.azul, alinear = 'center', style }) => {
  const f = useCurrentFrame();
  let n = 0;
  const salida = hasta != null ? interpolate(f, [hasta - 8, hasta], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  return (
    <div style={{ fontFamily: LETRA, fontWeight: 900, fontSize: tam, lineHeight: 0.98, letterSpacing: -tam * 0.035, color, textAlign: alinear, opacity: salida, ...style }}>
      {lineas.map((linea, i) => (
        <div key={i} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: alinear === 'center' ? 'center' : 'flex-start', columnGap: tam * 0.24 }}>
          {linea.split(' ').map((palabra, j) => {
            const inicio = desde + n++ * cada;
            const t = interpolate(f, [inicio, inicio + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
            const azul = /^\*.*\*[.,!?]?$/.test(palabra);
            const amarillo = /^_.*_[.,!?]?$/.test(palabra);
            const limpia = palabra.replace(/[*_]/g, '');
            return (
              <span
                key={j}
                style={{
                  display: 'inline-block',
                  opacity: t,
                  translate: `0 ${(1 - t) * tam * 0.45}px`,
                  filter: `blur(${(1 - t) * 14}px)`,
                  color: azul ? acento : undefined,
                  background: amarillo ? `linear-gradient(transparent 58%, ${C.amarillo} 58%, ${C.amarillo} 92%, transparent 92%)` : undefined,
                  padding: amarillo ? `0 ${tam * 0.06}px` : undefined,
                }}
              >
                {limpia}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Texto pequeño de apoyo que aparece suave */
export const Subtitulo: React.FC<{ children: React.ReactNode; desde?: number; tam?: number; color?: string; style?: React.CSSProperties }> = ({ children, desde = 0, tam = 44, color = C.suave, style }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [desde, desde + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: suave });
  return <div style={{ fontFamily: LETRA, fontWeight: 600, fontSize: tam, color, opacity: t, translate: `0 ${(1 - t) * 20}px`, textAlign: 'center', ...style }}>{children}</div>;
};

/** Cifra que cuenta desde 0 hasta `valor` (pesos colombianos) */
export const Cifra: React.FC<{ valor: number; desde?: number; dura?: number; tam?: number; color?: string; prefijo?: string; sufijo?: string; style?: React.CSSProperties }> = ({ valor, desde = 0, dura = 24, tam = 220, color = C.tinta, prefijo = '$', sufijo = '', style }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [desde, desde + dura], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const v = Math.round(valor * t);
  const aparece = interpolate(f, [desde, desde + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ fontFamily: LETRA_CIFRAS, fontWeight: 800, fontSize: tam, lineHeight: 1, letterSpacing: -tam * 0.01, color, opacity: aparece, fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefijo}{v.toLocaleString('es-CO')}{sufijo}
    </div>
  );
};

/** Tarjeta blanca flotante (como una notificación) que entra con un rebote */
export const Tarjeta: React.FC<{ desde: number; hasta?: number; icono?: React.ReactNode; titulo: string; texto?: string; style?: React.CSSProperties; ancho?: number }> = ({ desde, hasta, icono, titulo, texto, style, ancho = 620 }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [desde, desde + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  const salida = hasta != null ? interpolate(f, [hasta - 6, hasta], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  if (f < desde) return null;
  return (
    <div style={{ position: 'absolute', width: ancho, display: 'flex', gap: 26, alignItems: 'center', padding: '26px 30px', borderRadius: 34, background: 'rgba(255,255,255,0.96)', boxShadow: '0 30px 70px rgba(18,38,58,0.22), 0 6px 18px rgba(18,38,58,0.10)', scale: String(0.7 + 0.3 * t), opacity: Math.min(t * 1.4, 1) * salida, fontFamily: LETRA, ...style }}>
      {icono && <div style={{ flexShrink: 0 }}>{icono}</div>}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: C.tinta, lineHeight: 1.1 }}>{titulo}</div>
        {texto && <div style={{ fontSize: 28, fontWeight: 500, color: C.suave, marginTop: 6, lineHeight: 1.25 }}>{texto}</div>}
      </div>
    </div>
  );
};

/** Ícono cuadrado redondeado con un símbolo */
export const Icono: React.FC<{ fondo: string; children: React.ReactNode; tam?: number }> = ({ fondo, children, tam = 78 }) => (
  <div style={{ width: tam, height: tam, borderRadius: tam * 0.28, background: fondo, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: tam * 0.48, fontWeight: 900, fontFamily: LETRA }}>{children}</div>
);
