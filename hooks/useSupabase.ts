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
}// =============================================================================
// INVEXUS — Hooks nuevos para useSupabase.ts
// Agregar al archivo existente: hooks/useSupabase.ts
// =============================================================================


const supabase = createClient()

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export type CuentaCorriente = {
  id: string
  empresa: string
  venta_id: string
  cliente: string | null
  monto_total: number
  cant_cuotas: number
  aprobado_por: string | null
  observaciones: string | null
  estado: 'Activa' | 'Saldada' | 'Cancelada'
  created_at: string
  updated_at: string
}

export type CcCuota = {
  id: string
  cc_id: string
  nro_cuota: number
  monto: number
  fecha_vencimiento: string
  estado_pago: 'Pendiente' | 'Cobrado' | 'Vencido'
  fecha_cobro: string | null
  nro_pagare: string | null
  observaciones: string | null
  // campos extras de la vista cc_cuotas_estado
  empresa?: string
  venta_id?: string
  cliente?: string | null
  monto_total?: number
  estado_calculado?: 'Cobrado' | 'Vencido' | 'Por vencer' | 'Pendiente'
  dias_para_vencer?: number
}

export type TomaPxp = {
  id: string
  empresa: string
  venta_id: string
  inv_id_tomado: string | null
  valor_pxp: number
  marca: string | null
  modelo: string | null
  version: string | null
  anio: number | null
  km: number | null
  color: string | null
  patente: string | null
  vin: string | null
  combustible: string | null
  transmision: string | null
  observaciones: string | null
  created_at: string
}

// ─── HOOK: useCuentasCorrientes ───────────────────────────────────────────────

export function useCuentasCorrientes(empresa?: string) {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCuentas = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('cuentas_corrientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (empresa) query = query.eq('empresa', empresa)

    const { data, error } = await query
    if (error) setError(error.message)
    else setCuentas(data || [])
    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchCuentas() }, [fetchCuentas])

  return { cuentas, loading, error, refetch: fetchCuentas }
}

// ─── HOOK: useCcCuotas ───────────────────────────────────────────────────────

export function useCcCuotas(ccId?: string) {
  const [cuotas, setCuotas] = useState<CcCuota[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCuotas = useCallback(async () => {
    if (!ccId) { setCuotas([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('cc_cuotas_estado')
      .select('*')
      .eq('cc_id', ccId)
      .order('nro_cuota', { ascending: true })
    setCuotas(data || [])
    setLoading(false)
  }, [ccId])

  useEffect(() => { fetchCuotas() }, [fetchCuotas])

  return { cuotas, loading, refetch: fetchCuotas }
}

// ─── HOOK: useCuotasPendientes (para módulo cobranzas) ───────────────────────

export function useCuotasPendientes(empresa?: string) {
  const [cuotas, setCuotas] = useState<CcCuota[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from('cc_cuotas_estado')
        .select('*')
        .neq('estado_pago', 'Cobrado')
        .order('fecha_vencimiento', { ascending: true })

      if (empresa) query = query.eq('empresa', empresa)

      const { data } = await query
      setCuotas(data || [])
      setLoading(false)
    }
    fetch()
  }, [empresa])

  return { cuotas, loading }
}

// ─── HOOK: useTomas ──────────────────────────────────────────────────────────

export function useTomas(empresa?: string) {
  const [tomas, setTomas] = useState<TomaPxp[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTomas = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('tomas_pxp')
      .select('*')
      .order('created_at', { ascending: false })

    if (empresa) query = query.eq('empresa', empresa)

    const { data } = await query
    setTomas(data || [])
    setLoading(false)
  }, [empresa])

  useEffect(() => { fetchTomas() }, [fetchTomas])

  return { tomas, loading, refetch: fetchTomas }
}

// ─── HELPERS: generar IDs correlativos ───────────────────────────────────────

export async function siguienteIdCc(empresa: string): Promise<string> {
  const { data } = await supabase.rpc('siguiente_id_cc', { p_empresa: empresa })
  return data || 'CC-001'
}

export async function siguienteIdPxp(empresa: string): Promise<string> {
  const { data } = await supabase.rpc('siguiente_id_pxp', { p_empresa: empresa })
  return data || 'PXP-001'
}

// ─── HELPER: generar cuotas por defecto ──────────────────────────────────────

export function generarCuotasDefault(
  ccId: string,
  montoTotal: number,
  cantCuotas: number,
  fechaVenta: string
): Omit<CcCuota, 'id' | 'estado_pago' | 'fecha_cobro' | 'nro_pagare' | 'observaciones'>[] {
  const montoCuota = Math.floor(montoTotal / cantCuotas)
  const resto = montoTotal - montoCuota * cantCuotas
  const fechaBase = new Date(fechaVenta)

  return Array.from({ length: cantCuotas }, (_, i) => {
    const fechaVenc = new Date(fechaBase)
    fechaVenc.setDate(fechaVenc.getDate() + 30 * (i + 1))
    const monto = i === cantCuotas - 1 ? montoCuota + resto : montoCuota
    return {
      cc_id: ccId,
      nro_cuota: i + 1,
      monto,
      fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
    }
  })
}
