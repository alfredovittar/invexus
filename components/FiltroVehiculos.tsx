'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export type FiltroVehiculosState = {
  estado: string
  marca: string
  tipo: string
  busqueda: string
  diasStock: string
}

type Props = {
  value: FiltroVehiculosState
  onChange: (filtro: FiltroVehiculosState) => void
  mostrarDiasStock?: boolean
  mostrarBusqueda?: boolean
  compacto?: boolean // Para usar en modales/formularios
}

const ESTADOS = ['Todos', 'Disponible', 'Reservado', 'Vendido']
const TIPOS = ['Todos', '0km', 'usado']
const DIAS_STOCK = ['Todos', '+30 días', '+60 días', '+90 días']

const colorEstado: Record<string, { bg: string; color: string; border: string }> = {
  Todos:      { bg: '#1a1a2e',   color: '#a0a0b0', border: '#333355' },
  Disponible: { bg: '#0d3321',   color: '#22c55e', border: '#166534' },
  Reservado:  { bg: '#2d2000',   color: '#f59e0b', border: '#92400e' },
  Vendido:    { bg: '#1a0a2e',   color: '#a78bfa', border: '#5b21b6' },
}

export default function FiltroVehiculos({
  value,
  onChange,
  mostrarDiasStock = false,
  mostrarBusqueda = true,
  compacto = false,
}: Props) {
  const [marcas, setMarcas] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('inventario')
      .select('marca')
      .then(({ data }) => {
        if (data) {
          const unicas = Array.from(new Set(data.map((r: any) => r.marca).filter(Boolean))).sort() as string[]
          setMarcas(unicas)
        }
      })
  }, [])

  const set = (key: keyof FiltroVehiculosState, val: string) =>
    onChange({ ...value, [key]: val })

  const estiloChip = (activo: boolean, colores?: { bg: string; color: string; border: string }) => ({
    padding: compacto ? '4px 10px' : '5px 14px',
    borderRadius: '20px',
    fontSize: compacto ? '12px' : '13px',
    fontWeight: 500,
    border: `1px solid ${activo ? (colores?.border ?? '#4f46e5') : '#2a2a3e'}`,
    background: activo ? (colores?.bg ?? '#1e1b4b') : 'transparent',
    color: activo ? (colores?.color ?? '#818cf8') : '#666680',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  })

  const estiloSelect = {
    background: '#12121e',
    border: '1px solid #2a2a3e',
    borderRadius: '8px',
    color: '#c0c0d0',
    padding: compacto ? '5px 10px' : '6px 12px',
    fontSize: compacto ? '12px' : '13px',
    cursor: 'pointer',
    outline: 'none',
  }

  const estiloInput = {
    background: '#12121e',
    border: '1px solid #2a2a3e',
    borderRadius: '8px',
    color: '#c0c0d0',
    padding: compacto ? '5px 10px' : '6px 12px',
    fontSize: compacto ? '12px' : '13px',
    outline: 'none',
    width: compacto ? '160px' : '200px',
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: compacto ? '8px' : '12px',
      alignItems: 'center',
    }}>
      {/* ESTADO */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {ESTADOS.map(e => (
          <button
            key={e}
            onClick={() => set('estado', e)}
            style={estiloChip(value.estado === e, colorEstado[e])}
          >
            {e === 'Todos' ? 'Todos' : e}
            {e !== 'Todos' && (
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: colorEstado[e].color,
                marginLeft: '6px',
                verticalAlign: 'middle',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* SEPARADOR */}
      <div style={{ width: '1px', height: '24px', background: '#2a2a3e' }} />

      {/* MARCA */}
      <select
        value={value.marca}
        onChange={e => set('marca', e.target.value)}
        style={estiloSelect}
      >
        <option value="Todas">Todas las marcas</option>
        {marcas.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* TIPO */}
      <select
        value={value.tipo}
        onChange={e => set('tipo', e.target.value)}
        style={estiloSelect}
      >
        {TIPOS.map(t => (
          <option key={t} value={t}>{t === 'Todos' ? 'Todos los tipos' : t}</option>
        ))}
      </select>

      {/* DÍAS EN STOCK */}
      {mostrarDiasStock && (
        <select
          value={value.diasStock}
          onChange={e => set('diasStock', e.target.value)}
          style={estiloSelect}
        >
          {DIAS_STOCK.map(d => (
            <option key={d} value={d}>{d === 'Todos' ? 'Cualquier antigüedad' : d}</option>
          ))}
        </select>
      )}

      {/* BÚSQUEDA LIBRE */}
      {mostrarBusqueda && (
        <input
          type="text"
          placeholder="Buscar modelo, VIN, patente..."
          value={value.busqueda}
          onChange={e => set('busqueda', e.target.value)}
          style={estiloInput}
        />
      )}

      {/* RESET */}
      {(value.estado !== 'Todos' || value.marca !== 'Todas' || value.tipo !== 'Todos' || value.busqueda !== '' || value.diasStock !== 'Todos') && (
        <button
          onClick={() => onChange({ estado: 'Todos', marca: 'Todas', tipo: 'Todos', busqueda: '', diasStock: 'Todos' })}
          style={{
            background: 'transparent',
            border: '1px solid #3a1010',
            borderRadius: '8px',
            color: '#ef4444',
            padding: compacto ? '4px 10px' : '5px 12px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          ✕ Limpiar
        </button>
      )}
    </div>
  )
}

// ─── Helper para aplicar el filtro sobre un array de vehículos ────────────────
export function aplicarFiltroVehiculos<T extends Record<string, any>>(
  items: T[],
  filtro: FiltroVehiculosState
): T[] {
  return items.filter(item => {
    if (filtro.estado !== 'Todos' && item.estado !== filtro.estado) return false
    if (filtro.marca !== 'Todas' && item.marca !== filtro.marca) return false
    if (filtro.tipo !== 'Todos' && item.tipo !== filtro.tipo) return false
    if (filtro.diasStock !== 'Todos') {
      const dias = parseInt(filtro.diasStock)
      if ((item.dias_stock ?? 0) < dias) return false
    }
    if (filtro.busqueda) {
      const q = filtro.busqueda.toLowerCase()
      const campos = [item.modelo, item.version, item.vin, item.patente, item.marca, item.color]
      if (!campos.some(c => c?.toLowerCase().includes(q))) return false
    }
    return true
  })
}

