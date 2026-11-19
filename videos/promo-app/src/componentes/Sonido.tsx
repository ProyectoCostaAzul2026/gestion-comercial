import { Audio } from '@remotion/media';
import { Sequence, staticFile } from 'remotion';

/** Volumen general de los efectos frente a la música */
const GENERAL = 0.9;

/** Un efecto de sonido (public/sfx, generado con musica/efectos.py) que suena en el cuadro `en` */
export const Sonido: React.FC<{ nombre: string; en?: number; vol?: number }> = ({ nombre, en = 0, vol = 1 }) => (
  <Sequence from={Math.round(en)} layout="none" name={`sonido ${nombre}`}>
    <Audio src={staticFile(`sfx/${nombre}.wav`)} volume={vol * GENERAL} />
  </Sequence>
);
