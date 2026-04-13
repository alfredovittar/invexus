'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import FiltroFechas from '@/components/FiltroFechas'
import { useGastos, useTipoCambio } from '@/hooks/useSupabase'
import { createClient } from '@/utils/supabase/client'

const CATS_UNIDAD = ['Traslado','Lavado/Detailing','Mecánica','Chapería/Pintura','Documentación','Patentamiento','Verificación','Publicidad auto','Comisión externa','Otro']
const CATS_OP = ['Sueldos','Alquiler','Servicios','Publicidad','Impuestos','Asesoría contable','Asesoría legal','Mantenimiento','Insumos','Otro']

export default function GastosPage() {
  const hoy = new Date().toISOString().split('T')[0]
  const primeroDeMes = hoy.substring(0,8)+'01'
  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const [desde, setDesde] = useState(primeroDeMes)
  const [hasta, setHasta] = useState(hoy)
  const [tab, setTab] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState('')
  const { gastos, loading, refresh } = useGastos(empresa, desde||undefined, hasta||undefined)
  const { tcBna } = useTipoCambio()
  const tc = tcBna
  const [form, setForm] = useState({ empresa:'INVEXUS', tipo:'por_unidad', inv_id:'', fecha:hoy, categoria:'Traslado', descripcion:'', monto:'', proveedor:'', estado_pago:'Pagado' })

  const fmt = (n:number) => moneda==='USD'
    ? 'USD '+new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(n/tc)
    : new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n)

  const fmtFecha = (f:string|null|undefined) => {
    if (!f) return '—'
    const [y,m,d] = f.split('T')[0].split('-')
    return `${d}/${m}/${y.slice(2)}`
  }

  const filtered = gastos.filter((g:any) => tab==='todos'?true:g.tipo===tab)
  const totalFilt = filtered.reduce((a:number,g:any)=>a+(g.monto||0),0)
  const totalOp = gastos.filter((g:any)=>g.tipo==='operativo').reduce((a:number,g:any)=>a+(g.monto||0),0)
  const totalUn = gastos.filter((g:any)=>g.tipo==='por_unidad').reduce((a:number,g:any)=>a+(g.monto||0),0)
  const pendientes = gastos.filter((g:any)=>g.estado_pago==='Pendiente')
  const porCat:Record<string,number> = {}
  filtered.forEach((g:any) => { const k=g.categoria||'Otro'; porCat[k]=(porCat[k]||0)+(g.monto||0) })
  const catS = Object.entries(porCat).sort((a,b)=>b[1]-a[1])
  const maxCat = catS[0]?.[1]||1

  const handleGuardar = async () => {
    if(!form.monto||!form.descripcion){alert('Completá descripción y monto');return}
    const supabase = createClient()
    const {error} = await supabase.from('gastos').insert({
      empresa:form.empresa, tipo:form.tipo,
      inv_id:form.tipo==='por_unidad'&&form.inv_id?form.inv_id:null,
      fecha:form.fecha, categoria:form.categoria, descripcion:form.descripcion,
      monto:parseFloat(form.monto), proveedor:form.proveedor||null,
      estado_pago:form.estado_pago, fecha_pago:form.estado_pago==='Pagado'?form.fecha:null,
    })
    if(error){alert('Error: '+error.message);return}
    setToast('Gasto registrado'); setTimeout(()=>setToast(''),3000)
    setShowForm(false); setForm({...form,inv_id:'',descripcion:'',monto:'',proveedor:''}); refresh()
  }

  const ec=(e:string)=>e==='Pagado'?'#4ade80':e==='Pendiente'?'#fb923c':'#facc15'

  return (
    <div style={{minHeight:'100vh',background:'#0f172a',color:'#e2e8f0'}}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={()=>setMoneda(m=>m==='ARS'?'USD':'ARS')} />
      {toast&&<div style={{position:'fixed',top:20,right:20,background:'#166534',color:'#4ade80',border:'1px solid #16a34a',borderRadius:10,padding:'10px 18px',fontSize:13,zIndex:1000,fontWeight:500}}>✓ {toast}</div>}
      <div style={{padding:'20px 24px',maxWidth:1400,margin:'0 auto'}}>

        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <span style={{fontSize:11,color:'#475569',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',whiteSpace:'nowrap'}}>Período</span>
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <button onClick={()=>setShowForm(true)} style={{marginLeft:'auto',padding:'6px 16px',borderRadius:8,background:'#3b82f6',color:'white',border:'none',fontSize:12,cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>+ Registrar gasto</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:16}}>
          {[['Total gastos',fmt(totalFilt),filtered.length+' registros','#ef4444'],['Operativos',fmt(totalOp),gastos.filter((g:any)=>g.tipo==='operativo').length+' regs','#f97316'],['Por unidad',fmt(totalUn),gastos.filter((g:any)=>g.tipo==='por_unidad').length+' regs','#eab308'],['Pendiente pago',fmt(pendientes.reduce((a:number,g:any)=>a+(g.monto||0),0)),pendientes.length+' regs','#8b5cf6']].map(([l,v,s,c])=>(
            <div key={l} style={{background:'#1e293b',border:`1px solid ${c}`,borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:c as string}} />
              <div style={{fontSize:11,color:'#64748b',fontWeight:500,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>{l}</div>
              <div style={{fontSize:18,fontWeight:700,color:'#f1f5f9',fontFamily:'monospace'}}>{v}</div>
              <div style={{fontSize:11,color:'#475569',marginTop:3}}>{s}</div>
            </div>
          ))}
        </div>

        {showForm&&(
          <div style={{background:'#1e293b',border:'1px solid #3b82f6',borderRadius:12,padding:20,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:600,color:'#e2e8f0',marginBottom:16}}>Registrar gasto</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:12}}>
              <div><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Empresa</label>
                <select value={form.empresa} onChange={e=>setForm({...form,empresa:e.target.value})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}}>
                  <option>INVEXUS</option><option>MAXIAUTO</option>
                </select>
              </div>
              <div><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Tipo</label>
                <select value={form.tipo} onChange={e=>{const nf={...form,tipo:e.target.value}; nf.categoria=e.target.value==='por_unidad'?CATS_UNIDAD[0]:CATS_OP[0]; setForm(nf)}} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}}>
                  <option value="por_unidad">Por unidad (auto)</option>
                  <option value="operativo">Operativo (concesionaria)</option>
                </select>
              </div>
              <div><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Categoría</label>
                <select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}}>
                  {(form.tipo==='por_unidad'?CATS_UNIDAD:CATS_OP).map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} />
              </div>
              {form.tipo==='por_unidad'&&(
                <div><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>ID Vehículo</label>
                  <input value={form.inv_id} onChange={e=>setForm({...form,inv_id:e.target.value})} placeholder="INV-001" style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} />
                </div>
              )}
              <div style={{gridColumn:'span 2'}}><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Descripción</label>
                <input value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} />
              </div>
              <div><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Monto ARS</label>
                <input type="number" value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} />
              </div>
              <div><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Proveedor</label>
                <input value={form.proveedor} onChange={e=>setForm({...form,proveedor:e.target.value})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} />
              </div>
              <div><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>Estado pago</label>
                <select value={form.estado_pago} onChange={e=>setForm({...form,estado_pago:e.target.value})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}}>
                  <option>Pagado</option><option>Pendiente</option><option>Parcial</option>
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={handleGuardar} style={{padding:'7px 20px',borderRadius:8,background:'#16a34a',color:'white',border:'none',fontSize:12,cursor:'pointer',fontWeight:600}}>Guardar</button>
              <button onClick={()=>setShowForm(false)} style={{padding:'7px 16px',borderRadius:8,background:'transparent',color:'#64748b',border:'1px solid #334155',fontSize:12,cursor:'pointer'}}>Cancelar</button>
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:16}}>
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',overflow:'hidden'}}>
            <div style={{display:'flex',borderBottom:'1px solid #334155'}}>
              {[['todos','Todos'],['por_unidad','Por unidad'],['operativo','Operativos']].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'10px',border:'none',background:tab===k?'#0f172a':'transparent',color:tab===k?'#60a5fa':'#64748b',fontSize:12,cursor:'pointer',fontWeight:tab===k?600:400,borderBottom:tab===k?'2px solid #3b82f6':'2px solid transparent'}}>
                  {l} ({gastos.filter((g:any)=>k==='todos'?true:g.tipo===k).length})
                </button>
              ))}
            </div>
            {loading?<div style={{color:'#475569',padding:24,textAlign:'center'}}>Cargando...</div>:(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{borderBottom:'1px solid #334155'}}>{['Fecha','Tipo','Categoría','Vehículo','Descripción','Proveedor','Monto','Estado'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 10px',color:'#475569',fontWeight:500,fontSize:11,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                  <tbody>{filtered.map((g:any)=>(
                    <tr key={g.id} style={{borderBottom:'1px solid #0f172a'}}>
                      <td style={{padding:'8px 10px',color:'#64748b',fontFamily:'monospace',fontSize:11,whiteSpace:'nowrap'}}>{fmtFecha(g.fecha)}</td>
                      <td style={{padding:'8px 10px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:g.tipo==='por_unidad'?'rgba(234,179,8,.15)':'rgba(249,115,22,.15)',color:g.tipo==='por_unidad'?'#facc15':'#fb923c',border:`1px solid ${g.tipo==='por_unidad'?'rgba(234,179,8,.3)':'rgba(249,115,22,.3)'}`}}>{g.tipo==='por_unidad'?'Unidad':'Operativo'}</span></td>
                      <td style={{padding:'8px 10px',color:'#94a3b8'}}>{g.categoria}</td>
                      <td style={{padding:'8px 10px',color:'#64748b',fontFamily:'monospace',fontSize:11}}>{g.inv_id||'—'}</td>
                      <td style={{padding:'8px 10px',color:'#e2e8f0'}}>{g.descripcion}</td>
                      <td style={{padding:'8px 10px',color:'#64748b'}}>{g.proveedor||'—'}</td>
                      <td style={{padding:'8px 10px',color:'#f87171',fontFamily:'monospace',fontWeight:600}}>{fmt(g.monto||0)}</td>
                      <td style={{padding:'8px 10px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,fontWeight:600,color:ec(g.estado_pago),background:ec(g.estado_pago)+'22',border:`1px solid ${ec(g.estado_pago)}44`}}>{g.estado_pago}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
                {filtered.length===0&&<div style={{color:'#475569',padding:24,textAlign:'center'}}>Sin gastos en el período. ¡Registrá el primero!</div>}
              </div>
            )}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'14px 16px'}}>
              <div style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:12}}>Por categoría</div>
              {catS.length===0?<div style={{color:'#475569',fontSize:12}}>Sin datos</div>:catS.slice(0,8).map(([cat,monto])=>(
                <div key={cat} style={{marginBottom:9}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:11,color:'#94a3b8'}}>{cat}</span>
                    <span style={{fontSize:11,color:'#e2e8f0',fontFamily:'monospace'}}>{fmt(monto)}</span>
                  </div>
                  <div style={{background:'#0f172a',borderRadius:3,height:3}}>
                    <div style={{height:'100%',background:'#ef4444',width:(monto/maxCat*100)+'%',borderRadius:3,opacity:.5+monto/maxCat*.5}} />
                  </div>
                </div>
              ))}
            </div>
            {pendientes.length>0&&(
              <div style={{background:'#1e293b',borderRadius:12,border:'1px solid rgba(249,115,22,.3)',padding:'14px 16px'}}>
                <div style={{fontSize:11,color:'#fb923c',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:10}}>⚠ Pendientes</div>
                {pendientes.slice(0,4).map((g:any)=>(
                  <div key={g.id} style={{padding:'6px 0',borderBottom:'1px solid #0f172a',display:'flex',justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontSize:11,color:'#e2e8f0'}}>{g.descripcion}</div>
                      <div style={{fontSize:10,color:'#64748b'}}>{fmtFecha(g.fecha)}</div>
                    </div>
                    <span style={{fontSize:11,color:'#fb923c',fontFamily:'monospace',fontWeight:600}}>{fmt(g.monto||0)}</span>
                  </div>
                ))}
                <div style={{marginTop:8,padding:'6px 10px',background:'rgba(249,115,22,.1)',borderRadius:7,display:'flex',justifyContent:'space-between',fontSize:12}}>
                  <span style={{color:'#fb923c',fontWeight:600}}>Total</span>
                  <span style={{color:'#fb923c',fontFamily:'monospace',fontWeight:700}}>{fmt(pendientes.reduce((a:number,g:any)=>a+(g.monto||0),0))}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}