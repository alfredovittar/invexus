'use client'
import React, { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import FiltroFechas from '@/components/FiltroFechas'
import FiltroVehiculos, { FiltroVehiculosState, aplicarFiltroVehiculos } from '@/components/FiltroVehiculos'
import { useVentas, useTipoCambio, useInstrumentos } from '@/hooks/useSupabase'
import { createClient } from '@/utils/supabase/client'
import { registrarAuditoria } from '@/utils/auditoria'

type GastoUnidad = {
  id?: string
  tipo: 'flete' | 'formularios' | 'patentamiento' | 'varios'
  descripcion: string
  monto_ars: number
}

type InstrumentoCobro = {
  id?: string
  tipo: 'cheque' | 'transferencia' | 'efectivo' | 'pagare' | 'pxp' | 'otro'
  numero_referencia: string
  banco: string
  monto_ars: number
  fecha_emision: string
  fecha_vencimiento: string
  monto_aplicado: number
}

const TIPOS_GASTO: GastoUnidad['tipo'][] = ['flete', 'formularios', 'patentamiento', 'varios']
const TIPOS_INSTRUMENTO: InstrumentoCobro['tipo'][] = ['cheque', 'transferencia', 'efectivo', 'pagare', 'pxp', 'otro']
const FORMAS_PAGO = ['Todas', 'Contado', 'Transferencia', 'Financiado', 'Mixto', 'Permuta']
const ESTADOS_COBRO = ['Todos', 'Cobrado', 'Parcial', 'Pendiente', 'Seña']
const VENDEDORES = ['Todos', 'GIULIANA', 'CARLITOS', 'GABRIEL', 'LUCAS', 'SAYAGO', 'GERENCIA']

export default function VentasPage() {
  const hoy = new Date().toISOString().split('T')[0]
  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [detalle, setDetalle] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [toast, setToast] = useState('')
  const [showAnular, setShowAnular] = useState<string | null>(null)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')

  const [filtroVendedor, setFiltroVendedor] = useState('Todos')
  const [filtroFormaPago, setFiltroFormaPago] = useState('Todas')
  const [filtroEstadoCobro, setFiltroEstadoCobro] = useState('Todos')
  const [busquedaCliente, setBusquedaCliente] = useState('')

  const [filtroVehiculo, setFiltroVehiculo] = useState<FiltroVehiculosState>({
    estado: 'Disponible', marca: 'Todas', tipo: 'Todos', busqueda: '', diasStock: 'Todos',
  })
  const [inventario, setInventario] = useState<any[]>([])
  const [gastosForm, setGastosForm] = useState<GastoUnidad[]>([])
  const [instrumentosForm, setInstrumentosForm] = useState<InstrumentoCobro[]>([])
  const [showInstrumentoExistente, setShowInstrumentoExistente] = useState(false)

  const { ventas, loading, refresh } = useVentas(empresa, desde || undefined, hasta || undefined)
  const { tcBna, tcBlue } = useTipoCambio()
  const { instrumentos: instrumentosExistentes, refresh: refreshInstrumentos } = useInstrumentos(empresa)
  const tc = tcBna

  const [form, setForm] = useState({
    empresa: 'INVEXUS', inv_id: '', cliente: '', vendedor_nombre: '',
    precio_venta: '', forma_pago: 'Contado',
    cobro_efectivo: 0, cobro_transfer: 0, cobro_usd: 0,
    cobro_usd_tc: tcBna, cobro_pagare: 0, cobro_pxp: 0,
    estado_cobro: 'Cobrado', observaciones: '', fecha: hoy,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('inventario_view').select('*')
      .then(({ data }) => { if (data) setInventario(data) })
  }, [empresa])

  const inventarioFiltradoPorEmpresa = inventario.filter((v: any) =>
    form.empresa === 'AMBAS' ? true : v.empresa === form.empresa
  )
  const vehiculosParaVenta = aplicarFiltroVehiculos(inventarioFiltradoPorEmpresa, filtroVehiculo)
  const getVehiculo = (inv_id: string) => inventario.find((v: any) => v.id === inv_id)

  const fmt = (n: number) => moneda === 'USD'
    ? 'USD ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n / tc)
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
  const fmtN = (n: number) => new Intl.NumberFormat('es-AR').format(n)
  const fmtFecha = (f: string | null | undefined) => {
    if (!f) return '—'
    const [y, m, d] = f.split('T')[0].split('-')
    return `${d}/${m}/${y.slice(2)}`
  }

  const ventasFiltradas = ventas.filter((v: any) => {
    if (filtroVendedor !== 'Todos' && v.vendedor_nombre !== filtroVendedor) return false
    if (filtroFormaPago !== 'Todas' && v.forma_pago !== filtroFormaPago) return false
    if (filtroEstadoCobro !== 'Todos' && v.estado_cobro !== filtroEstadoCobro) return false
    if (busquedaCliente) {
      const q = busquedaCliente.toLowerCase()
      const vehiculo = v.inv_id ? getVehiculo(v.inv_id) : null
      if (!v.cliente?.toLowerCase().includes(q) && !v.vendedor_nombre?.toLowerCase().includes(q) && !v.inv_id?.toLowerCase().includes(q) && !vehiculo?.modelo?.toLowerCase().includes(q) && !vehiculo?.marca?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const hayFiltrosActivos = filtroVendedor !== 'Todos' || filtroFormaPago !== 'Todas' || filtroEstadoCobro !== 'Todos' || busquedaCliente !== ''
  const limpiarFiltros = () => { setFiltroVendedor('Todos'); setFiltroFormaPago('Todas'); setFiltroEstadoCobro('Todos'); setBusquedaCliente('') }

  const totalVentas = ventasFiltradas.reduce((a: number, v: any) => a + (v.precio_venta || 0), 0)
  const totalGanancia = ventasFiltradas.reduce((a: number, v: any) => a + (v.ganancia_neta || 0), 0)

  const totalCobrado =
    (parseFloat(String(form.cobro_efectivo)) || 0) +
    (parseFloat(String(form.cobro_transfer)) || 0) +
    (parseFloat(String(form.cobro_usd)) || 0) * form.cobro_usd_tc +
    (parseFloat(String(form.cobro_pagare)) || 0) +
    (parseFloat(String(form.cobro_pxp)) || 0) +
    instrumentosForm.reduce((a, i) => a + (i.monto_aplicado || 0), 0)
  const precioVenta = parseFloat(form.precio_venta) || 0
  const totalGastosForm = gastosForm.reduce((a, g) => a + (g.monto_ars || 0), 0)
  const diff = precioVenta - totalCobrado

  const handleClickFila = (id: string) => {
    if (detalle === id) { setDetalle(null); setEditando(null) }
    else { setDetalle(id); setEditando(null); setShowAnular(null) }
  }

  const handleEditar = (v: any) => {
    setEditando(v.id)
    setEditForm({
      cliente: v.cliente || '', vendedor_nombre: v.vendedor_nombre || '',
      precio_venta: v.precio_venta || '', forma_pago: v.forma_pago || 'Contado',
      cobro_efectivo: v.cobro_efectivo || 0, cobro_transfer: v.cobro_transfer || 0,
      cobro_usd: v.cobro_usd || 0, cobro_usd_tc: v.cobro_usd_tc || tcBna,
      cobro_pagare: v.cobro_pagare || 0, cobro_pxp: v.cobro_pxp || 0,
      ganancia_neta: v.ganancia_neta || '', costo_compra: v.costo_compra || '',
      estado_cobro: v.estado_cobro || 'Cobrado', observaciones: v.observaciones || '',
      fecha: v.fecha ? v.fecha.split('T')[0] : hoy,
    })
  }

  // ── REGISTRAR VENTA ───────────────────────────────────────
  const handleGuardar = async () => {
    const supabase = createClient()
    const newId = 'VTA-' + Date.now().toString().slice(-8)
    const ventaData = {
      id: newId, empresa: form.empresa, inv_id: form.inv_id || null,
      fecha: form.fecha || hoy, cliente: form.cliente,
      vendedor_nombre: form.vendedor_nombre,
      precio_venta: parseFloat(form.precio_venta),
      forma_pago: form.forma_pago,
      cobro_efectivo: form.cobro_efectivo, cobro_transfer: form.cobro_transfer,
      cobro_usd: form.cobro_usd, cobro_usd_tc: form.cobro_usd_tc,
      cobro_pagare: form.cobro_pagare, cobro_pxp: form.cobro_pxp,
      estado_cobro: form.estado_cobro,
      tc_bna_snapshot: tcBna, tc_blue_snapshot: tcBlue,
      observaciones: form.observaciones, estado_venta: 'Activa',
    }
    const { error: errVenta } = await supabase.from('ventas').insert(ventaData)
    if (errVenta) { alert('Error al registrar venta: ' + errVenta.message); return }

    // Actualizar estado vehículo
    if (form.inv_id) {
      await supabase.from('inventario').update({ estado: 'Vendido', fecha_venta: form.fecha || hoy }).eq('id', form.inv_id)
      await registrarAuditoria({ tabla: 'inventario', registro_id: form.inv_id, accion: 'UPDATE', descripcion: `Estado cambiado a Vendido por venta ${newId}`, datos_despues: { estado: 'Vendido', fecha_venta: form.fecha || hoy }, empresa: form.empresa })
    }

    // Gastos por unidad
    if (gastosForm.length > 0 && form.inv_id) {
      const gastosInsert = gastosForm.filter(g => g.monto_ars > 0).map(g => ({
        inv_id: form.inv_id, venta_id: newId, empresa: form.empresa,
        tipo: g.tipo, descripcion: g.descripcion, monto_ars: g.monto_ars, fecha: form.fecha || hoy,
      }))
      if (gastosInsert.length > 0) await supabase.from('gastos_unidad').insert(gastosInsert)
    }

    // Instrumentos
    for (const inst of instrumentosForm) {
      if (inst.monto_aplicado <= 0) continue
      let instrId = inst.id
      if (!instrId) {
        const { data: newInstr } = await supabase.from('instrumentos_cobro').insert({
          empresa: form.empresa, tipo: inst.tipo, numero_referencia: inst.numero_referencia,
          banco: inst.banco, monto_ars: inst.monto_ars, fecha_emision: inst.fecha_emision || hoy,
          fecha_vencimiento: inst.fecha_vencimiento || null,
          estado: inst.monto_aplicado >= inst.monto_ars ? 'aplicado_total' : 'aplicado_parcial',
        }).select().single()
        if (!newInstr) continue
        instrId = newInstr.id
      } else {
        const instrExistente = instrumentosExistentes.find(i => i.id === instrId)
        await supabase.from('instrumentos_cobro').update({ estado: inst.monto_aplicado >= (instrExistente?.monto_ars || 0) ? 'aplicado_total' : 'aplicado_parcial' }).eq('id', instrId)
      }
      await supabase.from('venta_instrumentos').insert({ venta_id: newId, instrumento_id: instrId, monto_aplicado: inst.monto_aplicado })
    }

    // ── AUDITORÍA ──
    await registrarAuditoria({
      tabla: 'ventas', registro_id: newId, accion: 'INSERT',
      descripcion: `Venta registrada: ${form.cliente} · ${form.empresa} · $${parseFloat(form.precio_venta).toLocaleString('es-AR')}`,
      datos_despues: ventaData, empresa: form.empresa,
    })

    setToast('Venta registrada correctamente')
    setTimeout(() => setToast(''), 3000)
    setShowForm(false); setGastosForm([]); setInstrumentosForm([])
    refresh(); refreshInstrumentos()
    const { data } = await supabase.from('inventario_view').select('*')
    if (data) setInventario(data)
  }

  // ── GUARDAR EDICIÓN ───────────────────────────────────────
  const handleGuardarEdicion = async (v: any) => {
    const supabase = createClient()
    const datosNuevos = {
      cliente: editForm.cliente, vendedor_nombre: editForm.vendedor_nombre,
      precio_venta: parseFloat(editForm.precio_venta),
      forma_pago: editForm.forma_pago,
      cobro_efectivo: parseFloat(editForm.cobro_efectivo) || 0,
      cobro_transfer: parseFloat(editForm.cobro_transfer) || 0,
      cobro_usd: parseFloat(editForm.cobro_usd) || 0,
      cobro_usd_tc: parseFloat(editForm.cobro_usd_tc) || tcBna,
      cobro_pagare: parseFloat(editForm.cobro_pagare) || 0,
      cobro_pxp: parseFloat(editForm.cobro_pxp) || 0,
      ganancia_neta: editForm.ganancia_neta ? parseFloat(editForm.ganancia_neta) : null,
      costo_compra: editForm.costo_compra ? parseFloat(editForm.costo_compra) : null,
      estado_cobro: editForm.estado_cobro,
      observaciones: editForm.observaciones,
      fecha: editForm.fecha || hoy,
    }
    const { error } = await supabase.from('ventas').update(datosNuevos).eq('id', v.id)
    if (error) { alert('Error: ' + error.message); return }

    // ── AUDITORÍA ──
    await registrarAuditoria({
      tabla: 'ventas', registro_id: v.id, accion: 'UPDATE',
      descripcion: `Venta editada: ${editForm.cliente} · ${v.empresa}`,
      datos_antes: { cliente: v.cliente, precio_venta: v.precio_venta, estado_cobro: v.estado_cobro, forma_pago: v.forma_pago },
      datos_despues: datosNuevos, empresa: v.empresa,
    })

    setToast('Venta ' + v.id + ' actualizada')
    setTimeout(() => setToast(''), 3000)
    setEditando(null); refresh()
  }

  // ── ANULAR VENTA ──────────────────────────────────────────
  const handleAnular = async (v: any) => {
    if (!motivoAnulacion.trim()) { alert('Ingresá el motivo de anulación'); return }
    const supabase = createClient()
    const { error: errV } = await supabase.from('ventas').update({
      estado_venta: 'Anulada', fecha_anulacion: new Date().toISOString(), motivo_anulacion: motivoAnulacion,
    }).eq('id', v.id)
    if (errV) { alert('Error al anular: ' + errV.message); return }

    if (v.inv_id) {
      await supabase.from('inventario').update({ estado: 'Disponible', fecha_venta: null }).eq('id', v.inv_id)
      await registrarAuditoria({ tabla: 'inventario', registro_id: v.inv_id, accion: 'UPDATE', descripcion: `Vehículo vuelto a Disponible por anulación de ${v.id}`, datos_despues: { estado: 'Disponible' }, empresa: v.empresa })
    }

    // ── AUDITORÍA ──
    await registrarAuditoria({
      tabla: 'ventas', registro_id: v.id, accion: 'ANULACION',
      descripcion: `Venta anulada: ${v.cliente} · Motivo: ${motivoAnulacion}`,
      datos_antes: { estado_venta: 'Activa', cliente: v.cliente, precio_venta: v.precio_venta },
      datos_despues: { estado_venta: 'Anulada', motivo_anulacion: motivoAnulacion },
      empresa: v.empresa,
    })

    setToast('Venta ' + v.id + ' anulada')
    setTimeout(() => setToast(''), 4000)
    setShowAnular(null); setMotivoAnulacion(''); setDetalle(null); refresh()
    const { data } = await supabase.from('inventario_view').select('*')
    if (data) setInventario(data)
  }

  // ── helpers gastos / instrumentos ─────────────────────────
  const agregarGasto = () => setGastosForm(prev => [...prev, { tipo: 'flete', descripcion: '', monto_ars: 0 }])
  const actualizarGasto = (idx: number, campo: keyof GastoUnidad, valor: any) => setGastosForm(prev => prev.map((g, i) => i === idx ? { ...g, [campo]: valor } : g))
  const eliminarGasto = (idx: number) => setGastosForm(prev => prev.filter((_, i) => i !== idx))
  const agregarInstrumentoNuevo = () => setInstrumentosForm(prev => [...prev, { tipo: 'cheque', numero_referencia: '', banco: '', monto_ars: 0, fecha_emision: hoy, fecha_vencimiento: '', monto_aplicado: 0 }])
  const agregarInstrumentoExistente = (i: any) => {
    if (instrumentosForm.find(x => x.id === i.id)) return
    setInstrumentosForm(prev => [...prev, { id: i.id, tipo: i.tipo, numero_referencia: i.numero_referencia, banco: i.banco, monto_ars: i.monto_ars, fecha_emision: i.fecha_emision, fecha_vencimiento: i.fecha_vencimiento, monto_aplicado: i.monto_ars }])
    setShowInstrumentoExistente(false)
  }
  const actualizarInstrumento = (idx: number, campo: keyof InstrumentoCobro, valor: any) => setInstrumentosForm(prev => prev.map((i, n) => n === idx ? { ...i, [campo]: valor } : i))
  const eliminarInstrumento = (idx: number) => setInstrumentosForm(prev => prev.filter((_, i) => i !== idx))

  const estadoCobro = (e: string) => {
    const map: Record<string, { bg: string; color: string; border: string }> = {
      Cobrado:   { bg: 'rgba(34,197,94,.15)',  color: '#4ade80', border: 'rgba(34,197,94,.3)' },
      Parcial:   { bg: 'rgba(234,179,8,.15)',  color: '#facc15', border: 'rgba(234,179,8,.3)' },
      Pendiente: { bg: 'rgba(249,115,22,.15)', color: '#fb923c', border: 'rgba(249,115,22,.3)' },
      Seña:      { bg: 'rgba(96,165,250,.15)', color: '#60a5fa', border: 'rgba(96,165,250,.3)' },
    }
    return map[e] ?? map['Pendiente']
  }

  const campo = (label: string, value: any) => (
    <div key={label}>
      <div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )

  const estiloSelect = { padding: '5px 10px', borderRadius: 7, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11, cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={() => setMoneda(m => m === 'ARS' ? 'USD' : 'ARS')} />
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#166534', color: '#4ade80', border: '1px solid #16a34a', borderRadius: 10, padding: '10px 18px', fontSize: 13, zIndex: 1000, fontWeight: 500 }}>✓ {toast}</div>}
      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* BARRA FILTROS */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>Período</span>
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
          <div style={{ width: 1, height: 24, background: '#334155' }} />
          <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)} style={estiloSelect}>
            {VENDEDORES.map(v => <option key={v} value={v}>{v === 'Todos' ? 'Todos los vendedores' : v}</option>)}
          </select>
          <select value={filtroFormaPago} onChange={e => setFiltroFormaPago(e.target.value)} style={estiloSelect}>
            {FORMAS_PAGO.map(f => <option key={f} value={f}>{f === 'Todas' ? 'Todas las formas' : f}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            {ESTADOS_COBRO.map(e => {
              const ec = estadoCobro(e)
              const activo = filtroEstadoCobro === e
              return <button key={e} onClick={() => setFiltroEstadoCobro(e)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${activo ? ec.border : '#334155'}`, background: activo ? ec.bg : 'transparent', color: activo ? ec.color : '#64748b', fontSize: 11, cursor: 'pointer', fontWeight: activo ? 600 : 400 }}>{e}</button>
            })}
          </div>
          <input value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} placeholder="Buscar cliente, vehículo..." style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11, width: 180 }} />
          {hayFiltrosActivos && <button onClick={limpiarFiltros} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #3a1010', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>✕ Limpiar</button>}
          <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{ventasFiltradas.length}{ventas.length !== ventasFiltradas.length ? ` de ${ventas.length}` : ''} operaciones</span>
          <button onClick={() => setShowForm(v => !v)} style={{ padding: '6px 16px', borderRadius: 8, background: '#3b82f6', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Registrar venta</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
          {[
            ['Total vendido', fmt(totalVentas), ventasFiltradas.length + ' operaciones', '#3b82f6'],
            ['Ganancia total', fmt(totalGanancia), totalVentas ? ((totalGanancia / totalVentas) * 100).toFixed(1) + '% margen' : '—', '#22c55e'],
            ['Ticket promedio', ventasFiltradas.length > 0 ? fmt(totalVentas / ventasFiltradas.length) : '—', ventasFiltradas.length + ' ops', '#8b5cf6'],
            ['Pendientes cobro', ventasFiltradas.filter((v: any) => v.estado_cobro !== 'Cobrado').length + ' ventas', 'Requieren seguimiento', '#f97316'],
          ].map(([l, v, s, c]) => (
            <div key={l as string} style={{ background: '#1e293b', border: `1px solid ${c}`, borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c as string }} />
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>{v}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* FORMULARIO NUEVA VENTA */}
        {showForm && (
          <div style={{ background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>Nueva operación</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
              {[
                ['empresa', 'Empresa', ['INVEXUS', 'MAXIAUTO']],
                ['cliente', 'Cliente', null],
                ['vendedor_nombre', 'Vendedor', ['GIULIANA','CARLITOS','GABRIEL','LUCAS','SAYAGO','GERENCIA']],
                ['precio_venta', 'Precio ARS', null],
                ['forma_pago', 'Forma pago', ['Contado', 'Transferencia', 'Financiado', 'Mixto', 'Permuta']],
                ['estado_cobro', 'Estado cobro', ['Cobrado', 'Parcial', 'Pendiente', 'Seña']],
              ].map(([k, l, opts]: any) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>{l}</label>
                  {opts ? <select value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }}>{opts.map((o: string) => <option key={o}>{o}</option>)}</select>
                  : <input type={k === 'precio_venta' ? 'number' : 'text'} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }} />}
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha operación</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Observaciones</label>
                <input value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }} />
              </div>
            </div>

            {/* selector vehículo */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Vehículo</div>
              <div style={{ marginBottom: 10 }}><FiltroVehiculos value={filtroVehiculo} onChange={setFiltroVehiculo} mostrarDiasStock={false} mostrarBusqueda={true} compacto={true} /></div>
              <select value={form.inv_id} onChange={e => setForm({ ...form, inv_id: e.target.value })} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 }}>
                <option value="">— Seleccioná un vehículo ({vehiculosParaVenta.length} disponibles) —</option>
                {vehiculosParaVenta.map((v: any) => <option key={v.id} value={v.id}>[{v.id}] {v.marca} {v.modelo} {v.version} — {v.color}{v.vin ? ` | VIN: ${v.vin}` : ''}{v.patente ? ` | Pat: ${v.patente}` : ''}{v.dias_stock ? ` (${v.dias_stock}d)` : ''}</option>)}
              </select>
            </div>

            {/* cobro */}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #334155' }}>Desglose de cobro directo</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
              {[['cobro_efectivo','Efectivo ARS'],['cobro_transfer','Transferencia ARS'],['cobro_pagare','Pagaré ARS'],['cobro_pxp','Parte de pago ARS']].map(([k,l]) => (
                <div key={k}><label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>{l}</label><input type="number" value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }} /></div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>USD</label><input type="number" value={form.cobro_usd} onChange={e => setForm({ ...form, cobro_usd: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }} /></div>
              <div><label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>TC pactado</label><input type="number" value={form.cobro_usd_tc} onChange={e => setForm({ ...form, cobro_usd_tc: parseFloat(e.target.value) || tcBna })} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fb923c', fontSize: 12 }} /></div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                <button onClick={() => setForm({ ...form, cobro_usd_tc: tcBna })} style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid #334155', background: 'rgba(96,165,250,.1)', color: '#60a5fa', fontSize: 11, cursor: 'pointer' }}>BNA ${fmtN(tcBna)}</button>
                <button onClick={() => setForm({ ...form, cobro_usd_tc: tcBlue })} style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(251,146,60,.3)', background: 'rgba(251,146,60,.1)', color: '#fb923c', fontSize: 11, cursor: 'pointer' }}>Blue ${fmtN(tcBlue)}</button>
              </div>
            </div>

            {/* instrumentos */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Instrumentos de cobro</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowInstrumentoExistente(v => !v)} style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(167,139,250,.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,.3)', fontSize: 11, cursor: 'pointer' }}>Usar existente</button>
                  <button onClick={agregarInstrumentoNuevo} style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(96,165,250,.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,.3)', fontSize: 11, cursor: 'pointer' }}>+ Nuevo</button>
                </div>
              </div>
              {showInstrumentoExistente && (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 10, marginBottom: 10, maxHeight: 200, overflowY: 'auto' }}>
                  {instrumentosExistentes.filter(i => i.estado !== 'aplicado_total').length === 0
                    ? <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: 8 }}>Sin instrumentos disponibles</div>
                    : instrumentosExistentes.filter(i => i.estado !== 'aplicado_total').map(i => (
                        <div key={i.id} onClick={() => agregarInstrumentoExistente(i)} style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#334155'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                          <span>{i.tipo.toUpperCase()} {i.numero_referencia && `#${i.numero_referencia}`} {i.banco && `— ${i.banco}`}</span>
                          <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>{fmt(i.monto_ars)}</span>
                        </div>
                      ))
                  }
                </div>
              )}
              {instrumentosForm.map((inst, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                  <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Tipo</label><select value={inst.tipo} onChange={e => actualizarInstrumento(idx, 'tipo', e.target.value)} disabled={!!inst.id} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }}>{TIPOS_INSTRUMENTO.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>N° / Ref</label><input value={inst.numero_referencia} onChange={e => actualizarInstrumento(idx, 'numero_referencia', e.target.value)} disabled={!!inst.id} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                  <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Banco</label><input value={inst.banco} onChange={e => actualizarInstrumento(idx, 'banco', e.target.value)} disabled={!!inst.id} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                  <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Monto total</label><input type="number" value={inst.monto_ars} onChange={e => actualizarInstrumento(idx, 'monto_ars', parseFloat(e.target.value) || 0)} disabled={!!inst.id} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                  <div><label style={{ fontSize: 10, color: '#a78bfa', display: 'block', marginBottom: 3 }}>Aplicado acá</label><input type="number" value={inst.monto_aplicado} onChange={e => actualizarInstrumento(idx, 'monto_aplicado', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(167,139,250,.4)', background: '#0f172a', color: '#a78bfa', fontSize: 11, fontWeight: 600 }} /></div>
                  <button onClick={() => eliminarInstrumento(idx)} style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              {instrumentosForm.length === 0 && <div style={{ color: '#334155', fontSize: 11, textAlign: 'center', padding: '6px 0' }}>Sin instrumentos agregados</div>}
            </div>

            {/* gastos */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Gastos de la operación</div>
                <button onClick={agregarGasto} style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(251,146,60,.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,.3)', fontSize: 11, cursor: 'pointer' }}>+ Agregar gasto</button>
              </div>
              {gastosForm.map((g, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'flex-end' }}>
                  <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Tipo</label><select value={g.tipo} onChange={e => actualizarGasto(idx, 'tipo', e.target.value)} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }}>{TIPOS_GASTO.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Descripción</label><input value={g.descripcion} onChange={e => actualizarGasto(idx, 'descripcion', e.target.value)} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                  <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Monto ARS</label><input type="number" value={g.monto_ars} onChange={e => actualizarGasto(idx, 'monto_ars', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#fb923c', fontSize: 11 }} /></div>
                  <button onClick={() => eliminarGasto(idx)} style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              {gastosForm.length > 0 && <div style={{ textAlign: 'right', fontSize: 12, color: '#fb923c', fontFamily: 'monospace', paddingTop: 6, borderTop: '1px solid #1e293b' }}>Total gastos: {fmt(totalGastosForm)}</div>}
            </div>

            {/* resumen */}
            <div style={{ background: diff > 100 ? 'rgba(239,68,68,.1)' : diff < -100 ? 'rgba(234,179,8,.1)' : 'rgba(34,197,94,.1)', border: `1px solid ${diff > 100 ? 'rgba(239,68,68,.3)' : diff < -100 ? 'rgba(234,179,8,.3)' : 'rgba(34,197,94,.3)'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
              <span style={{ color: '#94a3b8' }}>Precio: </span><span style={{ color: '#e2e8f0', fontFamily: 'monospace', marginRight: 12 }}>{fmt(precioVenta)}</span>
              <span style={{ color: '#94a3b8' }}>Cobrado: </span><span style={{ color: '#e2e8f0', fontFamily: 'monospace', marginRight: 12 }}>{fmt(totalCobrado)}</span>
              {totalGastosForm > 0 && <><span style={{ color: '#94a3b8' }}>Gastos: </span><span style={{ color: '#fb923c', fontFamily: 'monospace', marginRight: 12 }}>{fmt(totalGastosForm)}</span></>}
              <span style={{ color: diff > 100 ? '#f87171' : diff < -100 ? '#facc15' : '#4ade80', fontWeight: 600 }}>{diff > 100 ? 'Faltan: ' + fmt(diff) : diff < -100 ? 'Exceso: ' + fmt(Math.abs(diff)) : 'Cobro completo ✓'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleGuardar} style={{ padding: '7px 20px', borderRadius: 8, background: '#16a34a', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Registrar venta</button>
              <button onClick={() => { setShowForm(false); setGastosForm([]); setInstrumentosForm([]) }} style={{ padding: '7px 16px', borderRadius: 8, background: 'transparent', color: '#64748b', border: '1px solid #334155', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* TABLA */}
        {loading ? <div style={{ color: '#475569', padding: 40, textAlign: 'center' }}>Cargando...</div> : (
          <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Fecha','Empresa','Cliente','Vendedor','Vehículo','Precio','Ganancia','Pago','TC BNA','Estado',''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '9px 10px', color: '#475569', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.map((v: any) => {
                  const isOpen = detalle === v.id
                  const isEditing = editando === v.id
                  const ec = estadoCobro(v.estado_cobro)
                  const vehiculo = v.inv_id ? getVehiculo(v.inv_id) : null
                  return (
                    <React.Fragment key={v.id}>
                      <tr onClick={() => handleClickFila(v.id)} style={{ borderBottom: isOpen ? 'none' : '1px solid #0f172a', background: isOpen ? '#1a2744' : 'transparent', cursor: 'pointer', transition: 'background .15s' }} onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#16213a' }} onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtFecha(v.fecha)}</td>
                        <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: v.empresa === 'INVEXUS' ? 'rgba(96,165,250,.15)' : 'rgba(167,139,250,.15)', color: v.empresa === 'INVEXUS' ? '#60a5fa' : '#a78bfa', border: `1px solid ${v.empresa === 'INVEXUS' ? 'rgba(96,165,250,.3)' : 'rgba(167,139,250,.3)'}` }}>{v.empresa}</span></td>
                        <td style={{ padding: '8px 10px', color: '#cbd5e1', fontWeight: 500 }}>{v.cliente}</td>
                        <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{v.vendedor_nombre}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : (v.inv_id || '—')}</td>
                        <td style={{ padding: '8px 10px', color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{fmt(v.precio_venta || 0)}</td>
                        <td style={{ padding: '8px 10px', color: v.ganancia_neta > 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>{v.ganancia_neta ? fmt(v.ganancia_neta) : '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{v.forma_pago}</td>
                        <td style={{ padding: '8px 10px', color: '#60a5fa', fontFamily: 'monospace', fontSize: 11 }}>{v.tc_bna_snapshot ? '$' + fmtN(v.tc_bna_snapshot) : '—'}</td>
                        <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: ec.bg, color: ec.color, border: `1px solid ${ec.border}` }}>{v.estado_cobro}</span></td>
                        <td style={{ padding: '8px 10px', color: isOpen ? '#60a5fa' : '#475569', fontSize: 13 }}>{isOpen ? '▲' : '▼'}</td>
                      </tr>
                      {isOpen && (
                        <tr style={{ borderBottom: '2px solid #3b82f6' }}>
                          <td colSpan={11} style={{ padding: 0 }}>
                            <div style={{ background: '#0f1f3d', borderTop: '1px solid #1e3a5f', padding: '20px 24px' }}>
                              {!isEditing ? (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                                    <div>
                                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{v.cliente}</div>
                                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{v.id} · {fmtFecha(v.fecha)}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button onClick={e => { e.stopPropagation(); handleEditar(v) }} style={{ padding: '6px 16px', borderRadius: 8, background: 'rgba(59,130,246,.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.3)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✎ Editar</button>
                                      <button onClick={e => { e.stopPropagation(); setShowAnular(showAnular === v.id ? null : v.id); setMotivoAnulacion('') }} style={{ padding: '6px 16px', borderRadius: 8, background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>⊘ Anular</button>
                                      <button onClick={e => { e.stopPropagation(); setDetalle(null) }} style={{ padding: '6px 14px', borderRadius: 8, background: 'transparent', color: '#475569', border: '1px solid #334155', fontSize: 12, cursor: 'pointer' }}>✕ Cerrar</button>
                                    </div>
                                  </div>
                                  {showAnular === v.id && (
                                    <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f87171', marginBottom: 10 }}>⚠ Anular venta {v.id}</div>
                                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>Esta acción marcará la venta como anulada y devolverá el vehículo {v.inv_id ? `(${v.inv_id})` : ''} al stock como Disponible.</div>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)} placeholder="Motivo de anulación (obligatorio)" style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,.4)', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }} />
                                        <button onClick={e => { e.stopPropagation(); handleAnular(v) }} style={{ padding: '6px 16px', borderRadius: 8, background: '#dc2626', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Confirmar anulación</button>
                                        <button onClick={e => { e.stopPropagation(); setShowAnular(null) }} style={{ padding: '6px 12px', borderRadius: 8, background: 'transparent', color: '#64748b', border: '1px solid #334155', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                                      </div>
                                    </div>
                                  )}
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 16 }}>
                                    {campo('Vendedor', v.vendedor_nombre)}{campo('Empresa', v.empresa)}{campo('Forma de pago', v.forma_pago)}{campo('Estado cobro', v.estado_cobro)}
                                    {campo('Precio de venta', fmt(v.precio_venta || 0))}{campo('Ganancia neta', v.ganancia_neta ? fmt(v.ganancia_neta) : null)}{campo('Costo compra', v.costo_compra ? fmt(v.costo_compra) : null)}{campo('TC BNA snapshot', v.tc_bna_snapshot ? '$' + fmtN(v.tc_bna_snapshot) : null)}
                                  </div>
                                  {vehiculo && (
                                    <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                                      <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Vehículo vendido</div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
                                        {campo('ID', vehiculo.id)}{campo('Marca', vehiculo.marca)}{campo('Modelo', vehiculo.modelo)}{campo('Versión', vehiculo.version)}{campo('Color', vehiculo.color)}
                                        {campo('Tipo', vehiculo.tipo)}{campo('Año', vehiculo.anio)}{campo('Km', vehiculo.km ? fmtN(vehiculo.km) : null)}{campo('VIN / Motor', vehiculo.vin)}{campo('Patente', vehiculo.patente)}
                                      </div>
                                    </div>
                                  )}
                                  <div style={{ borderTop: '1px solid #1e3a5f', paddingTop: 14, marginBottom: 14 }}>
                                    <div style={{ fontSize: 10, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Desglose de cobro</div>
                                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                      {[['Efectivo',v.cobro_efectivo],['Transferencia',v.cobro_transfer],['USD',v.cobro_usd?`USD ${fmtN(v.cobro_usd)} × $${fmtN(v.cobro_usd_tc)}`:null],['Pagaré',v.cobro_pagare],['Parte de pago',v.cobro_pxp]].filter(([,val])=>val&&val!==0).map(([label,val])=>(
                                        <div key={label as string}><div style={{ fontSize: 10, color: '#475569', marginBottom: 2 }}>{label}</div><div style={{ fontSize: 12, color: '#cbd5e1', fontFamily: 'monospace' }}>{typeof val === 'number' ? fmt(val) : val}</div></div>
                                      ))}
                                    </div>
                                  </div>
                                  {v.observaciones && <div style={{ background: '#12223d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8', border: '1px solid #1e3a5f' }}><span style={{ color: '#475569', marginRight: 8 }}>Obs:</span>{v.observaciones}</div>}
                                </>
                              ) : (
                                <div onClick={e => e.stopPropagation()}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa', marginBottom: 16 }}>Editando {v.id}</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
                                    {[['cliente','Cliente'],['vendedor_nombre','Vendedor'],['precio_venta','Precio venta'],['ganancia_neta','Ganancia neta']].map(([k,l]) => (
                                      <div key={k}><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>{l}</label><input value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                                    ))}
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
                                    {[['cobro_efectivo','Efectivo'],['cobro_transfer','Transferencia'],['cobro_pagare','Pagaré'],['cobro_pxp','Parte de pago']].map(([k,l]) => (
                                      <div key={k}><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>{l}</label><input type="number" value={editForm[k]} onChange={e => setEditForm({ ...editForm, [k]: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                                    ))}
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14 }}>
                                    <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>USD cobrado</label><input type="number" value={editForm.cobro_usd} onChange={e => setEditForm({ ...editForm, cobro_usd: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                                    <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>TC pactado</label><input type="number" value={editForm.cobro_usd_tc} onChange={e => setEditForm({ ...editForm, cobro_usd_tc: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#fb923c', fontSize: 11 }} /></div>
                                    <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Forma de pago</label><select value={editForm.forma_pago} onChange={e => setEditForm({ ...editForm, forma_pago: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }}>{['Contado','Transferencia','Financiado','Mixto','Permuta'].map(o => <option key={o}>{o}</option>)}</select></div>
                                    <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Estado cobro</label><select value={editForm.estado_cobro} onChange={e => setEditForm({ ...editForm, estado_cobro: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }}>{['Cobrado','Parcial','Pendiente','Seña'].map(o => <option key={o}>{o}</option>)}</select></div>
                                    <div><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Fecha operación</label><input type="date" value={editForm.fecha} onChange={e => setEditForm({ ...editForm, fecha: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                                  </div>
                                  <div style={{ marginBottom: 12 }}><label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Observaciones</label><input value={editForm.observaciones} onChange={e => setEditForm({ ...editForm, observaciones: e.target.value })} style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /></div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={e => { e.stopPropagation(); handleGuardarEdicion(v) }} style={{ padding: '6px 18px', borderRadius: 7, background: '#16a34a', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Guardar cambios</button>
                                    <button onClick={e => { e.stopPropagation(); setEditando(null) }} style={{ padding: '6px 14px', borderRadius: 7, background: 'transparent', color: '#64748b', border: '1px solid #334155', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
            {ventasFiltradas.length === 0 && <div style={{ color: '#475569', padding: 24, textAlign: 'center' }}>{ventas.length > 0 ? 'Sin ventas con los filtros aplicados.' : 'Sin ventas en el período seleccionado.'}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
