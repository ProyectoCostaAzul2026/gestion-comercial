// Graba la app en uso (toques, escritura, desplazamientos) cuadro a cuadro y arma un MP4 por cada guion.
// Uso: node grabar.js <carpeta de salida> [filtro de guiones]
//   Anota el segundo de cada toque y cada tecla en src/eventos.json, para poner los sonidos en el video.
//   Requiere la app en http://localhost:3000 apuntando al servidor de demostración (supabase-demo.js en el 54321).
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const SALIDA = path.resolve(process.argv[2] || 'grabaciones')
const FILTRO = process.argv[3] ? new RegExp(process.argv[3]) : null
const BASE = 'http://localhost:3000'
const ESCALA = 2

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const user = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'admin@demo.co' }
const exp = Math.floor(Date.now() / 1000) + 3600 * 12
const sesion = { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, exp, role: 'authenticated' })}.firma`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: exp, user }
const cookieSesion = { name: 'sb-localhost-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(sesion)).toString('base64url'), domain: 'localhost', path: '/' }

const esperar = ms => new Promise(r => setTimeout(r, ms))

// Círculo que marca cada toque y oculta las barras de desplazamiento
const SCRIPT_TOQUE = `
  addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = '::-webkit-scrollbar{display:none} *{scrollbar-width:none}';
    document.head.appendChild(st);
  });
  addEventListener('pointerdown', e => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:' + (e.clientX - 24) + 'px;top:' + (e.clientY - 24) + 'px;width:48px;height:48px;border-radius:50%;' +
      'background:rgba(18,38,58,.22);border:2.5px solid rgba(255,255,255,.95);box-shadow:0 0 0 2px rgba(3,104,182,.55),0 4px 14px rgba(0,0,0,.18);' +
      'pointer-events:none;z-index:2147483647;transition:transform .5s ease-out,opacity .5s ease-out';
    document.documentElement.appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = 'scale(1.7)'; d.style.opacity = '0'; }));
    setTimeout(() => d.remove(), 650);
  }, true);
`

// Ayudas para los guiones
// `marcar(tipo)` anota un sonido en el momento actual (toque, tecla, cobro, check)
const ayudas = (page, marcar) => ({
  esperar,
  async tocar(loc, pausa = 450, sonido = 'toque') {
    const l = typeof loc === 'string' ? page.locator(loc).first() : loc
    await l.scrollIntoViewIfNeeded().catch(() => {})
    await esperar(150)
    await l.tap({ timeout: 6000 }).catch(async () => { await l.click({ timeout: 6000 }) })
    marcar(sonido)
    await esperar(pausa)
  },
  async escribir(loc, texto, retardo = 110) {
    const l = typeof loc === 'string' ? page.locator(loc).first() : loc
    await l.tap({ timeout: 6000 }).catch(() => l.click({ timeout: 6000 }))
    marcar('toque')
    for (const letra of texto) {
      await page.keyboard.type(letra)
      marcar('tecla')
      await esperar(retardo)
    }
  },
  async desplazar(y, ms = 900) {
    await page.evaluate(([y, ms]) => new Promise(r => {
      const el = document.scrollingElement
      const s = el.scrollTop, t0 = performance.now()
      const paso = () => {
        const k = Math.min(1, (performance.now() - t0) / ms)
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
        el.scrollTop = s + y * e
        k < 1 ? requestAnimationFrame(paso) : r()
      }
      paso()
    }), [y, ms])
    await esperar(250)
  },
  async arriba() { await page.evaluate(() => document.scrollingElement.scrollTo(0, 0)) },
})

const res = (p, n) => p.locator('ul li button:not([disabled])').nth(n)

const guiones = {
  // ── Principales ──
  venta: {
    ruta: '/dashboard/ventas/nueva', async pasos(p, h) {
      await h.esperar(700)
      await h.escribir(p.getByLabel('Buscar producto'), 'bombillo', 130); await h.esperar(900)
      await h.tocar(res(p, 2), 700)
      await h.escribir(p.getByLabel('Buscar producto'), 'flexo', 130); await h.esperar(900)
      await h.tocar(res(p, 1), 700)
      await h.tocar(p.getByLabel('Agregar uno').first(), 400)
      await h.tocar(p.getByLabel('Agregar uno').first(), 800)
      await h.tocar(p.getByRole('button', { name: /Cobrar/ }).first(), 1000)
      await h.tocar(p.getByRole('button', { name: /^Efectivo/ }).first(), 500)
      await h.tocar(p.getByRole('button', { name: /\$50\.000/ }).first(), 1300)
      await h.tocar(p.getByRole('button', { name: /Registrar/ }).first(), 1600, 'cobro')
      // La venta queda arriba en la lista: se abre, se ve el recibo y se manda por WhatsApp
      await h.tocar(p.locator('a[href^="/dashboard/ventas/v"]').first(), 1300)
      await h.tocar(p.getByRole('link', { name: /Recibo/ }).first().or(p.getByRole('button', { name: /Recibo/ }).first()), 1500)
      await h.tocar(p.getByRole('link', { name: /WhatsApp/ }).first().or(p.getByRole('button', { name: /WhatsApp/ }).first()), 900)
    },
  },
  inventario: {
    ruta: '/dashboard/inventario', async pasos(p, h) {
      await h.esperar(900)
      await h.tocar(p.getByText('Iluminación', { exact: true }).last(), 1100)
      await h.tocar(p.getByText('Bombillo LED', { exact: true }).last(), 1100)
      await h.tocar(p.getByText('Luz Blanca', { exact: false }).last(), 1200)
      await h.desplazar(420, 1100); await h.esperar(700)
      await h.tocar(p.getByText('9 W', { exact: false }).first(), 1300)
      await h.desplazar(360, 1000); await h.esperar(900)
    },
  },
  caja: {
    ruta: '/dashboard/caja', async pasos(p, h) {
      await h.esperar(900)
      await h.desplazar(380, 1000); await h.esperar(600); await h.desplazar(-380, 700)
      await h.tocar(p.getByRole('link', { name: /Contar y cerrar/ }).first().or(p.getByRole('button', { name: /Contar y cerrar/ }).first()), 1300)
      const campos = p.locator('input[type=number]')
      const valores = ['1', '2', '3', '4', '3', '5']
      for (let i = 0; i < valores.length; i++) { await h.escribir(campos.nth(i), valores[i], 90).catch(() => {}); await h.esperar(250) }
      await h.desplazar(700, 1300); await h.esperar(1200)
    },
  },
  reportes: {
    ruta: '/dashboard/reportes?periodo=mes', async pasos(p, h) {
      await h.esperar(900)
      await h.desplazar(520, 1300); await h.esperar(800)
      await h.desplazar(900, 1500); await h.esperar(800)
    },
  },
  grafica: {
    horizontal: true, ruta: '/dashboard/reportes?periodo=mes', async pasos(p, h) {
      await h.esperar(600)
      await h.tocar(p.getByRole('button', { name: 'Ampliar la gráfica Ventas por hora del día' }), 1300)
      for (const x of [260, 360, 460, 560, 660]) { await p.mouse.move(x, 230, { steps: 8 }); await h.esperar(380) }
      await h.tocar(p.getByRole('button', { name: 'Cerrar la gráfica ampliada' }), 500)
      await h.tocar(p.getByRole('button', { name: 'Ampliar la gráfica Ventas promedio por día de la semana' }), 1300)
      for (const x of [180, 300, 420, 540, 660]) { await p.mouse.move(x, 220, { steps: 8 }); await h.esperar(380) }
    },
  },
  creditos: {
    ruta: '/dashboard/reportes/cartera', async pasos(p, h) {
      await h.esperar(900)
      await h.tocar(p.getByText(/61 a 90 días/).first(), 900)
      await h.tocar(p.getByText(/^Todo$/).first(), 700)
      await h.desplazar(380, 1000); await h.esperar(400)
      await h.tocar(p.getByText('Obras Rivera SAS').first(), 900)
      await h.tocar(p.getByRole('link', { name: /Ver cliente y abonar/ }).first(), 1400)
      await h.tocar(p.getByText(/Recordarle el pago por WhatsApp/).first(), 1200)
    },
  },
  recepcion: {
    ruta: '/dashboard/recepcion', async pasos(p, h) {
      await h.esperar(800)
      await h.tocar(p.getByText('Eléctricos del Centro').first(), 1300)
      await h.tocar(p.getByRole('tab', { name: /Conteo/ }).first(), 1000)
      await h.desplazar(300, 900); await h.esperar(700)
      const campo = p.locator('input[type=number]').first()
      if (await campo.count()) { await h.escribir(campo, '24', 160); await h.esperar(700) }
      await h.desplazar(300, 900); await h.esperar(800)
    },
  },
  // ── Secundarias (cortas) ──
  cotizacion: {
    ruta: '/dashboard/ventas/cotizacion', async pasos(p, h) {
      await h.esperar(500)
      await h.escribir(p.getByPlaceholder('Nombre del cliente…'), 'Obras Rivera SAS', 70)
      await h.escribir(p.getByPlaceholder('Buscar producto…'), 'candado', 90); await h.esperar(700)
      await h.tocar(p.getByRole('button', { name: /Candado - Acero/ }).nth(1), 700)
      await h.escribir(p.getByPlaceholder('Buscar producto…'), 'martillo', 90); await h.esperar(700)
      await h.tocar(p.getByRole('button', { name: /Martillo/ }).first(), 700)
      await h.desplazar(500, 900); await h.esperar(500)
    },
  },
  devolucion: {
    ruta: '/dashboard/ventas/v1300?accion=devolver', async pasos(p, h) {
      await h.esperar(600)
      await h.tocar(p.locator('input[type=checkbox]').first(), 600)
      await h.escribir(p.locator('textarea').first(), 'No era la medida', 60); await h.esperar(500)
    },
  },
  garantias: { ruta: '/dashboard/inventario/garantias', async pasos(p, h) { await h.esperar(700); await h.desplazar(250, 900); await h.esperar(500) } },
  preciosCantidad: {
    ruta: '/dashboard/inventario/p11/editar', async pasos(p, h) {
      await h.esperar(600)
      const t = p.getByText(/Precios por cantidad/).first()
      const y = await t.evaluate(el => el.getBoundingClientRect().top + window.scrollY - 140).catch(() => 1400)
      await h.desplazar(y, 1300); await h.esperar(900)
    },
  },
  conteo: {
    ruta: '/dashboard/inventario/conteo', async pasos(p, h) {
      await h.esperar(500)
      await p.getByLabel('Categoría').selectOption({ label: 'Iluminación' }).catch(() => {}); await h.esperar(700)
      const campos = p.locator('input[inputmode=numeric], input[type=number]')
      await h.escribir(campos.nth(0), '30', 140).catch(() => {}); await h.esperar(300)
      await h.escribir(campos.nth(2), '11', 140).catch(() => {}); await h.esperar(500)
    },
  },
  agotados: { ruta: '/dashboard/inventario/agotados', async pasos(p, h) { await h.esperar(700); await h.desplazar(400, 1000); await h.esperar(400) } },
  proveedor: {
    ruta: '/dashboard/proveedores/pr1', async pasos(p, h) {
      await h.esperar(600); await h.desplazar(420, 1000); await h.esperar(300)
      await h.tocar(p.getByRole('button', { name: /Hacer pedido/ }).first().or(p.getByRole('link', { name: /Hacer pedido/ }).first()), 900)
    },
  },
  flujo: {
    ruta: '/dashboard/reportes/flujo', async pasos(p, h) {
      await h.esperar(600)
      await h.tocar(p.getByRole('button', { name: /12 semanas/ }).first(), 700)
      await h.desplazar(700, 1100); await h.esperar(500)
    },
  },
  contabilidad: {
    ruta: '/dashboard/contabilidad', async pasos(p, h) {
      await h.esperar(600)
      await h.tocar(p.getByRole('tab', { name: /^Semana$/ }).first(), 1100)
      await h.tocar(p.getByRole('tab', { name: /^Mes$/ }).first(), 1100)
      await h.desplazar(300, 800)
    },
  },
  horario: {
    ruta: '/dashboard/empleados/horario', async pasos(p, h) {
      await h.esperar(600)
      await h.desplazar(260, 800); await h.esperar(300); await h.desplazar(-260, 500)
      await h.tocar(p.getByRole('button', { name: /siguiente|Semana siguiente/i }).first(), 800)
    },
  },
  nomina: {
    ruta: '/dashboard/empleados/nomina', async pasos(p, h) {
      await h.esperar(600)
      await h.tocar(p.getByRole('button', { name: /^Pagar$/ }).first(), 900, 'cobro')
    },
  },
  tareas: {
    ruta: '/dashboard/tareas', async pasos(p, h) {
      await h.esperar(600)
      await h.tocar(p.getByRole('checkbox').first().or(p.getByLabel(/Marcar/).first()), 900, 'check')
    },
  },
  bitacora: {
    ruta: '/dashboard/bitacora', async pasos(p, h) {
      await h.esperar(600)
      await h.tocar(p.locator('button[aria-expanded]').first(), 800)
      await h.desplazar(220, 700)
    },
  },
  empleados: { ruta: '/dashboard/empleados', async pasos(p, h) { await h.esperar(600); await h.desplazar(380, 1000); await h.esperar(400) } },
  // ── Claro y oscuro, computador ──
  tema: {
    ruta: '/dashboard/mi-perfil', async pasos(p, h) {
      await h.esperar(800)
      await h.tocar(p.getByRole('button', { name: /^Oscuro/ }).first().or(p.getByText('Oscuro', { exact: true }).first()), 1600)
      await h.tocar(p.getByRole('button', { name: /^Claro/ }).first().or(p.getByText('Claro', { exact: true }).first()), 1200)
    },
  },
  inicioOscuro: { tema: 'oscuro', ruta: '/dashboard', async pasos(p, h) { await h.esperar(800); await h.desplazar(300, 1000); await h.esperar(500) } },
  inicio: { ruta: '/dashboard', async pasos(p, h) { await h.esperar(800); await h.desplazar(300, 1000); await h.esperar(500) } },
  pc: {
    pc: true, ruta: '/dashboard', async pasos(p, h) {
      await h.esperar(900)
      await p.getByRole('link', { name: /^Reportes$/ }).first().click(); await h.esperar(1500)
      await h.desplazar(500, 1400); await h.esperar(800)
    },
  },
}

async function grabar(browser, nombre, g) {
  const opciones = g.pc
    ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 }
    : g.horizontal
      ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: ESCALA, isMobile: true, hasTouch: true }
      : { viewport: { width: 390, height: 844 }, deviceScaleFactor: ESCALA, isMobile: true, hasTouch: true }
  const ctx = await browser.newContext(opciones)
  await ctx.addCookies([{ name: 'tema', value: g.tema || 'claro', domain: 'localhost', path: '/' }, cookieSesion])
  await ctx.addInitScript(SCRIPT_TOQUE)
  // Los enlaces de WhatsApp abren otra pestaña: se cierran sin grabar
  const page = await ctx.newPage()
  ctx.on('page', np => { if (np !== page) np.close().catch(() => {}) })
  page.on('pageerror', e => console.log('  error de página:', e.message.slice(0, 120)))
  await page.goto(BASE + g.ruta, { waitUntil: 'load', timeout: 60000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  await esperar(400)

  const ancho = Math.round(opciones.viewport.width * opciones.deviceScaleFactor)
  const alto = Math.round(opciones.viewport.height * opciones.deviceScaleFactor)
  const cdp = await ctx.newCDPSession(page)
  const cuadros = []
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    cuadros.push({ data, t: metadata.timestamp })
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: ancho, maxHeight: alto, everyNthFrame: 1 })
  const inicio = Date.now()
  const eventos = []
  const marcar = tipo => eventos.push({ tipo, t: Date.now() / 1000 })
  try { await g.pasos(page, ayudas(page, marcar)) } catch (e) { console.log('  paso falló:', e.message.split('\n')[0]) }
  await esperar(500)
  await cdp.send('Page.stopScreencast').catch(() => {})
  const fin = Date.now()
  await ctx.close()

  // Arma el MP4 respetando el tiempo real entre cuadros (la pantalla solo manda cuadros cuando cambia)
  const dir = path.join(SALIDA, `_${nombre}`)
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
  const lista = []
  cuadros.forEach((c, i) => {
    const f = path.join(dir, `c${String(i).padStart(5, '0')}.jpg`)
    fs.writeFileSync(f, Buffer.from(c.data, 'base64'))
    const sig = i + 1 < cuadros.length ? cuadros[i + 1].t : c.t + Math.max(0.5, (fin - inicio) / 1000 - (c.t - cuadros[0].t))
    lista.push(`file '${f}'\nduration ${Math.max(sig - c.t, 0.001).toFixed(4)}`)
  })
  if (!cuadros.length) { console.log('  sin cuadros'); return }
  lista.push(`file '${path.join(dir, `c${String(cuadros.length - 1).padStart(5, '0')}.jpg`)}'`)
  fs.writeFileSync(path.join(dir, 'lista.txt'), lista.join('\n'))
  const salida = path.join(SALIDA, `${nombre}.mp4`)
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'lista.txt'),
    '-vf', `fps=30,scale=${ancho - (ancho % 2)}:${alto - (alto % 2)},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-movflags', '+faststart', salida])
  fs.rmSync(dir, { recursive: true, force: true })
  // Segundo de cada sonido dentro del MP4 (el video empieza en el primer cuadro)
  const archivoEventos = path.join(__dirname, '..', 'src', 'eventos.json')
  const todos = fs.existsSync(archivoEventos) ? JSON.parse(fs.readFileSync(archivoEventos, 'utf8')) : {}
  todos[nombre] = eventos.map(e => ({ tipo: e.tipo, t: Number((e.t - cuadros[0].t).toFixed(3)) })).filter(e => e.t >= 0)
  fs.writeFileSync(archivoEventos, JSON.stringify(todos, null, 1) + '\n')
  console.log(`  reloj: primer cuadro ${(cuadros[0].t - inicio / 1000).toFixed(3)} s después de empezar; ${eventos.length} sonidos`)
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', salida]).toString().trim()
  console.log(`ok ${nombre}: ${cuadros.length} cuadros, ${Number(dur).toFixed(1)} s`)
}

;(async () => {
  fs.mkdirSync(SALIDA, { recursive: true })
  const browser = await chromium.launch()
  for (const [nombre, g] of Object.entries(guiones)) {
    if (FILTRO && !FILTRO.test(nombre)) continue
    await grabar(browser, nombre, g)
  }
  await browser.close()
})()
