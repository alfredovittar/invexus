'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import { useStock, useTipoCambio } from '@/hooks/useSupabase'
import { createClient } from '@/utils/supabase/client'

export default function StockPage() {
  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [filtroMarca, setFiltroMarca] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState('')
  const { stock, loading, refresh } = useStock(empresa)
  const { tcBna, tcBlue } = useTipoCambio()
  const tc = tcBna
  const [form, setForm] = useState({ empresa:'INVEXUS', tipo:'0km', marca:'BAIC', modelo:'BJ30', version:'4X2', color:'', anio:2026, km:0, costo_usd:'', precio_lista:'', vin:'', proveedor:'BAIC ARGENTINA', combustible:'Híbrido', transmision:'Automática', moneda_costo:'USD', tc_usado:tcBna })
  const fmt = (n:number) => moneda==='USD' ? 'USD '+new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(n/tc) : new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n)
  const fmtN = (n:number) => new Intl.NumberFormat('es-AR').format(n)
  const riskColor = (d:number) => d>=90?'#ef4444':d>=60?'#f97316':d>=30?'#eab308':'#22c55e'
  const riskLabel = (d:number) => d>=90?'CRÍTICO':d>=60?'ALERTA':d>=30?'VIGILAR':'OK'
  const marcas = ['', ...Array.from(new Set(stock.map((s:any)=>s.marca).filter(Boolean))).sort()] as string[]
  const filtered = stock.filter((s:any) => {
    if (filtro==='0km' && s.tipo?.toLowerCase()!=='0km') return false
    if (filtro==='usado' && s.tipo?.toLowerCase()!=='usado') return false
    if (filtro==='critico' && (s.dias_stock||0)<60) return false
    if (filtroMarca && s.marca?.toLowerCase()!==filtroMarca.toLowerCase()) return false
    if (busqueda) { const q=busqueda.toLowerCase(); return s.modelo?.toLowerCase().includes(q)||s.id?.toLowerCase().includes(q)||s.color?.toLowerCase().includes(q)||s.marca?.toLowerCase().includes(q) }
    return true
  })
  const handleGuardar = async () => {
    const supabase = createClient()
    const costoArs = form.moneda_costo==='USD' ? parseFloat(form.costo_usd||'0')*form.tc_usado : parseFloat(form.costo_usd||'0')
    const prefix = form.empresa === 'INVEXUS' ? 'INV' : 'MAX'
    const { data: ultimos } = await supabase
      .from('inventario')
      .select('id')
      .like('id', `${prefix}-%`)
      .order('id', { ascending: false })
      .limit(1)
    let nextNum = 1
    if (ultimos && ultimos.length > 0) {
      const lastNum = parseInt(ultimos[0].id.split('-')[1])
      if (!isNaN(lastNum)) nextNum = lastNum + 1
    }
    const newId = `${prefix}-${String(nextNum).padStart(3, '0')}`
    const { error } = await supabase.from('inventario').insert({ id:newId, empresa:form.empresa, tipo:form.tipo, marca:form.marca, modelo:form.modelo, version:form.version, color:form.color, anio:form.anio, km:form.km, costo_usd:form.moneda_costo==='USD'?parseFloat(form.costo_usd||'0'):null, costo_ars:costoArs, tc_compra:form.tc_usado, precio_lista:parseFloat(form.precio_lista||'0'), precio_minimo:parseFloat(form.precio_lista||'0'), vin:form.vin, proveedor:form.proveedor, combustible:form.combustible, transmision:form.transmision, estado:'Disponible', fecha_ingreso:new Date().toISOString().split('T')[0] })
    if (error) { alert('Error: '+error.message); return }
    setToast('Vehículo '+newId+' cargado'); setTimeout(()=>setToast(''),3000); setShowForm(false); refresh()
  }
  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#e2e8f0' }}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={()=>setMoneda(m=>m==='ARS'?'USD':'ARS')} />
      {toast && <div style={{ position:'fixed', top:20, right:20, background:'#166534', color:'#4ade80', border:'1px solid #16a34a', borderRadius:10, padding:'10px 18px', fontSize:13, zIndex:1000, fontWeight:500 }}>✓ {toast}</div>}
      <div style={{ padding:'24px', maxWidth:1400, margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:6 }}>
            {[['todos','Todos',stock.length],['0km','0km',stock.filter((s:any)=>s.tipo?.toLowerCase()==='0km').length],['usado','Usados',stock.filter((s:any)=>s.tipo?.toLowerCase()==='usado').length],['critico','Alertas',stock.filter((s:any)=>(s.dias_stock||0)>=60).length]].map(([k,l,c]:any)=>(
              <button key={k} onClick={()=>setFiltro(k)} style={{ padding:'5px 14px', borderRadius:8, border:`1px solid ${filtro===k?'#3b82f6':'#334155'}`, background:filtro===k?'rgba(59,130,246,.15)':'transparent', color:filtro===k?'#60a5fa':'#64748b', fontSize:12, cursor:'pointer' }}>
                {l} <span style={{ fontSize:10, opacity:.7 }}>({c})</span>
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <select value={filtroMarca} onChange={e=>setFiltroMarca(e.target.value)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:filtroMarca?'#e2e8f0':'#64748b', fontSize:12 }}>
              {marcas.map((m:string)=><option key={m} value={m}>{m||'Todas las marcas'}</option>)}
            </select>
            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar modelo, ID, color..." style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12, width:200 }} />
            <button onClick={()=>setShowForm(true)} style={{ padding:'6px 16px', borderRadius:8, background:'#3b82f6', color:'white', border:'none', fontSize:12, cursor:'pointer', fontWeight:600 }}>+ Cargar vehículo</button>
          </div>
        </div>
        {showForm && (
          <div style={{ background:'#1e293b', border:'1px solid #3b82f6', borderRadius:12, padding:20, marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0', marginBottom:16 }}>Nuevo ingreso</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
              {[['empresa','Empresa',['INVEXUS','MAXIAUTO']],['tipo','Tipo',['0km','Usado']],['marca','Marca',['BAIC','CHERY','VW','TOYOTA','CHEVROLET','FIAT','Otro']],['modelo','Modelo',null],['version','Versión',null],['color','Color',null],['vin','VIN/Motor',null],['proveedor','Proveedor',null]].map(([k,l,opts]:any)=>(
                <div key={k}>
                  <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>{l}</label>
                  {opts ? <select value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12 }}>{opts.map((o:string)=><option key={o}>{o}</option>)}</select>
                  : <input value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12 }} />}
                </div>
              ))}
              <div><label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Moneda costo</label><select value={form.moneda_costo} onChange={e=>setForm({...form,moneda_costo:e.target.value})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12 }}><option value="USD">USD → TC</option><option value="ARS">ARS directo</option></select></div>
              <div><label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Costo ({form.moneda_costo})</label><input type="number" value={form.costo_usd} onChange={e=>setForm({...form,costo_usd:e.target.value})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12 }} /></div>
              <div><label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>TC (BNA: ${fmtN(tcBna)})</label><input type="number" value={form.tc_usado} onChange={e=>setForm({...form,tc_usado:parseFloat(e.target.value)})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#fb923c', fontSize:12 }} /></div>
              <div><label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Precio lista ARS</label><input type="number" value={form.precio_lista} onChange={e=>setForm({...form,precio_lista:e.target.value})} style={{ width:'100%', padding:'6px 10px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:12 }} /></div>
            </div>
            {form.costo_usd && form.moneda_costo==='USD' && <div style={{ background:'rgba(251,146,60,.1)', border:'1px solid rgba(251,146,60,.25)', borderRadius:8, padding:'8px 14px', marginBottom:12, fontSize:12 }}><span style={{ color:'#fb923c' }}>Conversión: </span><span style={{ color:'#e2e8f0', fontFamily:'monospace' }}>USD {fmtN(parseFloat(form.costo_usd))} × ${fmtN(form.tc_usado)} = {fmt(parseFloat(form.costo_usd)*form.tc_usado)}</span></div>}
            {form.costo_usd && form.precio_lista && <div style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)', borderRadius:8, padding:'8px 14px', marginBottom:12, fontSize:12 }}><span style={{ color:'#4ade80' }}>Margen estimado: </span><span style={{ color:'#e2e8f0', fontFamily:'monospace' }}>{fmt(parseFloat(form.precio_lista)-(form.moneda_costo==='USD'?parseFloat(form.costo_usd)*form.tc_usado:parseFloat(form.costo_usd)))}</span></div>}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleGuardar} style={{ padding:'7px 20px', borderRadius:8, background:'#16a34a', color:'white', border:'none', fontSize:12, cursor:'pointer', fontWeight:600 }}>Guardar</button>
              <button onClick={()=>setShowForm(false)} style={{ padding:'7px 16px', borderRadius:8, background:'transparent', color:'#64748b', border:'1px solid #334155', fontSize:12, cursor:'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}
        {loading ? <div style={{ color:'#475569', padding:40, textAlign:'center' }}>Cargando stock...</div> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr style={{ borderBottom:'1px solid #334155' }}>{['ID','Empresa','Tipo','Modelo','Ver.','Color','Km','Costo','Lista','Margen','Días','Estado'].map(h=><th key={h} style={{ textAlign:'left', padding:'7px 8px', color:'#475569', fontWeight:500, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
              <tbody>{filtered.map((s:any)=>{ const ca = s.costo_ars ? (s.costo_usd ? Math.min(s.costo_ars, s.costo_usd*tc) : s.costo_ars) : (s.costo_usd*tc); const mg=(s.precio_lista||0)-ca; const d=s.dias_stock||0; return (
                <tr key={s.id} style={{ borderBottom:'1px solid #0f172a' }}>
                  <td style={{ padding:'7px 8px', color:'#94a3b8', fontFamily:'monospace', fontSize:11 }}>{s.id}</td>
                  <td style={{ padding:'7px 8px' }}><span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:s.empresa==='INVEXUS'?'rgba(96,165,250,.15)':'rgba(167,139,250,.15)', color:s.empresa==='INVEXUS'?'#60a5fa':'#a78bfa', border:`1px solid ${s.empresa==='INVEXUS'?'rgba(96,165,250,.3)':'rgba(167,139,250,.3)'}` }}>{s.empresa}</span></td>
                  <td style={{ padding:'7px 8px' }}><span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:s.tipo?.toLowerCase()==='0km'?'rgba(34,197,94,.15)':'rgba(100,116,139,.15)', color:s.tipo?.toLowerCase()==='0km'?'#4ade80':'#94a3b8', border:`1px solid ${s.tipo?.toLowerCase()==='0km'?'rgba(34,197,94,.3)':'rgba(100,116,139,.3)'}` }}>{s.tipo}</span></td>
                  <td style={{ padding:'7px 8px', color:'#e2e8f0', fontWeight:500 }}>{s.modelo}</td>
                  <td style={{ padding:'7px 8px', color:'#94a3b8' }}>{s.version}</td>
                  <td style={{ padding:'7px 8px', color:'#cbd5e1' }}>{s.color}</td>
                  <td style={{ padding:'7px 8px', color:'#64748b', fontFamily:'monospace' }}>{fmtN(s.km||0)}</td>
                  <td style={{ padding:'7px 8px', color:'#94a3b8', fontFamily:'monospace', fontSize:11 }}>{fmt(ca)}</td>
                  <td style={{ padding:'7px 8px', color:'#e2e8f0', fontFamily:'monospace', fontSize:11 }}>{fmt(s.precio_lista||0)}</td>
                  <td style={{ padding:'7px 8px', color:mg>=0?'#4ade80':'#f87171', fontFamily:'monospace', fontSize:11 }}>{fmt(mg)}</td>
                  <td style={{ padding:'7px 8px' }}><span style={{ color:riskColor(d), fontFamily:'monospace', fontSize:12, fontWeight:600 }}>{d}d</span></td>
                  <td style={{ padding:'7px 8px' }}><span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:600, background:d>=60?`rgba(${d>=90?'239,68,68':'249,115,22'},.15)`:'rgba(34,197,94,.15)', color:riskColor(d), border:`1px solid ${riskColor(d)}44` }}>{d>=60?riskLabel(d):s.estado}</span></td>
                </tr>
              )})}
              </tbody>
            </table>
            {filtered.length===0 && <div style={{ color:'#475569', padding:24, textAlign:'center' }}>Sin resultados</div>}
          </div>
        )}
      </div>
    </div>
  )
}
