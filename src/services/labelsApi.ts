import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'

export type LabelDestination = 'venta_directa' | 'despacho'

export interface StockLabel {
  id: string
  store_id: string
  product_id: string | null
  product_name: string
  comensal: string | null
  destination: LabelDestination
  dispatch_id: string | null
  date: string
  code: string
  status: 'generado' | 'escaneado'
  scanned_at: string | null
  created_at: string
}

// Short, human-readable slug from a product name for the printed code (no accents, no spaces)
function slugify(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 12) || 'PROD'
}

function buildCode(productName: string, date: string, seq: number): string {
  return `${slugify(productName)}-${date.replace(/-/g, '')}-${String(seq).padStart(4, '0')}`
}

export const labelsApi = {
  // Genera una etiqueta (código único) por unidad para venta directa (mostrador/web), a partir
  // de lo ya cargado en Producción para esa fecha — no requiere tipear nada nuevo.
  generateForProduction: async (date: string, items: { product_id: string; product_name: string; quantity: number }[]): Promise<StockLabel[]> => {
    const storeId = await getStoreId()
    let seq = 0
    const rows = items.flatMap((item) =>
      Array.from({ length: Math.max(0, Math.floor(item.quantity)) }, () => {
        seq += 1
        return {
          store_id: storeId,
          product_id: item.product_id,
          product_name: item.product_name,
          comensal: null,
          destination: 'venta_directa' as LabelDestination,
          dispatch_id: null,
          date,
          code: buildCode(item.product_name, date, seq),
        }
      })
    )
    if (rows.length === 0) return []
    const { data, error } = await supabase.from('stock_labels').insert(rows).select()
    if (error) throw error
    return data || []
  },

  // Genera etiquetas (código único) para un despacho ya cargado (empresa o pack semanal) —
  // el comensal sale del despacho, no hay que volver a tipearlo.
  generateForDispatch: async (dispatchId: string, employeeName: string | null, date: string, items: { product_id: string | null; product_name: string; quantity: number }[]): Promise<StockLabel[]> => {
    const storeId = await getStoreId()
    let seq = 0
    const rows = items.flatMap((item) =>
      Array.from({ length: Math.max(0, Math.floor(item.quantity)) }, () => {
        seq += 1
        return {
          store_id: storeId,
          product_id: item.product_id,
          product_name: item.product_name,
          comensal: employeeName,
          destination: 'despacho' as LabelDestination,
          dispatch_id: dispatchId,
          date,
          code: buildCode(item.product_name, date, seq),
        }
      })
    )
    if (rows.length === 0) return []
    const { data, error } = await supabase.from('stock_labels').insert(rows).select()
    if (error) throw error
    return data || []
  },

  listByDate: async (date: string, destination?: LabelDestination): Promise<StockLabel[]> => {
    const storeId = await getStoreId()
    let query = supabase.from('stock_labels').select('*').eq('store_id', storeId).eq('date', date)
    if (destination) query = query.eq('destination', destination)
    const { data, error } = await query.order('code')
    if (error) throw error
    return data || []
  },

  getDaySummary: async (date: string): Promise<Record<LabelDestination, { generado: number; escaneado: number }>> => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
      .from('stock_labels')
      .select('destination, status')
      .eq('store_id', storeId)
      .eq('date', date)
    if (error) throw error
    const summary: Record<LabelDestination, { generado: number; escaneado: number }> = {
      venta_directa: { generado: 0, escaneado: 0 },
      despacho: { generado: 0, escaneado: 0 },
    }
    for (const row of (data || []) as { destination: LabelDestination; status: 'generado' | 'escaneado' }[]) {
      summary[row.destination][row.status] += 1
    }
    return summary
  },

  // Escaneo: busca la etiqueta por código y la marca como salida (sin importar en qué tienda
  // se generó, siempre que sea del mismo dueño — RLS cross-store ya lo permite)
  scan: async (code: string): Promise<StockLabel> => {
    const { data: existing, error: findError } = await supabase
      .from('stock_labels')
      .select('*')
      .eq('code', code)
      .maybeSingle()
    if (findError) throw findError
    if (!existing) throw new Error('Código no encontrado')
    if (existing.status === 'escaneado') throw new Error(`Ya fue escaneado el ${new Date(existing.scanned_at).toLocaleString('es-AR')}`)

    const { data, error } = await supabase
      .from('stock_labels')
      .update({ status: 'escaneado', scanned_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
