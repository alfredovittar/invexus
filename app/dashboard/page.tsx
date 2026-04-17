'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import FiltroFechas from '@/components/FiltroFechas'
import FiltroVehiculos, { FiltroVehiculosState, aplicarFiltroVehiculos } from '@/components/FiltroVehiculos'
import { useStock, useVentas, useTipoCambio } from '@/hooks/useSupabase'

export default function DashboardPage() {
  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const hoy = new Date().toISOString().split('T')[0]
  const primeroDeMes = hoy.substring(0,8)+'01'
  const [desde, setDesde] = useState(primeroDeMes)
  const [hasta, setHasta] = useState(hoy)

  // Filtro para la sección de stock
  const [filtroStock, setFiltroStock] = useState<FiltroVehiculosState>({
    estado: 'Disponible',
    marca: 'Todas',
    tipo: 'Todos',
    busqueda: '',
    diasStock: 'Todos',
  })

  const { stock } = useStock(empresa)
  const { ventas } = useVentas(empresa, desde||undefined, hasta||undefined)
  const { tcBna, tcBlue } = useTipoCambio()
  const tc = tcBna

  const fmt = (n:number) => moneda==='USD'
    ? 'USD '+new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(n/tc)
    : new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n)
  const fmtN = (n:number) => new Intl.NumberFormat('es-AR').format(n)

  const totalVentas = ventas.reduce((a:number,v:any)=>a+(v.precio_venta||0),0)
  const totalGanancia = ventas.reduce((a:number,v:any)=>a+(v.ganancia_neta||0),0)
  const criticos = stock.filter((s:any)=>(s.dias_stock||0)>=60)
  const disponibles = stock.filter((s:any)=>s.estado==='Disponible')

  // Stock filtrado para la sección de alertas
  const stockFiltrado = aplicarFiltroVehiculos(stock, filtroStock)
  const stockFiltradoCritico = stockFiltrado.filter((s:any)=>(s.dias_stock||0)>=60)

  const kpi = (label:string,value:string,sub:string,color:string) => (
    <div style={{background:'#1e293b',border:`1px solid ${color}`,borderRadius:12,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:color,opacity:.85}} />
      <div style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:8}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,color:'#f1f5f9',fontFamily:'monospace'}}>{value}</div>
      <div style={{fontSize:11,color:'#475569',marginTop:4}}>{sub}</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0f172a',color:'#e2e8f0'}}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={()=>setMoneda(m=>m==='ARS'?'USD':'ARS')} />
      <div style={{padding:'20px 24px',maxWidth:1400,margin:'0 auto'}}>

        {/* ── FILTRO FECHAS ── */}
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <span style={{fontSize:11,color:'#475569',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>Período</span>
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <span style={{fontSize:11,color:'#475569',marginLeft:'auto',whiteSpace:'nowrap'}}>{ventas.length} operaciones</span>
        </div>

        {/* ── KPIs ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:20}}>
          {kpi('Ingresos del período',fmt(totalVentas),ventas.length+' operaciones','#3b82f6')}
          {kpi('Ganancia neta',fmt(totalGanancia),totalVentas?((totalGanancia/totalVentas)*100).toFixed(1)+'% margen':'—','#22c55e')}
          {kpi('Stock disponible',disponibles.length+' unidades',criticos.length+' con alerta · '+stock.length+' total',criticos.length>0?'#ef4444':'#334155')}
          {kpi('TC hoy','$'+fmtN(tcBna),'Blue: $'+fmtN(tcBlue)+' · spread '+((tcBlue/tcBna-1)*100).toFixed(1)+'%','#fb923c')}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

          {/* ── STOCK CON FILTRO ── */}
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <span style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase'}}>
                Stock
                <span style={{fontWeight:400,marginLeft:6,color:'#334155',textTransform:'none',letterSpacing:'normal'}}>
                  {stockFiltrado.length} vehículos
                  {stockFiltradoCritico.length > 0 && (
                    <span style={{color:'#ef4444',marginLeft:4}}>· {stockFiltradoCritico.length} en alerta</span>
                  )}
                </span>
              </span>
            </div>
            <div style={{marginBottom:12}}>
              <FiltroVehiculos
                value={filtroStock}
                onChange={setFiltroStock}
                mostrarDiasStock={true}
                mostrarBusqueda={false}
                compacto={true}
              />
            </div>
            {stockFiltrado.length === 0
              ? <div style={{color:'#475569',fontSize:13}}>Sin vehículos con ese filtro</div>
              : stockFiltrado.slice(0,6).map((s:any)=>(
                <div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #0f172a'}}>
                  <div>
                    <div style={{fontSize:12,color:'#e2e8f0',fontWeight:500}}>{s.id} · {s.modelo} {s.version}</div>
                    <div style={{fontSize:11,color:'#64748b'}}>{s.color} · {s.marca} · {s.dias_stock}d</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:4,
                    background:s.dias_stock>=90?'rgba(239,68,68,.15)':s.dias_stock>=60?'rgba(249,115,22,.15)':s.dias_stock>=30?'rgba(234,179,8,.15)':'rgba(34,197,94,.15)',
                    color:s.dias_stock>=90?'#f87171':s.dias_stock>=60?'#fb923c':s.dias_stock>=30?'#facc15':'#4ade80',
                    border:`1px solid ${s.dias_stock>=90?'rgba(239,68,68,.3)':s.dias_stock>=60?'rgba(249,115,22,.3)':s.dias_stock>=30?'rgba(234,179,8,.3)':'rgba(34,197,94,.3)'}`
                  }}>
                    {s.dias_stock>=90?'CRÍTICO':s.dias_stock>=60?'ALERTA':s.dias_stock>=30?'VIGILAR':s.estado}
                  </span>
                </div>
              ))
            }
            {stockFiltrado.length > 6 && (
              <div style={{fontSize:11,color:'#475569',marginTop:8,textAlign:'center'}}>+{stockFiltrado.length-6} más</div>
            )}
          </div>

          {/* ── ÚLTIMAS OPERACIONES ── */}
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'16px 18px'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:14}}>Operaciones del período</div>
            {ventas.length===0
              ?<div style={{color:'#475569',fontSize:13}}>Sin ventas en el período seleccionado</div>
              :ventas.slice(0,6).map((v:any)=>(
                <div key={v.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #0f172a'}}>
                  <div>
                    <div style={{fontSize:12,color:'#e2e8f0'}}>{v.cliente}</div>
                    <div style={{fontSize:11,color:'#64748b'}}>{v.vendedor_nombre} · {v.fecha}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:12,color:'#4ade80',fontFamily:'monospace'}}>{fmt(v.precio_venta||0)}</div>
                    <div style={{fontSize:10,color:v.estado_cobro==='Cobrado'?'#4ade80':'#fb923c'}}>{v.estado_cobro}</div>
                  </div>
                </div>
              ))
            }
            {ventas.length>6&&<div style={{fontSize:11,color:'#475569',marginTop:8,textAlign:'center'}}>+{ventas.length-6} más en el período</div>}
          </div>

          {/* ── RANKING VENDEDORES ── */}
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'16px 18px'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:14}}>Ranking vendedores · período</div>
            {(()=>{
              const by:Record<string,{ventas:number,total:number}> = {}
              ventas.forEach((v:any)=>{ const k=v.vendedor_nombre||'Sin asignar'; if(!by[k]) by[k]={ventas:0,total:0}; by[k].ventas++; by[k].total+=v.precio_venta||0 })
              const sorted = Object.entries(by).sort((a,b)=>b[1].total-a[1].total)
              const maxT = sorted[0]?.[1].total||1
              return sorted.length===0
                ?<div style={{color:'#475569',fontSize:13}}>Sin datos en el período</div>
                :sorted.map(([nombre,data],i)=>(
                  <div key={nombre} style={{padding:'7px 0',borderBottom:'1px solid #0f172a'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <span style={{fontSize:10,fontWeight:700,color:i===0?'#facc15':'#64748b',width:14}}>#{i+1}</span>
                        <span style={{fontSize:12,color:'#e2e8f0',fontWeight:500}}>{nombre}</span>
                        <span style={{fontSize:10,color:'#475569'}}>{data.ventas} op.</span>
                      </div>
                      <span style={{fontSize:12,color:'#4ade80',fontFamily:'monospace'}}>{fmt(data.total)}</span>
                    </div>
                    <div style={{background:'#0f172a',borderRadius:3,height:3}}>
                      <div style={{height:'100%',background:i===0?'#facc15':'#3b82f6',width:(data.total/maxT*100)+'%',borderRadius:3}} />
                    </div>
                  </div>
                ))
            })()}
          </div>

          {/* ── MÉTRICAS DEL PERÍODO ── */}
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'16px 18px'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:14}}>Métricas del período</div>
            {[
              ['Ticket promedio', ventas.length>0?fmt(totalVentas/ventas.length):'—',''],
              ['Ganancia promedio', ventas.length>0?fmt(totalGanancia/ventas.length):'—','por operación'],
              ['Ventas cobradas', ventas.filter((v:any)=>v.estado_cobro==='Cobrado').length+' / '+ventas.length,'operaciones'],
              ['Ventas mixto/financiado', ventas.filter((v:any)=>v.forma_pago!=='Contado').length+' / '+ventas.length,'operaciones'],
            ].map(([l,v,s])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #0f172a'}}>
                <div>
                  <div style={{fontSize:12,color:'#94a3b8'}}>{l}</div>
                  {s&&<div style={{fontSize:10,color:'#475569'}}>{s}</div>}
                </div>
                <span style={{fontSize:13,color:'#e2e8f0',fontFamily:'monospace',fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

