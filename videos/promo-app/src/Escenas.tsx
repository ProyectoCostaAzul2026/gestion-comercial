import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Clip, Monitor } from './componentes/Clip';
import { Fondo } from './componentes/Fondo';
import { Telefono, Toque } from './componentes/Telefono';
import { Cifra, Icono, Subtitulo, Tarjeta, Titulo } from './componentes/Texto';
import cifras from './cifras.json';
import { C, LETRA, p } from './tema';

const resorte = Easing.bezier(0.2, 1, 0.3, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Celular que entra desde abajo con un giro y luego orbita despacio, como una cámara alrededor */
const TelefonoEnEscena: React.FC<{ dura: number; ancho?: number; top?: number; giro?: [number, number]; entra?: boolean; oscuro?: boolean; children: React.ReactNode; zoom?: [number, number, number, number] }> = ({ dura, ancho = 520, top = 470, giro = [-14, 10], entra = true, oscuro, children, zoom }) => {
  const f = useCurrentFrame();
  const t = entra ? interpolate(f, [0, 16], [0, 1], { ...clamp, easing: resorte }) : 1;
  const giroY = interpolate(f, [0, dura], giro, clamp);
  const escala = zoom ? interpolate(f, [zoom[0], zoom[1]], [1, zoom[2]], { ...clamp, easing: Easing.inOut(Easing.cubic) }) * interpolate(f, [zoom[1] + 20, zoom[1] + 40], [1, 1 / zoom[2]], clamp) : 1;
  return (
    <AbsoluteFill style={{ perspective: 2600, alignItems: 'center' }}>
      <div style={{ position: 'absolute', top, transformStyle: 'preserve-3d', translate: `0 ${(1 - t) * 900}px`, rotate: `x ${interpolate(t, [0, 1], [28, 6])}deg`, scale: String(escala) }}>
        <div style={{ rotate: `y ${giroY}deg`, transformStyle: 'preserve-3d' }}>
          <Telefono ancho={ancho} oscuro={oscuro}>{children}</Telefono>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Zona de títulos arriba */
const Arriba: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 150 }) => (
  <AbsoluteFill style={{ alignItems: 'center' }}><div style={{ position: 'absolute', top, width: 960 }}>{children}</div></AbsoluteFill>
);

const IconoWhatsApp = () => (
  <Icono fondo="#1fa855">
    <svg width="44" height="44" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" /></svg>
  </Icono>
);

// ── 1. Gancho ──
export const Gancho: React.FC = () => (
  <>
    <Fondo />
    <AbsoluteFill style={{ justifyContent: 'center' }}>
      <Titulo lineas={['Vende.']} desde={0} hasta={p(2)} tam={210} />
    </AbsoluteFill>
    <AbsoluteFill style={{ justifyContent: 'center' }}>
      <Titulo lineas={['Cobra.']} desde={p(2)} hasta={p(4)} tam={210} />
    </AbsoluteFill>
    <AbsoluteFill style={{ justifyContent: 'center' }}>
      <Titulo lineas={['*Controla.*']} desde={p(4)} hasta={p(6)} tam={210} />
    </AbsoluteFill>
    <Sequence from={p(6)}>
      <Arriba top={330}><Titulo lineas={['Todo desde', 'tu _celular._']} tam={132} cada={3} /></Arriba>
      <Sequence from={p(1.5)}>
        <TelefonoEnEscena dura={p(3)} top={800} giro={[-24, -12]}><Clip nombre="inicio" velocidad={0.6} /></TelefonoEnEscena>
      </Sequence>
    </Sequence>
  </>
);

// ── 2. Presentación ──
export const Presentacion: React.FC = () => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, 14], [0, 1], { ...clamp, easing: resorte });
  return (
    <>
      <Fondo />
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <Img src={staticFile('logo.webp')} style={{ position: 'absolute', top: 150, width: 560, borderRadius: 26, opacity: t, scale: String(0.85 + 0.15 * t), boxShadow: '0 24px 60px rgba(18,38,58,0.18)' }} />
        <div style={{ position: 'absolute', top: 470, width: 900 }}><Subtitulo desde={6} tam={46} color={C.tinta}>Sistema de gestión comercial</Subtitulo></div>
      </AbsoluteFill>
      <TelefonoEnEscena dura={p(8)} top={590} ancho={500} giro={[-16, 14]}><Clip nombre="inicio" /></TelefonoEnEscena>
    </>
  );
};

// ── 3. Vender ── (la grabación va en dos tramos para saltar las pantallas de carga)
export const Vender: React.FC = () => (
  <>
    <Fondo />
    <Arriba><Titulo lineas={['Busca', 'con _foto._']} hasta={82} /></Arriba>
    <Sequence from={82}><Arriba><Titulo lineas={['Agrega al', '*carrito.*']} hasta={36} /></Arriba></Sequence>
    <Sequence from={118}><Arriba><Titulo lineas={['Cobra con', 'cualquier *medio.*']} hasta={68} /></Arriba></Sequence>
    <Sequence from={186}><Arriba><Titulo lineas={['Recibo por', '_WhatsApp._']} /></Arriba></Sequence>
    <TelefonoEnEscena dura={p(19)} giro={[-12, 12]}>
      <Sequence durationInFrames={186}><Clip nombre="venta" velocidad={2} /></Sequence>
      <Sequence from={186}><Clip nombre="venta" desde={14} velocidad={1.6} /></Sequence>
    </TelefonoEnEscena>
    <Sequence from={237}>
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <Tarjeta desde={0} icono={<IconoWhatsApp />} titulo="Recibo enviado" texto="Ticket con el detalle de la compra" style={{ top: 1320 }} ancho={640} />
      </AbsoluteFill>
    </Sequence>
  </>
);

// ── 4. Inventario ──
export const Inventario: React.FC = () => (
  <>
    <Fondo />
    <Arriba><Titulo lineas={['Tu inventario,', 'con _foto._']} hasta={p(6.5)} /></Arriba>
    <Sequence from={p(6.6)}><Arriba><Titulo lineas={['Categoría, familia', 'y *medida.*']} tam={100} /></Arriba></Sequence>
    <TelefonoEnEscena dura={p(13)} giro={[12, -10]}><Clip nombre="inventario" velocidad={1.8} desde={0.3} /></TelefonoEnEscena>
  </>
);

// ── 5. Caja ──
export const Caja: React.FC = () => (
  <>
    <Fondo />
    <Arriba><Titulo lineas={['Caja que', '*cuadra.*']} hasta={p(6)} /></Arriba>
    <Sequence from={p(6)}><Arriba><Titulo lineas={['Cierre del día', 'en _minutos._']} /></Arriba></Sequence>
    <TelefonoEnEscena dura={p(12)} giro={[-12, 10]}><Clip nombre="caja" velocidad={2} desde={0.2} /></TelefonoEnEscena>
  </>
);

// ── 6. Reportes ──
export const Reportes: React.FC = () => (
  <>
    <Fondo />
    <Arriba><Titulo lineas={['Mira cómo va', 'tu *negocio.*']} /></Arriba>
    <TelefonoEnEscena dura={p(8)} giro={[10, -8]}><Clip nombre="reportes" velocidad={1.6} desde={0.3} /></TelefonoEnEscena>
  </>
);

// ── 7. Cifra en grande ──
export const CifraMes: React.FC = () => {
  const f = useCurrentFrame();
  const chip = interpolate(f, [p(3), p(3) + 12], [0, 1], { ...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  return (
    <AbsoluteFill style={{ backgroundColor: C.azul, justifyContent: 'center', alignItems: 'center', gap: 30 }}>
      <Cifra valor={cifras.ventasMes} dura={30} tam={190} color="#fff" />
      <Subtitulo desde={8} tam={52} color="rgba(255,255,255,0.85)">vendido este mes</Subtitulo>
      <div style={{ marginTop: 40, padding: '20px 40px', borderRadius: 999, background: C.amarillo, color: C.tinta, fontFamily: LETRA, fontWeight: 800, fontSize: 50, scale: String(chip), opacity: chip }}>
        +{cifras.cambio} % frente al mes pasado
      </div>
    </AbsoluteFill>
  );
};

// ── 8. Gráficas ampliadas (el celular gira a horizontal) ──
export const Graficas: React.FC = () => {
  const f = useCurrentFrame();
  const giro = interpolate(f, [0, 20], [0, -90], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const t = interpolate(f, [0, 14], [0, 1], { ...clamp, easing: resorte });
  return (
    <>
      <Fondo />
      <Arriba top={230}><Titulo lineas={['Gráficas a', 'pantalla *completa.*']} /></Arriba>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 2600 }}>
        <div style={{ marginTop: 380, rotate: `${giro}deg`, opacity: t, scale: String(0.9 + 0.1 * t) }}>
          <div style={{ rotate: `x ${interpolate(f, [0, p(13)], [-6, 6])}deg` }}>
            <Telefono ancho={440}><Clip nombre="grafica" girada velocidad={1.6} desde={0.3} /></Telefono>
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
};

// ── 9. Créditos ──
export const Creditos: React.FC = () => (
  <>
    <Fondo />
    <Arriba><Titulo lineas={['Nadie se queda', '*debiendo.*']} /></Arriba>
    <TelefonoEnEscena dura={p(11)} giro={[12, -12]}><Clip nombre="creditos" velocidad={1.8} desde={0.3} /></TelefonoEnEscena>
    <Sequence from={p(8.5)}>
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <Tarjeta desde={0} icono={<IconoWhatsApp />} titulo="Recordatorio de pago" texto="Saldo y fecha, listos para enviar" style={{ top: 1320 }} ancho={640} />
      </AbsoluteFill>
    </Sequence>
  </>
);

// ── 10. Recepción de mercancía ──
export const Recepcion: React.FC = () => (
  <>
    <Fondo />
    <Arriba><Titulo lineas={['Recibe mercancía', 'sin *errores.*']} tam={104} /></Arriba>
    <TelefonoEnEscena dura={p(11)} giro={[-12, 10]}><Clip nombre="recepcion" velocidad={1.8} desde={0.3} /></TelefonoEnEscena>
  </>
);

// ── 11. Y mucho más ──
export const MasTitulo: React.FC = () => (
  <>
    <Fondo />
    <AbsoluteFill style={{ justifyContent: 'center' }}><Titulo lineas={['Y mucho', '_más._']} tam={190} cada={3} /></AbsoluteFill>
  </>
);

const SECUNDARIAS: { texto: string; clip: string; desde: number; velocidad: number }[] = [
  { texto: 'Cotizaciones', clip: 'cotizacion', desde: 4.5, velocidad: 3 },
  { texto: 'Devoluciones y cambios', clip: 'devolucion', desde: 0.6, velocidad: 3 },
  { texto: 'Garantías', clip: 'garantias', desde: 0.4, velocidad: 2.5 },
  { texto: 'Precios por cantidad', clip: 'preciosCantidad', desde: 0.6, velocidad: 3 },
  { texto: 'Conteo de inventario', clip: 'conteo', desde: 0.5, velocidad: 3 },
  { texto: 'Pedido sugerido', clip: 'agotados', desde: 0.4, velocidad: 2.5 },
  { texto: 'Proveedores y facturas', clip: 'proveedor', desde: 0.6, velocidad: 3.2 },
  { texto: 'Flujo de caja proyectado', clip: 'flujo', desde: 0.5, velocidad: 3.4 },
  { texto: 'Excel para el contador', clip: 'contabilidad', desde: 0.8, velocidad: 3.8 },
  { texto: 'Horario y festivos', clip: 'horario', desde: 0.8, velocidad: 3.4 },
  { texto: 'Nómina diaria', clip: 'nomina', desde: 0.3, velocidad: 2 },
  { texto: 'Tareas del equipo', clip: 'tareas', desde: 0.3, velocidad: 2.1 },
  { texto: 'Bitácora de cambios', clip: 'bitacora', desde: 0.3, velocidad: 2.8 },
  { texto: 'Roles y permisos', clip: 'empleados', desde: 0.3, velocidad: 2.4 },
];

// ── 12. Funciones secundarias, rápidas ──
export const Secundarias: React.FC = () => {
  const f = useCurrentFrame();
  const cada = p(2);
  return (
    <>
      <Fondo />
      {SECUNDARIAS.map((s, i) => (
        <Sequence key={s.clip} from={i * cada} durationInFrames={cada}>
          <Arriba top={250}><Titulo lineas={[s.texto]} tam={92} cada={2} /></Arriba>
          <TelefonoEnEscena dura={cada} entra={false} ancho={500} top={480} giro={i % 2 ? [8, 4] : [-8, -4]}><Clip nombre={s.clip} desde={s.desde} velocidad={s.velocidad} /></TelefonoEnEscena>
        </Sequence>
      ))}
      {/* Contador discreto de cuántas van */}
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: 170, fontFamily: LETRA, fontWeight: 700, fontSize: 34, color: C.suave }}>
          {Math.min(SECUNDARIAS.length, Math.floor(f / cada) + 1)} de {SECUNDARIAS.length}
        </div>
      </AbsoluteFill>
    </>
  );
};

// ── 13. Claro u oscuro ──
export const Tema: React.FC = () => {
  const f = useCurrentFrame();
  const dos = interpolate(f, [p(7), p(7) + 16], [0, 1], { ...clamp, easing: resorte });
  return (
    <>
      <Fondo />
      <Arriba><Titulo lineas={['Claro u', '*oscuro.*']} /></Arriba>
      <Sequence durationInFrames={p(7)}>
        <TelefonoEnEscena dura={p(7)} giro={[-10, 8]}><Clip nombre="tema" velocidad={1.4} desde={0.4} /></TelefonoEnEscena>
      </Sequence>
      <Sequence from={p(7)}>
        <AbsoluteFill style={{ perspective: 2600 }}>
          <div style={{ position: 'absolute', top: 540, left: 70 - (1 - dos) * 300, rotate: `y ${18}deg`, opacity: dos }}>
            <Telefono ancho={430}><Clip nombre="inicio" /></Telefono>
          </div>
          <div style={{ position: 'absolute', top: 600, right: 70 - (1 - dos) * 300, rotate: `y ${-18}deg`, opacity: dos }}>
            <Telefono ancho={430} oscuro><Clip nombre="inicioOscuro" /></Telefono>
          </div>
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

// ── 14. También en el computador ──
export const Computador: React.FC = () => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, 16], [0, 1], { ...clamp, easing: resorte });
  return (
    <>
      <Fondo />
      <Arriba top={260}><Titulo lineas={['También en el', '*computador.*']} /></Arriba>
      <AbsoluteFill style={{ alignItems: 'center', perspective: 2600 }}>
        <div style={{ position: 'absolute', top: 760, opacity: t, translate: `0 ${(1 - t) * 300}px`, rotate: `y ${interpolate(f, [0, p(9)], [-8, 6])}deg` }}>
          <Monitor nombre="pc" ancho={940} velocidad={1.25} desde={0.6} />
        </div>
      </AbsoluteFill>
    </>
  );
};

// ── 15. Instalar como app ──
const IconoApp: React.FC<{ tam: number }> = ({ tam }) => (
  <Img src={staticFile('icono.png')} style={{ width: tam, height: tam, borderRadius: tam * 0.23, boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }} />
);

const PantallaInicioCelular: React.FC = () => {
  const f = useCurrentFrame();
  const aparece = interpolate(f, [8, 22], [0, 1], { ...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  // Íconos genéricos, sin marcas
  const colores = ['#8fb3d9', '#f2b880', '#9fd1b7', '#c7b3e6', '#f0a6a6', '#a8c5e0', '#e6d38f', '#b5c9a3', '#9cc3d5', '#d9b38c', '#b9b9d9', '#a3d1cc', '#e0b3c9', '#c2d68f', '#9fb8e6'];
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(160deg, #2f6fb0, #1b3d66 55%, #12263a)', padding: '70px 34px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 120, gap: '18px 0', justifyItems: 'center' }}>
      {colores.map((c, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 74, height: 74, borderRadius: 18, background: c, opacity: 0.9 }} />
          <div style={{ width: 54, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.45)' }} />
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, scale: String(aparece), opacity: aparece }}>
        <IconoApp tam={74} />
        <div style={{ fontFamily: LETRA, fontWeight: 600, fontSize: 17, color: '#fff' }}>Costa Azul</div>
      </div>
    </AbsoluteFill>
  );
};

export const Instalar: React.FC = () => {
  const f = useCurrentFrame();
  const hoja = interpolate(f, [8, 24], [0, 1], { ...clamp, easing: resorte });
  return (
    <>
      <Fondo />
      <Arriba><Titulo lineas={['Instálala como', 'una *app.*']} /></Arriba>
      <TelefonoEnEscena dura={p(11)} giro={[-10, 10]}>
        {/* 1: el navegador ofrece agregarla a la pantalla de inicio */}
        <Sequence durationInFrames={p(4)}>
          <Clip nombre="inicio" velocidad={0.3} />
          <AbsoluteFill style={{ background: `rgba(18,38,58,${0.35 * hoja})` }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, translate: `0 ${(1 - hoja) * 420}px`, background: '#fff', borderRadius: '30px 30px 0 0', padding: '26px 26px 40px', fontFamily: LETRA, boxShadow: '0 -10px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <IconoApp tam={64} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.tinta }}>Costa Azul</div>
                <div style={{ fontSize: 15, color: C.suave }}>Instalar la app en este celular</div>
              </div>
            </div>
            <div style={{ marginTop: 22, height: 54, borderRadius: 14, background: C.azul, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>Agregar a la pantalla de inicio</div>
          </div>
          <Toque x={195} y={790} en={p(3)} />
        </Sequence>
        {/* 2: aparece el ícono y se abre */}
        <Sequence from={p(4)} durationInFrames={p(4)}>
          <PantallaInicioCelular />
          <Toque x={322} y={391} en={p(3)} />
        </Sequence>
        {/* 3: la app abre a pantalla completa */}
        <Sequence from={p(8)}>
          <Clip nombre="inicio" />
        </Sequence>
      </TelefonoEnEscena>
    </>
  );
};

// ── 16. Cierre ──
export const Final: React.FC = () => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, 16], [0, 1], { ...clamp, easing: resorte });
  const boton = interpolate(f, [p(3), p(3) + 14], [0, 1], { ...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  return (
    <>
      <Fondo />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 34 }}>
        <IconoApp tam={210} />
        <Img src={staticFile('logo.webp')} style={{ width: 620, borderRadius: 24, opacity: t, scale: String(0.9 + 0.1 * t) }} />
        <Subtitulo desde={10} tam={50} color={C.tinta}>Sistema de gestión comercial</Subtitulo>
        <div style={{ marginTop: 26, padding: '26px 52px', borderRadius: 999, background: C.azul, color: '#fff', fontFamily: LETRA, fontWeight: 800, fontSize: 46, scale: String(boton), opacity: boton, boxShadow: '0 20px 40px rgba(3,104,182,0.35)' }}>
          Instálala en tu celular
        </div>
        <Subtitulo desde={p(5)} tam={34} color={C.suave} style={{ marginTop: 40 }}>By: Luis Ortiz</Subtitulo>
      </AbsoluteFill>
    </>
  );
};

// ── 17. Créditos de las fotos, al final y discretos ──
export const CreditosFotos: React.FC = () => (
  <>
    <AbsoluteFill style={{ backgroundColor: C.fondo, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 900, fontFamily: LETRA, color: C.suave, fontSize: 26, lineHeight: 1.6, textAlign: 'center' }}>
        <div style={{ fontWeight: 800, color: C.tinta, fontSize: 30, marginBottom: 18 }}>Fotos de productos</div>
        Martillo: Wikimedia Commons, CC BY-SA 3.0 · Destornillador: Tool Dude8mm, CC BY 2.0 · Flexómetro: Coyau, CC BY-SA 3.0 ·
        Bombillo LED: Kingled, CC BY-SA 4.0 · Candado: Jonatan Svensson Glad, CC BY-SA 4.0 · Alicate: rawpixel, CC0
        <div style={{ marginTop: 22, fontSize: 24 }}>Datos y cifras de demostración.</div>
      </div>
    </AbsoluteFill>
  </>
);
