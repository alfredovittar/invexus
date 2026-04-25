// utils/auditoria.ts
// Función utilitaria para registrar movimientos en el log de auditoría
// Llamar desde ventas, stock, gastos, etc.

import { createClient } from '@/utils/supabase/client'

type AccionAuditoria = 'INSERT' | 'UPDATE' | 'DELETE' | 'ANULACION'

interface RegistroAuditoria {
  tabla: string
  registro_id: string
  accion: AccionAuditoria
  descripcion: string
  datos_antes?: Record<string, any> | null
  datos_despues?: Record<string, any> | null
  campos_modificados?: string[]
  empresa?: string
}

export async function registrarAuditoria(params: RegistroAuditoria): Promise<void> {
  try {
    const supabase = createClient()

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser()

    // Calcular campos modificados si hay datos antes y después
    let campos_modificados = params.campos_modificados || []
    if (!campos_modificados.length && params.datos_antes && params.datos_despues) {
      campos_modificados = Object.keys(params.datos_despues).filter(k => {
        const antes = JSON.stringify(params.datos_antes![k])
        const despues = JSON.stringify(params.datos_despues![k])
        return antes !== despues
      })
    }

    // Limpiar datos para no guardar todo el objeto (solo campos relevantes)
    const limpiar = (obj: Record<string, any> | null | undefined) => {
      if (!obj) return null
      const excluir = ['created_at', 'updated_at'] // campos técnicos que no aportan
      return Object.fromEntries(
        Object.entries(obj).filter(([k]) => !excluir.includes(k))
      )
    }

    await supabase.from('auditoria_log').insert({
      tabla:              params.tabla,
      registro_id:        params.registro_id,
      accion:             params.accion,
      descripcion:        params.descripcion,
      datos_antes:        limpiar(params.datos_antes),
      datos_despues:      limpiar(params.datos_despues),
      campos_modificados: campos_modificados.length > 0 ? campos_modificados : null,
      usuario_email:      user?.email ?? 'desconocido',
      empresa:            params.empresa ?? null,
    })
  } catch (err) {
    // El log nunca debe bloquear la operación principal
    console.error('Error registrando auditoría:', err)
  }
}
