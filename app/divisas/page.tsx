'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import { createClient } from '@/utils/supabase/client'

export default function DivisasPage() {
  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const [historial, setHistorial] = useState<any[]>([])
  const [monto, setMonto] = useState('38150')
  const [origen, setOrigen] = useState('USD')
  const [tcBlueRT, setTcBlueRT] = useState<number>(1462)
  useEffect(() => {
    const cargar = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('tipo_cambio').select('*').order('fecha',{ascending:false}).limit(30)
      setHistorial(data??[])
      // Siempre buscar Blue en tiempo real desde Bluelytics
      try {
        const r = await window.fetch('https://api.bluelytics.com.ar/v2/latest')
        if (r.ok) {
          const d = await r.json()
          if (d.blue?.value_sell) setTcBlueRT(d.blue.value_sell)
        }
      } catch(e) { console.warn('Bluelytics error:', e) }
    }
    cargar()
  }, [])
  const tc = historial[0]
  const tcBna = tc?.tc_bna_venta??1392.5
  const tcBlue = tcBlueRT
  const fmtN = (n:number) => new Intl.NumberFormat('es-AR').format(n)
  const fmt = (n:number) => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n)
  const m = parseFloat(monto)||0
  const convBna = origen==='USD'?m*tcBna:m/tcBna
  const convBlue = origen==='USD'?m*tcBlue:m/tcBlue
  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#e2e8f0' }}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={()=>setMoneda(m=>m==='ARS'?'USD':'ARS')} />
      <div style={{ padding:'24px', maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          <div style={{ background:'#1e293b', border:'1px solid rgba(96,165,250,.3)', borderRadius:12, padding:20 }}>
            <div style={{ fontSize:11, color:'#60a5fa', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:12 }}>TC BNA — Banco Nación</div>
            <div style={{ fontSize:32, fontWeight:700, color:'#f1f5f9', fontFamily:'monospace' }}>${fmtN(tcBna)}</div>
            <div style={{ fontSize:12, color:'#475569', marginTop:6 }}>Fuente: API BCRA · {tc?.fecha||'—'}</div>
            <div style={{ marginTop:12, padding:'8px 12px', background:'rgba(96,165,250,.08)', borderRadius:8, fontSize:11, color:'#94a3b8' }}>Costo de compra 0km (factura importador)</div>
          </div>
          <div style={{ background:'#1e293b', border:'1px solid rgba(251,146,60,.3)', borderRadius:12, padding:20 }}>
            <div style={{ fontSize:11, color:'#fb923c', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:12 }}>TC Blue — Mercado informal</div>
            <div style={{ fontSize:32, fontWeight:700, color:'#fb923c', fontFamily:'monospace' }}>${fmtN(tcBlue)}</div>
            <div style={{ fontSize:12, color:'#475569', marginTop:6 }}>Fuente: Bluelytics · Actualización continua</div>
            <div style={{ marginTop:12, padding:'8px 12px', background:'rgba(251,146,60,.08)', borderRadius:8, fontSize:11, color:'#94a3b8' }}>Operaciones pactadas en blue, referencia</div>
          </div>
          <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:20 }}>
            <div style={{ fontSize:11, color:'#64748b', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:12 }}>Spread BNA / Blue</div>
            <div style={{ fontSize:32, fontWeight:700, color:'#a78bfa', fontFamily:'monospace' }}>{tcBna?((tcBlue/tcBna-1)*100).toFixed(1):'—'}%</div>
            <div style={{ fontSize:12, color:'#475569', marginTop:6 }}>+${fmtN(Math.round(tcBlue-tcBna))} por dólar</div>
            <div style={{ marginTop:12, padding:'8px 12px', background:'rgba(167,139,250,.08)', borderRadius:8, fontSize:11, color:'#94a3b8' }}>En USD 1.000: diferencia de {fmt((tcBlue-tcBna)*1000)}</div>
          </div>
        </div>
        <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:'16px 18px', marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#64748b', fontWeight:500, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:14 }}>Calculadora de conversión</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ display:'flex', gap:10 }}>
              <div style={{ flex:1 }}><label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Monto</label><input type="number" value={monto} onChange={e=>setMonto(e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:14, fontFamily:'monospace' }} /></div>
              <div style={{ flex:1 }}><label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:4 }}>Moneda</label><select value={origen} onChange={e=>setOrigen(e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:13 }}><option value="USD">USD → ARS</option><option value="ARS">ARS → USD</option></select></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'rgba(96,165,250,.08)', border:'1px solid rgba(96,165,250,.2)', borderRadius:10, padding:'12px 14px' }}><div style={{ fontSize:11, color:'#60a5fa', marginBottom:4 }}>Con TC BNA</div><div style={{ fontSize:18, fontWeight:700, color:'#e2e8f0', fontFamily:'monospace' }}>{origen==='USD'?fmt(convBna):'USD '+fmtN(Math.round(convBna))}</div></div>
              <div style={{ background:'rgba(251,146,60,.08)', border:'1px solid rgba(251,146,60,.2)', borderRadius:10, padding:'12px 14px' }}><div style={{ fontSize:11, color:'#fb923c', marginBottom:4 }}>Con TC Blue</div><div style={{ fontSize:18, fontWeight:700, color:'#fb923c', fontFamily:'monospace' }}>{origen==='USD'?fmt(convBlue):'USD '+fmtN(Math.round(convBlue))}</div></div>
            </div>
          </div>
        </div>
        <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:'16px 18px', overflowX:'auto' }}>
          <div style={{ fontSize:11, color:'#64748b', fontWeight:500, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:14 }}>Historial últimos 30 días</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ borderBottom:'1px solid #334155' }}>{['Fecha','TC BNA','TC Blue','Spread','Diferencia/USD'].map(h=><th key={h} style={{ textAlign:'left', padding:'6px 8px', color:'#475569', fontWeight:500, fontSize:11 }}>{h}</th>)}</tr></thead>
            <tbody>{historial.map((t:any)=>(
              <tr key={t.id} style={{ borderBottom:'1px solid #0f172a' }}>
                <td style={{ padding:'6px 8px', color:'#64748b', fontFamily:'monospace', fontSize:11 }}>{t.fecha}</td>
                <td style={{ padding:'6px 8px', color:'#60a5fa', fontFamily:'monospace' }}>${fmtN(t.tc_bna_venta)}</td>
                <td style={{ padding:'6px 8px', color:'#fb923c', fontFamily:'monospace' }}>${fmtN(t.tc_blue_venta)}</td>
                <td style={{ padding:'6px 8px', color:'#a78bfa', fontFamily:'monospace' }}>{t.tc_bna_venta&&t.tc_blue_venta?((t.tc_blue_venta/t.tc_bna_venta-1)*100).toFixed(1)+'%':'—'}</td>
                <td style={{ padding:'6px 8px', color:'#4ade80', fontFamily:'monospace', fontSize:11 }}>{t.tc_bna_venta&&t.tc_blue_venta?'+$'+fmtN(Math.round(t.tc_blue_venta-t.tc_bna_venta)):'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
