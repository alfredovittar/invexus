// =============================================================================
// INVEXUS — Componente PanelPxP
// Panel de Toma de Usado como Parte de Pago — formulario de ventas
// Archivo: components/PanelPxP.tsx
// =============================================================================

'use client'

type DatosPxP = {
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
  costo_ars: string   // precio de toma (lo que vale para nosotros)
  precio_lista: string // precio al que lo vamos a vender
  observaciones: string
}

type Props = {
  valorPxP: number
  empresa: string
  tcActual: number
  datos: DatosPxP
  onDatosChange: (d: DatosPxP) => void
}

export default function PanelPxP({ valorPxP, empresa, tcActual, datos, onDatosChange }: Props) {
  const fmtARS = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  const set = (field: keyof DatosPxP) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onDatosChange({ ...datos, [field]: e.target.value })

  const s = {
    section: { marginTop: 12, padding: '14px 16px', background: 'var(--color-background-warning)', borderRadius: 8, border: '1px solid var(--color-border-warning)' } as React.CSSProperties,
    label: { fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 3 } as React.CSSProperties,
    input: { width: '100%', fontSize: 13, padding: '5px 8px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 6, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' } as React.CSSProperties,
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 } as React.CSSProperties,
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 } as React.CSSProperties,
  }

  const margenEstimado = datos.precio_lista && datos.costo_ars
    ? Number(datos.precio_lista) - Number(datos.costo_ars)
    : null

  return (
    <div style={s.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-warning)' }}>
          Vehículo tomado como parte de pago
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Valor imputado: <strong>{fmtARS(valorPxP)}</strong>
        </span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 10, padding: '6px 10px', background: 'var(--color-background-secondary)', borderRadius: 6 }}>
        Este vehículo se dará de alta en inventario ({empresa}) al guardar la venta. Se generará un ID automático.
      </div>

      {/* Datos básicos */}
      <div style={s.grid3}>
        <div>
          <label style={s.label}>Marca *</label>
          <input type="text" placeholder="Toyota" value={datos.marca} onChange={set('marca')} style={s.input} />
        </div>
        <div>
          <label style={s.label}>Modelo *</label>
          <input type="text" placeholder="Corolla" value={datos.modelo} onChange={set('modelo')} style={s.input} />
        </div>
        <div>
          <label style={s.label}>Versión</label>
          <input type="text" placeholder="XEI 2.0" value={datos.version} onChange={set('version')} style={s.input} />
        </div>
      </div>

      <div style={s.grid3}>
        <div>
          <label style={s.label}>Año *</label>
          <input type="number" placeholder="2021" value={datos.anio} onChange={set('anio')} style={s.input} />
        </div>
        <div>
          <label style={s.label}>KM *</label>
          <input type="number" placeholder="45000" value={datos.km} onChange={set('km')} style={s.input} />
        </div>
        <div>
          <label style={s.label}>Color</label>
          <input type="text" placeholder="Blanco" value={datos.color} onChange={set('color')} style={s.input} />
        </div>
      </div>

      <div style={s.grid2}>
        <div>
          <label style={s.label}>Patente *</label>
          <input type="text" placeholder="AA123BB" value={datos.patente} onChange={set('patente')} style={s.input} />
        </div>
        <div>
          <label style={s.label}>VIN / Chasis</label>
          <input type="text" placeholder="9BWZZZ..." value={datos.vin} onChange={set('vin')} style={s.input} />
        </div>
      </div>

      <div style={s.grid2}>
        <div>
          <label style={s.label}>Combustible</label>
          <select value={datos.combustible} onChange={set('combustible')} style={s.input}>
            <option value="">Seleccionar</option>
            <option>Nafta</option>
            <option>Diesel</option>
            <option>GNC</option>
            <option>Híbrido</option>
            <option>Eléctrico</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Transmisión</label>
          <select value={datos.transmision} onChange={set('transmision')} style={s.input}>
            <option value="">Seleccionar</option>
            <option>Manual</option>
            <option>Automático</option>
            <option>CVT</option>
          </select>
        </div>
      </div>

      {/* Precios */}
      <div style={{ marginTop: 4, paddingTop: 10, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
        <div style={s.grid2}>
          <div>
            <label style={s.label}>Costo de toma (ARS) *</label>
            <input
              type="number"
              placeholder="Lo que vale para nosotros"
              value={datos.costo_ars}
              onChange={set('costo_ars')}
              style={s.input}
            />
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Se guarda en inventario.costo_ars
            </span>
          </div>
          <div>
            <label style={s.label}>Precio lista (ARS)</label>
            <input
              type="number"
              placeholder="A cuánto lo venderemos"
              value={datos.precio_lista}
              onChange={set('precio_lista')}
              style={s.input}
            />
            {margenEstimado !== null && (
              <span style={{ fontSize: 11, color: margenEstimado >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>
                Margen estimado: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(margenEstimado)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <label style={s.label}>Observaciones</label>
        <textarea
          rows={2}
          placeholder="Estado general, detalles del vehículo..."
          value={datos.observaciones}
          onChange={set('observaciones')}
          style={{ ...s.input, resize: 'vertical' }}
        />
      </div>
    </div>
  )
}
