'use client'
const PERIODOS = [
  { label: 'Este mes', desde: new Date().toISOString().substring(0,8)+'01', hasta: new Date().toISOString().split('T')[0] },
  { label: 'Ene 26', desde: '2026-01-01', hasta: '2026-01-31' },
  { label: 'Feb 26', desde: '2026-02-01', hasta: '2026-02-28' },
  { label: 'Mar 26', desde: '2026-03-01', hasta: '2026-03-31' },
  { label: 'Abr 26', desde: '2026-04-01', hasta: '2026-04-30' },
  { label: 'Q1 2026', desde: '2026-01-01', hasta: '2026-03-31' },
  { label: 'Todo', desde: '', hasta: '' },
]
interface Props { desde: string; hasta: string; onDesde: (v: string) => void; onHasta: (v: string) => void }
export default function FiltroFechas({ desde, hasta, onDesde, onHasta }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {PERIODOS.map(p => (
        <button key={p.label} onClick={() => { onDesde(p.desde); onHasta(p.hasta) }}
          style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${desde === p.desde && hasta === p.hasta ? '#3b82f6' : '#334155'}`, background: desde === p.desde && hasta === p.hasta ? 'rgba(59,130,246,.15)' : 'transparent', color: desde === p.desde && hasta === p.hasta ? '#60a5fa' : '#64748b', fontSize: 11, cursor: 'pointer', fontWeight: desde === p.desde && hasta === p.hasta ? 600 : 400 }}>
          {p.label}
        </button>
      ))}
      <div style={{ width: 1, height: 18, background: '#334155' }} />
      <input type="date" value={desde} onChange={e => onDesde(e.target.value)} style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} />
      <span style={{ fontSize: 11, color: '#475569' }}>→</span>
      <input type="date" value={hasta} onChange={e => onHasta(e.target.value)} style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} />
    </div>
  )
}
