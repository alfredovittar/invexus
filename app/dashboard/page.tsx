'use client'
import { useState, useEffect, useRef } from 'react'
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

  // Toggle global: false = período filtrado, true = todos los datos
  const [modoTodoGlobal, setModoTodoGlobal] = useState(false)

  const [filtroStock, setFiltroStock] = useState<FiltroVehiculosState>({
    estado: 'Disponible',
    marca: 'Todas',
    tipo: 'Todos',
    busqueda: '',
    diasStock: 'Todos',
  })

  const [stockModoTodo, setStockModoTodo] = useState(false)
  const [ventasModoTodo, setVentasModoTodo] = useState(false)

  const { stock } = useStock(empresa)
  const { ventas: todasVentas } = useVentas(empresa, undefined, undefined)
  const { tcBna, tcBlue } = useTipoCambio()
  const tc = tcBna

  // Ventas filtradas por período
  const ventasPeriodo = todasVentas.filter((v:any) => {
    if (!v.fecha) return false
    if (desde && v.fecha < desde) return false
    if (hasta && v.fecha > hasta) return false
    return true
  })

  // Si toggle global activo → usa todas, si no → usa período
  const ventas = modoTodoGlobal ? todasVentas : ventasPeriodo

  const fmt = (n:number) => moneda==='USD'
    ? 'USD '+new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(n/tc)
    : new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n)
  const fmtN = (n:number) => new Intl.NumberFormat('es-AR').format(n)
  const fmtM = (n:number) => '$'+(n/1_000_000).toFixed(1)+'M'

  const totalVentas = ventas.reduce((a:number,v:any)=>a+(v.precio_venta||0),0)
  const totalGanancia = ventas.reduce((a:number,v:any)=>a+(v.ganancia_neta||0),0)
  const totalComisiones = ventas.reduce((a:number,v:any)=>a+(v.comision_ars||0),0)
  const criticos = stock.filter((s:any)=>(s.dias_stock||0)>=60)
  const disponibles = stock.filter((s:any)=>s.estado==='Disponible')
  const stockFiltrado = aplicarFiltroVehiculos(stock, filtroStock)
  const stockFiltradoCritico = stockFiltrado.filter((s:any)=>(s.dias_stock||0)>=60)
  const pendienteCobro = ventas.filter((v:any)=>v.estado_cobro==='Pendiente'||v.estado_cobro==='Parcial').length

  // Toggle global overrides toggles individuales
  const stockMostrado = (stockModoTodo || modoTodoGlobal) ? stock : stockFiltrado
  const ventasMostradas = (ventasModoTodo || modoTodoGlobal) ? todasVentas : ventas

  const masViejo = [...stock.filter((s:any)=>s.estado==='Disponible')].sort((a:any,b:any)=>(b.dias_stock||0)-(a.dias_stock||0))[0]

  // ── CHARTS ──
  const chartStockRef = useRef<any>(null)
  const chartMensualRef = useRef<any>(null)
  const stockCanvasRef = useRef<HTMLCanvasElement>(null)
  const mensualCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (todasVentas.length === 0 && stock.length === 0) return
    if ((window as any).Chart) {
      renderCharts()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      script.onload = () => renderCharts()
      document.head.appendChild(script)
    }
  }, [todasVentas, stock, desde, hasta, modoTodoGlobal])

  function destroyCharts() {
    if (chartStockRef.current) { chartStockRef.current.destroy(); chartStockRef.current = null }
    if (chartMensualRef.current) { chartMensualRef.current.destroy(); chartMensualRef.current = null }
  }

  function renderCharts() {
    if (typeof window === 'undefined' || !(window as any).Chart) return
    const Chart = (window as any).Chart
    destroyCharts()

    const dispOkm = stock.filter((s:any)=>s.estado==='Disponible'&&(s.tipo==='0km'||s.tipo==='0KM')).length
    const dispUsado = stock.filter((s:any)=>s.estado==='Disponible'&&s.tipo?.toLowerCase()==='usado').length
    const vendOkm = stock.filter((s:any)=>s.estado==='Vendido'&&(s.tipo==='0km'||s.tipo==='0KM')).length
    const vendUsado = stock.filter((s:any)=>s.estado==='Vendido'&&s.tipo?.toLowerCase()==='usado').length

    if (stockCanvasRef.current) {
      chartStockRef.current = new Chart(stockCanvasRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Disp. 0km','Disp. Usado','Vend. 0km','Vend. Usado'],
          datasets: [{ data:[dispOkm,dispUsado,vendOkm,vendUsado], backgroundColor:['#1D9E75','#5DCAA5','#378ADD','#85B7EB'], borderWidth:0 }]
        },
        options: {
          responsive:true, maintainAspectRatio:false, cutout:'65%',
          plugins:{ legend:{display:false}, tooltip:{callbacks:{label:(ctx:any)=>` ${ctx.label}: ${ctx.raw} unidades`}} }
        }
      })
    }

    const meses:Record<string,{ingresos:number,ganancia:number}> = {}
    ventas.forEach((v:any)=>{
      if (!v.fecha) return
      const mes = v.fecha.slice(0,7)
      if (!meses[mes]) meses[mes]={ingresos:0,ganancia:0}
      meses[mes].ingresos += v.precio_venta||0
      meses[mes].ganancia += v.ganancia_neta||0
    })
    const mesesOrdenados = Object.keys(meses).sort()
    const nombresMes = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const labelsMes = mesesOrdenados.map(m=>{ const [y,mo]=m.split('-'); return `${nombresMes[parseInt(mo)]} ${y.slice(2)}` })

    if (mensualCanvasRef.current) {
      chartMensualRef.current = new Chart(mensualCanvasRef.current, {
        type: 'bar',
        data: {
          labels: labelsMes,
          datasets: [
            { label:'Ingresos', type:'bar', data:mesesOrdenados.map(m=>meses[m].ingresos), backgroundColor:'#378ADD', borderRadius:4, order:2 },
            { label:'Ganancia', type:'line', data:mesesOrdenados.map(m=>meses[m].ganancia), borderColor:'#1D9E75', backgroundColor:'transparent', pointBackgroundColor:'#1D9E75', tension:0.3, order:1 }
          ]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{
            x:{ticks:{color:'#64748b',font:{size:11},maxRotation:0,autoSkip:false},grid:{color:'rgba(128,128,128,0.08)'}},
            y:{ticks:{color:'#64748b',font:{size:10},callback:(v:number)=>'$'+(v/1_000_000).toFixed(0)+'M'},grid:{color:'rgba(128,128,128,0.08)'}}
          }
        }
      })
    }
  }

  const kpi = (label:string,value:string,sub:string,color:string) => (
    <div style={{background:'#1e293b',border:`1px solid ${color}`,borderRadius:12,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:color,opacity:.85}} />
      <div style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:8}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,color:'#f1f5f9',fontFamily:'monospace'}}>{value}</div>
      <div style={{fontSize:11,color:'#475569',marginTop:4}}>{sub}</div>
    </div>
  )

  const toggle = (activo:boolean, onToggle:()=>void, labelA:string, labelB:string, small=false) => (
    <div style={{display:'flex',background:'#0f172a',borderRadius:6,padding:2,gap:2}}>
      <button onClick={()=>activo&&onToggle()} style={{padding:small?'2px 8px':'3px 10px',borderRadius:4,fontSize:small?9:10,fontWeight:600,cursor:'pointer',border:'none',
        background:!activo?'#334155':'transparent', color:!activo?'#e2e8f0':'#475569'}}>
        {labelA}
      </button>
      <button onClick={()=>!activo&&onToggle()} style={{padding:small?'2px 8px':'3px 10px',borderRadius:4,fontSize:small?9:10,fontWeight:600,cursor:'pointer',border:'none',
        background:activo?'#334155':'transparent', color:activo?'#e2e8f0':'#475569'}}>
        {labelB}
      </button>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0f172a',color:'#e2e8f0'}}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={()=>setMoneda(m=>m==='ARS'?'USD':'ARS')} />
      <div style={{padding:'20px 24px',maxWidth:1400,margin:'0 auto'}}>

        {/* FILTRO FECHAS + TOGGLE GLOBAL */}
        <div style={{background:'#1e293b',border:`1px solid ${modoTodoGlobal?'#3b82f6':'#334155'}`,borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <span style={{fontSize:11,color:'#475569',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>Período</span>
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
            {modoTodoGlobal && (
              <span style={{fontSize:10,color:'#3b82f6',fontWeight:600,letterSpacing:'.04em'}}>
                MOSTRANDO TODOS LOS DATOS
              </span>
            )}
            <span style={{fontSize:11,color:'#475569',whiteSpace:'nowrap'}}>
              {ventas.length} operaciones
            </span>
            {toggle(modoTodoGlobal, ()=>setModoTodoGlobal(v=>!v), 'Período', 'Todo')}
          </div>
        </div>

        {/* KPIs FILA 1 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:12}}>
          {kpi(modoTodoGlobal?'Ingresos totales':'Ingresos del período',fmt(totalVentas),ventas.length+' operaciones','#3b82f6')}
          {kpi('Ganancia neta',fmt(totalGanancia),totalVentas?((totalGanancia/totalVentas)*100).toFixed(1)+'% margen':'—','#22c55e')}
          {kpi('Stock disponible',disponibles.length+' unidades',criticos.length+' con alerta · '+stock.length+' total',criticos.length>0?'#ef4444':'#334155')}
          {kpi('TC hoy','$'+fmtN(tcBna),'Blue: $'+fmtN(tcBlue)+' · spread '+((tcBlue/tcBna-1)*100).toFixed(1)+'%','#fb923c')}
        </div>

        {/* KPIs FILA 2 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:20}}>
          {kpi('Ticket promedio', ventas.length>0?fmtM(totalVentas/ventas.length):'—','por unidad','#334155')}
          {kpi('Comisiones', fmtM(totalComisiones), totalVentas>0?(totalComisiones/totalVentas*100).toFixed(2)+'% sobre ingresos':'—','#334155')}
          {kpi('Vendidos total', stock.filter((s:any)=>s.estado==='Vendido').length+' unidades',
            stock.filter((s:any)=>s.estado==='Vendido'&&(s.tipo==='0km'||s.tipo==='0KM')).length+' 0km · '+
            stock.filter((s:any)=>s.estado==='Vendido'&&s.tipo?.toLowerCase()==='usado').length+' usados','#334155')}
          {kpi(
            masViejo&&(masViejo.dias_stock||0)>=60?'⚠ Stock crítico':'Mayor días stock',
            masViejo?masViejo.dias_stock+'d':'—',
            masViejo?masViejo.marca+' '+masViejo.modelo+' · '+masViejo.id:'Sin stock',
            masViejo&&(masViejo.dias_stock||0)>=60?'#ef4444':'#334155'
          )}
        </div>

        {/* GRÁFICOS */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'16px 18px'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:14}}>Stock por estado</div>
            <div style={{position:'relative',height:200}}>
              <canvas ref={stockCanvasRef} role="img" aria-label="Stock por estado" />
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:10}}>
              {[['#1D9E75','Disp. 0km'],['#5DCAA5','Disp. Usado'],['#378ADD','Vend. 0km'],['#85B7EB','Vend. Usado']].map(([c,l])=>(
                <span key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#94a3b8'}}>
                  <span style={{width:10,height:10,borderRadius:2,background:c,display:'inline-block'}} />{l}
                </span>
              ))}
            </div>
          </div>

          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'16px 18px'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:14}}>
              Evolución mensual
              <span style={{fontWeight:400,marginLeft:6,color:'#475569',textTransform:'none',letterSpacing:'normal',fontSize:10}}>
                {modoTodoGlobal?'todos los datos':'período seleccionado'}
              </span>
            </div>
            <div style={{position:'relative',height:200}}>
              <canvas ref={mensualCanvasRef} role="img" aria-label="Evolución mensual ingresos y ganancia" />
            </div>
            <div style={{display:'flex',gap:16,marginTop:10}}>
              <span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#94a3b8'}}>
                <span style={{width:10,height:10,borderRadius:2,background:'#378ADD',display:'inline-block'}} />Ingresos
              </span>
              <span style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#94a3b8'}}>
                <span style={{width:2,height:10,background:'#1D9E75',display:'inline-block'}} />Ganancia
              </span>
            </div>
          </div>
        </div>

        {/* GRID INFERIOR */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

          {/* STOCK CON TOGGLE */}
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <span style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase'}}>
                Stock
                <span style={{fontWeight:400,marginLeft:6,color:'#475569',textTransform:'none',letterSpacing:'normal'}}>
                  {stockMostrado.length} vehículos
                  {!(stockModoTodo||modoTodoGlobal) && stockFiltradoCritico.length>0 && (
                    <span style={{color:'#ef4444',marginLeft:4}}>· {stockFiltradoCritico.length} en alerta</span>
                  )}
                </span>
              </span>
              {!modoTodoGlobal && toggle(stockModoTodo, ()=>setStockModoTodo(v=>!v), 'Filtrado', 'Todo', true)}
              {modoTodoGlobal && <span style={{fontSize:9,color:'#3b82f6',fontWeight:600}}>GLOBAL</span>}
            </div>
            {!(stockModoTodo||modoTodoGlobal) && (
              <div style={{marginBottom:12}}>
                <FiltroVehiculos value={filtroStock} onChange={setFiltroStock} mostrarDiasStock={true} mostrarBusqueda={false} compacto={true} />
              </div>
            )}
            {stockMostrado.length===0
              ?<div style={{color:'#475569',fontSize:13}}>Sin vehículos con ese filtro</div>
              :stockMostrado.slice(0,6).map((s:any)=>(
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
            {stockMostrado.length>6&&<div style={{fontSize:11,color:'#475569',marginTop:8,textAlign:'center'}}>+{stockMostrado.length-6} más</div>}
          </div>

          {/* OPERACIONES CON TOGGLE */}
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'16px 18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase'}}>
                Operaciones
                <span style={{fontWeight:400,marginLeft:6,color:'#475569',textTransform:'none',letterSpacing:'normal'}}>
                  {ventasMostradas.length} {(ventasModoTodo||modoTodoGlobal)?'total':'en período'}
                </span>
              </span>
              {!modoTodoGlobal && toggle(ventasModoTodo, ()=>setVentasModoTodo(v=>!v), 'Período', 'Todas', true)}
              {modoTodoGlobal && <span style={{fontSize:9,color:'#3b82f6',fontWeight:600}}>GLOBAL</span>}
            </div>
            {ventasMostradas.length===0
              ?<div style={{color:'#475569',fontSize:13}}>Sin ventas{(ventasModoTodo||modoTodoGlobal)?'':' en el período seleccionado'}</div>
              :[...ventasMostradas].sort((a:any,b:any)=>(b.fecha||'').localeCompare(a.fecha||'')).slice(0,6).map((v:any)=>(
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
            {ventasMostradas.length>6&&<div style={{fontSize:11,color:'#475569',marginTop:8,textAlign:'center'}}>+{ventasMostradas.length-6} más</div>}
          </div>

          {/* RANKING VENDEDORES */}
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'16px 18px'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:14}}>
              Ranking vendedores
              <span style={{fontWeight:400,marginLeft:6,color:'#475569',textTransform:'none',letterSpacing:'normal',fontSize:10}}>
                {modoTodoGlobal?'todos los datos':'período'}
              </span>
            </div>
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

          {/* MÉTRICAS DEL PERÍODO */}
          <div style={{background:'#1e293b',borderRadius:12,border:'1px solid #334155',padding:'16px 18px'}}>
            <div style={{fontSize:11,color:'#64748b',fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:14}}>
              Métricas
              <span style={{fontWeight:400,marginLeft:6,color:'#475569',textTransform:'none',letterSpacing:'normal',fontSize:10}}>
                {modoTodoGlobal?'todos los datos':'período'}
              </span>
            </div>
            {[
              ['Ticket promedio', ventas.length>0?fmt(totalVentas/ventas.length):'—',''],
              ['Ganancia promedio', ventas.length>0?fmt(totalGanancia/ventas.length):'—','por operación'],
              ['Ventas cobradas', ventas.filter((v:any)=>v.estado_cobro==='Cobrado').length+' / '+ventas.length,'operaciones'],
              ['Ventas mixto/financiado', ventas.filter((v:any)=>v.forma_pago!=='Contado').length+' / '+ventas.length,'operaciones'],
              ['Pendientes cobro', pendienteCobro.toString(), pendienteCobro>0?'revisar':'al día'],
            ].map(([l,v,s])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #0f172a'}}>
                <div>
                  <div style={{fontSize:12,color:'#94a3b8'}}>{l}</div>
                  {s&&<div style={{fontSize:10,color:'#475569'}}>{s}</div>}
                </div>
                <span style={{fontSize:13,color: l==='Pendientes cobro'&&pendienteCobro>0?'#ef4444':'#e2e8f0',fontFamily:'monospace',fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
