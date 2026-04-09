import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return new NextResponse('Unauthorized', { status: 401 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const today = new Date().toISOString().split('T')[0]
  let tcBna = null, tcBlue = null
  try {
    const r = await fetch(`https://api.estadisticasbcra.ar/api/v2/variables/4/datos?desde=${today}&hasta=${today}`)
    if (r.ok) { const d = await r.json(); tcBna = d[0]?.v ?? null }
  } catch(e) { console.error('BCRA error', e) }
  if (!tcBna) {
    const { data } = await supabase.from('tipo_cambio').select('tc_bna_venta').not('tc_bna_venta','is',null).order('fecha',{ascending:false}).limit(1).single()
    if (data) tcBna = data.tc_bna_venta
  }
  try {
    const r = await fetch('https://api.bluelytics.com.ar/v2/latest')
    if (r.ok) { const d = await r.json(); tcBlue = d.blue?.value_sell ?? null }
  } catch(e) { console.error('Bluelytics error', e) }
  const { error } = await supabase.from('tipo_cambio').upsert({ fecha:today, tc_bna_venta:tcBna, tc_blue_venta:tcBlue, updated_at:new Date().toISOString() }, { onConflict:'fecha' })
  if (error) return NextResponse.json({ ok:false, error:error.message }, { status:500 })
  return NextResponse.json({ ok:true, fecha:today, tc_bna:tcBna, tc_blue:tcBlue })
}
