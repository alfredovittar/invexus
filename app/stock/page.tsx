'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import { useStock, useTipoCambio } from '@/hooks/useSupabase'
import { createClient } from '@/utils/supabase/client'
import FiltroVehiculos, { FiltroVehiculosState, aplicarFiltroVehiculos } from '@/components/FiltroVehiculos'
import { registrarAuditoria } from '@/utils/auditoria'

export default function StockPage() {
  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const [filtro, setFiltro] = useState<FiltroVehiculosState>({
    estado: 'Todos', marca: 'Todas', tipo: 'Todos', busqueda: '', diasStock: 'Todos',
  })
  const [showForm, setShowForm] = useState(false)
  const [detalle, setDetalle] = useState<string|null>(null)
  const [editando, setEditando] = useState<string|null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [toast, setToast] = useState('')
  const { stock, loading, refresh } = useStock(empresa)
  const { tcBna, tcBlue } = useTipoCambio()
  const tc = tcBna
  const hoy = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    empresa: 'INVEXUS', tipo: '0km', marca: 'BAIC', modelo: 'BJ30', version: '4X2',
    color: '', anio: 2026, km: 0, costo_usd: '', precio_lista: '',
    vin: '', proveedor: 'BAIC ARGENTINA', combustible: 'Híbrido', transmision: 'Automática',
    moneda_costo: 'USD', moneda_precio: 'ARS',   // ← nuevo campo
    tc_usado: tcBna, fecha_ingreso: hoy,
  })

  const fmt = (n: number) => moneda === 'USD'
    ? 'USD ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n / tc)
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
  const fmtN = (n: number) => new Intl.NumberFormat('es-AR').format(n)
  const fmtFecha = (f: string | null | undefined) => {
    if (!f) return '—'
    const [y, m, d] = f.split('T')[0].split('-')
    return `${d}/${m}/${y.slice(2)}`
  }
  const riskColor = (d: number) => d >= 90 ? '#ef4444' : d >= 60 ? '#f97316' : d >= 30 ? '#eab308' : '#22c55e'
  const riskLabel = (d: number) => d >= 90 ? 'CRÍTICO' : d >= 60 ? 'ALERTA' : d >= 30 ? 'VIGILAR' : 'OK'

  const filtered = aplicarFiltroVehiculos(stock, filtro)

  // ── Calculos del form ──────────────────────────────────────
  const costoArs = form.moneda_costo === 'USD'
    ? parseFloat(form.costo_usd || '0') * form.tc_usado
    : parseFloat(form.costo_usd || '0')

  const precioListaArs = form.moneda_precio === 'USD'
    ? parseFloat(form.precio_lista || '0') * form.tc_usado
    : parseFloat(form.precio_lista || '0')

  const margenEstimado = precioListaArs - costoArs

  const handleClickFila = (id: string) => {
    if (detalle === id) { setDetalle(null); setEditando(null) }
    else { setDetalle(id); setEditando(null) }
  }

  const handleEditar = (s: any) => {
    setEditando(s.id)
    setEditForm({
      modelo: s.modelo || '', version: s.version || '', color: s.color || '',
      anio: s.anio || 2026, km: s.km || 0,
      costo_usd: s.costo_usd || '', costo_ars: s.costo_ars || '',
      precio_lista: s.precio_lista || '', precio_minimo: s.precio_minimo || '',
      vin: s.vin || '', patente: s.patente || '', proveedor: s.proveedor || '',
      estado: s.estado || 'Disponible', observaciones: s.observaciones || '',
      fecha_ingreso: s.fecha_ingreso ? s.fecha_ingreso.split('T')[0] : hoy,
      fecha_venta: s.fecha_venta ? s.fecha_venta.split('T')[0] : '',
    })
  }

  // ── GUARDAR NUEVO ─────────────────────────────────────────
  const handleGuardar = async () => {
    const supabase = createClient()
    const prefix = form.empresa === 'INVEXUS' ? 'INV' : 'MAX'
    const { data: ultimos } = await supabase.from('inventario').select('id').like('id', `${prefix}-%`).order('id', { ascending: false }).limit(1)
    let nextNum = 1
    if (ultimos && ultimos.length > 0) {
      const lastNum = parseInt(ultimos[0].id.split('-')[1])
      if (!isNaN(lastNum)) nextNum = lastNum + 1
    }
    const newId = `${prefix}-${String(nextNum).padStart(3, '0')}`

    const vehiculoData = {
      id: newId, empresa: form.empresa, tipo: form.tipo, marca: form.marca,
      modelo: form.modelo, version: form.version, color: form.color,
      anio: form.anio, km: form.km,
      costo_usd: form.moneda_costo === 'USD' ? parseFloat(form.costo_usd || '0') : null,
      costo_ars: costoArs,
      tc_compra: form.tc_usado,
      precio_lista: precioListaArs,    // siempre se guarda en ARS
      precio_minimo: precioListaArs,
      vin: form.vin, proveedor: form.proveedor,
      combustible: form.combustible, transmision: form.transmision,
      estado: 'Disponible', fecha_ingreso: form.fecha_ingreso || hoy,
    }

    const { error } = await supabase.from('inventario').insert(vehiculoData)
    if (error) { alert('Error: ' + error.message); return }

    // ── AUDITORÍA ──
    await registrarAuditoria({
      tabla: 'inventario', registro_id: newId, accion: 'INSERT',
      descripcion: `Vehículo ingresado: ${form.marca} ${form.modelo} ${form.version} · ${form.color} · ${form.empresa}`,
      datos_despues: vehiculoData, empresa: form.empresa,
    })

    setToast('Vehículo ' + newId + ' cargado')
    setTimeout(() => setToast(''), 3000)
    setShowForm(false)
    refresh()
  }

  // ── GUARDAR EDICIÓN ───────────────────────────────────────
  const handleGuardarEdicion = async (s: any) => {
    const supabase = createClient()
    const datosNuevos = {
      modelo: editForm.modelo, version: editForm.version, color: editForm.color,
      anio: parseInt(editForm.anio), km: parseInt(editForm.km),
      costo_usd: editForm.costo_usd ? parseFloat(editForm.costo_usd) : null,
      costo_ars: editForm.costo_ars ? parseFloat(editForm.costo_ars) : null,
      precio_lista: parseFloat(editForm.precio_lista),
      precio_minimo: parseFloat(editForm.precio_minimo),
      vin: editForm.vin, patente: editForm.patente, proveedor: editForm.proveedor,
      estado: editForm.estado,
      fecha_ingreso: editForm.fecha_ingreso || null,
      fecha_venta: editForm.fecha_venta || null,
    }
    const { error } = await supabase.from('inventario').update(datosNuevos).eq('id', s.id)
    if (error) { alert('Error: ' + error.message); return }

    // ── AUDITORÍA ──
    await registrarAuditoria({
      tabla: 'inventario', registro_id: s.id, accion: 'UPDATE',
      descripcion: `Vehículo editado: ${s.marca} ${editForm.modelo} · ${s.empresa}`,
      datos_antes: { modelo: s.modelo, color: s.color, precio_lista: s.precio_lista, estado: s.estado, costo_usd: s.costo_usd },
      datos_despues: datosNuevos, empresa: s.empresa,
    })

    setToast('Vehículo ' + s.id + ' actualizado')
    setTimeout(() => setToast(''), 3000)
    setEditando(null)
    setDetalle(null)
    refresh()
  }

  const campo = (label: string, value: any) => (
    <div key={label}>
      <div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={() => setMoneda(m => m === 'ARS' ? 'USD' : 'ARS')} />
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#166534', color: '#4ade80', border: '1px solid #16a34a', borderRadius: 10, padding: '10px 18px', fontSize: 13, zIndex: 1000, fontWeight: 500 }}>✓ {toast}</div>}
      <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* FILTROS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>Stock</span>
            <span style={{ fontSize: 12, color: '#475569' }}>{filtered.length} vehículos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <FiltroVehiculos value={filtro} onChange={setFiltro} mostrarDiasStock={true} mostrarBusqueda={true} />
            <button onClick={() => setShowForm(true)} style={{ padding: '6px 16px', borderRadius: 8, background: '#3b82f6', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>+ Cargar vehículo</button>
          </div>
        </div>

        {/* FORMULARIO NUEVO VEHÍCULO */}
        {showForm && (
          <div style={{ background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>Nuevo ingreso</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
              {[
                ['empresa', 'Empresa', ['INVEXUS', 'MAXIAUTO']],
                ['tipo', 'Tipo', ['0km', 'Usado']],
                ['marca', 'Marca', ['BAIC', 'CHERY', 'VW', 'TOYOTA', 'CHEVROLET', 'FIAT', 'Otro']],
                ['modelo', 'Modelo', null],
                ['version', 'Versión', null],
                ['color', 'Color', null],
                ['vin', 'VIN/Motor', null],
                ['proveedor', 'Proveedor', null],
              ].map(([k, l, opts]: any) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>{l}</label>
                  {opts
                    ? <select value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }}>{opts.map((o: string) => <option key={o}>{o}</option>)}</select>
                    : <input value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }} />
                  }
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha ingreso</label>
                <input type="date" value={form.fecha_ingreso} onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }} />
              </div>
            </div>

            {/* ── SECCIÓN FINANCIERA ── */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Datos financieros</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>

                {/* COSTO */}
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Moneda costo</label>
                  <select value={form.moneda_costo} onChange={e => setForm({ ...form, moneda_costo: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 }}>
                    <option value="USD">USD → TC</option>
                    <option value="ARS">ARS directo</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Costo ({form.moneda_costo})</label>
                  <input type="number" value={form.costo_usd} onChange={e => setForm({ ...form, costo_usd: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 }} />
                </div>

                {/* PRECIO LISTA */}
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Moneda precio lista</label>
                  <select value={form.moneda_precio} onChange={e => setForm({ ...form, moneda_precio: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 }}>
                    <option value="ARS">ARS directo</option>
                    <option value="USD">USD → TC</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Precio lista ({form.moneda_precio})</label>
                  <input type="number" value={form.precio_lista} onChange={e => setForm({ ...form, precio_lista: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 }} />
                </div>
              </div>

              {/* TC */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>TC utilizado</label>
                  <input type="number" value={form.tc_usado} onChange={e => setForm({ ...form, tc_usado: parseFloat(e.target.value) })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fb923c', fontSize: 12 }} />
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                  <button onClick={() => setForm({ ...form, tc_usado: tcBna })} style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid #334155', background: 'rgba(96,165,250,.1)', color: '#60a5fa', fontSize: 11, cursor: 'pointer' }}>
                    BNA ${fmtN(tcBna)}
                  </button>
                  <button onClick={() => setForm({ ...form, tc_usado: tcBlue })} style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(251,146,60,.3)', background: 'rgba(251,146,60,.1)', color: '#fb923c', fontSize: 11, cursor: 'pointer' }}>
                    Blue ${fmtN(tcBlue)}
                  </button>
                </div>
              </div>

              {/* PREVIEWS */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {/* conversión costo */}
                {form.costo_usd && form.moneda_costo === 'USD' && (
                  <div style={{ background: 'rgba(251,146,60,.1)', border: '1px solid rgba(251,146,60,.25)', borderRadius: 8, padding: '8px 14px', fontSize: 12, flex: 1 }}>
                    <span style={{ color: '#fb923c' }}>Costo ARS: </span>
                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>USD {fmtN(parseFloat(form.costo_usd))} × ${fmtN(form.tc_usado)} = {fmt(costoArs)}</span>
                  </div>
                )}
                {/* conversión precio */}
                {form.precio_lista && form.moneda_precio === 'USD' && (
                  <div style={{ background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.25)', borderRadius: 8, padding: '8px 14px', fontSize: 12, flex: 1 }}>
                    <span style={{ color: '#60a5fa' }}>Precio ARS: </span>
                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>USD {fmtN(parseFloat(form.precio_lista))} × ${fmtN(form.tc_usado)} = {fmt(precioListaArs)}</span>
                  </div>
                )}
                {/* margen */}
                {form.costo_usd && form.precio_lista && (
                  <div style={{ background: margenEstimado >= 0 ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', border: `1px solid ${margenEstimado >= 0 ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, flex: 1 }}>
                    <span style={{ color: margenEstimado >= 0 ? '#4ade80' : '#f87171' }}>Margen estimado: </span>
                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{fmt(margenEstimado)}</span>
                    {precioListaArs > 0 && <span style={{ color: '#475569', marginLeft: 8 }}>({((margenEstimado / precioListaArs) * 100).toFixed(1)}%)</span>}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleGuardar} style={{ padding: '7px 20px', borderRadius: 8, background: '#16a34a', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Guardar</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '7px 16px', borderRadius: 8, background: 'transparent', color: '#64748b', border: '1px solid #334155', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* TABLA */}
        {loading ? <div style={{ color: '#475569', padding: 40, textAlign: 'center' }}>Cargando stock...</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['ID', 'Empresa', 'Tipo', 'Modelo', 'Ver.', 'Color', 'Km', 'Costo', 'Lista', 'Margen', 'Ingreso', 'Días', 'Estado', 'Comprador', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '7px 8px', color: '#475569', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => {
                  const ca = s.tipo?.toLowerCase() === 'usado' ? (s.costo_ars || 0) : (s.costo_usd ? s.costo_usd * tc : s.costo_ars || 0)
                  const mg = (s.precio_lista || 0) - ca
                  const d = s.dias_stock || 0
                  const isOpen = detalle === s.id
                  const isEditing = editando === s.id
                  const vendido = s.estado === 'Vendido'
                  return (
                    <>
                      <tr
                        key={s.id}
                        onClick={() => handleClickFila(s.id)}
                        style={{ borderBottom: isOpen ? 'none' : '1px solid #0f172a', background: isOpen ? '#1a2744' : 'transparent', cursor: 'pointer', transition: 'background .15s' }}
                        onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#16213a' }}
                        onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <td style={{ padding: '7px 8px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>{s.id}</td>
                        <td style={{ padding: '7px 8px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: s.empresa === 'INVEXUS' ? 'rgba(96,165,250,.15)' : 'rgba(167,139,250,.15)', color: s.empresa === 'INVEXUS' ? '#60a5fa' : '#a78bfa', border: `1px solid ${s.empresa === 'INVEXUS' ? 'rgba(96,165,250,.3)' : 'rgba(167,139,250,.3)'}` }}>{s.empresa}</span></td>
                        <td style={{ padding: '7px 8px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: s.tipo?.toLowerCase() === '0km' ? 'rgba(34,197,94,.15)' : 'rgba(100,116,139,.15)', color: s.tipo?.toLowerCase() === '0km' ? '#4ade80' : '#94a3b8', border: `1px solid ${s.tipo?.toLowerCase() === '0km' ? 'rgba(34,197,94,.3)' : 'rgba(100,116,139,.3)'}` }}>{s.tipo}</span></td>
                        <td style={{ padding: '7px 8px', color: '#e2e8f0', fontWeight: 500 }}>{s.modelo}</td>
                        <td style={{ padding: '7px 8px', color: '#94a3b8' }}>{s.version}</td>
                        <td style={{ padding: '7px 8px', color: '#cbd5e1' }}>{s.color}</td>
                        <td style={{ padding: '7px 8px', color: '#64748b', fontFamily: 'monospace' }}>{fmtN(s.km || 0)}</td>
                        <td style={{ padding: '7px 8px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>{fmt(ca)}</td>
                        <td style={{ padding: '7px 8px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }}>{fmt(s.precio_lista || 0)}</td>
                        <td style={{ padding: '7px 8px', color: mg >= 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace', fontSize: 11 }}>{fmt(mg)}</td>
                        <td style={{ padding: '7px 8px', color: '#64748b', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtFecha(s.fecha_ingreso)}</td>
                        <td style={{ padding: '7px 8px' }}><span style={{ color: riskColor(d), fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{d}d</span></td>
                        <td style={{ padding: '7px 8px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: d >= 60 ? `rgba(${d >= 90 ? '239,68,68' : '249,115,22'},.15)` : 'rgba(34,197,94,.15)', color: riskColor(d), border: `1px solid ${riskColor(d)}44` }}>{d >= 60 ? riskLabel(d) : s.estado}</span></td>
                        <td style={{ padding: '7px 8px' }}>
                          {vendido && s.venta?.cliente
                            ? <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 500 }}>{s.venta.cliente}</span>
                            : <span style={{ fontSize: 11, color: '#334155' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 8px', color: isOpen ? '#60a5fa' : '#475569', fontSize: 13 }}>{isOpen ? '▲' : '▼'}</td>
                      </tr>

                      {/* PANEL DETALLE */}
                      {isOpen && (
                        <tr key={s.id + '-detalle'} style={{ borderBottom: '2px solid #3b82f6' }}>
                          <td colSpan={15} style={{ padding: 0 }}>
                            <div style={{ background: '#0f1f3d', borderTop: '1px solid #1e3a5f', padding: '20px 24px' }}>
                              {!isEditing ? (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                                    <div>
                                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{s.marca} {s.modelo} {s.version}</div>
                                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{s.id} · Ingresó {fmtFecha(s.fecha_ingreso)} · {d} días en stock</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button onClick={e => { e.stopPropagation(); handleEditar(s) }} style={{ padding: '6px 16px', borderRadius: 8, background: 'rgba(59,130,246,.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.3)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✎ Editar</button>
                                      <button onClick={e => { e.stopPropagation(); setDetalle(null) }} style={{ padding: '6px 14px', borderRadius: 8, background: 'transparent', color: '#475569', border: '1px solid #334155', fontSize: 12, cursor: 'pointer' }}>✕ Cerrar</button>
                                    </div>
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 16 }}>
                                    {campo('ID', s.id)}{campo('Empresa', s.empresa)}{campo('Tipo', s.tipo)}{campo('Marca', s.marca)}{campo('Modelo', s.modelo)}
                                    {campo('Versión', s.version)}{campo('Color', s.color)}{campo('Año', s.anio)}{campo('Km', s.km ? fmtN(s.km) : null)}{campo('Combustible', s.combustible)}
                                    {campo('Transmisión', s.transmision)}{campo('VIN / Motor', s.vin)}{campo('Patente', s.patente)}{campo('Proveedor', s.proveedor)}{campo('Estado', s.estado)}
                                  </div>

                                  <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                                    <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Financiero</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
                                      {campo('Costo USD', s.costo_usd ? 'USD ' + fmtN(s.costo_usd) : null)}
                                      {campo('Costo ARS', s.costo_ars ? fmt(s.costo_ars) : null)}
                                      {campo('TC compra', s.tc_compra ? '$' + fmtN(s.tc_compra) : null)}
                                      {campo('Precio lista', fmt(s.precio_lista || 0))}
                                      {campo('Precio mínimo', fmt(s.precio_minimo || 0))}
                                    </div>
                                  </div>

                                  {vendido && s.venta && (
                                    <div style={{ background: 'rgba(167,139,250,.06)', border: '1px solid rgba(167,139,250,.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                                      <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Operación de venta</div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
                                        <div><div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>Comprador</div><div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600 }}>{s.venta.cliente || '—'}</div></div>
                                        <div><div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>Vendedor</div><div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{s.venta.vendedor_nombre || '—'}</div></div>
                                        <div><div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>Fecha venta</div><div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{fmtFecha(s.venta.fecha)}</div></div>
                                        <div><div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>Precio vendido</div><div style={{ fontSize: 13, color: '#4ade80', fontWeight: 600, fontFamily: 'monospace' }}>{fmt(s.venta.precio_venta || 0)}</div></div>
                                        <div><div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>Forma de pago</div><div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{s.venta.forma_pago || '—'}</div></div>
                                      </div>
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', gap: 24, marginBottom: s.observaciones ? 14 : 0 }}>
                                    <div>{campo('Fecha ingreso', fmtFecha(s.fecha_ingreso))}</div>
                                    {s.fecha_venta && <div>{campo('Fecha venta', fmtFecha(s.fecha_venta))}</div>}
                                    <div>
                                      <div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>Días en stock</div>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: riskColor(d) }}>{d}d — {riskLabel(d)}</div>
                                    </div>
                                  </div>
                                  {s.observaciones && (
                                    <div style={{ background: '#12223d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8', border: '1px solid #1e3a5f', marginTop: 14 }}>
                                      <span style={{ color: '#475569', marginRight: 8 }}>Obs:</span>{s.observaciones}
                                    </div>
                                  )}
                                </>
                              ) : (
                                /* MODO EDICIÓN */
                                <div onClick={e => e.stopPropagation()}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa', marginBottom: 16 }}>Editando {s.id}</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 12 }}>
                                    {[['modelo','Modelo'],['version','Versión'],['color','Color'],['anio','Año'],['km','Km']].map(([k, l]) => (
                                      <div key={k}><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>{l}</label><input value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                                    ))}
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 12 }}>
                                    {[['costo_usd','Costo USD'],['costo_ars','Costo ARS'],['precio_lista','Precio lista ARS'],['precio_minimo','Precio mínimo ARS'],['proveedor','Proveedor']].map(([k, l]) => (
                                      <div key={k}><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>{l}</label><input value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                                    ))}
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14 }}>
                                    {[['vin','VIN/Motor'],['patente','Patente']].map(([k, l]) => (
                                      <div key={k}><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>{l}</label><input value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                                    ))}
                                    <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Estado</label><select value={editForm.estado} onChange={e => setEditForm({ ...editForm, estado: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }}>{['Disponible','Reservado','Vendido'].map(o => <option key={o}>{o}</option>)}</select></div>
                                    <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Fecha ingreso</label><input type="date" value={editForm.fecha_ingreso} onChange={e => setEditForm({ ...editForm, fecha_ingreso: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                                    <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Fecha venta</label><input type="date" value={editForm.fecha_venta} onChange={e => setEditForm({ ...editForm, fecha_venta: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                                  </div>
                                  <div style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Observaciones</label>
                                    <input value={editForm.observaciones || ''} onChange={e => setEditForm({ ...editForm, observaciones: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} />
                                  </div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => handleGuardarEdicion(s)} style={{ padding: '6px 18px', borderRadius: 7, background: '#16a34a', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Guardar cambios</button>
                                    <button onClick={() => setEditando(null)} style={{ padding: '6px 14px', borderRadius: 7, background: 'transparent', color: '#64748b', border: '1px solid #334155', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div style={{ color: '#475569', padding: 24, textAlign: 'center' }}>Sin resultados</div>}
          </div>
        )}
      </div>
    </div>
  )
}
