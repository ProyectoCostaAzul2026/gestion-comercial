import React from 'react';
import { Audio } from '@remotion/media';
import { AbsoluteFill, Sequence, staticFile } from 'remotion';
import { Caja, CifraMes, Computador, Creditos, CreditosFotos, Final, Gancho, Graficas, Instalar, Inventario, MasTitulo, Presentacion, Recepcion, Reportes, Secundarias, Tema, Vender } from './Escenas';
import { Firma } from './componentes/Firma';
import linea from './linea.json';
import { PULSO } from './tema';

const ESCENAS: Record<string, React.FC> = {
  gancho: Gancho, presentacion: Presentacion, vender: Vender, inventario: Inventario, caja: Caja, reportes: Reportes,
  cifra: CifraMes, graficas: Graficas, creditos: Creditos, recepcion: Recepcion, masTitulo: MasTitulo, secundarias: Secundarias,
  tema: Tema, computador: Computador, instalar: Instalar, final: Final, creditosFotos: CreditosFotos,
};

/** Inicio de cada escena en cuadros, según linea.json (la música usa la misma línea de tiempo) */
export const tramos = (() => {
  let desde = 0;
  return linea.map(e => {
    const t = { id: e.id, desde, dura: e.pulsos * PULSO };
    desde += t.dura;
    return t;
  });
})();
export const DURACION = tramos[tramos.length - 1].desde + tramos[tramos.length - 1].dura;

export const PromoApp: React.FC<{ conMusica: boolean }> = ({ conMusica }) => (
  <AbsoluteFill style={{ backgroundColor: '#eef1f4' }}>
    {tramos.map(t => {
      const Escena = ESCENAS[t.id];
      return (
        <Sequence key={t.id} name={t.id} from={t.desde} durationInFrames={t.dura} premountFor={30}>
          <Escena />
          {t.id !== 'gancho' && t.id !== 'final' && t.id !== 'creditosFotos' && <Firma oscuro={t.id === 'cifra'} />}
        </Sequence>
      );
    })}
    {conMusica && <Audio src={staticFile('musica.wav')} volume={0.75} />}
  </AbsoluteFill>
);
