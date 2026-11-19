# Video promocional del sistema

Video vertical (1080x1920, 30 cuadros por segundo, unos 95 segundos) hecho con Remotion. Muestra la app instalada en el
celular, en modo claro, con grabaciones reales de la app usando datos de demostración (nada de la base de producción).

## Cómo está armado

- `src/linea.json`: la línea de tiempo. Cada escena dura un número de pulsos (120 por minuto, un pulso = 15 cuadros). La
  música y el video leen el mismo archivo, así los cortes caen en el ritmo.
- `src/Escenas.tsx`: las escenas (gancho, vender, inventario, caja, reportes, gráficas, créditos, recepción, funciones
  secundarias, claro y oscuro, computador, instalar, cierre y créditos de las fotos).
- `src/componentes/`: celular en 3D, monitor, títulos animados, fondo, firma "By: Luis Ortiz".
- `src/cifras.json`: cifras que se muestran en pantalla (salen de los datos de demostración).
- `demo/`: lo necesario para grabar la app sin tocar la base real.
  - `datos.js`: negocio ficticio (productos, ventas, créditos, caja, empleados).
  - `supabase-demo.js`: servidor que imita a Supabase en el puerto 54321 con esos datos.
  - `grabar.js`: abre la app, hace cada recorrido (tocar, escribir, desplazar) y guarda un MP4 por recorrido.
  - `capturar.js`: capturas fijas (se usaron para revisar).
  - `img/`: fotos de los productos de demostración (no se suben al repositorio; sus autores van al final del video).
- `musica/generar.py`: genera la pista (`public/musica.wav`) por código, sin derechos de autor.

## Rehacer el video

1. Dependencias: `npm ci` en esta carpeta. Python 3 con numpy para la música.
2. Servidor de demostración: `node demo/supabase-demo.js` (necesita las fotos en `demo/img/`).
3. La app, desde la raíz del repositorio, apuntando a ese servidor:
   `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-falsa npm run build` y luego
   `npx next start -p 3000` con las mismas variables.
4. Grabar: `node demo/grabar.js public/grabaciones` (o con un filtro, por ejemplo `node demo/grabar.js public/grabaciones venta`).
5. Música: `python3 musica/generar.py`.
6. Vista previa: `npm run dev`. Render: `npx remotion render PromoApp out/promo-app.mp4`.
   En la nube, Remotion no puede bajar su navegador: usar el de Playwright con
   `REMOTION_CHROME=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`.
   Sin música: `--props='{"conMusica":false}'`.

Las grabaciones, la música, las fotos y el video final no se suben al repositorio (`.gitignore`).
