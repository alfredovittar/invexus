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
        <div style={{background:'#1e293b',border:'1px solid #334155',borderRadius:12,padding:'20px 24px'}}>
          <div style={{fontSize:11,color:'#ef4444',fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:16}}>Sesión</div>
          <button onClick={handleCerrarSesion} style={{padding:'9px 20px',borderRadius:8,background:'rgba(239,68,68,.1)',color:'#f87171',border:'1px solid rgba(239,68,68,.3)',fontSize:13,cursor:'pointer',fontWeight:600}}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  )
}
