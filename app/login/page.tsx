'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'password'|'magic'>('password')
  const [sent, setSent] = useState(false)
  const router = useRouter()
  const handleLogin = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/')
  }
  const handleMagic = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/' } })
    if (error) { setError(error.message); setLoading(false) }
    else { setSent(true); setLoading(false) }
  }
  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:16, padding:'2rem', width:'100%', maxWidth:380 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.75rem' }}>
          <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white' }}>IX</div>
          <div><div style={{ fontSize:16, fontWeight:700, color:'#f1f5f9' }}>INVEXUS</div><div style={{ fontSize:11, color:'#475569' }}>Sistema automotriz</div></div>
        </div>
        {sent ? (
          <div style={{ textAlign:'center', color:'#94a3b8', fontSize:14 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>📧</div>
            <div style={{ fontWeight:600, color:'#e2e8f0', marginBottom:8 }}>Revisá tu email</div>
            <div>Link enviado a <strong style={{ color:'#60a5fa' }}>{email}</strong></div>
            <button onClick={() => setSent(false)} style={{ marginTop:16, color:'#60a5fa', background:'none', border:'none', cursor:'pointer', fontSize:13 }}>Volver</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:'#64748b', display:'block', marginBottom:6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
                style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:13 }}
                onKeyDown={e => e.key==='Enter' && mode==='password' && handleLogin()} />
            </div>
            {mode === 'password' && (
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:'#64748b', display:'block', marginBottom:6 }}>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #334155', background:'#0f172a', color:'#e2e8f0', fontSize:13 }}
                  onKeyDown={e => e.key==='Enter' && handleLogin()} />
              </div>
            )}
            {error && <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:7, padding:'8px 12px', fontSize:12, color:'#f87171', marginBottom:14 }}>{error}</div>}
            <button onClick={mode==='password' ? handleLogin : handleMagic} disabled={loading || !email}
              style={{ width:'100%', padding:'10px', borderRadius:8, background:loading?'#1e3a5f':'#3b82f6', color:'white', border:'none', fontSize:14, fontWeight:600, cursor:'pointer', marginBottom:12 }}>
              {loading ? 'Ingresando...' : mode==='password' ? 'Ingresar' : 'Enviar link de acceso'}
            </button>
            <button onClick={() => setMode(m => m==='password'?'magic':'password')}
              style={{ width:'100%', padding:'8px', borderRadius:8, background:'transparent', color:'#64748b', border:'1px solid #334155', fontSize:12, cursor:'pointer' }}>
              {mode==='password' ? 'Ingresar sin contraseña (Magic Link)' : 'Usar contraseña'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
