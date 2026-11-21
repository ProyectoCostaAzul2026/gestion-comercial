import { AbsoluteFill } from 'remotion';
import { C, LETRA } from '../tema';

/** "By: Luis Ortiz" en la esquina inferior derecha, pequeño y discreto */
export const Firma: React.FC<{ oscuro?: boolean }> = ({ oscuro = false }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div
      style={{
        position: 'absolute',
        right: 44,
        bottom: 40,
        fontFamily: LETRA,
        fontWeight: 600,
        fontSize: 24,
        letterSpacing: 0.3,
        color: oscuro ? 'rgba(255,255,255,0.55)' : C.tinta,
        opacity: oscuro ? 1 : 0.42,
      }}
    >
      By: Luis Ortiz
    </div>
  </AbsoluteFill>
);
