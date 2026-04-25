'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import FiltroFechas from '@/components/FiltroFechas'
import { createClient } from '@/utils/supabase/client'

const TABLAS = ['Todas', 'ventas', 'inventario', 'gastos', 'leads']
const ACCIONES = ['Todas', 'INSERT', 'UPDATE', 'ANULACION', 'DELETE']

const colorAccion = (accion: string) => {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    INSERT:   { bg: 'rgba(34,197,94,.15)',  color: '#4ade80', border: 'rgba(34,197,94,.3)' },
    UPDATE:   { bg: 'rgba(96,165,250,.15)', color: '#60a5fa', border: 'rgba(96,165,250,.3)' },
    ANULACION:{ bg: 'rgba(239,68,68,.15)',  color: '#f87171', border: 'rgba(239,68,68,.3)' },
    DELETE:   { bg: 'rgba(239,68,68,.2)',   color: '#ef4444', border: 'rgba(239,68,68,.4)' },
  }
  return map[accion] ?? { bg: 'rgba(100,116,139,.15)', color: '#94a3b8', border: 'rgba(100,116,139,.3)' }
}

const colorTabla = (tabla: string) => {
  const map: Record<string, string> = {
    ventas: '#a78bfa', inventario: '#60a5fa', gastos: '#fb923c', leads: '#4ade80',
  }
  return map[tabla] ?? '#64748b'
}

export default function AuditoriaPage() {
  const router = useRouter()
  const hoy = new Date().toISOString().split('T')[0]
  const primeroDeMes = hoy.substring(0, 8) + '01'

  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const [acceso, setAcceso] = useState<'cargando' | 'permitido' | 'denegado'>('cargando')
  const [userEmail, setUserEmail] = useState('')

  // Filtros
  const [desde, setDesde] = useState(primeroDeMes)
  const [hasta, setHasta] = useState(hoy)
  const [filtroTabla, setFiltroTabla] = useState('Todas')
  const [filtroAccion, setFiltroAccion] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')

  // Datos
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detalleAbierto, setDetalleAbierto] = useState<string | null>(null)

  // ── Verificar acceso ──────────────────────────────────────
  useEffect(() => {
    const verificar = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || '')

      const { data } = await supabase
        .from('usuarios_config')
        .select('rol')
        .eq('user_id', user.id)
        .single()

      // Si no tiene config o es ceo → acceso permitido
      if (!data || data.rol === 'ceo') {
        setAcceso('permitido')
      } else {
        setAcceso('denegado')
      }
    }
    verificar()
  }, [])

  // ── Cargar logs ───────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('auditoria_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (desde) query = query.gte('created_at', desde + 'T00:00:00')
    if (hasta) query = query.lte('created_at', hasta + 'T23:59:59')
    if (filtroTabla !== 'Todas') query = query.eq('tabla', filtroTabla)
    if (filtroAccion !== 'Todas') query = query.eq('accion', filtroAccion)
    if (empresa !== 'AMBAS') query = query.eq('empresa', empresa)

    const { data } = await query
    setLogs(data ?? [])
    setLoading(false)
  }, [desde, hasta, filtroTabla, filtroAccion, empresa])

  useEffect(() => {
    if (acceso === 'permitido') fetchLogs()
  }, [fetchLogs, acceso])

  // ── Filtro búsqueda local ─────────────────────────────────
  const logsFiltrados = logs.filter(l => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      l.registro_id?.toLowerCase().includes(q) ||
      l.descripcion?.toLowerCase().includes(q) ||
      l.usuario_email?.toLowerCase().includes(q) ||
      l.tabla?.toLowerCase().includes(q)
    )
  })

  const fmtFecha = (f: string) => {
    if (!f) return '—'
    const d = new Date(f)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
      ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  // ── Pantalla denegada ─────────────────────────────────────
  if (acceso === 'cargando') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#475569', fontSize: 14 }}>Verificando acceso...</div>
      </div>
    )
  }

  if (acceso === 'denegado') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1e293b', border: '1px solid rgba(239,68,68,.3)', borderRadius: 12, padding: '32px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>Acceso restringido</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>No tenés permisos para ver el log de auditoría.</div>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 20px', borderRadius: 8, background: '#1e3a5f', color: '#60a5fa', border: '1px solid rgba(96,165,250,.3)', fontSize: 13, cursor: 'pointer' }}>
            Volver al dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Stats rápidos ─────────────────────────────────────────
  const totalInserts   = logsFiltrados.filter(l => l.accion === 'INSERT').length
  const totalUpdates   = logsFiltrados.filter(l => l.accion === 'UPDATE').length
  const totalAnulados  = logsFiltrados.filter(l => l.accion === 'ANULACION').length

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={() => setMoneda(m => m === 'ARS' ? 'USD' : 'ARS')} />
      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── ENCABEZADO ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>🔍 Log de Auditoría</div>
          <div style={{ fontSize: 12, color: '#475569' }}>Todos los movimientos del sistema</div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#334155', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '3px 10px' }}>
            Acceso CEO · {userEmail}
          </div>
        </div>

        {/* ── BARRA FILTROS ── */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>Período</span>
          <FiltroFechas desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />

          {/* filtro tabla */}
          <div style={{ display: 'flex', gap: 4 }}>
            {TABLAS.map(t => (
              <button key={t} onClick={() => setFiltroTabla(t)} style={{
                padding: '4px 10px', borderRadius: 6, border: `1px solid ${filtroTabla === t ? colorTabla(t) + '66' : '#334155'}`,
                background: filtroTabla === t ? colorTabla(t) + '22' : 'transparent',
                color: filtroTabla === t ? colorTabla(t) : '#64748b',
                fontSize: 11, cursor: 'pointer', fontWeight: filtroTabla === t ? 600 : 400,
              }}>
                {t}
              </button>
            ))}
          </div>

          {/* filtro acción */}
          <div style={{ display: 'flex', gap: 4 }}>
            {ACCIONES.map(a => {
              const ca = colorAccion(a)
              return (
                <button key={a} onClick={() => setFiltroAccion(a)} style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${filtroAccion === a ? ca.border : '#334155'}`,
                  background: filtroAccion === a ? ca.bg : 'transparent',
                  color: filtroAccion === a ? ca.color : '#64748b',
                  fontSize: 11, cursor: 'pointer', fontWeight: filtroAccion === a ? 600 : 400,
                }}>
                  {a}
                </button>
              )
            })}
          </div>

          {/* búsqueda */}
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar ID, descripción, usuario..."
            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11, width: 200 }}
          />

          <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {logsFiltrados.length} registros
          </span>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
          {[
            ['Total movimientos', logsFiltrados.length.toString(), 'en el período', '#3b82f6'],
            ['Creaciones', totalInserts.toString(), 'registros nuevos', '#22c55e'],
            ['Modificaciones', totalUpdates.toString(), 'campos editados', '#60a5fa'],
            ['Anulaciones', totalAnulados.toString(), 'operaciones revertidas', '#ef4444'],
          ].map(([l, v, s, c]) => (
            <div key={l} style={{ background: '#1e293b', border: `1px solid ${c}`, borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c as string }} />
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>{v}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* ── TABLA LOG ── */}
        {loading ? (
          <div style={{ color: '#475569', padding: 40, textAlign: 'center' }}>Cargando log...</div>
        ) : (
          <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['Fecha / Hora', 'Tabla', 'Acción', 'Registro', 'Descripción', 'Usuario', 'Empresa', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '9px 10px', color: '#475569', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logsFiltrados.map(l => {
                  const isOpen = detalleAbierto === l.id
                  const ca = colorAccion(l.accion)
                  return (
                    <>
                      <tr
                        key={l.id}
                        onClick={() => setDetalleAbierto(isOpen ? null : l.id)}
                        style={{ borderBottom: isOpen ? 'none' : '1px solid #0f172a', background: isOpen ? '#1a2744' : 'transparent', cursor: 'pointer', transition: 'background .15s' }}
                        onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#16213a' }}
                        onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {fmtFecha(l.created_at)}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600, color: colorTabla(l.tabla), background: colorTabla(l.tabla) + '22', border: `1px solid ${colorTabla(l.tabla)}44` }}>
                            {l.tabla}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: ca.bg, color: ca.color, border: `1px solid ${ca.border}` }}>
                            {l.accion}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>{l.registro_id}</td>
                        <td style={{ padding: '8px 10px', color: '#e2e8f0', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.descripcion || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 11 }}>
                          {l.usuario_email ? l.usuario_email.split('@')[0] : '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {l.empresa && (
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: l.empresa === 'INVEXUS' ? 'rgba(96,165,250,.15)' : 'rgba(167,139,250,.15)', color: l.empresa === 'INVEXUS' ? '#60a5fa' : '#a78bfa', border: `1px solid ${l.empresa === 'INVEXUS' ? 'rgba(96,165,250,.3)' : 'rgba(167,139,250,.3)'}` }}>
                              {l.empresa}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', color: isOpen ? '#60a5fa' : '#475569', fontSize: 13 }}>{isOpen ? '▲' : '▼'}</td>
                      </tr>

                      {/* PANEL DETALLE */}
                      {isOpen && (
                        <tr key={l.id + '-detalle'} style={{ borderBottom: '2px solid #1e3a5f' }}>
                          <td colSpan={8} style={{ padding: 0 }}>
                            <div style={{ background: '#0a1628', borderTop: '1px solid #1e3a5f', padding: '16px 20px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                                {/* Campos modificados */}
                                {l.campos_modificados && l.campos_modificados.length > 0 && (
                                  <div style={{ gridColumn: '1/-1', marginBottom: 8 }}>
                                    <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Campos modificados</div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                      {l.campos_modificados.map((c: string) => (
                                        <span key={c} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(96,165,250,.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,.2)' }}>
                                          {c}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Datos antes */}
                                {l.datos_antes && (
                                  <div>
                                    <div style={{ fontSize: 10, color: '#f87171', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Estado anterior</div>
                                    <div style={{ background: '#0f172a', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 12px', fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', maxHeight: 200, overflowY: 'auto', lineHeight: 1.8 }}>
                                      {Object.entries(l.datos_antes)
                                        .filter(([, v]) => v !== null && v !== undefined && v !== '')
                                        .map(([k, v]) => (
                                          <div key={k}>
                                            <span style={{ color: '#475569' }}>{k}: </span>
                                            <span style={{ color: '#cbd5e1' }}>{String(v)}</span>
                                          </div>
                                        ))
                                      }
                                    </div>
                                  </div>
                                )}

                                {/* Datos después */}
                                {l.datos_despues && (
                                  <div>
                                    <div style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Estado posterior</div>
                                    <div style={{ background: '#0f172a', border: '1px solid rgba(34,197,94,.2)', borderRadius: 8, padding: '10px 12px', fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', maxHeight: 200, overflowY: 'auto', lineHeight: 1.8 }}>
                                      {Object.entries(l.datos_despues)
                                        .filter(([, v]) => v !== null && v !== undefined && v !== '')
                                        .map(([k, v]) => (
                                          <div key={k}>
                                            <span style={{ color: '#475569' }}>{k}: </span>
                                            <span style={{ color: '#cbd5e1' }}>{String(v)}</span>
                                          </div>
                                        ))
                                      }
                                    </div>
                                  </div>
                                )}

                                {/* Meta */}
                                <div style={{ gridColumn: '1/-1', display: 'flex', gap: 24, paddingTop: 12, borderTop: '1px solid #1e3a5f', fontSize: 11, color: '#475569' }}>
                                  <span>ID log: <span style={{ fontFamily: 'monospace', color: '#334155' }}>{l.id}</span></span>
                                  <span>Timestamp: <span style={{ fontFamily: 'monospace', color: '#334155' }}>{l.created_at}</span></span>
                                  {l.ip && <span>IP: <span style={{ fontFamily: 'monospace', color: '#334155' }}>{l.ip}</span></span>}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
            {logsFiltrados.length === 0 && (
              <div style={{ color: '#475569', padding: 40, textAlign: 'center', fontSize: 13 }}>
                {logs.length > 0 ? 'Sin registros con los filtros aplicados.' : 'El log de auditoría está vacío. Los movimientos aparecerán aquí a medida que se registren.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
