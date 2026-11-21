import { Composition } from 'remotion';
import { DURACION, PromoApp } from './PromoApp';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="PromoApp"
      component={PromoApp}
      durationInFrames={DURACION}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ conMusica: true }}
    />
  </>
);
