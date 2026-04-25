'use client'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useTipoCambio } from '@/hooks/useSupabase'
import { useEffect, useState } from 'react'

interface NavProps {
  empresa: string
  onEmpresaChange: (e: string) => void
  moneda: string
  onMonedaChange: () => void
}

export default function Nav({ empresa, onEmpresaChange, moneda, onMonedaChange }: NavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { tcBna, tcBlue } = useTipoCambio()
  const fmtN = (n: number) => new Intl.NumberFormat('es-AR').format(n)
  const [rol, setRol] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const cargarRol = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email || '')
      const { data } = await supabase
        .from('usuarios_config')
        .select('rol')
        .eq('user_id', user.id)
        .single()
      if (data) setRol(data.rol)
    }
    cargarRol()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const esCeo = rol === 'ceo' || rol === '' // mientras carga o no tiene config → CEO (los 3 usuarios actuales)

  const nav = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/stock',     label: 'Stock' },
    { href: '/ventas',    label: 'Ventas' },
    { href: '/gastos',    label: 'Gastos' },
    { href: '/crm',       label: 'CRM' },
    { href: '/divisas',   label: 'Divisas' },
    ...(esCeo ? [{ href: '/auditoria', label: '🔍 Auditoría' }] : []),
  ]

  return (
    <div style={{ borderBottom:'1px solid #1e293b', padding:'0 20px', display:'flex', alignItems:'center', gap:12, height:50, background:'#0f172a', position:'sticky', top:0, zIndex:100, flexWrap:'wrap' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <div style={{ width:26, height:26, borderRadius:7, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white' }}>IX</div>
        <span style={{ fontSize:14, fontWeight:700, color:'#f1f5f9' }}>INVEXUS</span>
      </div>
      <nav style={{ display:'flex', gap:2, flex:1 }}>
        {nav.map(n => (
          <button key={n.href} onClick={() => router.push(n.href)}
            style={{ padding:'5px 12px', borderRadius:7, border:'none', background:pathname===n.href?'#1e293b':'transparent', color:pathname===n.href?'#e2e8f0':'#64748b', fontSize:12, cursor:'pointer', fontWeight:pathname===n.href?600:400 }}>
            {n.label}
          </button>
        ))}
      </nav>
      <div style={{ display:'flex', gap:4 }}>
        {['AMBAS','INVEXUS','MAXIAUTO'].map(e => (
          <button key={e} onClick={() => onEmpresaChange(e)}
            style={{ padding:'3px 9px', borderRadius:6, border:`1px solid ${empresa===e?'#3b82f6':'#334155'}`, background:empresa===e?'rgba(59,130,246,.15)':'transparent', color:empresa===e?'#60a5fa':'#475569', fontSize:11, cursor:'pointer', fontWeight:empresa===e?600:400 }}>
            {e}
          </button>
        ))}
      </div>
      <button onClick={onMonedaChange}
        style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${moneda==='USD'?'rgba(251,146,60,.4)':'#334155'}`, background:moneda==='USD'?'rgba(251,146,60,.15)':'transparent', color:moneda==='USD'?'#fb923c':'#64748b', fontSize:11, cursor:'pointer', fontWeight:600 }}>
        {moneda==='ARS'?'$ ARS':'$ USD'}
      </button>
      <div style={{ display:'flex', gap:5 }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,.05)', borderRadius:7, padding:'3px 8px', border:'1px solid rgba(255,255,255,.08)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#60a5fa' }} />
          <span style={{ fontSize:10, color:'#64748b', fontFamily:'monospace' }}>BNA</span>
          <span style={{ fontSize:12, fontWeight:600, color:'#e2e8f0', fontFamily:'monospace' }}>${fmtN(tcBna)}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,.05)', borderRadius:7, padding:'3px 8px', border:'1px solid rgba(251,146,60,.2)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#fb923c' }} />
          <span style={{ fontSize:10, color:'#64748b', fontFamily:'monospace' }}>BLUE</span>
          <span style={{ fontSize:12, fontWeight:600, color:'#fb923c', fontFamily:'monospace' }}>${fmtN(tcBlue)}</span>
        </div>
      </div>
      {userEmail && (
        <span style={{ fontSize:10, color:'#334155', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {userEmail.split('@')[0]}
        </span>
      )}
      <button onClick={handleLogout}
        style={{ padding:'3px 9px', borderRadius:6, border:'1px solid #334155', background:'transparent', color:'#64748b', fontSize:11, cursor:'pointer' }}>
        Salir
      </button>
    </div>
  )
}
