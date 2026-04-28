// =============================================================================
// INVEXUS — Componente PanelCC
// Panel de Cuenta Corriente para el formulario de ventas
// Archivo: components/PanelCC.tsx
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { generarCuotasDefault, type CcCuota } from '@/hooks/useSupabase'

type CuotaEditable = {
  nro_cuota: number
  monto: number
  fecha_vencimiento: string
  nro_pagare: string
}

type Props = {
  empresa: string
  montoCC: number
  fechaVenta: string
  aprobadoPor: string
  onAprobadoPorChange: (v: string) => void
  onCuotasChange: (cuotas: CuotaEditable[]) => void
  onError: (msg: string | null) => void
}

export default function PanelCC({
  empresa, montoCC, fechaVenta, aprobadoPor,
  onAprobadoPorChange, onCuotasChange, onError
}: Props) {
  const [cantCuotas, setCantCuotas] = useState(3)
  const [cuotas, setCuotas] = useState<CuotaEditable[]>([])

  const fmtARS = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  // Regenerar cuotas cuando cambia monto, cantidad o fecha
  useEffect(() => {
    if (!montoCC || montoCC <= 0) { setCuotas([]); return }
    const base = generarCuotasDefault('__tmp__', montoCC, cantCuotas, fechaVenta)
    const editables: CuotaEditable[] = base.map(c => ({
      nro_cuota: c.nro_cuota,
      monto: c.monto,
      fecha_vencimiento: c.fecha_vencimiento,
      nro_pagare: '',
    }))
    setCuotas(editables)
    onCuotasChange(editables)
    onError(null)
  }, [montoCC, cantCuotas, fechaVenta])

  const updateCuota = (idx: number, field: keyof CuotaEditable, value: string | number) => {
    const nuevas = cuotas.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    setCuotas(nuevas)

    // Validar que la suma de montos cuadre
    const suma = nuevas.reduce((acc, c) => acc + Number(c.monto), 0)
    if (Math.abs(suma - montoCC) > 1) {
      onError(`La suma de cuotas (${fmtARS(suma)}) no coincide con el monto CC (${fmtARS(montoCC)})`)
    } else {
      onError(null)
    }
    onCuotasChange(nuevas)
  }

  const sumaActual = cuotas.reduce((acc, c) => acc + Number(c.monto), 0)
  const cuadra = Math.abs(sumaActual - montoCC) <= 1

  const s = {
    section: { marginTop: 12, padding: '14px 16px', background: 'var(--color-background-info)', borderRadius: 8, border: '1px solid var(--color-border-info)' } as React.CSSProperties,
    label: { fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 } as React.CSSProperties,
    input: { width: '100%', fontSize: 13, padding: '5px 8px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' } as React.CSSProperties,
    row: { display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 6 } as React.CSSProperties,
    headerRow: { display: 'grid', gridTemplateColumns: '36px 1fr 1fr 1fr', gap: 8, marginBottom: 4 } as React.CSSProperties,
    badge: (ok: boolean) => ({ display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 10, background: ok ? 'var(--color-background-success)' : 'var(--color-background-danger)', color: ok ? 'var(--color-text-success)' : 'var(--color-text-danger)', fontWeight: 500 }) as React.CSSProperties,
  }

  return (
    <div style={s.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-info)' }}>
          Cuenta corriente propia
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Total: <strong>{fmtARS(montoCC)}</strong>
        </span>
      </div>

      {/* Configuración */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={s.label}>Cantidad de cuotas</label>
          <select
            value={cantCuotas}
            onChange={e => setCantCuotas(Number(e.target.value))}
            style={{ ...s.input }}
          >
            {[1,2,3,4,5,6,9,12].map(n => (
              <option key={n} value={n}>{n} {n === 1 ? 'cuota' : 'cuotas'}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={s.label}>Aprobado por</label>
          <input
            type="text"
            placeholder="Nombre responsable"
            value={aprobadoPor}
            onChange={e => onAprobadoPorChange(e.target.value)}
            style={s.input}
          />
        </div>
      </div>

      {/* Tabla de cuotas */}
      {cuotas.length > 0 && (
        <>
          <div style={s.headerRow}>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>#</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Vencimiento</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Monto ARS</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Nro. pagaré</span>
          </div>
          {cuotas.map((c, i) => (
            <div key={i} style={s.row}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>{c.nro_cuota}</span>
              <input
                type="date"
                value={c.fecha_vencimiento}
                onChange={e => updateCuota(i, 'fecha_vencimiento', e.target.value)}
                style={s.input}
              />
              <input
                type="number"
                value={c.monto}
                onChange={e => updateCuota(i, 'monto', Number(e.target.value))}
                style={s.input}
              />
              <input
                type="text"
                placeholder="PAG-001"
                value={c.nro_pagare}
                onChange={e => updateCuota(i, 'nro_pagare', e.target.value)}
                style={s.input}
              />
            </div>
          ))}

          {/* Validación suma */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Suma de cuotas: <strong>{fmtARS(sumaActual)}</strong>
            </span>
            <span style={s.badge(cuadra)}>
              {cuadra ? '✓ Cuadra' : '✗ No cuadra'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
