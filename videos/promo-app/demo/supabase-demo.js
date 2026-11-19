// Servidor que imita a Supabase con los datos de demostración (datos.js), para grabar el video sin tocar la base real.
const http = require('http')
const fs = require('fs')
const path = require('path')
const { USER, ROL, productos, clientes, tablas } = require('./datos')

const leer = req => new Promise(r => { let b = ''; req.on('data', c => (b += c)); req.on('end', () => r(b)) })

http.createServer(async (req, res) => {
  if (process.env.DEMORA && req.url.startsWith('/rest/')) await new Promise(r => setTimeout(r, Number(process.env.DEMORA)))
  const url = new URL(req.url, 'http://x')
  // Fotos y logo de la demostración
  if (url.pathname.startsWith('/demo/img/')) {
    const f = path.join(__dirname, 'img', path.basename(url.pathname))
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end() }
    const ext = path.extname(f).slice(1).replace('jpg', 'jpeg')
    res.writeHead(200, { 'Content-Type': `image/${ext}`, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=3600' })
    return res.end(fs.readFileSync(f))
  }
  // Storage: subir (binario) y servir lo subido
  if (url.pathname.startsWith('/storage/v1/object/')) {
    const fs = require('fs'), path = require('path')
    const dir = path.join(__dirname, 'subidas'); fs.mkdirSync(dir, { recursive: true })
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
    if (req.method === 'OPTIONS') { res.writeHead(200, cors); return res.end() }
    const ruta = url.pathname.replace('/storage/v1/object/public/', '').replace('/storage/v1/object/', '')
    const archivo = path.join(dir, ruta.replace(/\//g, '__'))
    if (req.method === 'POST' || req.method === 'PUT') {
      const partes = []; for await (const c of req) partes.push(c)
      let buf = Buffer.concat(partes)
      // multipart: quedarse solo con el archivo (la parte con Content-Type de imagen), como hace Storage
      let tipo = req.headers['content-type'] || ''
      const cab = buf.indexOf(Buffer.from('Content-Type: image', 'latin1'))
      if (tipo.startsWith('multipart/') && cab > 0) {
        const ini = buf.indexOf(Buffer.from('\r\n\r\n', 'latin1'), cab); const fin = buf.indexOf(Buffer.from('\r\n--', 'latin1'), ini)
        tipo = buf.slice(cab + 14, buf.indexOf(Buffer.from('\r\n', 'latin1'), cab)).toString('latin1').trim()
        buf = buf.slice(ini + 4, fin)
      }
      fs.writeFileSync(archivo, buf); fs.writeFileSync(archivo + '.tipo', tipo)
      console.log('STORAGE subida', ruta, buf.length, 'bytes', req.headers['content-type'])
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ Key: ruta, Id: 'x' }))
    }
    if (fs.existsSync(archivo)) { res.writeHead(200, { ...cors, 'Content-Type': fs.readFileSync(archivo + '.tipo', 'utf8') }); return res.end(fs.readFileSync(archivo)) }
    res.writeHead(404, cors); return res.end()
  }
  const cuerpo = await leer(req)
  const cab = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': '*' }
  const enviar = (code, obj, extra = {}) => { res.writeHead(code, { ...cab, ...extra }); res.end(obj === undefined ? '' : JSON.stringify(obj)) }
  if (req.method === 'OPTIONS') return enviar(200, {})
  if (url.pathname === '/auth/v1/user') return enviar(200, USER)
  if (url.pathname.startsWith('/auth/v1/')) return enviar(200, {})

  if (url.pathname === '/rest/v1/rpc/mover_productos') {
    const a = JSON.parse(cuerpo || '{}')
    if (process.env.FALLAR) return enviar(400, { message: 'Ya existe un producto con ese nombre, marca y medida', code: 'P0001' })
    for (const p of productos) if (a.p_producto_ids.includes(p.id)) {
      if (a.p_caracteristica) { p.caracteristica = a.p_caracteristica; p.nombre = `${p.nombre.split(' - ')[0]} - ${a.p_caracteristica}` }
      if (a.p_categoria_id) p.categoria_id = a.p_categoria_id
    }
    console.log('RPC mover_productos', JSON.stringify(a))
    return enviar(200, a.p_producto_ids.length)
  }
  if (url.pathname === '/rest/v1/rpc/registrar_conteo_inventario') { console.log('RPC conteo', cuerpo); return process.env.SIN_RPC ? enviar(404, { code: 'PGRST202', message: 'no existe' }) : enviar(200, 2) }
  if (url.pathname === '/rest/v1/rpc/buscar_productos') {
    const q = (JSON.parse(cuerpo || '{}').p_query || '').toLowerCase().trim()
    const lista = productos.filter(p => !q || `${p.nombre} ${p.unidad_medida} ${p.codigo}`.toLowerCase().includes(q)).slice(0, 10)
    return enviar(200, lista.map(p => ({ ...p, nombre: p.nombre, precios_cantidad: p.tramos, similitud: 1 })))
  }
  if (url.pathname === '/rest/v1/rpc/buscar_clientes') {
    const q = (JSON.parse(cuerpo || '{}').p_query || '').toLowerCase()
    return enviar(200, clientes.filter(c => c.nombre.toLowerCase().includes(q)).slice(0, 8))
  }
  if (url.pathname === '/rest/v1/rpc/registrar_venta' || url.pathname === '/rest/v1/rpc/registrar_venta_credito') { console.log('RPC venta', cuerpo.slice(0, 300)); return enviar(200, 'v1200') }
  if (url.pathname === '/rest/v1/rpc/calcular_rotacion_productos') return enviar(200, productos.map((p, i) => ({ producto_id: p.id, unidades_vendidas: (i * 7) % 40, rotacion_diaria: ((i * 7) % 40) / 90 })))
  if (url.pathname === '/rest/v1/rpc/is_admin') return enviar(200, ROL === 'administrador')
  if (url.pathname.startsWith('/rest/v1/rpc/')) return enviar(200, [])

  const tabla = url.pathname.replace('/rest/v1/', '')
  if (req.method === 'PATCH' && tabla === 'productos') {
    const ids = (url.searchParams.get('id') || '').replace(/^in\.\(|\)$/g, '').split(',').map(s => s.replace(/"/g, ''))
    const cambios = JSON.parse(cuerpo || '{}')
    for (const p of productos) if (ids.includes(p.id)) Object.assign(p, cambios)
    console.log('PATCH productos', ids.join(','), cuerpo)
    return enviar(204)
  }
  if (req.method === 'PATCH' || req.method === 'POST') console.log(req.method, tabla, cuerpo)
  let filas = tablas[tabla] ? tablas[tabla]() : []
  // Filtros de igualdad sencillos (id=eq.x) para las páginas de detalle
  // Filtros como PostgREST (eq, neq, gt, gte, lt, lte, in, is), también sobre campos anidados ("ventas.fecha").
  // Un campo que la fila no trae no filtra (el demo no tiene todas las columnas).
  const RESERVADOS = new Set(['select', 'order', 'limit', 'offset', 'or', 'and', 'columns', 'on_conflict'])
  const leerCampo = (fila, k) => k.split('.').reduce((o, c) => (o == null ? undefined : Array.isArray(o) ? o[0]?.[c] : o[c]), fila)
  for (const [k, v] of url.searchParams) {
    if (RESERVADOS.has(k)) continue
    const m = /^(not\.)?(eq|neq|gt|gte|lt|lte|in|is|like|ilike)\.(.*)$/.exec(v)
    if (!m) continue
    const [, neg, op, val] = m
    filas = filas.filter(f => {
      const x = leerCampo(f, k)
      if (x === undefined) return true
      let r
      if (op === 'eq') r = String(x) === val
      else if (op === 'neq') r = String(x) !== val
      else if (op === 'in') r = val.replace(/^\(|\)$/g, '').split(',').map(t => t.replace(/"/g, '')).includes(String(x))
      else if (op === 'is') r = val === 'null' ? x === null : String(x) === val
      else if (op === 'like' || op === 'ilike') r = new RegExp('^' + val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[*%]/g, '.*') + '$', 'i').test(String(x))
      else { const a1 = String(x), b1 = val; r = op === 'gt' ? a1 > b1 : op === 'gte' ? a1 >= b1 : op === 'lt' ? a1 < b1 : a1 <= b1; if (!isNaN(+x) && !isNaN(+val) && !/^\d{4}-/.test(val)) r = op === 'gt' ? +x > +val : op === 'gte' ? +x >= +val : op === 'lt' ? +x < +val : +x <= +val }
      return neg ? !r : r
    })
  }
  // Paginación como PostgREST: offset/limit en la dirección o encabezado Range
  const total = filas.length
  let desde = Number(url.searchParams.get('offset') || 0)
  let lim = url.searchParams.get('limit') != null ? Number(url.searchParams.get('limit')) : null
  const rh = req.headers['range']
  if (rh && /^\d+-\d+$/.test(rh)) { const [a1, b1] = rh.split('-').map(Number); desde = a1; lim = b1 - a1 + 1 }
  if (lim != null) filas = filas.slice(desde, desde + lim)
  const rango = { 'Content-Range': `${desde}-${Math.max(desde + filas.length - 1, desde)}/${total}` }
  if (req.method === 'HEAD') { res.writeHead(200, { ...cab, ...rango }); return res.end() }
  if ((req.headers.accept || '').includes('vnd.pgrst.object')) {
    if (!filas.length) return (req.headers.accept.includes('nulls=stripped') || true) ? enviar(406, { code: 'PGRST116', message: 'no rows', details: 'The result contains 0 rows' }) : null
    return enviar(200, filas[0], rango)
  }
  enviar(200, filas, rango)
}).listen(54321, () => console.log('Supabase falso en 54321, rol', ROL))
