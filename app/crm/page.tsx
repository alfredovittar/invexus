'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import FiltroFechas from '@/components/FiltroFechas'
import FiltroVehiculos, { FiltroVehiculosState, aplicarFiltroVehiculos } from '@/components/FiltroVehiculos'
import { useLeads } from '@/hooks/useSupabase'
import { createClient } from '@/utils/supabase/client'

const ESTADOS = ['Nuevo','Contactado','Seguimiento','Negociación','Cerrado','Perdido']
const FUENTES = ['WhatsApp','Instagram','Web','Salón','Referido','Llamada','Otro']
const MODELOS = ['BJ30','BJ40','X55 II','X55 PLUS','U5 PLUS','Usado multimarca','Otro']
const VENDEDORES = ['GIULIANA','CARLITOS','GABRIEL','LUCAS','SAYAGO','GERENCIA']

export default function CRMPage() {
  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState('')

  // ── Filtros ──────────────────────────────────────────────
  const hoy = new Date().toISOString().split('T')[0]
  const primeroDeMes = hoy.substring(0,8)+'01'
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroVendedor, setFiltroVendedor] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')

  const { leads, loading, refresh } = useLeads(empresa)

  const [form, setForm] = useState({
    empresa:'INVEXUS', nombre:'', telefono:'', email:'', ciudad:'',
    vehiculo_interes:'BJ30', estado:'Nuevo', vendedor_nombre:'GIULIANA',
    fuente:'WhatsApp', proximo_contacto:'', inv_id:'', observaciones:''
  })

  const ec: Record<string,string> = {
    Nuevo:'#60a5fa', Contactado:'#a78bfa', Seguimiento:'#facc15',
    Negociación:'#fb923c', Cerrado:'#4ade80', Perdido:'#f87171'
  }

  // ── Filtro vehículo para el form ─────────────────────────
  const [filtroVehiculo, setFiltroVehiculo] = useState<FiltroVehiculosState>({
    estado: 'Disponible', marca: 'Todas', tipo: 'Todos', busqueda: '', diasStock: 'Todos',
  })
  const [inventario, setInventario] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('inventario_view')
      .select('id, empresa, marca, modelo, version, color, tipo, estado, dias_stock')
      .then(({ data }) => { if (data) setInventario(data) })
  }, [])

  const vehiculosDisponibles = aplicarFiltroVehiculos(inventario, filtroVehiculo)

  // ── Aplicar filtros a leads ───────────────────────────────
  const leadsFiltrados = leads.filter((l:any) => {
    if (filtroEstado !== 'Todos' && l.estado !== filtroEstado) return false
    if (filtroVendedor !== 'Todos' && l.vendedor_nombre !== filtroVendedor) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (
        !l.nombre?.toLowerCase().includes(q) &&
        !l.telefono?.toLowerCase().includes(q) &&
        !l.vehiculo_interes?.toLowerCase().includes(q) &&
        !l.ciudad?.toLowerCase().includes(q)
      ) return false
    }
    if (desde) {
      const fechaLead = l.created_at ? l.created_at.split('T')[0] : ''
      if (fechaLead < desde) return false
    }
    if (hasta) {
      const fechaLead = l.created_at ? l.created_at.split('T')[0] : ''
      if (fechaLead > hasta) return false
    }
    return true
  })

  const fmtFecha = (f:string|null|undefined) => {
    if (!f) return null
    const [y,m,d] = f.split('T')[0].split('-')
    return `${d}/${m}/${y.slice(2)}`
  }

  const handleGuardar = async () => {
    if (!form.nombre) { alert('Ingresá el nombre del lead'); return }
    const supabase = createClient()
    const { error } = await supabase.from('leads').insert({
      empresa:form.empresa, nombre:form.nombre, telefono:form.telefono,
      email:form.email, ciudad:form.ciudad, vehiculo_interes:form.vehiculo_interes,
      estado:form.estado, vendedor_nombre:form.vendedor_nombre, fuente:form.fuente,
      proximo_contacto:form.proximo_contacto||null,
      inv_id: form.inv_id || null,
      observaciones: form.observaciones || null,
    })
    if (error) { alert('Error: '+error.message); return }
    setToast('Lead '+form.nombre+' registrado')
    setTimeout(()=>setToast(''),3000)
    setShowForm(false)
    setForm({ empresa:'INVEXUS', nombre:'', telefono:'', email:'', ciudad:'', vehiculo_interes:'BJ30', estado:'Nuevo', vendedor_nombre:'GIULIANA', fuente:'WhatsApp', proximo_contacto:'', inv_id:'', observaciones:'' })
    refresh()
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#e2e8f0' }}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={()=>setMoneda(m=>m==='ARS'?'USD':'ARS')} />
      {toast && <div style={{ position:'fixed', top:20, right:20, background:'#166534', color:'#4ade80', border:'1px solid #16a34a', borderRadius:10, padding:'10px 18px', fontSize:13, zIndex:1000, fontWeight:500 }}>✓ {toast}</div>}
      <div style={{ padding:'20px 24px', maxWidth:1400, margin:'0 auto' }}>

        {/* ── BARRA FILTROS ── */}
        <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:10, padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#475569', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', whiteSpace:'nowrap' }}>Período</span>
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />

          {/* filtro estado */}
          <div style={{ display:'flex', gap:4, marginLeft:8, flexWrap:'wrap' }}>
            {['Todos',...ESTADOS].map(e=>(
              <button key={e} onClick={()=>setFiltroEstado(e)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:filtroEstado===e?(ec[e]||'#3b82f6')+'33':'rgba(51,65,85,.5)', color:filtroEstado===e?(ec[e]||'#60a5fa'):'#64748b', fontSize:11, cursor:'pointer', fontWeight:filtroEstado===e?600:400, borderBottom:filtroEstado===e?`2px solid ${ec[e]||'#3b82f6'}`:'2px solid transparent' }}>
                {e}{e!=='Todos'?' ('+leads.filter((l:any)=>l.estado===e).length+')':''}
              </button>
            ))}
          </div>

          {/* filtro vendedor */}
          <select value={filtroVendedor} onChange={e=>setFiltroVendedor(e.target.value)} style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:11 }}>
            <option value="Todos">Todos los vendedores</option>
            {VENDEDORES.map(v=><option key={v}>{v}</option>)}
          </select>

          {/* búsqueda */}
          <input
            value={busqueda}
            onChange={e=>setBusqueda(e.target.value)}
            placeholder="Buscar nombre, tel, modelo..."
            style={{ padding:'5px 10px', borderRadius:7, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:11, width:200 }}
          />

          <span style={{ fontSize:11, color:'#475569', marginLeft:'auto', whiteSpace:'nowrap' }}>{leadsFiltrados.length} leads</span>
          <button onClick={()=>setShowForm(v=>!v)} style={{ padding:'6px 16px', borderRadius:8, background:'#3b82f6', color:'white', border:'none', fontSize:12, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>
            + Nuevo lead
          </button>
        </div>

        {/* ── KPIs PIPELINE ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,minmax(0,1fr))', gap:10, marginBottom:16 }}>
          {ESTADOS.map(e=>(
            <div key={e} onClick={()=>setFiltroEstado(filtroEstado===e?'Todos':e)} style={{ background:'#1e293b', border:`1px solid ${filtroEstado===e?(ec[e]||'#334155'):'#334155'}`, borderRadius:10, padding:'10px 14px', cursor:'pointer', transition:'border .15s' }}>
              <div style={{ fontSize:10, color:'#475569', marginBottom:4, textTransform:'uppercase', letterSpacing:'.05em' }}>{e}</div>
              <div style={{ fontSize:22, fontWeight:700, color:ec[e]||'#f1f5f9', fontFamily:'monospace' }}>
                {leads.filter((l:any)=>l.estado===e).length}
              </div>
            </div>
          ))}
        </div>

        {/* ── FORMULARIO NUEVO LEAD ── */}
        {showForm && (
          <div style={{ background:'#1e293b', border:'1px solid #3b82f6', borderRadius:12, padding:20, marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0', marginBottom:16 }}>Registrar lead</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              {[
                ['empresa','Empresa',['INVEXUS','MAXIAUTO']],
                ['nombre','Nombre completo',null],
                ['telefono','WhatsApp',null],
                ['email','Email',null],
                ['ciudad','Ciudad',null],
                ['vehiculo_interes','Interés',MODELOS],
                ['estado','Estado',ESTADOS],
                ['vendedor_nombre','Vendedor',VENDEDORES],
                ['fuente','Fuente',FUENTES],
                ['proximo_contacto','Próximo contacto',null],
              ].map(([k,l,opts]:any)=>(
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>{l}</label>
                  {opts
                    ? <select value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12 }}>
                        {opts.map((o:string)=><option key={o}>{o}</option>)}
                      </select>
                    : <input type={k==='proximo_contacto'?'date':'text'} value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12 }} />
                  }
                </div>
              ))}
              <div style={{gridColumn:'span 2'}}>
                <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Observaciones</label>
                <input value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12 }} />
              </div>
            </div>

            {/* asignar vehículo */}
            <div style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:10, padding:'12px 14px', marginTop:16 }}>
              <div style={{ fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>
                Vehículo de interés en stock
                <span style={{ fontWeight:400, marginLeft:6, color:'#334155' }}>(opcional)</span>
              </div>
              <div style={{ marginBottom:10 }}>
                <FiltroVehiculos value={filtroVehiculo} onChange={setFiltroVehiculo} mostrarDiasStock={false} mostrarBusqueda={true} compacto={true} />
              </div>
              <select value={form.inv_id} onChange={e=>setForm({...form,inv_id:e.target.value})} style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid #334155', background:'#1e293b', color:'#e2e8f0', fontSize:12 }}>
                <option value="">— Sin vehículo asignado ({vehiculosDisponibles.length} disponibles) —</option>
                {vehiculosDisponibles.map((v:any)=>(
                  <option key={v.id} value={v.id}>
                    [{v.id}] {v.marca} {v.modelo} {v.version} — {v.color}
                    {v.dias_stock ? ` (${v.dias_stock}d en stock)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button onClick={handleGuardar} style={{ padding:'7px 20px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:12, cursor:'pointer', fontWeight:600 }}>Guardar</button>
              <button onClick={()=>setShowForm(false)} style={{ padding:'7px 16px', borderRadius:8, background:'transparent', color:'#64748b', border:'1px solid #334155', fontSize:12, cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* ── CARDS LEADS ── */}
        {loading ? <div style={{ color:'#475569', padding:40, textAlign:'center' }}>Cargando leads...</div> : (
          <>
            {leadsFiltrados.length === 0 && (
              <div style={{ color:'#475569', fontSize:13, padding:24, textAlign:'center' }}>
                {leads.length > 0 ? 'Sin leads con los filtros aplicados.' : 'Sin leads. ¡Cargá el primero!'}
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
              {leadsFiltrados.map((l:any)=>(
                <div key={l.id} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{l.nombre}</div>
                      <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{l.ciudad||'—'} · {l.fuente||'—'}</div>
                      {l.created_at && (
                        <div style={{ fontSize:10, color:'#334155', marginTop:2 }}>Ingresó: {fmtFecha(l.created_at)}</div>
                      )}
                    </div>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:600, background:(ec[l.estado]||'#94a3b8')+'22', color:ec[l.estado]||'#94a3b8', border:`1px solid ${ec[l.estado]||'#334155'}44` }}>
                      {l.estado}
                    </span>
                  </div>

                  <div style={{ fontSize:12, color:'#64748b', marginBottom:8 }}>{l.telefono||'Sin teléfono'}</div>

                  <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid #0f172a' }}>
                    <div>
                      <div style={{ fontSize:11, color:'#475569' }}>Interés</div>
                      <div style={{ fontSize:12, color:'#cbd5e1', fontWeight:500 }}>{l.vehiculo_interes}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:11, color:'#475569' }}>Vendedor</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{l.vendedor_nombre}</div>
                    </div>
                  </div>

                  {l.inv_id && (
                    <div style={{ marginTop:8, fontSize:11, color:'#60a5fa', background:'rgba(96,165,250,.08)', border:'1px solid rgba(96,165,250,.2)', borderRadius:6, padding:'4px 8px' }}>
                      🚗 {l.inv_id}
                    </div>
                  )}

                  {l.observaciones && (
                    <div style={{ marginTop:6, fontSize:11, color:'#94a3b8', background:'rgba(51,65,85,.3)', borderRadius:6, padding:'4px 8px' }}>
                      {l.observaciones}
                    </div>
                  )}

                  {l.proximo_contacto && (
                    <div style={{ marginTop:6, fontSize:11, color:'#fb923c' }}>
                      ⏰ {fmtFecha(l.proximo_contacto)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
