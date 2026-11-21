// Datos de demostración para grabar el video de la app. Todo es inventado: productos, clientes, empleados y cifras.
// Nunca se usan datos ni cifras reales del negocio.
const fs = require('fs')
const path = require('path')

const BASE = process.env.DEMO_URL || 'http://localhost:54321'
const fotosDisponibles = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'fotos.json'), 'utf8')) } catch { return {} }
})()
const foto = clave => (fotosDisponibles[clave] ? `${BASE}/demo/img/${fotosDisponibles[clave]}` : null)

// Generador pseudoaleatorio con semilla: las capturas salen iguales cada vez
let semilla = 20261119
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648 }
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1))
const elegir = arr => arr[Math.floor(azar() * arr.length)]

const ahora = Date.now()
const diaB = d => new Date(ahora - 5 * 3600e3 + d * 86400e3).toISOString().slice(0, 10)
const hoy = diaB(0)

const USER = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'admin@demo.co', app_metadata: {}, user_metadata: {} }
const ROL = process.env.ROL || 'administrador'
const PERFIL = { id: USER.id, rol: ROL, activo: true, nombre_completo: 'Daniela Pérez', telefono: '3001234567', salario_base: 0, foto_url: null, email: USER.email, created_at: diaB(-200) }
const perfiles = [
  PERFIL,
  { id: 'e2', rol: 'empleado', activo: true, nombre_completo: 'Jhon Castro', telefono: '3017654321', salario_base: 1423500, foto_url: null, email: 'jhon@demo.co', created_at: diaB(-150) },
  { id: 'e3', rol: 'empleado', activo: true, nombre_completo: 'Marcela Ruiz', telefono: '3029876543', salario_base: 1423500, foto_url: null, email: 'marcela@demo.co', created_at: diaB(-90) },
]
const nombreDe = id => (perfiles.find(p => p.id === id) || PERFIL).nombre_completo

// ── Catálogo ──
const categorias = [
  { id: 'c-herr', nombre: 'Herramientas Manuales', foto: 'martillo' },
  { id: 'c-ilum', nombre: 'Iluminación', foto: 'bombillo_led' },
  { id: 'c-medi', nombre: 'Herramientas de Medición', foto: 'flexometro' },
  { id: 'c-cerr', nombre: 'Cerraduras y Seguridad', foto: 'candado' },
].map(c => ({ id: c.id, nombre: c.nombre, imagen_url: foto(c.foto), descripcion: null }))

// familia, característica, marca, medidas, precio base, paso de precio, categoría, foto, extras
const grupos = [
  ['Martillo', 'Uña Mango Madera', 'Generica', ['16 Onza', '20 Onza', '24 Onza'], 18900, 4000, 'c-herr', 'martillo'],
  ['Destornillador', 'Estrella', 'Generica', ['1/8x4 Pulgada', '1/4x4 Pulgada', '1/4x6 Pulgada', '5/16x8 Pulgada'], 6500, 1500, 'c-herr', 'destornillador'],
  ['Alicate', 'Universal', 'Generica', ['6 Pulgada', '7 Pulgada', '8 Pulgada'], 15900, 3000, 'c-herr', 'alicate'],
  ['Bombillo LED', 'Luz Blanca', 'Generica', ['5 W', '7 W', '9 W', '12 W', '15 W', '18 W'], 4200, 1100, 'c-ilum', 'bombillo_led', { tramos: true }],
  ['Bombillo LED', 'Luz Calida', 'Generica', ['7 W', '9 W', '12 W'], 5600, 1200, 'c-ilum', 'bombillo_led'],
  ['Flexometro', 'Carcasa Caucho', 'Generica', ['3 Metro', '5 Metro', '8 Metro'], 9800, 4000, 'c-medi', 'flexometro'],
  ['Candado', 'Acero', 'Generica', ['30 mm', '40 mm', '50 mm'], 14500, 6000, 'c-cerr', 'candado'],
]
const familias = []
const productos = []
let nProd = 0
for (const [fam, car, marca, medidas, precio, paso, catId, fotoClave, extra = {}] of grupos) {
  let f = familias.find(x => x.nombre_base === fam)
  if (!f) { f = { id: `f${familias.length + 1}`, nombre_base: fam, imagen_url: foto(fotoClave), created_at: diaB(-300) }; familias.push(f) }
  medidas.forEach((m, i) => {
    nProd++
    const pv = precio + paso * i
    const stock = entre(0, 6) === 0 ? entre(0, 1) : entre(4, 60)
    const cat = categorias.find(c => c.id === catId)
    productos.push({
      id: `p${nProd}`, codigo: `${fam.slice(0, 3).toUpperCase()}-${String(nProd).padStart(4, '0')}`, nombre: `${fam} - ${car}`, caracteristica: car, marca,
      unidad_medida: m, precio_venta: pv, precio_costo_base: Math.round(pv * 0.6), stock_actual: stock, stock_almacen: Math.ceil(stock * 0.7), stock_bodega: Math.floor(stock * 0.3),
      stock_minimo: 3, prioridad: 2, familia_id: f.id, categoria_id: catId, imagen_url: foto(fotoClave), activo: true, por_completar: false,
      orden_medida: i, ubicacion: `Estante ${entre(1, 9)}`, peso_unitario_g: extra.peso ?? null,
      vender_por_fraccion: !!extra.fraccion, medida_venta: extra.fraccion ? 'Metro' : null, cantidad_total_unidad: extra.fraccion ? 100 : null,
      cantidad_minima_venta: extra.fraccion ? 1 : null, precio_por_unidad_medida: extra.fraccion ? pv : null, remanente_fraccion: 0,
      tiene_iva: true, iva_incluido: false, porcentaje_iva: 19, descripcion: `${fam} ${car.toLowerCase()} de buena calidad.`, created_at: diaB(-200),
      desactivado_en: null, producto_familias: { id: f.id, nombre_base: fam, imagen_url: f.imagen_url }, categorias_producto: { id: catId, nombre: cat.nombre },
      tramos: extra.tramos ? [{ cantidad_minima: 10, precio_unitario: Math.round(pv * 0.9 / 50) * 50 }, { cantidad_minima: 50, precio_unitario: Math.round(pv * 0.8 / 50) * 50 }] : [],
    })
  })
}
// Algunos agotados o en el mínimo, para la pantalla de pedido sugerido
for (const [id, st] of [['p2', 0], ['p9', 1], ['p17', 0], ['p21', 2], ['p24', 1]]) { const x = productos.find(p => p.id === id); if (x) Object.assign(x, { stock_actual: st, stock_almacen: st, stock_bodega: 0 }) }
const precioCantidad = productos.flatMap(p => p.tramos.map((t, i) => ({ id: `${p.id}-t${i}`, producto_id: p.id, ...t })))

// ── Clientes ──
const nombresClientes = ['Cliente General', 'Carlos Rodríguez', 'Marta Jiménez', 'Obras Rivera SAS', 'Pedro Salazar', 'Luz Ángela Moreno', 'Construcciones Andina', 'Jorge Patiño']
const clientes = nombresClientes.map((nombre, i) => ({
  id: `cl${i}`, nombre, telefono: i ? `30${entre(10, 29)}${entre(1000000, 9999999)}` : null, email: null, nit_cc: i ? `${entre(10000000, 99999999)}` : null,
  es_cliente_generico: i === 0, activo: true, direccion: i % 3 ? 'Bogotá' : null, created_at: diaB(-120 + i), saldo_credito: 0,
}))

// ── Ventas de los últimos 45 días ──
const medios = ['efectivo', 'efectivo', 'efectivo', 'nequi', 'nequi', 'daviplata', 'tarjeta']
const ventas = []
const ventaItems = []
const ventaPagos = []
let ticket = 1000
for (let d = -44; d <= 0; d++) {
  const fecha = diaB(d)
  const diaSemana = new Date(fecha + 'T12:00:00').getDay()
  const cuantas = diaSemana === 0 ? entre(2, 5) : entre(6, 14) + (diaSemana === 6 ? 4 : 0)
  for (let k = 0; k < cuantas; k++) {
    const id = `v${++ticket}`
    const hora = `${String(entre(8, 18)).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}:00`
    const items = []
    const nItems = entre(1, 4)
    for (let j = 0; j < nItems; j++) {
      const p = elegir(productos)
      const cant = p.precio_venta < 6000 ? entre(1, 6) : entre(1, 2)
      items.push({ p, cant })
    }
    const total = items.reduce((a, it) => a + it.p.precio_venta * it.cant, 0)
    const cli = azar() < 0.55 ? clientes[0] : elegir(clientes.slice(1))
    const credito = azar() < 0.07 && cli.id !== 'cl0'
    const mixto = !credito && azar() < 0.12
    const empleado = elegir(perfiles).id
    const tipo = credito ? 'credito' : mixto ? 'mixto' : elegir(medios)
    const estado = azar() < 0.02 ? 'anulada' : 'completada'
    const descuento = azar() < 0.15 ? Math.round(total * 0.05 / 100) * 100 : 0
    const v = {
      id, numero_ticket: ticket, fecha, hora, total: total - descuento, subtotal: total, total_descuentos: descuento, monto_devolucion: 0, tipo_pago: tipo, estado,
      empleado_id: empleado, cliente_id: cli.id, clientes: { id: cli.id, nombre: cli.nombre, telefono: cli.telefono }, empleado: { nombre_completo: nombreDe(empleado) },
      profiles: { nombre_completo: nombreDe(empleado) }, observaciones: null, factura_electronica: false, created_at: `${fecha}T${hora}-05:00`, total_iva: Math.round((total - descuento) * 0.19 / 1.19),
      descuento_tipo: descuento ? 'porcentaje' : null, descuento_total_porcentaje: descuento ? 5 : 0, total_manual: null,
    }
    ventas.push(v)
    items.forEach((it, j) => ventaItems.push({
      id: `${id}-i${j}`, venta_id: id, producto_id: it.p.id, nombre_producto: `${it.p.nombre} ${it.p.unidad_medida}`, cantidad: it.cant, cantidad_fraccion: null,
      precio_unitario: it.p.precio_venta, subtotal_linea: it.p.precio_venta * it.cant, costo_unitario: it.p.precio_costo_base, descuento_linea: 0, es_fraccionado: false, iva_unitario: Math.round(it.p.precio_venta * 0.19 / 1.19),
      productos: { id: it.p.id, codigo: it.p.codigo, nombre: it.p.nombre, imagen_url: it.p.imagen_url, unidad_medida: it.p.unidad_medida, marca: it.p.marca, tiene_iva: true, iva_incluido: false, porcentaje_iva: 19, cantidad_total_unidad: it.p.cantidad_total_unidad, producto_familias: { nombre_base: it.p.producto_familias.nombre_base }, categorias_producto: { nombre: it.p.categorias_producto.nombre } },
      ventas: { id, fecha, estado, numero_ticket: ticket, hora }, devolucion_items: [],
    }))
    if (credito) ventaPagos.push({ id: `${id}-pg`, venta_id: id, metodo: 'credito', monto: v.total, ventas: { fecha, estado } })
    else if (mixto) {
      const a = Math.round(v.total * 0.6 / 100) * 100
      ventaPagos.push({ id: `${id}-pg1`, venta_id: id, metodo: 'efectivo', monto: a, ventas: { fecha, estado } }, { id: `${id}-pg2`, venta_id: id, metodo: 'nequi', monto: v.total - a, ventas: { fecha, estado } })
    } else ventaPagos.push({ id: `${id}-pg`, venta_id: id, metodo: tipo, monto: v.total, ventas: { fecha, estado } })
  }
}
ventas.sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))
// La venta más reciente es de una clienta con teléfono, para mandarle el recibo por WhatsApp en el video
{ const c = clientes[2]; Object.assign(ventas[0], { cliente_id: c.id, clientes: { id: c.id, nombre: c.nombre, telefono: c.telefono } }) }
const ventaConDetalle = v => ({ ...v, venta_items: ventaItems.filter(i => i.venta_id === v.id), venta_pagos: ventaPagos.filter(p => p.venta_id === v.id), venta_servicios: [], devoluciones: [] })

// ── Créditos (cartera por edades) ──
const creditos = [
  ['cl1', 85000, 120000, -3, -25, 'parcial'], ['cl3', 640000, 640000, 12, -8, 'pendiente'], ['cl4', 46000, 46000, -38, -60, 'pendiente'],
  ['cl6', 215000, 300000, -70, -95, 'parcial'], ['cl2', 32000, 32000, 4, -2, 'pendiente'], ['cl7', 18500, 18500, -110, -130, 'pendiente'],
].map(([cid, saldo, orig, pago, fecha, estado], i) => {
  const c = clientes.find(x => x.id === cid)
  const v = ventas[20 + i * 7]
  return {
    id: `vc${i + 1}`, saldo_pendiente: saldo, monto_original: orig, fecha_pago_programada: diaB(pago), cliente_id: cid, estado, created_at: diaB(fecha),
    clientes: { id: cid, nombre: c.nombre, telefono: c.telefono }, ventas: { id: v.id, numero_ticket: v.numero_ticket, fecha: diaB(fecha), total: orig, estado: 'completada' },
    abonos_credito: estado === 'parcial' ? [{ id: `ab${i}`, monto: orig - saldo, fecha: diaB(fecha + 10), metodo_pago: 'efectivo', created_at: diaB(fecha + 10) }] : [],
    venta_id: v.id,
  }
})
for (const c of clientes) c.saldo_credito = creditos.filter(x => x.cliente_id === c.id).reduce((a, x) => a + x.saldo_pendiente, 0)

// ── Proveedores y facturas ──
const proveedores = [
  { id: 'pr1', nombre: 'Distribuidora Ferretera Andina', contacto: 'Sandra Vélez', telefono: '3105550101', nit_ruc: null, email: null, direccion: 'Bogotá', notas: null, sitio_web: null, logo_url: null, activo: true },
  { id: 'pr2', nombre: 'Eléctricos del Centro', contacto: 'Mauricio Leal', telefono: '3115550202', nit_ruc: null, email: null, direccion: 'Bogotá', notas: null, sitio_web: null, logo_url: null, activo: true },
  { id: 'pr3', nombre: 'Plásticos y Tubos SAS', contacto: null, telefono: '3125550303', nit_ruc: null, email: null, direccion: null, notas: null, sitio_web: null, logo_url: null, activo: true },
]
const facturas = [
  ['fp1', 'pr1', 'DFA-2041', -18, 12, 1850000, 0, 'pendiente'], ['fp2', 'pr2', 'EC-3310', -40, -10, 920000, 400000, 'parcial'],
  ['fp3', 'pr3', 'PT-118', -6, 24, 640000, 0, 'pendiente'], ['fp4', 'pr1', 'DFA-1990', -60, -30, 1200000, 1200000, 'pagada'],
].map(([id, pid, num, em, ve, total, pagado, estado]) => ({
  id, proveedor_id: pid, numero_factura: num, fecha_emision: diaB(em), fecha_vencimiento: diaB(ve), monto_total: total, monto_pagado: pagado,
  saldo_pendiente: total - pagado, estado, notas: null, proveedores: { id: pid, nombre: proveedores.find(p => p.id === pid).nombre },
  pagos_factura_proveedor: pagado ? [{ id: `${id}-p`, monto: pagado, metodo_pago: 'transferencia', fecha_pago: diaB(em + 5), observaciones: null }] : [],
  pagos_programados_proveedor: [], recepciones: [], tipo_documento: 'factura', created_at: diaB(em),
}))
for (const p of proveedores) p.facturas_proveedor = facturas.filter(f => f.proveedor_id === p.id)
const productoProveedores = productos.map((p, i) => {
  const prov = proveedores[i % 3]
  return { id: `pp${i}`, producto_id: p.id, proveedor_id: prov.id, precio_costo: p.precio_costo_base, referencia_proveedor: `REF-${1000 + i}`, notas: null, es_costo_base_manual: false, proveedores: { id: prov.id, nombre: prov.nombre }, productos: { id: p.id, nombre: p.nombre, codigo: p.codigo, imagen_url: p.imagen_url, marca: p.marca, unidad_medida: p.unidad_medida, activo: true, stock_actual: p.stock_actual, stock_minimo: p.stock_minimo, precio_venta: p.precio_venta } }
})

// ── Recepción de mercancía abierta ──
const recepcionItems = productos.filter(p => ['Bombillo LED', 'Candado', 'Flexometro'].includes(p.producto_familias.nombre_base)).filter((_, i) => i % 2 === 0).slice(0, 6).map((p, i) => ({
  id: `ri${i}`, recepcion_id: 'r1', producto_id: p.id, descripcion: `${p.nombre} ${p.unidad_medida}`, referencia: `EC-${200 + i}`, cantidad_facturada: [24, 24, 24, 12, 12, 10][i],
  costo_unitario: p.precio_costo_base, cantidad_contada: i < 3 ? [24, 23, 12][i] : null, cantidad_averiada: i === 1 ? 1 : 0, cantidad_almacen: i < 3 ? [20, 18, 12][i] : null,
  ingresado_bodega: i < 3, ingresado_almacen: i < 3, precio_aprobado: p.precio_venta, precio_venta_nuevo: p.precio_venta, estado: i < 3 ? 'contado' : 'pendiente', creado_por: 'e2', orden: i,
  productos: { id: p.id, nombre: p.nombre, codigo: p.codigo, imagen_url: p.imagen_url, marca: p.marca, unidad_medida: p.unidad_medida, precio_venta: p.precio_venta, precio_costo_base: p.precio_costo_base, activo: true, tiene_iva: true, iva_incluido: false, porcentaje_iva: 19, familia_id: p.familia_id, caracteristica: p.caracteristica },
  created_at: diaB(0),
}))
const recepciones = [{
  id: 'r1', estado: 'conteo', created_at: `${hoy}T09:10:00-05:00`, proveedor_id: 'pr2', factura_id: 'fp2', numero_factura: 'EC-3310', fecha_factura: diaB(-1), monto_total: 920000, costos_con_iva: false, notas: null, abierta_por: USER.id,
  proveedores: { id: 'pr2', nombre: 'Eléctricos del Centro' }, facturas_proveedor: { numero_factura: 'EC-3310', fecha_emision: diaB(-1), monto_total: 920000, estado: 'parcial' },
  recepcion_items: recepcionItems.map(r => ({ id: r.id, cantidad_contada: r.cantidad_contada })),
}]

// ── Caja ──
const hhmm = h => `${h}:00`
const movimientosHoy = [
  ['ingreso', 'efectivo', 86400, 'venta', '08:42'], ['ingreso', 'nequi', 42500, 'venta', '09:15'], ['ingreso', 'efectivo', 128900, 'venta', '10:03'],
  ['egreso', 'efectivo', 35000, 'gasto', '10:40'], ['ingreso', 'daviplata', 25800, 'venta', '11:22'], ['ingreso', 'efectivo', 50000, 'abono_credito', '12:05'],
  ['ingreso', 'tarjeta', 189900, 'venta', '14:30'], ['egreso', 'efectivo', 150000, 'retiro', '16:10'], ['ingreso', 'efectivo', 64300, 'venta', '17:25'],
].map(([tipo, medio, monto, ref, h], i) => ({ id: `mc${i}`, fecha: hoy, hora: hhmm(h), tipo_movimiento: tipo, origen_destino: medio, monto, referencia_tipo: ref, referencia_id: null, observaciones: ref === 'gasto' ? 'Aseo del local' : null, created_at: `${hoy}T${h}:00-05:00` }))
const saldos = [{ medio: 'efectivo', saldo_acumulado: 144600 }, { medio: 'nequi', saldo_acumulado: 342500 }, { medio: 'daviplata', saldo_acumulado: 125800 }, { medio: 'tarjeta', saldo_acumulado: 489900 }, { medio: 'credito', saldo_acumulado: 1036500 }, { medio: 'caja_mayor', saldo_acumulado: 2500000 }]
const denominaciones = [100000, 50000, 20000, 10000, 5000, 2000].map((d, i) => ({ tipo: 'billete', denominacion: d, cantidad: [1, 2, 3, 4, 3, 5][i], billetes_acumulados: 0 }))
  .concat([1000, 500, 200, 100, 50].map((d, i) => ({ tipo: 'moneda', denominacion: d, cantidad: [20, 30, 25, 20, 10][i], billetes_acumulados: 0 })))

// ── Empleados: horario, permisos, nómina, tareas, bitácora ──
const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const turnos = dias.flatMap((d, i) => [
  { id: `t${i}a`, empleado_id: USER.id, dia_semana: d, hora_inicio: d === 'domingo' ? '09:00:00' : '08:00:00', hora_fin: d === 'domingo' ? '14:00:00' : '18:00:00', activo: true, profiles: { nombre_completo: nombreDe(USER.id) } },
  ...(i < 6 ? [{ id: `t${i}b`, empleado_id: 'e2', dia_semana: d, hora_inicio: '08:00:00', hora_fin: '17:00:00', activo: true, profiles: { nombre_completo: 'Jhon Castro' } }] : []),
  ...(i > 0 ? [{ id: `t${i}c`, empleado_id: 'e3', dia_semana: d, hora_inicio: '10:00:00', hora_fin: '19:00:00', activo: true, profiles: { nombre_completo: 'Marcela Ruiz' } }] : []),
])
const permisos = [{ id: 'pe1', empleado_id: 'e3', fecha: diaB(2), motivo: 'Cita médica', created_at: diaB(-1), profiles: { nombre_completo: 'Marcela Ruiz' } }]
const nominas = perfiles.slice(1).flatMap((p, k) => Array.from({ length: 6 }, (_, i) => ({
  id: `n${k}${i}`, empleado_id: p.id, periodo_inicio: diaB(-i), periodo_fin: diaB(-i), fecha_pago: diaB(-i), horas_trabajadas: 9, salario_base: 54750, bonificaciones: i === 2 ? 10000 : 0,
  deducciones: 0, total_pagar: 54750 + (i === 2 ? 10000 : 0), total_pago: 54750 + (i === 2 ? 10000 : 0), salario_dia: 54750, estado: i === 0 ? 'pendiente' : 'pagada', metodo_pago: 'efectivo', profiles: { nombre_completo: p.nombre_completo },
})))
const tareas = [
  { id: 'ta1', titulo: 'Organizar la vitrina de bombillos', descripcion: 'Por potencia, de menor a mayor', prioridad: 'alta', asignado_a: 'e2', fecha_limite: hoy, estado: 'pendiente', hecha_por: null, hecha_en: null, nota: null, plantilla_id: null, created_at: diaB(-1), creado_por: USER.id },
  { id: 'ta2', titulo: 'Contar los candados de la vitrina', descripcion: null, prioridad: 'media', asignado_a: null, fecha_limite: diaB(1), estado: 'pendiente', hecha_por: null, hecha_en: null, nota: null, plantilla_id: 'pl1', created_at: diaB(-1), creado_por: USER.id },
  { id: 'ta3', titulo: 'Recibir el pedido de Eléctricos del Centro', descripcion: null, prioridad: 'alta', asignado_a: 'e3', fecha_limite: hoy, estado: 'pendiente', hecha_por: null, hecha_en: null, nota: null, plantilla_id: null, created_at: diaB(-2), creado_por: USER.id },
  { id: 'ta4', titulo: 'Revisar precios de alicates', descripcion: null, prioridad: 'baja', asignado_a: null, fecha_limite: null, estado: 'hecha', hecha_por: 'e2', hecha_en: new Date(ahora - 7200e3).toISOString(), nota: 'Listo, quedaron actualizados', plantilla_id: null, created_at: diaB(-3), creado_por: USER.id },
]
const plantillasTareas = [{ id: 'pl1', titulo: 'Contar los candados de la vitrina', descripcion: null, prioridad: 'media', asignado_a: null, veces_usada: 4 }]
const bit = (numero, horas, origen, accion, tabla, resumen, detalle, usuario) => ({ numero, ocurrido_en: new Date(ahora - horas * 3600e3).toISOString(), origen, usuario_id: null, usuario_nombre: usuario ?? null, rol_bd: 'authenticated', accion, tabla, registro_id: null, resumen, detalle })
const bitacora = [
  bit(214, 1, 'sistema', 'cambiar', 'productos', 'Cambio en productos: Bombillo LED - Luz Blanca (precio_venta)', { precio_venta: { antes: 6300, despues: 6500 } }, 'Daniela Pérez'),
  bit(213, 3, 'sistema', 'crear', 'retiros', 'Retiro de dinero', { monto: 150000 }, 'Daniela Pérez'),
  bit(212, 5, 'sistema', 'cambiar', 'productos', 'Ajuste de stock: Candado - Acero 40 mm', { stock_almacen: { antes: 18, despues: 16 } }, 'Jhon Castro'),
  bit(211, 20, 'sistema', 'crear', 'arqueo_caja', 'Cierre de caja', { diferencia: 0 }, 'Daniela Pérez'),
  bit(210, 26, 'sistema', 'cambiar', 'profiles', 'Cambio en profiles: Marcela Ruiz (rol)', { rol: { antes: 'empleado', despues: 'empleado' } }, 'Daniela Pérez'),
]
const garantias = [
  { id: 'g2', producto_id: 'p25', proveedor_id: 'pr2', cantidad: 2, estado: 'pendiente', observaciones: 'No enciende', fecha_envio: diaB(-2), created_at: diaB(-2), productos: { nombre: 'Bombillo LED - Luz Blanca', codigo: 'BOM-0025', imagen_url: null, unidad_medida: '5 W' }, proveedores: { nombre: 'Eléctricos del Centro' } },
  { id: 'g1', producto_id: productos[0].id, proveedor_id: 'pr1', cantidad: 1, estado: 'pendiente', observaciones: 'Mango partido', fecha_envio: diaB(-4), created_at: diaB(-4), productos: { nombre: productos[0].nombre, codigo: productos[0].codigo, imagen_url: productos[0].imagen_url, unidad_medida: productos[0].unidad_medida }, proveedores: { nombre: 'Distribuidora Ferretera Andina' } },
]
const config = {
  id: 'cfg1', nombre: 'Ferreléctricos Costa Azul', bonos_ventas: { equipo: [{ tope: 200000, bono: 5000 }, { tope: 350000, bono: 10000 }, { tope: 600000, bono: 20000 }], individual: [{ tope: 20000, bono: 1000 }, { tope: 50000, bono: 3000 }] }, nit: null, direccion: 'Bogotá, Colombia', telefono: null, email: null, ciudad: 'Bogotá', regimen: 'No responsable de IVA',
  mensaje_pie: 'Gracias por su compra', logo_url: `${BASE}/demo/img/logo.webp`, logo_subido: null, logo_enlace: null, monto_base_caja_menor: 300000, monto_inicial_monedas: 400000,
  monto_inicial_sencillo: 800000, margen_default: 0.4, max_descuento_porcentaje: 0.1, whatsapp_negocio: '3000000000', updated_at: diaB(-1),
}
const unidades = ['Pulgada', 'mm', 'cm', 'Metro', 'Onza', 'W', 'Unidad'].map((nombre, i) => ({ id: i + 1, nombre, orden: i, activo: true }))

const tablas = {
  profiles: () => perfiles,
  productos: () => productos,
  producto_familias: () => familias,
  categorias_producto: () => categorias,
  ventas: () => ventas.map(ventaConDetalle),
  venta_items: () => ventaItems,
  venta_pagos: () => ventaPagos,
  venta_servicios: () => [],
  devoluciones: () => [],
  clientes: () => clientes,
  ventas_credito: () => creditos,
  abonos_credito: () => creditos.flatMap(c => c.abonos_credito.map(a => ({ ...a, venta_credito_id: c.id }))),
  proveedores: () => proveedores,
  facturas_proveedor: () => facturas,
  pagos_factura_proveedor: () => facturas.flatMap(f => f.pagos_factura_proveedor),
  pagos_programados_proveedor: () => [],
  producto_proveedores: () => productoProveedores,
  precios_cantidad: () => precioCantidad,
  recepciones: () => recepciones,
  recepcion_items: () => recepcionItems,
  movimientos_caja: () => movimientosHoy,
  saldos_medios_pago: () => saldos,
  caja_mayor: () => [{ id: 1, saldo_actual: 2500000 }],
  fondos_denominaciones: () => denominaciones,
  arqueo_caja: () => [],
  gastos: () => [{ id: 'gs1', fecha: hoy, monto: 35000, categoria_gasto: 'Aseo', concepto: 'Productos de aseo', created_at: hoy }],
  categorias_gasto: () => ['Aseo', 'Transporte', 'Servicios', 'Papelería'].map((nombre, i) => ({ id: i + 1, nombre, activo: true })),
  nominas: () => nominas,
  horario_laboral: () => turnos,
  permisos_empleado: () => permisos,
  tareas: () => tareas,
  tareas_plantillas: () => plantillasTareas,
  bitacora: () => bitacora,
  bitacora_borrados: () => [],
  garantias: () => garantias,
  movimientos_inventario: () => productos.map(p => ({ producto_id: p.id, created_at: new Date(ahora - 20 * 86400e3).toISOString(), tipo: 'salida', cantidad: 1 })),
  historial_precios: () => [],
  configuracion_negocio: () => [config],
  unidades_medida: () => unidades,
  servicios: () => [{ id: 's1', nombre: 'Corte de llaves', descripcion: null, precio: 4000, activo: true }],
}

module.exports = { USER, ROL, PERFIL, productos, clientes, tablas, hoy }
