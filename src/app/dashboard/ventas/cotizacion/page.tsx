import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CotizacionForm } from '@/components/modulos/cotizacion-form'

export default async function CotizacionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: catalogo }, { data: config }] = await Promise.all([
    supabase.from('servicios').select('id, nombre, descripcion, precio').eq('activo', true).order('nombre'),
    supabase.from('configuracion_negocio').select('nombre, nit, direccion, telefono, ciudad, regimen, mensaje_pie, logo_url, whatsapp_negocio, max_descuento_porcentaje').single(),
  ])

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/ventas" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-steel-900">Nueva Cotización</h1>
      </div>
      <CotizacionForm
        catalogo={catalogo ?? []}
        config={config as any}
        maxDescuentoPct={(config as any)?.max_descuento_porcentaje ?? 0.10}
      />
    </div>
  )
}