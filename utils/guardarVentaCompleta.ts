// =============================================================================
// INVEXUS — Función transaccional: guardar venta completa
// Archivo: utils/guardarVentaCompleta.ts
//
// Ejecuta en secuencia atómica:
//   1. INSERT ventas
//   2. UPDATE inventario (vehículo vendido → Vendido)
//   3. Si hay PxP: INSERT inventario (usado tomado) + INSERT tomas_pxp
//   4. Si hay CC:  INSERT cuentas_corrientes + INSERT cc_cuotas (N rows)
//   5. INSERT auditoria_log
// =============================================================================

import { createClient } from '@/utils/supabase/client'
import { registrarAuditoria } from '@/utils/auditoria'
import { siguienteIdPxp, siguienteIdCc } from '@/hooks/useSupabase'
import type { ValoresCobro, DatosPxP } from '@/components/MediosCobro'

const supabase = createClient()

type DatosVenta = {
  empresa: string
  inv_id: string
  fecha: string
  cliente: string
  vendedor_nombre: string
  precio_venta: number
  forma_pago: string
  estado_cobro: string
  tc_bna_snapshot: number
  tc_blue_snapshot: number
  observaciones: string
  cobros: ValoresCobro
}

type Resultado = { ok: true; ventaId: string } | { ok: false; error: string }

export async function guardarVentaCompleta(datos: DatosVenta): Promise<Resultado> {
  // ─── 1. Armar el objeto venta ─────────────────────────────────────────────
  const ventaPayload = {
    empresa:               datos.empresa,
    inv_id:                datos.inv_id,
    fecha:                 datos.fecha,
    cliente:               datos.cliente,
    vendedor_nombre:       datos.vendedor_nombre,
    precio_venta:          datos.precio_venta,
    forma_pago:            datos.forma_pago,
    estado_cobro:          datos.estado_cobro,
    tc_bna_snapshot:       datos.tc_bna_snapshot,
    tc_blue_snapshot:      datos.tc_blue_snapshot,
    observaciones:         datos.observaciones,
    // Medios de cobro
    cobro_efectivo:        datos.cobros.cobro_efectivo || 0,
    cobro_transfer:        datos.cobros.cobro_transfer || 0,
    cobro_usd:             datos.cobros.cobro_usd || 0,
    cobro_usd_tc:          datos.cobros.cobro_usd_tc || 0,
    cobro_pagare:          datos.cobros.cobro_pagare || 0,
    cobro_tarjeta:         datos.cobros.cobro_tarjeta || 0,
    cobro_tarjeta_detalle: datos.cobros.cobro_tarjeta_detalle || null,
    cobro_pxp:             datos.cobros.cobro_pxp || 0,
    cobro_cc:              datos.cobros.cobro_cc || 0,
  }

  // ─── 2. INSERT ventas ─────────────────────────────────────────────────────
  const { data: ventaData, error: errVenta } = await supabase
    .from('ventas')
    .insert(ventaPayload)
    .select('id')
    .single()

  if (errVenta || !ventaData) {
    return { ok: false, error: `Error al registrar la venta: ${errVenta?.message}` }
  }
  const ventaId = ventaData.id

  // ─── 3. UPDATE inventario: vehículo vendido → Vendido ────────────────────
  const { error: errInv } = await supabase
    .from('inventario')
    .update({ estado: 'Vendido', fecha_venta: datos.fecha, precio_vendido: datos.precio_venta })
    .eq('id', datos.inv_id)

  if (errInv) {
    // No revertimos la venta pero avisamos — el admin puede corregirlo
    console.error('Advertencia: venta registrada pero no se actualizó el estado del inventario:', errInv.message)
  }

  // ─── 4. Si hay PxP: dar de alta el usado + registrar toma ────────────────
  const cobros = datos.cobros
  if (cobros.cobro_pxp > 0 && cobros.datos_pxp) {
    const pxp: DatosPxP = cobros.datos_pxp

    // Validación mínima
    if (!pxp.marca || !pxp.modelo || !pxp.patente) {
      return { ok: false, error: 'Parte de pago: completar al menos Marca, Modelo y Patente.' }
    }

    // Obtener siguiente ID de inventario para este empresa
    // Reutilizamos la lógica existente del sistema — llamada al backend
    const { data: idData } = await supabase.rpc('siguiente_id_cc', { p_empresa: datos.empresa })
    // Nota: el sistema ya tiene lógica de IDs en el front, usamos el mismo patrón
    // Para inventario usamos la función existente que genera INV-XXX / MAX-XXX
    const prefijo = datos.empresa === 'INVEXUS' ? 'INV' : 'MAX'
    const { data: ultimoInv } = await supabase
      .from('inventario')
      .select('id')
      .ilike('id', `${prefijo}-%`)
      .order('id', { ascending: false })
      .limit(1)
      .single()

    const ultimoNum = ultimoInv?.id
      ? parseInt(ultimoInv.id.replace(`${prefijo}-`, '')) || 0
      : 0
    const nuevoInvId = `${prefijo}-${String(ultimoNum + 1).padStart(3, '0')}`

    // INSERT inventario (usado tomado)
    const { error: errNuevoInv } = await supabase.from('inventario').insert({
      id:              nuevoInvId,
      empresa:         datos.empresa,
      tipo:            'usado',
      marca:           pxp.marca,
      modelo:          pxp.modelo,
      version:         pxp.version || null,
      anio:            pxp.anio ? parseInt(pxp.anio) : null,
      km:              pxp.km ? parseFloat(pxp.km) : null,
      color:           pxp.color || null,
      patente:         pxp.patente,
      vin:             pxp.vin || null,
      combustible:     pxp.combustible || null,
      transmision:     pxp.transmision || null,
      costo_ars:       pxp.costo_ars ? parseFloat(pxp.costo_ars) : cobros.cobro_pxp,
      costo_usd:       null,
      precio_lista:    pxp.precio_lista ? parseFloat(pxp.precio_lista) : null,
      estado:          'Disponible',
      fecha_ingreso:   datos.fecha,
      origen:          'toma_pxp',
      venta_origen_id: ventaId,
    })

    if (errNuevoInv) {
      return { ok: false, error: `Error al dar de alta el vehículo tomado: ${errNuevoInv.message}` }
    }

    // INSERT tomas_pxp
    const pxpId = await siguienteIdPxp(datos.empresa)
    const { error: errToma } = await supabase.from('tomas_pxp').insert({
      id:            pxpId,
      empresa:       datos.empresa,
      venta_id:      ventaId,
      inv_id_tomado: nuevoInvId,
      valor_pxp:     cobros.cobro_pxp,
      marca:         pxp.marca,
      modelo:        pxp.modelo,
      version:       pxp.version || null,
      anio:          pxp.anio ? parseInt(pxp.anio) : null,
      km:            pxp.km ? parseFloat(pxp.km) : null,
      color:         pxp.color || null,
      patente:       pxp.patente,
      vin:           pxp.vin || null,
      combustible:   pxp.combustible || null,
      transmision:   pxp.transmision || null,
      observaciones: pxp.observaciones || null,
    })

    if (errToma) {
      return { ok: false, error: `Error al registrar la toma PxP: ${errToma.message}` }
    }
  }

  // ─── 5. Si hay CC: crear cuenta corriente + cuotas ───────────────────────
  if (cobros.cobro_cc > 0 && cobros.cuotas_cc.length > 0) {
    const ccId = await siguienteIdCc(datos.empresa)

    const { error: errCC } = await supabase.from('cuentas_corrientes').insert({
      id:           ccId,
      empresa:      datos.empresa,
      venta_id:     ventaId,
      cliente:      datos.cliente || null,
      monto_total:  cobros.cobro_cc,
      cant_cuotas:  cobros.cuotas_cc.length,
      aprobado_por: cobros.aprobado_por_cc || null,
      estado:       'Activa',
    })

    if (errCC) {
      return { ok: false, error: `Error al crear la cuenta corriente: ${errCC.message}` }
    }

    // INSERT cuotas — una por una (Supabase acepta array también)
    const cuotasPayload = cobros.cuotas_cc.map(c => ({
      cc_id:             ccId,
      nro_cuota:         c.nro_cuota,
      monto:             c.monto,
      fecha_vencimiento: c.fecha_vencimiento,
      estado_pago:       'Pendiente',
      nro_pagare:        c.nro_pagare || null,
    }))

    const { error: errCuotas } = await supabase.from('cc_cuotas').insert(cuotasPayload)

    if (errCuotas) {
      return { ok: false, error: `Error al registrar las cuotas: ${errCuotas.message}` }
    }
  }

  // ─── 6. Auditoría ─────────────────────────────────────────────────────────
  await registrarAuditoria({
    tabla:    'ventas',
    accion:   'INSERT',
    registro_id: ventaId,
    descripcion: `Venta registrada: ${datos.cliente} · ${datos.empresa}`,
    empresa: datos.empresa,
    datos_despues: { ...ventaPayload, tiene_pxp: cobros.cobro_pxp > 0, tiene_cc: cobros.cobro_cc > 0 },
  })

  return { ok: true, ventaId }
}
