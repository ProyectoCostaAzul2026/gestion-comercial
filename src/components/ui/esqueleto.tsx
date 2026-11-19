// Siluetas de carga: se muestran mientras el servidor arma la página (archivos loading.tsx).
// Imitan la forma de cada vista para que el cambio de pantalla se sienta inmediato.

function Bloque({ className = '' }: { className?: string }) {
  return <div className={`rounded-xl bg-white/[0.06] ${className}`} aria-hidden />
}

function Contenedor({ children, etiqueta }: { children: React.ReactNode; etiqueta: string }) {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label={etiqueta}>
      {children}
      <span className="sr-only">{etiqueta}…</span>
    </div>
  )
}

/** Encabezado de sección (título grande con botones) */
function Encabezado({ botones = 1 }: { botones?: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-superficie p-4">
      <div className="space-y-2">
        <Bloque className="h-7 w-36" />
        <Bloque className="h-3 w-24" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: botones }, (_, i) => <Bloque key={i} className="h-11 w-24 md:w-32" />)}
      </div>
    </div>
  )
}

/** Barra fija de las subpáginas: flecha de volver y título */
function BarraSubpagina() {
  return (
    <div className="-mx-4 -mt-4 flex items-center gap-3 border-b border-linea px-4 py-3 md:-mx-6 md:-mt-6">
      <Bloque className="h-10 w-10" />
      <div className="space-y-1.5">
        <Bloque className="h-5 w-40" />
        <Bloque className="h-3 w-24" />
      </div>
    </div>
  )
}

function Indicadores({ cuantos = 4 }: { cuantos?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: cuantos }, (_, i) => (
        <div key={i} className="space-y-3 rounded-2xl bg-superficie p-4">
          <Bloque className="h-3 w-20" />
          <Bloque className="h-7 w-24" />
        </div>
      ))}
    </div>
  )
}

function Filas({ cuantas = 6 }: { cuantas?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: cuantas }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl bg-superficie p-3">
          <div className="flex-1 space-y-2">
            <Bloque className="h-4 w-2/5" />
            <Bloque className="h-3 w-3/5" />
          </div>
          <Bloque className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Listas con indicadores arriba: Ventas, Clientes, Proveedores, Empleados, Recepción, Nómina, Bitácora */
export function EsqueletoLista({ indicadores = false, etiqueta = 'Cargando lista' }: { indicadores?: boolean; etiqueta?: string }) {
  return (
    <Contenedor etiqueta={etiqueta}>
      <Encabezado botones={2} />
      {indicadores && <Indicadores />}
      <Bloque className="h-12 w-full" />
      <Filas cuantas={7} />
    </Contenedor>
  )
}

/** Inventario por tarjetas */
export function EsqueletoTarjetas() {
  return (
    <Contenedor etiqueta="Cargando inventario">
      <Encabezado botones={0} />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => <Bloque key={i} className="h-11" />)}
      </div>
      <Bloque className="h-12 w-full" />
      <Bloque className="h-3 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-superficie">
            <Bloque className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Bloque className="h-4 w-3/4" />
              <Bloque className="h-3 w-1/2" />
              <Bloque className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    </Contenedor>
  )
}

/** Detalle de un registro: venta, producto, cliente, proveedor, empleado, recepción */
export function EsqueletoDetalle({ etiqueta = 'Cargando detalle' }: { etiqueta?: string }) {
  return (
    <Contenedor etiqueta={etiqueta}>
      <BarraSubpagina />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl bg-superficie p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex justify-between gap-4">
                <Bloque className="h-4 w-24" />
                <Bloque className="h-4 w-32" />
              </div>
            ))}
          </div>
          <Filas cuantas={4} />
        </div>
        <div className="space-y-3 rounded-2xl bg-superficie p-4">
          <Bloque className="h-5 w-32" />
          <Bloque className="h-11 w-full" />
          <Bloque className="h-11 w-full" />
        </div>
      </div>
    </Contenedor>
  )
}

/** Formularios: nuevo o editar producto, cliente, proveedor, empleado, nómina, factura */
export function EsqueletoFormulario({ etiqueta = 'Cargando formulario' }: { etiqueta?: string }) {
  return (
    <Contenedor etiqueta={etiqueta}>
      <BarraSubpagina />
      <div className="max-w-3xl space-y-4 rounded-2xl bg-superficie p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Bloque className="h-3 w-20" /><Bloque className="h-11 w-full" /></div>
            <div className="space-y-1.5"><Bloque className="h-3 w-24" /><Bloque className="h-11 w-full" /></div>
          </div>
        ))}
        <Bloque className="h-12 w-full" />
      </div>
    </Contenedor>
  )
}

/** Paneles con indicadores y gráficas: Caja, Contabilidad, Reportes */
export function EsqueletoPanel({ etiqueta = 'Cargando panel' }: { etiqueta?: string }) {
  return (
    <Contenedor etiqueta={etiqueta}>
      <Encabezado botones={1} />
      <Indicadores />
      <div className="grid gap-4 lg:grid-cols-2">
        <Bloque className="h-64 w-full rounded-2xl" />
        <Bloque className="h-64 w-full rounded-2xl" />
      </div>
      <Filas cuantas={4} />
    </Contenedor>
  )
}

/** Nueva venta y cotización: buscador y carrito a la izquierda, resumen a la derecha */
export function EsqueletoVenta() {
  return (
    <Contenedor etiqueta="Preparando la venta">
      <BarraSubpagina />
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-3 rounded-2xl bg-superficie p-4">
              <Bloque className="h-5 w-28" />
              <Bloque className="h-12 w-full" />
              {i === 1 && <Bloque className="h-24 w-full" />}
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-2xl bg-superficie p-4 lg:w-80">
          <Bloque className="h-5 w-24" />
          {[0, 1, 2, 3].map(i => <div key={i} className="flex justify-between"><Bloque className="h-4 w-20" /><Bloque className="h-4 w-16" /></div>)}
          <Bloque className="h-12 w-full" />
          <Bloque className="h-12 w-full" />
        </div>
      </div>
    </Contenedor>
  )
}

/** Horario semanal */
export function EsqueletoSemana() {
  return (
    <Contenedor etiqueta="Cargando horario">
      <Encabezado botones={0} />
      <Bloque className="h-14 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="space-y-2 rounded-2xl bg-superficie p-2">
            <Bloque className="h-8 w-full" />
            <Bloque className="h-10 w-full" />
            <Bloque className="h-10 w-full" />
          </div>
        ))}
      </div>
    </Contenedor>
  )
}
