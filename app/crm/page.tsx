'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
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
  const { leads, loading, refresh } = useLeads(empresa)
  const [form, setForm] = useState({ empresa:'INVEXUS', nombre:'', telefono:'', email:'', ciudad:'', vehiculo_interes:'BJ30', estado:'Nuevo', vendedor_nombre:'GIULIANA', fuente:'WhatsApp', proximo_contacto:'' })
  const ec: Record<string,string> = { Nuevo:'#60a5fa', Contactado:'#a78bfa', Seguimiento:'#facc15', Negociación:'#fb923c', Cerrado:'#4ade80', Perdido:'#f87171' }

  const fmtFecha = (f:string|null|undefined) => {
    if (!f) return null
    const [y,m,d] = f.split('T')[0].split('-')
    return `${d}/${m}/${y.slice(2)}`
  }

  const handleGuardar = async () => {
    const supabase = createClient()
    const { error } = await supabase.from('leads').insert({ empresa:form.empresa, nombre:form.nombre, telefono:form.telefono, email:form.email, ciudad:form.ciudad, vehiculo_interes:form.vehiculo_interes, estado:form.estado, vendedor_nombre:form.vendedor_nombre, fuente:form.fuente, proximo_contacto:form.proximo_contacto||null })
    if (error) { alert('Error: '+error.message); return }
    setToast('Lead '+form.nombre+' registrado'); setTimeout(()=>setToast(''),3000)
    setShowForm(false); setForm({ empresa:'INVEXUS', nombre:'', telefono:'', email:'', ciudad:'', vehiculo_interes:'BJ30', estado:'Nuevo', vendedor_nombre:'GIULIANA', fuente:'WhatsApp', proximo_contacto:'' }); refresh()
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#e2e8f0' }}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={()=>setMoneda(m=>m==='ARS'?'USD':'ARS')} />
      {toast && <div style={{ position:'fixed', top:20, right:20, background:'#166534', color:'#4ade80', border:'1px solid #16a34a', borderRadius:10, padding:'10px 18px', fontSize:13, zIndex:1000, fontWeight:500 }}>✓ {toast}</div>}
      <div style={{ padding:'24px', maxWidth:1400, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10, flex:1, marginRight:12 }}>
            {['Nuevo','Contactado','Seguimiento','Negociación'].map(e=>(
              <div key={e} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:10, padding:'10px 14px' }}>
                <div style={{ fontSize:11, color:'#475569', marginBottom:4 }}>{e}</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#f1f5f9', fontFamily:'monospace' }}>{leads.filter((l:any)=>l.estado===e).length}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>setShowForm(true)} style={{ padding:'8px 18px', borderRadius:8, background:'#3b82f6', color:'white', border:'none', fontSize:12, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>+ Nuevo lead</button>
        </div>

        {showForm && (
          <div style={{ background:'#1e293b', border:'1px solid #3b82f6', borderRadius:12, padding:20, marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0', marginBottom:16 }}>Registrar lead</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              {[['empresa','Empresa',['INVEXUS','MAXIAUTO']],['nombre','Nombre completo',null],['telefono','WhatsApp',null],['email','Email',null],['ciudad','Ciudad',null],['vehiculo_interes','Interés',MODELOS],['estado','Estado',ESTADOS],['vendedor_nombre','Vendedor',VENDEDORES],['fuente','Fuente',FUENTES],['proximo_contacto','Próximo contacto',null]].map(([k,l,opts]:any)=>(
                <div key={k}><label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>{l}</label>
                {opts ? <select value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12 }}>{opts.map((o:string)=><option key={o}>{o}</option>)}</select>
                : <input type={k==='proximo_contacto'?'date':'text'} value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12 }} />}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button onClick={handleGuardar} style={{ padding:'7px 20px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:12, cursor:'pointer', fontWeight:600 }}>Guardar</button>
              <button onClick={()=>setShowForm(false)} style={{ padding:'7px 16px', borderRadius:8, background:'transparent', color:'#64748b', border:'1px solid #334155', fontSize:12, cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}

        {loading ? <div style={{ color:'#475569', padding:40, textAlign:'center' }}>Cargando leads...</div> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
            {leads.map((l:any)=>(
              <div key={l.id} style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{l.nombre}</div>
                    <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>{l.ciudad||'—'} · {l.fuente||'—'}</div>
                    {/* FECHA INGRESO DEL LEAD */}
                    {l.created_at && (
                      <div style={{ fontSize:10, color:'#334155', marginTop:2 }}>Ingresó: {fmtFecha(l.created_at)}</div>
                    )}
                  </div>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:600, background:(ec[l.estado]||'#94a3b8')+'22', color:ec[l.estado]||'#94a3b8', border:`1px solid ${ec[l.estado]||'#334155'}44` }}>{l.estado}</span>
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
                {/* PRÓXIMO CONTACTO FORMATEADO */}
                {l.proximo_contacto && (
                  <div style={{ marginTop:8, fontSize:11, color:'#fb923c' }}>
                    ⏰ {fmtFecha(l.proximo_contacto)}
                  </div>
                )}
              </div>
            ))}
            {leads.length===0 && <div style={{ color:'#475569', fontSize:13, gridColumn:'1/-1', padding:24, textAlign:'center' }}>Sin leads. ¡Cargá el primero!</div>}
          </div>
        )}
      </div>
    </div>
  )
}