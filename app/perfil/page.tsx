'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import { createClient } from '@/utils/supabase/client'

export default function PerfilPage() {
  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('')
  const [pwNueva, setPwNueva] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })
  useEffect(() => {
    const load = async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) setEmail(user.email || '')
      const { data } = await sb.from('usuarios_config').select('*').single()
      if (data) { setNombre(data.nombre || ''); setRol(data.rol || '') }
    }
    load()
  }, [])
  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 4000) }
  const handleCambiarPassword = async () => {
    if (!pwNueva || !pwConfirm) { showToast('Completa ambos campos', false); return }
    if (pwNueva.length < 8) { showToast('Minimo 8 caracteres', false); return }
    if (pwNueva !== pwConfirm) { showToast('Las contrasenas no coinciden', false); return }
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.auth.updateUser({ password: pwNueva })
    setLoading(false)
    if (error) { showToast('Error: ' + error.message, false); return }
    showToast('Contrasena actualizada')
    setPwNueva(''); setPwConfirm('')
  }
  const handleCerrarSesion = async () => {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }
  const rolLabel: Record<string,string> = { ceo:'CEO / Gerente', admin:'Administrador', vendedor:'Vendedor', readonly:'Solo lectura' }
  const inp = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:13 } as const
  const lbl = { fontSize:11, color:'#64748b', display:'block' as const, marginBottom:5, fontWeight:500, textTransform:'uppercase' as const, letterSpacing:'.06em' }
  const s = pwNueva.length >= 12 ? 4 : pwNueva.length >= 10 ? 3 : pwNueva.length >= 8 ? 2 : pwNueva.length > 0 ? 1 : 0
  const sc = s >= 4 ? '#4ade80' : s >= 3 ? '#facc15' : '#fb923c'
  return (
    <div style={{minHeight:'100vh',background:'#0f172a',color:'#e2e8f0'}}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={()=>setMoneda(m=>m==='ARS'?'USD':'ARS')} />
      {toast.msg&&<div style={{position:'fixed',top:20,right:20,background:toast.ok?'#166534':'#7f1d1d',color:toast.ok?'#4ade80':'#f87171',border:`1px solid ${toast.ok?'#16a34a':'#dc2626'}`,borderRadius:10,padding:'10px 18px',fontSize:13,zIndex:1000,fontWeight:500}}>{toast.msg}</div>}
      <div style={{padding:'32px 24px',maxWidth:600,margin:'0 auto'}}>
        <div style={{marginBottom:28}}>
          <h1 style={{fontSize:20,fontWeight:700,color:'#f1f5f9',margin:0}}>Mi perfil</h1>
          <p style={{fontSize:13,color:'#475569',marginTop:4}}>Administra tu cuenta y contrasena</p>
        </div>
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:'20px 24px',marginBottom:16}}>
          <div style={{fontSize:11,color:'#3b82f6',fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:16}}>Cuenta</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label style={lbl}>Email</label><div style={{...inp,color:'#64748b'}}>{email}</div></div>
            <div><label style={lbl}>Nombre</label><div style={{...inp,color:'#94a3b8'}}>{nombre||'Sin nombre'}</div></div>
            <div><label style={lbl}>Rol</label><span style={{display:'inline-block',padding:'5px 12px',borderRadius:6,background:'rgba(59,130,246,.15)',color:'#60a5fa',border:'1px solid rgba(59,130,246,.3)',fontSize:12,fontWeight:600}}>{rolLabel[rol]||rol||'Sin rol'}</span></div>
            <div><label style={lbl}>Acceso</label><span style={{display:'inline-block',padding:'5px 12px',borderRadius:6,background:'rgba(167,139,250,.15)',color:'#a78bfa',border:'1px solid rgba(167,139,250,.3)',fontSize:12,fontWeight:600}}>INVEXUS · MAXIAUTO</span></div>
          </div>
        </div>
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:'20px 24px',marginBottom:16}}>
          <div style={{fontSize:11,color:'#3b82f6',fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:16}}>Cambiar contrasena</div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={lbl}>Nueva contrasena</label><input type="password" value={pwNueva} onChange={e=>setPwNueva(e.target.value)} placeholder="Minimo 8 caracteres" style={inp} /></div>
            {s>0&&<div style={{display:'flex',gap:4,alignItems:'center'}}>{[1,2,3,4].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=s?sc:'#334155'}} />)}<span style={{fontSize:10,color:'#64748b',marginLeft:6}}>{['','Muy corta','Debil','Media','Fuerte'][s]}</span></div>}
            <div><label style={lbl}>Confirmar</label><input type="password" value={pwConfirm} onChange={e=>setPwConfirm(e.target.value)} placeholder="Repeti la contrasena" style={{...inp,borderColor:pwConfirm?(pwNueva===pwConfirm?'rgba(34,197,94,.5)':'rgba(239,68,68,.5)'):'#334155'}} /></div>
            {pwNueva&&pwConfirm&&<div style={{fontSize:12,color:pwNueva===pwConfirm?'#4ade80':'#f87171'}}>{pwNueva===pwConfirm?'Las contrasenas coinciden':'No coinciden'}</div>}
            <button onClick={handleCambiarPassword} disabled={loading} style={{padding:'9px 0',borderRadius:8,background:loading?'#1e3a5f':'#3b82f6',color:loading?'#64748b':'white',border:'none',fontSize:13,cursor:loading?'not-allowed':'pointer',fontWeight:600}}>{loading?'Actualizando...':'Actualizar contrasena'}</button>
          </div>
        </div>
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadi
sed -i '' "s|{ href: '/gastos', label: 'Gastos' },|{ href: '/gastos', label: 'Gastos' },\n    { href: '/perfil', label: 'Perfil' },|" components/Nav.tsx && echo "✓ Nav" && git add . && git commit -m "feat: modulo perfil con cambio de contrasena" && git push && echo "✓ DEPLOY iniciado"
cd ~/Desktop/invexus && cp -r ~/Desktop/invexus/. . 2>/dev/null; git add . && git commit -m "feat: stock form + venta-inventario sync + ganancia real" && git push && echo "✓ DEPLOY iniciado"
cd ~/Desktop/invexus && cat > app/stock/page.tsx << 'ENDOFFILE'
'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import { useStock, useTipoCambio } from '@/hooks/useSupabase'
import { createClient } from '@/utils/supabase/client'

const MARCAS = ['BAIC','CHERY','VOLKSWAGEN','TOYOTA','FORD','CHEVROLET','FIAT','RENAULT','PEUGEOT','CITROEN','HONDA','NISSAN','OTRO']
const MODELOS: Record<string,string[]> = {
  BAIC:['BJ30','BJ40','U5 PLUS','X55 II','X55 PLUS','X7'],
  CHERY:['TIGGO 2','TIGGO 4','TIGGO 7','TIGGO 8'],
  VOLKSWAGEN:['AMAROK','TAOS','T-CROSS','POLO'],
  TOYOTA:['HILUX','COROLLA','COROLLA CROSS','YARIS','RAV4'],
  FORD:['RANGER','TERRITORY'],
  CHEVROLET:['TRACKER','ONIX','CRUZE','S10','CAPTIVA'],
}

export default function StockPage() {
  const [empresa, setEmpresa] = useState('AMBAS')
  const [moneda, setMoneda] = useState('ARS')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })
  const { stock, loading, refresh } = useStock(empresa)
  const { tcBna } = useTipoCambio()
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    empresa: 'INVEXUS', tipo: '0km', marca: 'BAIC', modelo: 'BJ30',
    version: '', anio: new Date().getFullYear(), color: '', km: 0,
    combustible: 'Nafta', transmision: 'Automatica',
    vin: '', patente: '', proveedor: '',
    costo_usd: '', precio_lista: '', precio_minimo: '',
    fecha_ingreso: hoy, estado: 'Disponible',
  })

  const fmt = (n: number) => moneda === 'USD'
    ? 'USD ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n / tcBna)
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
  const fmtN = (n: number) => new Intl.NumberFormat('es-AR').format(n)

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 3000) }

  const filtered = stock.filter((s: any) => {
    if (filtroEstado !== 'todos' && s.estado?.toLowerCase() !== filtroEstado) return false
    if (filtroTipo !== 'todos' && s.tipo?.toLowerCase() !== filtroTipo) return false
    return true
  })

  const disponibles = stock.filter((s: any) => s.estado === 'Disponible').length
  const vendidos = stock.filter((s: any) => s.estado === 'Vendido').length
  const criticos = stock.filter((s: any) => (s.dias_stock || 0) >= 60 && s.estado === 'Disponible').length
  const reservados = stock.filter((s: any) => s.estado === 'Reservado').length

  const handleGuardar = async () => {
    if (!form.costo_usd || !form.precio_lista) { showToast('Completa costo USD y precio lista', false); return }
    const supabase = createClient()
    const costoUsd = parseFloat(form.costo_usd)
    const lastId = stock.length > 0
      ? Math.max(...stock.map((s: any) => parseInt(s.id?.replace('INV-', '') || '0')))
      : 0
    const newId = 'INV-' + String(lastId + 1).padStart(3, '0')
    const { error } = await supabase.from('inventario').insert({
      id: newId, empresa: form.empresa, tipo: form.tipo,
      marca: form.marca, modelo: form.modelo, version: form.version || null,
      anio: form.anio, color: form.color || null,
      km: form.tipo === 'usado' ? form.km : 0,
      combustible: form.combustible, transmision: form.transmision,
      vin: form.vin || null,
      patente: form.tipo === 'usado' ? (form.patente || null) : null,
      proveedor: form.proveedor || null,
      costo_usd: costoUsd, costo_ars: costoUsd * tcBna, tc_compra: tcBna,
      precio_lista: parseFloat(form.precio_lista),
      precio_minimo: form.precio_minimo ? parseFloat(form.precio_minimo) : parseFloat(form.precio_lista),
      estado: form.estado, fecha_ingreso: form.fecha_ingreso, gastos_acum: 0,
    })
    if (error) { showToast('Error: ' + error.message, false); return }
    showToast(`${newId} cargado al inventario`)
    setShowForm(false)
    setForm({ ...form, vin: '', patente: '', proveedor: '', costo_usd: '', precio_lista: '', precio_minimo: '', color: '', version: '', km: 0 })
    refresh()
  }

  const ac = (d: number) => d >= 90 ? '#ef4444' : d >= 60 ? '#fb923c' : d >= 30 ? '#facc15' : '#334155'
  const al = (d: number) => d >= 90 ? 'CRITICO' : d >= 60 ? 'ALERTA' : d >= 30 ? 'AVISO' : ''
  const inp = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 } as const
  const lbl = { fontSize: 11, color: '#64748b', display: 'block' as const, marginBottom: 4 }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Nav empresa={empresa} onEmpresaChange={setEmpresa} moneda={moneda} onMonedaChange={() => setMoneda(m => m === 'ARS' ? 'USD' : 'ARS')} />
      {toast.msg && <div style={{ position: 'fixed', top: 20, right: 20, background: toast.ok ? '#166534' : '#7f1d1d', color: toast.ok ? '#4ade80' : '#f87171', border: `1px solid ${toast.ok ? '#16a34a' : '#dc2626'}`, borderRadius: 10, padding: '10px 18px', fontSize: 13, zIndex: 1000, fontWeight: 500 }}>{toast.msg}</div>}
      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
          {[['Disponibles', disponibles + ' unidades', '#3b82f6'], ['Vendidos', vendidos + ' unidades', '#22c55e'], ['Reservados', reservados + ' unidades', '#8b5cf6'], ['Criticos +60d', criticos + ' unidades', criticos > 0 ? '#ef4444' : '#334155']].map(([l, v, c]) => (
            <div key={l} style={{ background: '#1e293b', border: `1px solid ${c}`, borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c as string }} />
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', fontFamily: 'monospace' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {[['todos', 'Todos'], ['disponible', 'Disponibles'], ['vendido', 'Vendidos'], ['reservado', 'Reservados']].map(([k, l]) => (
            <button key={k} onClick={() => setFiltroEstado(k)} style={{ padding: '4px 11px', borderRadius: 6, border: `1px solid ${filtroEstado === k ? '#3b82f6' : '#334155'}`, background: filtroEstado === k ? 'rgba(59,130,246,.15)' : 'transparent', color: filtroEstado === k ? '#60a5fa' : '#64748b', fontSize: 11, cursor: 'pointer', fontWeight: filtroEstado === k ? 600 : 400 }}>{l}</button>
          ))}
          <div style={{ width: 1, height: 18, background: '#334155' }} />
          {[['todos', 'Todos'], ['0km', '0km'], ['usado', 'Usados']].map(([k, l]) => (
            <button key={k} onClick={() => setFiltroTipo(k)} style={{ padding: '4px 11px', borderRadius: 6, border: `1px solid ${filtroTipo === k ? '#8b5cf6' : '#334155'}`, background: filtroTipo === k ? 'rgba(139,92,246,.15)' : 'transparent', color: filtroTipo === k ? '#a78bfa' : '#64748b', fontSize: 11, cursor: 'pointer', fontWeight: filtroTipo === k ? 600 : 400 }}>{l}</button>
          ))}
          <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto' }}>{filtered.length} vehículos</span>
          <button onClick={() => setShowForm(v => !v)} style={{ padding: '6px 16px', borderRadius: 8, background: showForm ? '#334155' : '#3b82f6', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            {showForm ? '✕ Cerrar' : '+ Cargar vehículo'}
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div style={{ background: '#1e293b', border: '1px solid #3b82f6', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>Nuevo vehículo al inventario</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Empresa</label>
                <select value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} style={inp}><option>INVEXUS</option><option>MAXIAUTO</option></select></div>
              <div><label style={lbl}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inp}><option value="0km">0km</option><option value="usado">Usado</option></select></div>
              <div><label style={lbl}>Marca</label>
                <select value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value, modelo: MODELOS[e.target.value]?.[0] || '' })} style={inp}>
                  {MARCAS.map(m => <option key={m}>{m}</option>)}</select></div>
              <div><label style={lbl}>Modelo</label>
                {MODELOS[form.marca]
                  ? <select value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} style={inp}>{MODELOS[form.marca].map(m => <option key={m}>{m}</option>)}</select>
                  : <input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} style={inp} />}</div>
              <div><label style={lbl}>Versión</label><input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="4X2, AUTO..." style={inp} /></div>
              <div><label style={lbl}>Año</label><input type="number" value={form.anio} onChange={e => setForm({ ...form, anio: parseInt(e.target.value) })} style={inp} /></div>
              <div><label style={lbl}>Color</label><input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Combustible</label>
                <select value={form.combustible} onChange={e => setForm({ ...form, combustible: e.target.value })} style={inp}>
                  <option>Nafta</option><option>Diesel</option><option>Hibrido</option><option>Electrico</option><option>GNC</option></select></div>
              <div><label style={lbl}>Transmision</label>
                <select value={form.transmision} onChange={e => setForm({ ...form, transmision: e.target.value })} style={inp}>
                  <option>Automatica</option><option>Manual</option></select></div>
              {form.tipo === 'usado' && <div><label style={lbl}>Kilometros</label><input type="number" value={form.km} onChange={e => setForm({ ...form, km: parseInt(e.target.value) || 0 })} style={inp} /></div>}
              <div><label style={lbl}>VIN / Motor</label><input value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value })} style={inp} /></div>
              {form.tipo === 'usado' && <div><label style={lbl}>Patente</label><input value={form.patente} onChange={e => setForm({ ...form, patente: e.target.value })} style={inp} /></div>}
              <div><label style={lbl}>Proveedor</label><input value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Fecha ingreso</label><input type="date" value={form.fecha_ingreso} onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Estado inicial</label>
                <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} style={inp}>
                  <option>Disponible</option><option>Reservado</option></select></div>
            </div>
            <div style={{ fontSize: 11, color: '#fb923c', fontWeight: 600, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #334155' }}>
              PRECIOS · TC actual BNA: ${fmtN(tcBna)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              <div><label style={lbl}>Costo USD</label><input type="number" value={form.costo_usd} onChange={e => setForm({ ...form, costo_usd: e.target.value })} placeholder="0" style={inp} /></div>
              <div><label style={lbl}>Costo ARS (calculado)</label>
                <div style={{ ...inp, color: '#64748b' }}>{form.costo_usd ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(parseFloat(form.costo_usd) * tcBna) : '—'}</div></div>
              <div><label style={lbl}>Precio lista ARS</label><input type="number" value={form.precio_lista} onChange={e => setForm({ ...form, precio_lista: e.target.value })} placeholder="0" style={inp} /></div>
              <div><label style={lbl}>Precio minimo ARS</label><input type="number" value={form.precio_minimo} onChange={e => setForm({ ...form, precio_minimo: e.target.value })} placeholder="Igual al lista" style={inp} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleGuardar} style={{ padding: '8px 24px', borderRadius: 8, background: '#16a34a', color: 'white', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Guardar vehículo</button>
              <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', color: '#64748b', border: '1px solid #334155', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Tabla */}
        {loading ? <div style={{ color: '#475569', padding: 40, textAlign: 'center' }}>Cargando...</div> : (
          <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ borderBottom: '1px solid #334155' }}>
                {['ID', 'Tipo', 'Vehiculo', 'Año', 'Color / Km', 'VIN', 'Costo USD', 'Precio Lista', 'Dias', 'Estado'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 10px', color: '#475569', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{filtered.map((s: any) => {
                const dias = s.dias_stock || 0
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #0f172a' }}>
                    <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{s.id}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: s.tipo === '0km' ? 'rgba(34,197,94,.15)' : 'rgba(96,165,250,.15)', color: s.tipo === '0km' ? '#4ade80' : '#60a5fa', border: `1px solid ${s.tipo === '0km' ? 'rgba(34,197,94,.3)' : 'rgba(96,165,250,.3)'}` }}>{s.tipo}</span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{s.marca} {s.modelo}</div>
                      <div style={{ color: '#64748b', fontSize: 10 }}>{s.version} · {s.empresa}</div>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{s.anio}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11 }}>
                      <div style={{ color: '#94a3b8' }}>{s.color || '—'}</div>
                      {s.tipo === 'usado' && <div style={{ color: '#64748b' }}>{fmtN(s.km)} km</div>}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748b', fontFamily: 'monospace', fontSize: 10 }}>{s.vin || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#e2e8f0', fontFamily: 'monospace' }}>{s.costo_usd ? 'USD ' + fmtN(s.costo_usd) : '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#e2e8f0', fontFamily: 'monospace' }}>{s.precio_lista ? fmt(s.precio_lista) : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: al(dias) ? ac(dias) : '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{dias}d</span>
                        {al(dias) && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: ac(dias) + '22', color: ac(dias), border: `1px solid ${ac(dias)}44`, fontWeight: 700 }}>{al(dias)}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                        background: s.estado === 'Disponible' ? 'rgba(34,197,94,.15)' : s.estado === 'Vendido' ? 'rgba(100,116,139,.15)' : 'rgba(139,92,246,.15)',
                        color: s.estado === 'Disponible' ? '#4ade80' : s.estado === 'Vendido' ? '#94a3b8' : '#a78bfa',
                        border: `1px solid ${s.estado === 'Disponible' ? 'rgba(34,197,94,.3)' : s.estado === 'Vendido' ? 'rgba(100,116,139,.3)' : 'rgba(139,92,246,.3)'}` }}>
                        {s.estado}
                      </span>
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
            {filtered.length === 0 && <div style={{ color: '#475569', padding: 24, textAlign: 'center' }}>Sin vehiculos para el filtro seleccionado</div>}
          </div>
        )}
      </div>
    </div>
  )
}
