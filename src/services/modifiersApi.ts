import { supabase } from '../supabaseClient'
import { getStoreId } from './coreApi'
import type { ModifierGroup, ModifierOption } from '../types'

export const modifiersApi = {
  // ─── Groups ────────────────────────────────────────────────────────────────

  listGroups: async (): Promise<ModifierGroup[]> => {
    const storeId = await getStoreId()

    const { data: groups, error } = await supabase
      .from('modifier_groups')
      .select('*')
      .eq('store_id', storeId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!groups || groups.length === 0) return []

    const groupIds = groups.map((g) => g.id)

    // Load options for all groups in one query
    const { data: options } = await supabase
      .from('modifier_options')
      .select('*')
      .in('group_id', groupIds)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    // Load product links
    const { data: links } = await supabase
      .from('product_modifier_groups')
      .select('group_id, product_id, products(name)')
      .in('group_id', groupIds)

    return groups.map((g) => ({
      ...g,
      options: (options || []).filter((o) => o.group_id === g.id) as ModifierOption[],
      product_ids: (links || []).filter((l) => l.group_id === g.id).map((l) => l.product_id),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      product_names: (links || []).filter((l) => l.group_id === g.id).map((l) => (l as any).products?.name).filter(Boolean),
    })) as ModifierGroup[]
  },

  createGroup: async (data: {
    name: string
    description?: string
    selection_type: 'single' | 'multiple'
    required: boolean
    min_selections: number
    max_selections: number | null
    options: { name: string; price_delta: number }[]
    product_ids: string[]
  }): Promise<ModifierGroup> => {
    const storeId = await getStoreId()

    const { data: group, error } = await supabase
      .from('modifier_groups')
      .insert({
        store_id: storeId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        selection_type: data.selection_type,
        required: data.required,
        min_selections: data.min_selections,
        max_selections: data.max_selections,
      })
      .select('*')
      .single()

    if (error) throw error

    // Insert options
    if (data.options.length > 0) {
      const optionRows = data.options.map((o, i) => ({
        group_id: group.id,
        store_id: storeId,
        name: o.name.trim(),
        price_delta: o.price_delta,
        sort_order: i * 10,
      }))
      const { error: optErr } = await supabase.from('modifier_options').insert(optionRows)
      if (optErr) throw optErr
    }

    // Link to products
    if (data.product_ids.length > 0) {
      const linkRows = data.product_ids.map((pid) => ({ product_id: pid, group_id: group.id }))
      const { error: linkErr } = await supabase.from('product_modifier_groups').insert(linkRows)
      if (linkErr) throw linkErr
    }

    return group as ModifierGroup
  },

  updateGroup: async (
    groupId: string,
    data: {
      name: string
      description?: string
      selection_type: 'single' | 'multiple'
      required: boolean
      min_selections: number
      max_selections: number | null
      options: { id?: string; name: string; price_delta: number }[]
      product_ids: string[]
    }
  ): Promise<void> => {
    const storeId = await getStoreId()

    const { error } = await supabase
      .from('modifier_groups')
      .update({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        selection_type: data.selection_type,
        required: data.required,
        min_selections: data.min_selections,
        max_selections: data.max_selections,
      })
      .eq('id', groupId)

    if (error) throw error

    // Replace all options: delete existing and re-insert
    await supabase.from('modifier_options').delete().eq('group_id', groupId)
    if (data.options.length > 0) {
      const optionRows = data.options.map((o, i) => ({
        group_id: groupId,
        store_id: storeId,
        name: o.name.trim(),
        price_delta: o.price_delta,
        sort_order: i * 10,
      }))
      const { error: optErr } = await supabase.from('modifier_options').insert(optionRows)
      if (optErr) throw optErr
    }

    // Replace product links
    await supabase.from('product_modifier_groups').delete().eq('group_id', groupId)
    if (data.product_ids.length > 0) {
      const linkRows = data.product_ids.map((pid) => ({ product_id: pid, group_id: groupId }))
      const { error: linkErr } = await supabase.from('product_modifier_groups').insert(linkRows)
      if (linkErr) throw linkErr
    }
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    const { error } = await supabase.from('modifier_groups').delete().eq('id', groupId)
    if (error) throw error
  },

  toggleGroupActive: async (groupId: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase
      .from('modifier_groups')
      .update({ is_active: isActive })
      .eq('id', groupId)
    if (error) throw error
  },

  // ─── Options (standalone helpers) ──────────────────────────────────────────

  deleteOption: async (optionId: string): Promise<void> => {
    const { error } = await supabase.from('modifier_options').delete().eq('id', optionId)
    if (error) throw error
  },

  toggleOptionActive: async (optionId: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase
      .from('modifier_options')
      .update({ is_active: isActive })
      .eq('id', optionId)
    if (error) throw error
  },
}
