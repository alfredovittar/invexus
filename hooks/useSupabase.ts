'use client'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState, useCallback } from 'react'

export function useStock(empresa?: string) {
  const [stock, setStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchStock = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('inventario_view')
      .select('*, venta:ventas(cliente, vendedor_nombre, fecha, precio_venta, forma_pago)')
      .order('dias_stock', { ascending: false })
    if (empresa && empresa !== 'AMBAS') query = query.eq('empresa', empresa)
    const { data } = await query
    const normalizado = (data ?? []).map((v: any) => ({
      ...v,
      venta: Array.isArray(v.venta) ? v.venta[0] ?? null : v.venta ?? null,
    }))
    setStock(normalizado)
    setLoading(false)
  }, [empresa])
  useEffect(() => {
    fetchStock()
    const supabase = createClient()
    const ch = supabase.channel('inv-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventario' }, fetchStock)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchStock])
  return { stock, loading, refresh: fetchStock }
}

export function useVentas(empresa?: string, desde?: string, hasta?: string) {
  const [ventas, setVentas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchVentas = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('ventas')
      .select('*')
      .eq('estado_venta', 'Activa')   // ← excluye anuladas de todos los listados
      .order('fecha', { ascending: false })
    if (empresa && empresa !== 'AMBAS') query = query.eq('empresa', empresa)
    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)
    const { data } = await query
    setVentas(data ?? [])
    setLoading(false)
  }, [empresa, desde, hasta])
  useEffect(() => {
    fetchVentas()
    const supabase = createClient()
    const ch = supabase.channel('ventas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, fetchVentas)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchVentas])
  return { ventas, loading, refresh: fetchVentas }
}

export function useGastos(empresa?: string, desde?: string, hasta?: string) {
  const [gastos, setGastos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchGastos = useCallback(async () => {
    const supabase = createClient()
    let query = supabase.from('gastos').select('*').order('fecha', { ascending: false })
    if (empresa && empresa !== 'AMBAS') query = query.eq('empresa', empresa)
    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)
    const { data } = await query
    setGastos(data ?? [])
    setLoading(false)
  }, [empresa, desde, hasta])
  useEffect(() => {
    fetchGastos()
    const supabase = createClient()
    const ch = supabase.channel('gastos-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gastos' }, fetchGastos)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchGastos])
  return { gastos, loading, refresh: fetchGastos }
}

export function useGastosUnidad(inv_id?: string) {
  const [gastosUnidad, setGastosUnidad] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchGastosUnidad = useCallback(async () => {
    if (!inv_id) { setGastosUnidad([]); setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('gastos_unidad')
      .select('*')
      .eq('inv_id', inv_id)
      .order('fecha', { ascending: false })
    setGastosUnidad(data ?? [])
    setLoading(false)
  }, [inv_id])
  useEffect(() => { fetchGastosUnidad() }, [fetchGastosUnidad])
  return { gastosUnidad, loading, refresh: fetchGastosUnidad }
}

export function useInstrumentos(empresa?: string) {
  const [instrumentos, setInstrumentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchInstrumentos = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('instrumentos_cobro')
      .select('*')
      .order('created_at', { ascending: false })
    if (empresa && empresa !== 'AMBAS') query = query.eq('empresa', empresa)
    const { data } = await query
    setInstrumentos(data ?? [])
    setLoading(false)
  }, [empresa])
  useEffect(() => { fetchInstrumentos() }, [fetchInstrumentos])
  return { instrumentos, loading, refresh: fetchInstrumentos }
}

export function useLeads(empresa?: string) {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchLeads = useCallback(async () => {
    const supabase = createClient()
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (empresa && empresa !== 'AMBAS') query = query.eq('empresa', empresa)
    const { data } = await query
    setLeads(data ?? [])
    setLoading(false)
  }, [empresa])
  useEffect(() => {
    fetchLeads()
    const supabase = createClient()
    const ch = supabase.channel('leads-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchLeads])
  return { leads, loading, refresh: fetchLeads }
}

export function useTipoCambio() {
  const [tcBna, setTcBna] = useState<number>(1392.5)
  const [tcBlue, setTcBlue] = useState<number>(1462)
  const [fecha, setFecha] = useState<string>('')
  useEffect(() => {
    const cargarTC = async () => {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      try {
        const r = await window.fetch('https://api.bluelytics.com.ar/v2/latest')
        if (r.ok) {
          const d = await r.json()
          const blueVenta = d.blue?.value_sell ?? null
          if (blueVenta) setTcBlue(blueVenta)
        }
      } catch(e) { console.warn('Bluelytics error:', e) }
      const { data } = await supabase
        .from('tipo_cambio')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .single()
      if (data) {
        setTcBna(data.tc_bna_venta ?? 1392.5)
        setFecha(data.fecha)
        if (data.fecha === today && data.tc_blue_venta) {
          setTcBlue(prev => prev === 1462 ? data.tc_blue_venta : prev)
        }
      }
    }
    cargarTC()
  }, [])
  return { tcBna, tcBlue, fecha }
}