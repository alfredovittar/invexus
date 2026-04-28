// =============================================================================
// INVEXUS — Componente MediosCobro
// Reemplaza / extiende la sección de cobros en el formulario de ventas
// Archivo: components/MediosCobro.tsx
// =============================================================================

'use client'

import { useState } from 'react'
import PanelCC from './PanelCC'
import PanelPxP from './PanelPxP'

export type CuotaCC = {
  nro_cuota: number
  monto: number
  fecha_vencimiento: string
  nro_pagare: string
}

export type DatosPxP = {
  marca: string
  modelo: string
  version: string
  anio: string
  km: string
  color: string
  patente: string
  vin: string
  combustible: string
  transmision: string
  costo_ars: string
  precio_lista: string
  observaciones: string
}

export type ValoresCobro = {
  cobro_efectivo: number
  cobro_transfer: number
  cobro_usd: number
  cobro_usd_tc: number
  cobro_pagare: number
  cobro_tarjeta: number
  cobro_tarjeta_detalle: string
  cobro_pxp: number
  cobro_cc: number
  // datos para tablas auxiliares
  cuotas_cc: CuotaCC[]
  aprobado_por_cc: string
  datos_pxp: DatosPxP | null
}

type Props = {
  precioVenta: number
  empresa: string
  fechaVenta: string
  tcActual: number
  valores: ValoresCobro
  onChange: (v: ValoresCobro) => void
}

const DATOS_PXP_VACIO: DatosPxP = {
  marca: '', modelo: '', version: '', anio: '', km: '', color: '',
  patente: '', vin: '', combustible: '', transmision: '', costo_ars: '',
  precio_lista: '', observaciones: ''
}

export default function MediosCobro({ precioVenta, empresa, fechaVenta, tcActual, valores, onChange }: Props) {
  const [usaEfectivo, setUsaEfectivo]     = useState(false)
  const [usaTransfer, setUsaTransfer]     = useState(false)
  const [usaUsd, setUsaUsd]               = useState(false)
  const [usaPagare, setUsaPagare]         = useState(false)
  const [usaTarjeta, setUsaTarjeta]       = useState(false)
  const [usaPxP, setUsaPxP]               = useState(false)
  const [usaCC, setUsaCC]                 = useState(false)
  const [errorCC, setErrorCC]             = useState<string | null>(null)

  const set = (field: keyof ValoresCobro) => (val: ValoresCobro[typeof field]) =>
    onChange({ ...valores, [field]: val })

  const setNum = (field: keyof ValoresCobro) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...valores, [field]: Number(e.target.value) || 0 })

  const setStr = (field: keyof ValoresCobro) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...valores, [field]: e.target.value })

  const toggleMedio = (medio: string, checked: boolean) => {
    const updates: Partial<ValoresCobro> = {}
    if (!checked) {
      if (medio === 'efectivo') updates.cobro_efectivo = 0
      if (medio === 'transfer') updates.cobro_transfer = 0
      if (medio === 'usd')     { updates.cobro_usd = 0; updates.cobro_usd_tc = tcActual }
      if (medio === 'pagare')  updates.cobro_pagare = 0
      if (medio === 'tarjeta') { updates.cobro_tarjeta = 0; updates.cobro_tarjeta_detalle = '' }
      if (medio === 'pxp')     { updates.cobro_pxp = 0; updates.datos_pxp = null }
      if (medio === 'cc')      { updates.cobro_cc = 0; updates.cuotas_cc = []; updates.aprobado_por_cc = '' }
    }
    onChange({ ...valores, ...updates })
    if (medio === 'efectivo') setUsaEfectivo(checked)
    if (medio === 'transfer') setUsaTransfer(checked)
    if (medio === 'usd')      setUsaUsd(checked)
    if (medio === 'pagare')   setUsaPagare(checked)
    if (medio === 'tarjeta')  setUsaTarjeta(checked)
    if (medio === 'pxp')      { setUsaPxP(checked); if (checked) onChange({ ...valores, datos_pxp: DATOS_PXP_VACIO }) }
    if (medio === 'cc')       setUsaCC(checked)
  }

  const totalCobrado =
    (usaEfectivo ? valores.cobro_efectivo : 0) +
    (usaTransfer  ? valores.cobro_transfer : 0) +
    (usaUsd       ? valores.cobro_usd * valores.cobro_usd_tc : 0) +
    (usaPagare    ? valores.cobro_pagare : 0) +
    (usaTarjeta   ? valores.cobro_tarjeta : 0) +
    (usaPxP       ? valores.cobro_pxp : 0) +
    (usaCC        ? valores.cobro_cc : 0)

  const diferencia = precioVenta - totalCobrado
  const cuadra = Math.abs(diferencia) < 1

  const fmtARS = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  const pct = precioVenta > 0 ? Math.min(100, (totalCobrado / precioVenta) * 100) : 0

  const s = {
    row: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } as React.CSSProperties,
    label: { fontSize: 13, color: 'var(--color-text-primary)', minWidth: 160 } as React.CSSProperties,
    input: { flex: 1, fontSize: 13, padding: '5px 8px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' } as React.CSSProperties,
    check: { accentColor: 'var(--color-text-info)', width: 15, height: 15, cursor: 'pointer' } as React.CSSProperties,
    disabled: { opacity: 0.4, pointerEvents: 'none' } as React.CSSProperties,
  }

  return (
    <div>
      {/* Efectivo */}
      <div style={s.row}>
        <input type="checkbox" checked={usaEfectivo} onChange={e => toggleMedio('efectivo', e.target.checked)} style={s.check} />
        <label style={s.label}>Efectivo ARS</label>
        <input type="number" value={valores.cobro_efectivo || ''} onChange={setNum('cobro_efectivo')} placeholder="0" style={{ ...s.input, ...(usaEfectivo ? {} : s.disabled) }} />
      </div>

      {/* Transferencia */}
      <div style={s.row}>
        <input type="checkbox" checked={usaTransfer} onChange={e => toggleMedio('transfer', e.target.checked)} style={s.check} />
        <label style={s.label}>Transferencia bancaria</label>
        <input type="number" value={valores.cobro_transfer || ''} onChange={setNum('cobro_transfer')} placeholder="0" style={{ ...s.input, ...(usaTransfer ? {} : s.disabled) }} />
      </div>

      {/* USD */}
      <div style={s.row}>
        <input type="checkbox" checked={usaUsd} onChange={e => toggleMedio('usd', e.target.checked)} style={s.check} />
        <label style={s.label}>USD billete</label>
        <input type="number" value={valores.cobro_usd || ''} onChange={setNum('cobro_usd')} placeholder="USD" style={{ ...s.input, width: 90, flex: 'none', ...(usaUsd ? {} : s.disabled) }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>×</span>
        <input type="number" value={valores.cobro_usd_tc || tcActual} onChange={setNum('cobro_usd_tc')} placeholder="TC" style={{ ...s.input, width: 90, flex: 'none', ...(usaUsd ? {} : s.disabled) }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 120 }}>
          = {fmtARS((valores.cobro_usd || 0) * (valores.cobro_usd_tc || tcActual))}
        </span>
      </div>

      {/* Pagaré */}
      <div style={s.row}>
        <input type="checkbox" checked={usaPagare} onChange={e => toggleMedio('pagare', e.target.checked)} style={s.check} />
        <label style={s.label}>Pagaré</label>
        <input type="number" value={valores.cobro_pagare || ''} onChange={setNum('cobro_pagare')} placeholder="0" style={{ ...s.input, ...(usaPagare ? {} : s.disabled) }} />
      </div>

      {/* Tarjeta */}
      <div style={s.row}>
        <input type="checkbox" checked={usaTarjeta} onChange={e => toggleMedio('tarjeta', e.target.checked)} style={s.check} />
        <label style={s.label}>Tarjeta de crédito</label>
        <input type="number" value={valores.cobro_tarjeta || ''} onChange={setNum('cobro_tarjeta')} placeholder="0" style={{ ...s.input, ...(usaTarjeta ? {} : s.disabled) }} />
        <input type="text" value={valores.cobro_tarjeta_detalle} onChange={setStr('cobro_tarjeta_detalle')} placeholder="Visa 12 cuotas" style={{ ...s.input, ...(usaTarjeta ? {} : s.disabled) }} />
      </div>

      {/* PxP */}
      <div style={s.row}>
        <input type="checkbox" checked={usaPxP} onChange={e => toggleMedio('pxp', e.target.checked)} style={s.check} />
        <label style={s.label}>Parte de pago (usado)</label>
        <input type="number" value={valores.cobro_pxp || ''} onChange={setNum('cobro_pxp')} placeholder="Valor acordado" style={{ ...s.input, ...(usaPxP ? {} : s.disabled) }} />
      </div>
      {usaPxP && valores.datos_pxp !== null && (
        <PanelPxP
          valorPxP={valores.cobro_pxp}
          empresa={empresa}
          tcActual={tcActual}
          datos={valores.datos_pxp || DATOS_PXP_VACIO}
          onDatosChange={d => onChange({ ...valores, datos_pxp: d })}
        />
      )}

      {/* Cuenta Corriente */}
      <div style={s.row}>
        <input type="checkbox" checked={usaCC} onChange={e => toggleMedio('cc', e.target.checked)} style={s.check} />
        <label style={s.label}>Cuenta corriente propia</label>
        <input type="number" value={valores.cobro_cc || ''} onChange={setNum('cobro_cc')} placeholder="Monto financiado" style={{ ...s.input, ...(usaCC ? {} : s.disabled) }} />
      </div>
      {usaCC && (
        <PanelCC
          empresa={empresa}
          montoCC={valores.cobro_cc || 0}
          fechaVenta={fechaVenta}
          aprobadoPor={valores.aprobado_por_cc}
          onAprobadoPorChange={v => onChange({ ...valores, aprobado_por_cc: v })}
          onCuotasChange={cuotas => onChange({ ...valores, cuotas_cc: cuotas })}
          onError={setErrorCC}
        />
      )}

      {/* Error CC */}
      {errorCC && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--color-background-danger)', borderRadius: 6, fontSize: 12, color: 'var(--color-text-danger)' }}>
          {errorCC}
        </div>
      )}

      {/* Barra de progreso + saldo */}
      <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--color-background-secondary)', borderRadius: 8, border: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Cubierto: <strong>{fmtARS(totalCobrado)}</strong> de <strong>{fmtARS(precioVenta)}</strong>
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: cuadra ? 'var(--color-text-success)' : diferencia > 0 ? 'var(--color-text-danger)' : 'var(--color-text-warning)' }}>
            {cuadra ? '✓ Saldo cubierto' : diferencia > 0 ? `Faltan ${fmtARS(diferencia)}` : `Excede ${fmtARS(Math.abs(diferencia))}`}
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--color-border-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: cuadra ? 'var(--color-text-success)' : pct >= 100 ? 'var(--color-text-warning)' : 'var(--color-text-info)',
            transition: 'width 0.2s, background 0.2s',
            borderRadius: 3
          }} />
        </div>
      </div>
    </div>
  )
}
