# Video promocional del sistema

Video vertical (1080x1920, 30 cuadros por segundo, unos 95 segundos) hecho con Remotion. Muestra la app instalada en el
celular, en modo claro, con grabaciones reales de la app usando datos de demostración (nada de la base de producción).

## Cómo está armado

- `src/linea.json`: la línea de tiempo. Cada escena dura un número de pulsos (120 por minuto, un pulso = 15 cuadros). La
  música y el video leen el mismo archivo, así los cortes caen en el ritmo.
- `src/Escenas.tsx`: las escenas (gancho con la pregunta "¿Tu negocio en cuaderno?", explosión con las fotos, golpes al
  ritmo y montaje rápido de pantallas; luego vender, inventario, caja, reportes, gráficas, créditos, recepción, funciones
  secundarias, claro y oscuro, computador, instalar, cierre y créditos de las fotos).
- `src/componentes/`: celular en 3D, monitor, títulos animados, fondo, firma "By: Luis Ortiz".
- `src/cifras.json`: cifras que se muestran en pantalla (salen de los datos de demostración).
- `src/eventos.json`: segundo de cada toque y cada tecla de cada grabación (lo escribe `demo/grabar.js`). El componente
  `Clip` pone ahí los sonidos, ajustados al tramo y la velocidad con que se muestra la grabación.
- `src/componentes/Sonido.tsx`: un efecto de sonido en un cuadro dado.
- `demo/`: lo necesario para grabar la app sin tocar la base real.
  - `datos.js`: negocio ficticio (productos, ventas, créditos, caja, empleados).
  - `supabase-demo.js`: servidor que imita a Supabase en el puerto 54321 con esos datos.
  - `grabar.js`: abre la app, hace cada recorrido (tocar, escribir, desplazar) y guarda un MP4 por recorrido.
  - `capturar.js`: capturas fijas (se usaron para revisar).
  - `img/`: fotos de los productos de demostración (no se suben al repositorio; sus autores van al final del video).
- `musica/generar.py`: genera la pista (`public/musica.wav`) por código, sin derechos de autor.
- `musica/efectos.py`: genera los efectos de sonido (`public/sfx/`: teclas, toques, caja registradora, notificación,
  golpes, explosión, soplos y demás), también por código.

## Rehacer el video

1. Dependencias: `npm ci` en esta carpeta. Python 3 con numpy para la música.
2. Servidor de demostración: `node demo/supabase-demo.js` (necesita las fotos en `demo/img/`).
3. La app, desde la raíz del repositorio, apuntando a ese servidor:
   `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-falsa npm run build` y luego
   `npx next start -p 3000` con las mismas variables.
4. Grabar: `node demo/grabar.js public/grabaciones` (o con un filtro, por ejemplo `node demo/grabar.js public/grabaciones venta`).
5. Música y efectos: `python3 musica/generar.py` y `python3 musica/efectos.py`. Las fotos de la explosión del inicio van
   en `public/fotos/` (copia de `demo/img/`).
6. Vista previa: `npm run dev`. Render: `npx remotion render PromoApp out/promo-app.mp4`.
   En la nube, Remotion no puede bajar su navegador: usar el de Playwright con
   `REMOTION_CHROME=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`.
   Sin música: `--props='{"conMusica":false}'`.

Las grabaciones, la música, los efectos, las fotos y el video final no se suben al repositorio (`.gitignore`).
