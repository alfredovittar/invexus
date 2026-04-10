'use client'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState, useCallback } from 'react'

export function useStock(empresa?: string) {
  const [stock, setStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchStock = useCallback(async () => {
    const supabase = createClient()
    let query = supabase.from('inventario_view').select('*').order('dias_stock', { ascending: false })
    if (empresa && empresa !== 'AMBAS') query = query.eq('empresa', empresa)
    const { data } = await query
    setStock(data ?? [])
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
    let query = supabase.from('ventas').select('*').order('fecha', { ascending: false })
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
  const [fuenteBlue, setFuenteBlue] = useState<'supabase'|'bluelytics'|'default'>('default')
  useEffect(() => {
    const cargarTC = async () => {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      // 1 — Intentar leer de Supabase (registro del día o el más reciente)
      const { data } = await supabase
        .from('tipo_cambio')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setTcBna(data.tc_bna_venta ?? 1392.5)
        setFecha(data.fecha)

        // Si el registro es de hoy y tiene Blue, usarlo y no ir a Bluelytics
        if (data.fecha === today && data.tc_blue_venta) {
          setTcBlue(data.tc_blue_venta)
          setFuenteBlue('supabase')
          return
        }
        // Si NO es de hoy, NO usar el Blue de Supabase como base
        // Dejar que Bluelytics lo sobreescriba con el valor actual
      }

      // 2 — Fallback: consultar Bluelytics en tiempo real
      try {
        const r = await window.fetch('https://api.bluelytics.com.ar/v2/latest')
        if (r.ok) {
          const d = await r.json()
          const blueVenta = d.blue?.value_sell ?? null
          const bnaVenta = d.oficial?.value_sell ?? null
          if (blueVenta) { setTcBlue(blueVenta); setFuenteBlue('bluelytics') }
          if (bnaVenta && !data) setTcBna(bnaVenta)
        }
      } catch(e) {
        console.warn('Bluelytics fallback falló:', e)
      }
    }
    cargarTC()
  }, [])
  return { tcBna, tcBlue, fecha, fuenteBlue }
}
