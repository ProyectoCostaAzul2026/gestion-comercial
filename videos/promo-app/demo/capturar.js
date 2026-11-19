// Capturas de la app con los datos de demostración, para el video.
// Uso: node capturar.js <carpeta> <escala> [filtro]
//   Requiere la app en http://localhost:3000 apuntando al servidor de demostración (supabase-demo.js en el 54321).
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const SALIDA = process.argv[2] || 'capturas'
const ESCALA = Number(process.argv[3] || 3)
const FILTRO = process.argv[4] ? new RegExp(process.argv[4]) : null
const BASE = 'http://localhost:3000'

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'admin@demo.co' }
const exp = Math.floor(Date.now() / 1000) + 3600 * 12
const sesion = { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, exp, role: 'authenticated' })}.firma`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user }
const cookieSesion = { name: 'sb-localhost-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(sesion)).toString('base64url'), domain: 'localhost', path: '/' }

const espera = ms => new Promise(r => setTimeout(r, ms))

// Cada toma: nombre, ruta, y opcionalmente acciones antes de capturar y si va de página completa
const tomas = [
  { n: 'login', r: '/login', sinSesion: true },
  { n: 'inicio', r: '/dashboard', completa: true },
  { n: 'venta-vacia', r: '/dashboard/ventas/nueva' },
  { n: 'venta-buscar', r: '/dashboard/ventas/nueva', acc: async p => { await p.getByLabel('Buscar producto').fill('bombillo'); await espera(900) } },
  {
    n: 'venta-carrito', r: '/dashboard/ventas/nueva', acc: async p => {
      const buscar = p.getByLabel('Buscar producto')
      await buscar.fill('bombillo'); await espera(800); await p.locator('ul li button:not([disabled])').nth(2).click(); await espera(300)
      await buscar.fill('llave mixta'); await espera(800); await p.locator('ul li button:not([disabled])').nth(3).click(); await espera(300)
      await buscar.fill('flexometro'); await espera(800); await p.locator('ul li button:not([disabled])').nth(1).click(); await espera(300)
      await p.getByLabel('Agregar uno').first().click(); await p.getByLabel('Agregar uno').first().click(); await espera(300)
    },
  },
  {
    n: 'venta-cobro', r: '/dashboard/ventas/nueva', acc: async p => {
      const buscar = p.getByLabel('Buscar producto')
      await buscar.fill('bombillo'); await espera(800); await p.locator('ul li button:not([disabled])').nth(2).click(); await espera(300)
      await buscar.fill('llave mixta'); await espera(800); await p.locator('ul li button:not([disabled])').nth(3).click(); await espera(300)
      await p.getByRole('button', { name: /Cobrar/ }).first().click(); await espera(500)
    }, completa: true,
  },
  {
    n: 'venta-efectivo', r: '/dashboard/ventas/nueva', acc: async p => {
      const buscar = p.getByLabel('Buscar producto')
      await buscar.fill('bombillo'); await espera(800); await p.locator('ul li button:not([disabled])').nth(2).click(); await espera(300)
      await buscar.fill('llave mixta'); await espera(800); await p.locator('ul li button:not([disabled])').nth(3).click(); await espera(300)
      await p.getByRole('button', { name: /Cobrar/ }).first().click(); await espera(500)
      await p.getByRole('button', { name: /^Efectivo/ }).first().click(); await espera(200)
      await p.getByRole('button', { name: /\$20\.000/ }).first().click(); await espera(400)
    },
  },
  {
    n: 'venta-mixto', r: '/dashboard/ventas/nueva', acc: async p => {
      const buscar = p.getByLabel('Buscar producto')
      await buscar.fill('bombillo'); await espera(800); await p.locator('ul li button:not([disabled])').nth(2).click(); await espera(300)
      await buscar.fill('llave mixta'); await espera(800); await p.locator('ul li button:not([disabled])').nth(3).click(); await espera(300)
      await p.getByRole('button', { name: /Cobrar/ }).first().click(); await espera(500)
      await p.getByRole('button', { name: /Varios medios/ }).first().click(); await espera(500)
    }, completa: true,
  },
  { n: 'recibo', r: '/dashboard/ventas/v1300/recibo' },
  { n: 'venta-detalle', r: '/dashboard/ventas/v1300' },
  { n: 'inventario', r: '/dashboard/inventario' },
  { n: 'inv-categoria', r: '/dashboard/inventario?cat=c-ilum' },
  { n: 'inv-familia', r: '/dashboard/inventario?cat=c-llav&fam=f4' },
  { n: 'inv-grupo', r: '/dashboard/inventario?cat=c-ilum&fam=f8&g=' + encodeURIComponent('Luz Blanca|Generica') },
  { n: 'producto', r: '/dashboard/inventario/p27' },
  { n: 'caja', r: '/dashboard/caja', completa: true },
  {
    n: 'cierre', r: '/dashboard/caja/cierre', completa: true, acc: async p => {
      const campos = p.locator('input[type=number]')
      const valores = ['1', '2', '3', '4', '3', '5', '20', '30']
      for (let i = 0; i < valores.length; i++) { try { await campos.nth(i).fill(valores[i]) } catch { /* sin campo */ } }
      await espera(300)
    },
  },
  { n: 'reportes', r: '/dashboard/reportes?periodo=mes', completa: true },
  { n: 'cartera', r: '/dashboard/reportes/cartera', completa: true },
  { n: 'cliente-credito', r: '/dashboard/clientes/cl3', completa: true },
  { n: 'recepcion', r: '/dashboard/recepcion' },
  { n: 'recepcion-detalle', r: '/dashboard/recepcion/r1', completa: true },
  { n: 'recepcion-conteo', r: '/dashboard/recepcion/r1', completa: true, acc: async p => { await p.getByRole('button', { name: /Conteo/ }).first().click(); await espera(500) } },
  {
    n: 'cotizacion', r: '/dashboard/ventas/cotizacion', completa: true, acc: async p => {
      await p.getByPlaceholder('Nombre del cliente…').fill('Obras Rivera SAS')
      const b = p.getByPlaceholder('Buscar producto…'); await b.fill('candado'); await espera(900)
      await p.locator('ul li button, [role=option]').first().click().catch(() => {}); await espera(400)
      await b.fill('brocha'); await espera(900); await p.locator('ul li button, [role=option]').nth(1).click().catch(() => {}); await espera(400)
    },
  },
  { n: 'devolucion', r: '/dashboard/ventas/v1300?accion=devolver' },
  { n: 'garantias', r: '/dashboard/inventario/garantias' },
  { n: 'precios-cantidad', r: '/dashboard/inventario/p49/editar', completa: true },
  { n: 'grupo-pesos', r: '/dashboard/inventario/p49/grupo' },
  { n: 'conteo', r: '/dashboard/inventario/conteo', acc: async p => { await p.getByLabel('Categoría').selectOption({ label: 'Iluminación' }).catch(() => {}); await espera(600) } },
  { n: 'agotados', r: '/dashboard/inventario/agotados' },
  { n: 'proveedor', r: '/dashboard/proveedores/pr1' },
  { n: 'flujo', r: '/dashboard/reportes/flujo', completa: true },
  { n: 'contabilidad', r: '/dashboard/contabilidad' },
  { n: 'horario', r: '/dashboard/empleados/horario' },
  { n: 'nomina', r: '/dashboard/empleados/nomina' },
  { n: 'empleados', r: '/dashboard/empleados' },
  { n: 'tareas', r: '/dashboard/tareas' },
  { n: 'bitacora', r: '/dashboard/bitacora' },
  { n: 'perfil', r: '/dashboard/mi-perfil', completa: true },
  { n: 'menu', r: '/dashboard', acc: async p => { await p.getByText('Más', { exact: true }).last().click(); await espera(700) } },
]

// Gráficas ampliadas, con el celular en horizontal
const tomasHorizontal = [
  { n: 'graf-flujo', boton: 'Flujo de caja' },
  { n: 'graf-horas', boton: 'Ventas por hora del día' },
  { n: 'graf-dias', boton: 'Ventas promedio por día de la semana' },
  { n: 'graf-resultados', boton: 'Estado de resultados' },
  { n: 'graf-anterior', boton: 'Contra el periodo anterior' },
]

;(async () => {
  fs.mkdirSync(SALIDA, { recursive: true })
  const browser = await chromium.launch()
  const dispositivos = (process.env.DISPOSITIVOS || 'movil').split(',')
  const temas = (process.env.TEMAS || 'oscuro').split(',')
  for (const disp of dispositivos) for (const tema of temas) {
    const opciones = disp === 'pc'
      ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: Math.min(ESCALA, 2) }
      : { viewport: { width: 390, height: 844 }, deviceScaleFactor: ESCALA, isMobile: true, hasTouch: true }
    const ctx = await browser.newContext(opciones)
    await ctx.addCookies([{ name: 'tema', value: tema, domain: 'localhost', path: '/' }])
    const page = await ctx.newPage()
    page.on('pageerror', e => console.log('ERROR', disp, tema, e.message))
    for (const t of tomas) {
      if (FILTRO && !FILTRO.test(t.n)) continue
      await ctx.clearCookies(); await ctx.addCookies([{ name: 'tema', value: tema, domain: 'localhost', path: '/' }, ...(t.sinSesion ? [] : [cookieSesion])])
      try {
        await page.goto(BASE + t.r, { waitUntil: 'networkidle' }); await espera(700)
        if (t.acc) await t.acc(page)
        await espera(400)
        await page.screenshot({ path: path.join(SALIDA, `${disp}-${tema}-${t.n}.png`), fullPage: !!t.completa })
        console.log('ok', disp, tema, t.n)
      } catch (e) { console.log('FALLA', disp, tema, t.n, e.message.split('\n')[0]) }
    }
    await ctx.close()
    if (disp !== 'movil' || process.env.SIN_HORIZONTAL) continue
    const h = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: ESCALA, isMobile: true, hasTouch: true })
    await h.addCookies([{ name: 'tema', value: tema, domain: 'localhost', path: '/' }, cookieSesion])
    const ph = await h.newPage()
    for (const t of tomasHorizontal) {
      if (FILTRO && !FILTRO.test(t.n)) continue
      try {
        await ph.goto(BASE + '/dashboard/reportes?periodo=mes', { waitUntil: 'networkidle' }); await espera(800)
        await ph.getByRole('button', { name: `Ampliar la gráfica ${t.boton}` }).click(); await espera(1200)
        await ph.mouse.move(600, 200); await espera(500)
        await ph.screenshot({ path: path.join(SALIDA, `horizontal-${tema}-${t.n}.png`) })
        console.log('ok horizontal', tema, t.n)
      } catch (e) { console.log('FALLA horizontal', tema, t.n, e.message.split('\n')[0]) }
    }
    await h.close()
  }
  await browser.close()
})()
