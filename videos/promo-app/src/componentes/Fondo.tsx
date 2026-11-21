import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C } from '../tema';

/** Fondo claro con manchas de color difuminadas que se mueven despacio (azul y amarillo de la marca) */
export const Fondo: React.FC<{ color?: string }> = ({ color = C.fondo }) => {
  const f = useCurrentFrame();
  const mancha = (x: number, y: number, tam: number, tono: string, fase: number, alfa: number) => (
    <div
      style={{
        position: 'absolute',
        left: x + Math.sin((f + fase) / 70) * 60,
        top: y + Math.cos((f + fase) / 85) * 50,
        width: tam,
        height: tam,
        borderRadius: '50%',
        background: tono,
        opacity: alfa,
        filter: 'blur(120px)',
      }}
    />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: color, overflow: 'hidden' }}>
      {mancha(-260, 120, 760, C.azul, 0, 0.16)}
      {mancha(560, 980, 820, C.amarillo, 120, 0.28)}
      {mancha(380, -220, 560, '#7fb6e6', 260, 0.22)}
      {mancha(-200, 1380, 620, '#9fd3ff', 400, interpolate(Math.sin(f / 60), [-1, 1], [0.12, 0.22]))}
    </AbsoluteFill>
  );
};
