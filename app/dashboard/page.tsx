'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
const fmtM = (n: number) => '$' + (n / 1_000_000).toFixed(1) + 'M'
const fmtFecha = (s: string) => s ? new Date(s + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

export default function Dashboard() {
  const supabase = createClient()
  const [empresa, setEmpresa] = useState<string>('INVEXUS')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [ventas, setVentas] = useState<any[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [tc, setTc] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const chartStockRef = useRef<any>(null)
  const chartMensualRef = useRef<any>(null)
  const chartVendedoresRef = useRef<any>(null)
  const stockCanvasRef = useRef<HTMLCanvasElement>(null)
  const mensualCanvasRef = useRef<HTMLCanvasElement>(null)
  const vendedoresCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const emp = localStorage.getItem('empresa_selected') || 'INVEXUS'
      setEmpresa(emp)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [empresa, desde, hasta])

  useEffect(() => {
    if (loading) return
    if ((window as any).Chart) {
      renderCharts()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      script.onload = () => renderCharts()
      document.head.appendChild(script)
    }
  }, [loading, ventas, stock])

  async function cargarDatos() {
    setLoading(true)
    try {
      // TC
      const { data: tcData } = await supabase
        .from('tipo_cambio')
        .select('tc_bna_venta, fecha')
        .order('fecha', { ascending: false })
        .limit(1)
      if (tcData && tcData[0]) setTc(tcData[0].tc_bna_venta)

      // Ventas
      let qVentas = supabase.from('ventas').select('*').eq('empresa', empresa)
      if (desde) qVentas = qVentas.gte('fecha', desde)
      if (hasta) qVentas = qVentas.lte('fecha', hasta)
      const { data: ventasData } = await qVentas
      setVentas(ventasData || [])

      // Stock completo (para métricas)
      const { data: stockData } = await supabase
        .from('inventario_view')
        .select('*')
        .eq('empresa', empresa)
      setStock(stockData || [])
    } finally {
      setLoading(false)
    }
  }

  function destroyCharts() {
    if (chartStockRef.current) { chartStockRef.current.destroy(); chartStockRef.current = null }
    if (chartMensualRef.current) { chartMensualRef.current.destroy(); chartMensualRef.current = null }
    if (chartVendedoresRef.current) { chartVendedoresRef.current.destroy(); chartVendedoresRef.current = null }
  }

  function renderCharts() {
    if (typeof window === 'undefined' || !(window as any).Chart) return
    const Chart = (window as any).Chart
    destroyCharts()

    // --- Stock donut ---
    const dispOkm = stock.filter(s => s.estado === 'Disponible' && s.tipo === '0km' || s.tipo === '0KM').length
    const dispUsado = stock.filter(s => s.estado === 'Disponible' && s.tipo?.toLowerCase() === 'usado').length
    const vendOkm = stock.filter(s => s.estado === 'Vendido' && (s.tipo === '0km' || s.tipo === '0KM')).length
    const vendUsado = stock.filter(s => s.estado === 'Vendido' && s.tipo?.toLowerCase() === 'usado').length

    if (stockCanvasRef.current) {
      chartStockRef.current = new Chart(stockCanvasRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Disp. 0km', 'Disp. Usado', 'Vend. 0km', 'Vend. Usado'],
          datasets: [{
            data: [dispOkm, dispUsado, vendOkm, vendUsado],
            backgroundColor: ['#1D9E75', '#5DCAA5', '#378ADD', '#85B7EB'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw} unidades` } }
          }
        }
      })
    }

    // --- Evolución mensual ---
    const meses: Record<string, { ingresos: number; ganancia: number; cant: number }> = {}
    ventas.forEach((v: any) => {
      if (!v.fecha) return
      const mes = v.fecha.slice(0, 7)
      if (!meses[mes]) meses[mes] = { ingresos: 0, ganancia: 0, cant: 0 }
      meses[mes].ingresos += v.precio_venta || 0
      meses[mes].ganancia += v.ganancia_neta || 0
      meses[mes].cant++
    })
    const mesesOrdenados = Object.keys(meses).sort()
    const labelsMes = mesesOrdenados.map(m => {
      const [y, mo] = m.split('-')
      const nombres = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      return `${nombres[parseInt(mo)]} ${y.slice(2)}`
    })

    if (mensualCanvasRef.current) {
      chartMensualRef.current = new Chart(mensualCanvasRef.current, {
        type: 'bar',
        data: {
          labels: labelsMes,
          datasets: [
            {
              label: 'Ingresos', type: 'bar',
              data: mesesOrdenados.map(m => meses[m].ingresos),
              backgroundColor: '#378ADD', borderRadius: 4, order: 2
            },
            {
              label: 'Ganancia', type: 'line',
              data: mesesOrdenados.map(m => meses[m].ganancia),
              borderColor: '#1D9E75', backgroundColor: 'transparent',
              pointBackgroundColor: '#1D9E75', tension: 0.3, order: 1
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#888', font: { size: 11 }, maxRotation: 0 }, grid: { color: 'rgba(128,128,128,0.1)' } },
            y: {
              ticks: { color: '#888', font: { size: 10 }, callback: (v: number) => '$' + (v / 1_000_000).toFixed(0) + 'M' },
              grid: { color: 'rgba(128,128,128,0.1)' }
            }
          }
        }
      })
    }

    // --- Vendedores (horizontal bar) ---
    const vendMap: Record<string, { total: number; cant: number; ganancia: number }> = {}
    ventas.forEach((v: any) => {
      const nom = v.vendedor_nombre || 'Sin asignar'
      if (!vendMap[nom]) vendMap[nom] = { total: 0, cant: 0, ganancia: 0 }
      vendMap[nom].total += v.precio_venta || 0
      vendMap[nom].ganancia += v.ganancia_neta || 0
      vendMap[nom].cant++
    })
    const vendOrdenados = Object.entries(vendMap).sort((a, b) => b[1].total - a[1].total).slice(0, 6)

    if (vendedoresCanvasRef.current) {
      chartVendedoresRef.current = new Chart(vendedoresCanvasRef.current, {
        type: 'bar',
        data: {
          labels: vendOrdenados.map(([n]) => n),
          datasets: [{
            label: 'Ingresos',
            data: vendOrdenados.map(([, d]) => d.total),
            backgroundColor: vendOrdenados.map((_, i) => i === 0 ? '#EF9F27' : '#378ADD'),
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ' ' + fmtM(ctx.raw) } } },
          scales: {
            x: { ticks: { color: '#888', font: { size: 10 }, callback: (v: number) => fmtM(v) }, grid: { color: 'rgba(128,128,128,0.1)' } },
            y: { ticks: { color: '#ccc', font: { size: 12 } }, grid: { display: false } }
          }
        }
      })
    }
  }

  // KPIs calculados
  const totalVentas = ventas.reduce((s, v) => s + (v.precio_venta || 0), 0)
  const totalGanancia = ventas.reduce((s, v) => s + (v.ganancia_neta || 0), 0)
  const totalComisiones = ventas.reduce((s, v) => s + (v.comision_ars || 0), 0)
  const ticketProm = ventas.length > 0 ? totalVentas / ventas.length : 0
  const stockDisp = stock.filter(s => s.estado === 'Disponible').length
  const stockVendido = stock.filter(s => s.estado === 'Vendido').length
  const pendienteCobro = ventas.filter(v => v.estado_cobro === 'Pendiente' || v.estado_cobro === 'Parcial').length

  // Crítico: mayor días en stock
  const criticos = stock.filter(s => s.estado === 'Disponible').sort((a, b) => (b.dias_stock || 0) - (a.dias_stock || 0))
  const masViejo = criticos[0]

  // Margen %
  const margenPct = totalVentas > 0 ? (totalGanancia / totalVentas * 100).toFixed(1) : '0'

  const st: Record<string, any> = {
    wrap: { minHeight: '100vh', background: '#0a0f1e', padding: '24px 28px', fontFamily: 'system-ui, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    titulo: { fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 },
    subtitulo: { fontSize: 12, color: '#475569', marginTop: 3 },
    filtros: { display: 'flex', gap: 8, alignItems: 'center' },
    input: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', padding: '6px 10px', fontSize: 12 },
    btnFiltro: (activo: boolean) => ({
      padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 500,
      background: activo ? '#3b82f6' : '#1e293b',
      color: activo ? '#fff' : '#64748b',
      border: activo ? '1px solid #3b82f6' : '1px solid #334155'
    }),
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
    kpi: { background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: '14px 16px' },
    kpiLabel: { fontSize: 11, color: '#64748b', fontWeight: 500, letterSpacing: '.05em', textTransform: 'uppercase' as const, marginBottom: 6 },
    kpiValor: (color = '#f1f5f9') => ({ fontSize: 22, fontWeight: 700, color, fontFamily: 'monospace' }),
    kpiSub: { fontSize: 11, color: '#475569', marginTop: 4 },
    card: { background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: '16px 18px' },
    cardTitulo: { fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, marginBottom: 14 },
    legend: { display: 'flex', flexWrap: 'wrap' as const, gap: 10, marginTop: 10 },
    legendItem: (color: string) => ({ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }),
    legendDot: (color: string) => ({ width: 10, height: 10, borderRadius: 2, background: color }),
  }

  function setPeriodo(meses: number) {
    const hoy = new Date()
    const inicio = new Date()
    inicio.setMonth(hoy.getMonth() - meses + 1)
    inicio.setDate(1)
    setDesde(inicio.toISOString().slice(0, 10))
    setHasta(hoy.toISOString().slice(0, 10))
  }

  return (
    <div style={st.wrap}>
      {/* Header */}
      <div style={st.header}>
        <div>
          <h1 style={st.titulo}>Dashboard — {empresa}</h1>
          <p style={st.subtitulo}>
            {tc > 0 ? `TC BNA hoy: $${tc.toLocaleString('es-AR')}` : ''}
            {desde || hasta ? ` · Período: ${desde ? fmtFecha(desde) : '...'} → ${hasta ? fmtFecha(hasta) : '...'}` : ' · Todo el período'}
          </p>
        </div>
        <div style={st.filtros}>
          {[['1M', 1], ['3M', 3], ['6M', 6]].map(([label, m]) => (
            <button key={label} style={st.btnFiltro(false)} onClick={() => setPeriodo(m as number)}>{label}</button>
          ))}
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={st.input} />
          <span style={{ color: '#334155' }}>→</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={st.input} />
          <button style={st.btnFiltro(false)} onClick={() => { setDesde(''); setHasta('') }}>Todo</button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#475569', padding: 48, textAlign: 'center' }}>Cargando datos...</div>
      ) : (
        <>
          {/* KPIs principales */}
          <div style={st.grid4}>
            <div style={st.kpi}>
              <div style={st.kpiLabel}>Ingresos totales</div>
              <div style={st.kpiValor()}>{fmtM(totalVentas)}</div>
              <div style={st.kpiSub}>{ventas.length} operaciones</div>
            </div>
            <div style={st.kpi}>
              <div style={st.kpiLabel}>Ganancia neta</div>
              <div style={st.kpiValor('#4ade80')}>{fmtM(totalGanancia)}</div>
              <div style={st.kpiSub}>Margen {margenPct}%</div>
            </div>
            <div style={st.kpi}>
              <div style={st.kpiLabel}>Ticket promedio</div>
              <div style={st.kpiValor()}>{fmtM(ticketProm)}</div>
              <div style={st.kpiSub}>por unidad</div>
            </div>
            <div style={st.kpi}>
              <div style={st.kpiLabel}>Comisiones</div>
              <div style={st.kpiValor('#facc15')}>{fmtM(totalComisiones)}</div>
              <div style={st.kpiSub}>{totalVentas > 0 ? (totalComisiones / totalVentas * 100).toFixed(2) : '0'}% sobre ingresos</div>
            </div>
          </div>

          {/* KPIs stock */}
          <div style={st.grid3}>
            <div style={st.kpi}>
              <div style={st.kpiLabel}>Stock disponible</div>
              <div style={st.kpiValor('#60a5fa')}>{stockDisp}</div>
              <div style={st.kpiSub}>
                {stock.filter(s => s.estado === 'Disponible' && (s.tipo === '0km' || s.tipo === '0KM')).length} · 0km &nbsp;|&nbsp;
                {stock.filter(s => s.estado === 'Disponible' && s.tipo?.toLowerCase() === 'usado').length} · usados
              </div>
            </div>
            <div style={st.kpi}>
              <div style={st.kpiLabel}>Vehículos vendidos</div>
              <div style={st.kpiValor()}>{stockVendido}</div>
              <div style={st.kpiSub}>
                {stock.filter(s => s.estado === 'Vendido' && (s.tipo === '0km' || s.tipo === '0KM')).length} · 0km &nbsp;|&nbsp;
                {stock.filter(s => s.estado === 'Vendido' && s.tipo?.toLowerCase() === 'usado').length} · usados
              </div>
            </div>
            <div style={{ ...st.kpi, border: masViejo && masViejo.dias_stock >= 60 ? '1px solid rgba(239,68,68,.4)' : '1px solid #334155' }}>
              <div style={{ ...st.kpiLabel, color: masViejo && masViejo.dias_stock >= 60 ? '#ef4444' : '#64748b' }}>
                {masViejo && masViejo.dias_stock >= 60 ? '⚠ Stock crítico' : 'Mayor días en stock'}
              </div>
              <div style={st.kpiValor(masViejo && masViejo.dias_stock >= 60 ? '#ef4444' : '#f1f5f9')}>
                {masViejo ? `${masViejo.dias_stock}d` : '—'}
              </div>
              {masViejo && (
                <div style={st.kpiSub}>{masViejo.marca} {masViejo.modelo} · {masViejo.id}</div>
              )}
            </div>
          </div>

          {/* Gráficos fila 1: Stock donut + Evolución mensual */}
          <div style={st.grid2}>
            <div style={st.card}>
              <div style={st.cardTitulo}>Stock por estado</div>
              <div style={{ position: 'relative', height: 220 }}>
                <canvas ref={stockCanvasRef} role="img" aria-label="Gráfico de stock por estado" />
              </div>
              <div style={st.legend}>
                {[['#1D9E75', 'Disp. 0km'], ['#5DCAA5', 'Disp. Usado'], ['#378ADD', 'Vend. 0km'], ['#85B7EB', 'Vend. Usado']].map(([c, l]) => (
                  <span key={l} style={st.legendItem(c)}>
                    <span style={st.legendDot(c)} />
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <div style={st.card}>
              <div style={st.cardTitulo}>Evolución mensual</div>
              <div style={{ position: 'relative', height: 220 }}>
                <canvas ref={mensualCanvasRef} role="img" aria-label="Evolución mensual de ingresos y ganancia" />
              </div>
              <div style={st.legend}>
                <span style={st.legendItem('#378ADD')}><span style={{ ...st.legendDot('#378ADD') }} />Ingresos</span>
                <span style={st.legendItem('#1D9E75')}><span style={{ width: 2, height: 10, background: '#1D9E75', display: 'inline-block' }} />Ganancia</span>
              </div>
            </div>
          </div>

          {/* Gráfico vendedores + métricas */}
          <div style={st.grid2}>
            <div style={st.card}>
              <div style={st.cardTitulo}>Ranking vendedores — ingresos</div>
              <div style={{ position: 'relative', height: Math.max(180, Object.keys(
                ventas.reduce((m: any, v: any) => { m[v.vendedor_nombre || 'Sin asignar'] = true; return m }, {})
              ).length * 44 + 40) }}>
                <canvas ref={vendedoresCanvasRef} role="img" aria-label="Ranking de vendedores por ingresos" />
              </div>
            </div>

            <div style={st.card}>
              <div style={st.cardTitulo}>Métricas del período</div>
              {[
                ['Ticket promedio', ticketProm > 0 ? fmt(ticketProm) : '—', 'por operación'],
                ['Ganancia promedio', ventas.length > 0 ? fmt(totalGanancia / ventas.length) : '—', 'por operación'],
                ['Ventas cobradas', `${ventas.filter(v => v.estado_cobro === 'Cobrado').length} / ${ventas.length}`, 'operaciones'],
                ['Contado vs otros', `${ventas.filter(v => v.forma_pago === 'Contado').length} / ${ventas.length}`, 'operaciones'],
                ['Pendientes cobro', pendienteCobro.toString(), pendienteCobro > 0 ? 'revisar' : 'al día'],
              ].map(([label, valor, sub]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #0f172a' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>{sub}</div>
                  </div>
                  <span style={{
                    fontSize: 13, fontFamily: 'monospace', fontWeight: 600,
                    color: label === 'Pendientes cobro' && pendienteCobro > 0 ? '#ef4444' : '#e2e8f0'
                  }}>{valor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla últimas ventas */}
          <div style={st.card}>
            <div style={st.cardTitulo}>Últimas operaciones</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Fecha', 'Cliente', 'Vendedor', 'Vehículo', 'Precio venta', 'Ganancia', 'Forma pago', 'Estado cobro'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...ventas].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 15).map((v: any) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px 10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtFecha(v.fecha)}</td>
                      <td style={{ padding: '8px 10px', color: '#e2e8f0' }}>{v.cliente || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{v.vendedor_nombre || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{v.inv_id || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{v.precio_venta ? fmtM(v.precio_venta) : '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#4ade80', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{v.ganancia_neta ? fmtM(v.ganancia_neta) : '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{v.forma_pago || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                          background: v.estado_cobro === 'Cobrado' ? 'rgba(34,197,94,.15)' : v.estado_cobro === 'Pendiente' ? 'rgba(239,68,68,.15)' : 'rgba(250,204,21,.15)',
                          color: v.estado_cobro === 'Cobrado' ? '#4ade80' : v.estado_cobro === 'Pendiente' ? '#ef4444' : '#facc15',
                        }}>
                          {v.estado_cobro || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ventas.length === 0 && <div style={{ color: '#475569', padding: 24, textAlign: 'center' }}>Sin ventas para el período seleccionado</div>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
