'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import FiltroFechas from '@/components/FiltroFechas'
import { useVentas, useTipoCambio } from '@/hooks/useSupabase'
import { createClient } from '@/utils/supabase/client'

export default function VentasPage() {
  const hoy = new Date().toISOString().split('T')[0]
  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [toast, setToast] = useState('')
  const { ventas, loading, refresh } = useVentas(empresa, desde||undefined, hasta||undefined)
  const { tcBna, tcBlue } = useTipoCambio()
  const tc = tcBna
  const [form, setForm] = useState({ empresa:'INVEXUS', inv_id:'', cliente:'', vendedor_nombre:'', precio_venta:'', forma_pago:'Contado', cobro_efectivo:0, cobro_transfer:0, cobro_usd:0, cobro_usd_tc:tcBna, cobro_pagare:0, cobro_pxp:0, estado_cobro:'Cobrado', observaciones:'' })
  const fmt = (n:number) => moneda==='USD' ? 'USD '+new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(n/tc) : new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n)
  const fmtN = (n:number) => new Intl.NumberFormat('es-AR').format(n)
  const totalVentas = ventas.reduce((a:number,v:any)=>a+(v.precio_venta||0),0)
  const totalGanancia = ventas.reduce((a:number,v:any)=>a+(v.ganancia_neta||0),0)
  const totalCobrado = (parseFloat(String(form.cobro_efectivo))||0)+(parseFloat(String(form.cobro_transfer))||0)+(parseFloat(String(form.cobro_usd))||0)*form.cobro_usd_tc+(parseFloat(String(form.cobro_pagare))||0)+(parseFloat(String(form.cobro_pxp))||0)
  const precioVenta = parseFloat(form.precio_venta)||0
  const diff = precioVenta - totalCobrado
  const handleGuardar = async () => {
    const supabase = createClient()
    const newId = 'VTA-'+Date.now().toString().slice(-8)
    const { error } = await supabase.from('ventas').insert({ id:newId, empresa:form.empresa, inv_id:form.inv_id||null, fecha:hoy, cliente:form.cliente, vendedor_nombre:form.vendedor_nombre, precio_venta:parseFloat(form.precio_venta), forma_pago:form.forma_pago, cobro_efectivo:form.cobro_efectivo, cobro_transfer:form.cobro_transfer, cobro_usd:form.cobro_usd, cobro_usd_tc:form.cobro_usd_tc, cobro_pagare:form.cobro_pagare, cobro_pxp:form.cobro_pxp, estado_cobro:form.estado_cobro, tc_bna_snapshot:tcBna, tc_blue_snapshot:tcBlue, observaciones:form.observaciones })
    if(error){alert('Error: '+error.message);return}
    setToast('Venta registrada'); setTimeout(()=>setToast(''),3000); setShowForm(false); refresh()
  }
  const handleEditar = (v:any) => {
    setEditando(v.id)
    setEditForm({
      cliente: v.cliente||'', vendedor_nombre: v.vendedor_nombre||'',
      precio_venta: v.precio_venta||'', forma_pago: v.forma_pago||'Contado',
      cobro_efectivo: v.cobro_efectivo||0, cobro_transfer: v.cobro_transfer||0,
      cobro_usd: v.cobro_usd||0, cobro_usd_tc: v.cobro_usd_tc||tcBna,
      cobro_pagare: v.cobro_pagare||0, cobro_pxp: v.cobro_pxp||0,
      ganancia_neta: v.ganancia_neta||'', costo_compra: v.costo_compra||'',
      estado_cobro: v.estado_cobro||'Cobrado', observaciones: v.observaciones||''
    })
  }
  const handleGuardarEdicion = async (id:string) => {
    const supabase = createClient()
    const { error } = await supabase.from('ventas').update({
      cliente: editForm.cliente, vendedor_nombre: editForm.vendedor_nombre,
      precio_venta: parseFloat(editForm.precio_venta),
      forma_pago: editForm.forma_pago,
      cobro_efectivo: parseFloat(editForm.cobro_efectivo)||0,
      cobro_transfer: parseFloat(editForm.cobro_transfer)||0,
      cobro_usd: parseFloat(editForm.cobro_usd)||0,
      cobro_usd_tc: parseFloat(editForm.cobro_usd_tc)||tcBna,
      cobro_pagare: parseFloat(editForm.cobro_pagare)||0,
      cobro_pxp: parseFloat(editForm.cobro_pxp)||0,
      ganancia_neta: editForm.ganancia_neta ? parseFloat(editForm.ganancia_neta) : null,
      costo_compra: editForm.costo_compra ? parseFloat(editForm.costo_compra) : null,
      estado_cobro: editForm.estado_cobro,
      observaciones: editForm.observaciones
    }).eq('id', id)
    if (error) { alert('Error: '+error.message); return }
    setToast('Venta '+id+' actualizada')
    setTimeout(()=>setToast(''),3000)
    setEditando(null)
    refresh()
  }
  return (
    <div style={{minHeight:'100vh',background:'#0f172a',color:'#e2e8f0'}}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={()=>setMoneda(m=>m==='ARS'?'USD':'ARS')} />
      {toast&&<div style={{position:'fixed',top:20,right:20,background:'#166534',color:'#4ade80',border:'1px solid #16a34a',borderRadius:10,padding:'10px 18px',fontSize:13,zIndex:1000,fontWeight:500}}>✓ {toast}</div>}
      <div style={{padding:'20px 24px',maxWidth:1400,margin:'0 auto'}}>
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <span style={{fontSize:11,color:'#475569',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',whiteSpace:'nowrap'}}>Período</span>
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <span style={{fontSize:11,color:'#475569',marginLeft:'auto',whiteSpace:'nowrap'}}>{ventas.length} operaciones</span>
          <button onClick={()=>setShowForm(true)} style={{padding:'6px 16px',borderRadius:8,background:'#3b82f6',color:'white',border:'none',fontSize:12,cursor:'pointer',fontWeight:600}}>+ Registrar venta</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:16}}>
          {[['Total vendido',fmt(totalVentas),ventas.length+' operaciones','#3b82f6'],['Ganancia total',fmt(totalGanancia),totalVentas?((totalGanancia/totalVentas)*100).toFixed(1)+'% margen':'—','#22c55e'],['Ticket promedio',ventas.length>0?fmt(totalVentas/ventas.length):'—',ventas.length+' ops','#8b5cf6'],['Pendientes cobro',ventas.filter((v:any)=>v.estado_cobro!=='Cobrado').length+' ventas','Requieren seguimiento','#f97316']].map(([l,v,s,c])=>(
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
            <div style={{fontSize:14,fontWeight:600,color:'#e2e8f0',marginBottom:16}}>Nueva operación</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:12}}>
              {[['empresa','Empresa',['INVEXUS','MAXIAUTO']],['inv_id','ID Inventario',null],['cliente','Cliente',null],['vendedor_nombre','Vendedor',null],['precio_venta','Precio ARS',null],['forma_pago','Forma pago',['Contado','Transferencia','Financiado','Mixto','Permuta']],['estado_cobro','Estado',['Cobrado','Parcial','Pendiente','Seña']]].map(([k,l,opts]:any)=>(
                <div key={k}><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>{l}</label>
                {opts?<select value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}}>{opts.map((o:string)=><option key={o}>{o}</option>)}</select>
                :<input type={k==='precio_venta'?'number':'text'} value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} />}
                </div>
              ))}
            </div>
            <div style={{fontSize:12,fontWeight:600,color:'#94a3b8',marginBottom:10,paddingBottom:8,borderBottom:'1px solid #334155'}}>Desglose de cobro</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:12}}>
              {[['cobro_efectivo','Efectivo ARS'],['cobro_transfer','Transferencia ARS'],['cobro_pagare','Pagaré ARS'],['cobro_pxp','Parte de pago ARS']].map(([k,l])=>(
                <div key={k}><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>{l}</label><input type="number" value={(form as any)[k]} onChange={e=>setForm({...form,[k]:parseFloat(e.target.value)||0})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} /></div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
              <div><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>USD</label><input type="number" value={form.cobro_usd} onChange={e=>setForm({...form,cobro_usd:parseFloat(e.target.value)||0})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:12}} /></div>
              <div><label style={{fontSize:11,color:'#64748b',display:'block',marginBottom:4}}>TC pactado</label><input type="number" value={form.cobro_usd_tc} onChange={e=>setForm({...form,cobro_usd_tc:parseFloat(e.target.value)||tcBna})} style={{width:'100%',padding:'6px 10px',borderRadius:8,border:'1px solid #334155',background:'#0f172a',color:'#fb923c',fontSize:12}} /></div>
              <div style={{display:'flex',gap:6,alignItems:'flex-end'}}>
                <button onClick={()=>setForm({...form,cobro_usd_tc:tcBna})} style={{flex:1,padding:'6px 8px',borderRadius:8,border:'1px solid #334155',background:'rgba(96,165,250,.1)',color:'#60a5fa',fontSize:11,cursor:'pointer'}}>BNA ${fmtN(tcBna)}</button>
                <button onClick={()=>setForm({...form,cobro_usd_tc:tcBlue})} style={{flex:1,padding:'6px 8px',borderRadius:8,border:'1px solid rgba(251,146,60,.3)',background:'rgba(251,146,60,.1)',color:'#fb923c',fontSize:11,cursor:'pointer'}}>Blue ${fmtN(tcBlue)}</button>
              </div>
            </div>
            <div style={{background:diff>100?'rgba(239,68,68,.1)':diff<-100?'rgba(234,179,8,.1)':'rgba(34,197,94,.1)',border:`1px solid ${diff>100?'rgba(239,68,68,.3)':diff<-100?'rgba(234,179,8,.3)':'rgba(34,197,94,.3)'}`,borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12}}>
              <span style={{color:'#94a3b8'}}>Precio: </span><span style={{color:'#e2e8f0',fontFamily:'monospace',marginRight:12}}>{fmt(precioVenta)}</span>
              <span style={{color:'#94a3b8'}}>Cobrado: </span><span style={{color:'#e2e8f0',fontFamily:'monospace',marginRight:12}}>{fmt(totalCobrado)}</span>
              <span style={{color:diff>100?'#f87171':diff<-100?'#facc15':'#4ade80',fontWeight:600}}>{diff>100?'Faltan: '+fmt(diff):diff<-100?'Exceso: '+fmt(Math.abs(diff)):'Cobro completo ✓'}</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={handleGuardar} style={{padding:'7px 20px',borderRadius:8,background:'#16a34a',color:'white',border:'none',fontSize:12,cursor:'pointer',fontWeight:600}}>Registrar venta</button>
              <button onClick={()=>setShowForm(false)} style={{padding:'7px 16px',borderRadius:8,background:'transparent',color:'#64748b',border:'1px solid #334155',fontSize:12,cursor:'pointer'}}>Cancelar</button>
            </div>
          </div>
        )}
        {loading?<div style={{color:'#475569',padding:40,textAlign:'center'}}>Cargando...</div>:(
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{borderBottom:'1px solid #334155'}}>{['Fecha','Empresa','Cliente','Vendedor','Vehículo','Precio','Ganancia','Pago','TC BNA','Estado',''].map(h=><th key={h} style={{textAlign:'left',padding:'9px 10px',color:'#475569',fontWeight:500,fontSize:11,whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
              <tbody>{ventas.map((v:any)=>(
                <tr key={v.id} style={{borderBottom:'1px solid #0f172a'}}>
                  <td style={{padding:'8px 10px',color:'#64748b',fontFamily:'monospace',fontSize:11}}>{v.fecha}</td>
                  <td style={{padding:'8px 10px'}}><span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:v.empresa==='INVEXUS'?'rgba(96,165,250,.15)':'rgba(167,139,250,.15)',color:v.empresa==='INVEXUS'?'#60a5fa':'#a78bfa',border:`1px solid ${v.empresa==='INVEXUS'?'rgba(96,165,250,.3)':'rgba(167,139,250,.3)'}`}}>{v.empresa}</span></td>
                  <td style={{padding:'8px 10px',color:'#cbd5e1',fontWeight:500}}>{v.cliente}</td>
                  <td style={{padding:'8px 10px',color:'#94a3b8'}}>{v.vendedor_nombre}</td>
                  <td style={{padding:'8px 10px',color:'#64748b',fontFamily:'monospace',fontSize:11}}>{v.inv_id||'—'}</td>
                  <td style={{padding:'8px 10px',color:'#e2e8f0',fontFamily:'monospace',fontWeight:600}}>{fmt(v.precio_venta||0)}</td>
                  <td style={{padding:'8px 10px',color:v.ganancia_neta>0?'#4ade80':'#f87171',fontFamily:'monospace'}}>{v.ganancia_neta?fmt(v.ganancia_neta):'—'}</td>
                  <td style={{padding:'8px 10px',color:'#94a3b8'}}>{v.forma_pago}</td>
                  <td style={{padding:'8px 10px',color:'#60a5fa',fontFamily:'monospace',fontSize:11}}>{v.tc_bna_snapshot?'$'+fmtN(v.tc_bna_snapshot):'—'}</td>
                  <td style={{padding:'8px 10px'}}><span style={{fontSize:10,padding:'2px 8px',borderRadius:4,fontWeight:600,background:v.estado_cobro==='Cobrado'?'rgba(34,197,94,.15)':v.estado_cobro==='Parcial'?'rgba(234,179,8,.15)':'rgba(249,115,22,.15)',color:v.estado_cobro==='Cobrado'?'#4ade80':v.estado_cobro==='Parcial'?'#facc15':'#fb923c',border:`1px solid ${v.estado_cobro==='Cobrado'?'rgba(34,197,94,.3)':v.estado_cobro==='Parcial'?'rgba(234,179,8,.3)':'rgba(249,115,22,.3)'}`}}>{v.estado_cobro}</span></td>
                  <td style={{padding:'8px 10px'}}>
                    <button onClick={()=>editando===v.id?setEditando(null):handleEditar(v)} style={{padding:'3px 10px',borderRadius:6,border:`1px solid ${editando===v.id?'#f97316':'#334155'}`,background:editando===v.id?'rgba(249,115,22,.15)':'transparent',color:editando===v.id?'#fb923c':'#64748b',fontSize:11,cursor:'pointer'}}>
                      {editando===v.id?'✕ Cerrar':'✎ Editar'}
                    </button>
                  </td>
                </tr>
                {editando===v.id && (
                  <tr key={v.id+'-edit'} style={{background:'#1e293b',borderBottom:'2px solid #f97316'}}>
                    <td colSpan={11} style={{padding:'16px'}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
                        {[['cliente','Cliente'],['vendedor_nombre','Vendedor'],['precio_venta','Precio venta'],['ganancia_neta','Ganancia neta']].map(([k,l])=>(
                          <div key={k}>
                            <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:3}}>{l}</label>
                            <input value={editForm[k]} onChange={e=>setEditForm({...editForm,[k]:e.target.value})} style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:11}} />
                          </div>
                        ))}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
                        {[['cobro_efectivo','Efectivo'],['cobro_transfer','Transferencia'],['cobro_pagare','Pagaré'],['cobro_pxp','Parte de pago']].map(([k,l])=>(
                          <div key={k}>
                            <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:3}}>{l}</label>
                            <input type="number" value={editForm[k]} onChange={e=>setEditForm({...editForm,[k]:e.target.value})} style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:11}} />
                          </div>
                        ))}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
                        <div>
                          <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:3}}>USD cobrado</label>
                          <input type="number" value={editForm.cobro_usd} onChange={e=>setEditForm({...editForm,cobro_usd:e.target.value})} style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:11}} />
                        </div>
                        <div>
                          <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:3}}>TC pactado</label>
                          <input type="number" value={editForm.cobro_usd_tc} onChange={e=>setEditForm({...editForm,cobro_usd_tc:e.target.value})} style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#fb923c',fontSize:11}} />
                        </div>
                        <div>
                          <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:3}}>Forma de pago</label>
                          <select value={editForm.forma_pago} onChange={e=>setEditForm({...editForm,forma_pago:e.target.value})} style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:11}}>
                            {['Contado','Transferencia','Financiado','Mixto','Permuta'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:3}}>Estado cobro</label>
                          <select value={editForm.estado_cobro} onChange={e=>setEditForm({...editForm,estado_cobro:e.target.value})} style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:11}}>
                            {['Cobrado','Parcial','Pendiente','Seña'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{marginBottom:12}}>
                        <label style={{fontSize:10,color:'#64748b',display:'block',marginBottom:3}}>Observaciones</label>
                        <input value={editForm.observaciones} onChange={e=>setEditForm({...editForm,observaciones:e.target.value})} style={{width:'100%',padding:'5px 8px',borderRadius:6,border:'1px solid #334155',background:'#0f172a',color:'#e2e8f0',fontSize:11}} />
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={()=>handleGuardarEdicion(v.id)} style={{padding:'6px 18px',borderRadius:7,background:'#16a34a',color:'white',border:'none',fontSize:12,cursor:'pointer',fontWeight:600}}>Guardar cambios</button>
                        <button onClick={()=>setEditando(null)} style={{padding:'6px 14px',borderRadius:7,background:'transparent',color:'#64748b',border:'1px solid #334155',fontSize:12,cursor:'pointer'}}>Cancelar</button>
                      </div>
                    </td>
                  </tr>
                )}
              ))}</tbody>
            </table>
            {ventas.length===0&&<div style={{color:'#475569',padding:24,textAlign:'center'}}>Sin ventas en el período seleccionado</div>}
          </div>
        )}
      </div>
    </div>
  )
}
