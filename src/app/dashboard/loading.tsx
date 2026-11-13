// Se muestra mientras el servidor arma la página: en el celular confirma el toque al instante
export default function CargandoDashboard() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Cargando">
      <div className="h-24 rounded-2xl border border-white/10 bg-[#111820]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-[#111820]" />)}
      </div>
      <div className="h-12 rounded-xl bg-[#111820]" />
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-2xl bg-[#111820]" />)}
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
