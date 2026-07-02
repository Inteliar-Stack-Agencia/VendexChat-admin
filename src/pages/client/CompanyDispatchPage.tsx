import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Trash2, X, Loader2, ChevronLeft, ChevronRight, Edit2, Check, FileSpreadsheet, Users } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Card, Button } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { companyDispatchApi, type CompanyClient, type CompanyDispatch } from '../../services/companyDispatchApi'
import { productsApi } from '../../services/productsApi'
import { formatPrice } from '../../utils/helpers'
import type { Product } from '../../types'

const today = new Date().toISOString().split('T')[0]

function getWeekBounds(offset = 0): { from: string; to: string; label: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff + offset * 7)
  mon.setHours(0, 0, 0, 0)
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  const sat = new Date(mon)
  sat.setDate(mon.getDate() + 6)
  return {
    from: mon.toISOString().split('T')[0],
    to: sat.toISOString().split('T')[0],
    label: `${mon.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${fri.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`,
  }
}

// ─── Client Form Modal ────────────────────────────────────────────────────────

function ClientModal({
  client,
  products,
  onSave,
  onClose,
}: {
  client?: CompanyClient
  products: Product[]
  onSave: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(client?.name || '')
  const [contactName, setContactName] = useState(client?.contact_name || '')
  const [phone, setPhone] = useState(client?.phone || '')
  const [email, setEmail] = useState(client?.email || '')
  const [notes, setNotes] = useState(client?.notes || '')
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const p of client?.prices || []) init[p.product_id] = String(p.price)
    return init
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { showToast('error', 'El nombre es obligatorio'); return }
    setSaving(true)
    try {
      let id = client?.id
      if (id) {
        await companyDispatchApi.updateClient(id, { name: name.trim(), contact_name: contactName || null, phone: phone || null, email: email || null, notes: notes || null })
      } else {
        const created = await companyDispatchApi.createClient({ name: name.trim(), contact_name: contactName || undefined, phone: phone || undefined, email: email || undefined, notes: notes || undefined })
        id = created.id
      }
      // Save prices
      const priceEntries = Object.entries(prices)
        .filter(([, v]) => v !== '' && parseFloat(v) > 0)
        .map(([product_id, price]) => ({ product_id, price: parseFloat(price) }))
      await companyDispatchApi.saveClientPrices(id!, priceEntries)
      showToast('success', client ? 'Cliente actualizado' : 'Cliente creado')
      onSave()
      onClose()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const activeProducts = products.filter(p => p.is_active)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{client ? 'Editar empresa' : 'Nueva empresa'}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Datos y precios acordados por producto</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Datos básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nombre empresa *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: AVSA Argentina Valores"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contacto / empleado</label>
              <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nombre del contacto"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+54 11..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="facturacion@empresa.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Acuerdos especiales, días de entrega..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            </div>
          </div>

          {/* Precios por producto */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Precios acordados por producto</p>
            <div className="space-y-2">
              {activeProducts.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="flex-1 text-sm text-gray-700 font-medium truncate">{p.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">Precio normal: {formatPrice(p.price)}</span>
                  <div className="relative shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input
                      type="number" min="0" step="100"
                      value={prices[p.id] || ''}
                      placeholder="—"
                      onChange={e => setPrices(prev => ({ ...prev, [p.id]: e.target.value }))}
                      className="w-28 pl-6 pr-2 py-1.5 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100 shrink-0">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Dispatch Form Modal ──────────────────────────────────────────────────────

function DispatchModal({
  clients,
  products,
  onSave,
  onClose,
}: {
  clients: CompanyClient[]
  products: Product[]
  onSave: () => void
  onClose: () => void
}) {
  const [clientId, setClientId] = useState(clients[0]?.id || '')
  const [date, setDate] = useState(today)
  const [employeeName, setEmployeeName] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<{ product_id: string; product_name: string; quantity: string; unit_price: string }[]>([])
  const [saving, setSaving] = useState(false)

  const selectedClient = clients.find(c => c.id === clientId)

  // When client changes, auto-fill items from their price agreements
  useEffect(() => {
    if (!selectedClient) return
    const priceMap: Record<string, number> = {}
    for (const p of selectedClient.prices || []) priceMap[p.product_id] = p.price

    const activeProducts = products.filter(p => p.is_active)
    // Show products that have an agreed price for this client
    const withPrices = activeProducts.filter(p => priceMap[p.id])
    if (withPrices.length > 0) {
      setItems(withPrices.map(p => ({
        product_id: p.id,
        product_name: p.name,
        quantity: '',
        unit_price: String(priceMap[p.id]),
      })))
    } else {
      setItems(activeProducts.map(p => ({
        product_id: p.id,
        product_name: p.name,
        quantity: '',
        unit_price: String(p.price),
      })))
    }
  }, [clientId, selectedClient, products])

  const updateItem = (i: number, patch: Partial<typeof items[0]>) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))

  const filledItems = items.filter(it => parseInt(it.quantity) > 0)
  const total = filledItems.reduce((s, it) => s + (parseInt(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0)

  const handleSave = async () => {
    if (!clientId) { showToast('error', 'Seleccioná una empresa'); return }
    if (filledItems.length === 0) { showToast('error', 'Ingresá al menos un producto con cantidad'); return }
    setSaving(true)
    try {
      await companyDispatchApi.createDispatch({
        client_id: clientId,
        date,
        employee_name: employeeName || undefined,
        notes: notes || undefined,
        items: filledItems.map(it => ({
          product_id: it.product_id || null,
          product_name: it.product_name,
          quantity: parseInt(it.quantity),
          unit_price: parseFloat(it.unit_price) || 0,
          subtotal: (parseInt(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
        })),
      })
      showToast('success', 'Despacho registrado')
      onSave()
      onClose()
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Registrar despacho</h2>
              <p className="text-xs text-gray-400 mt-0.5">Productos enviados a una empresa</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Empresa *</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white">
                <option value="">Seleccioná una empresa...</option>
                {clients.filter(c => c.is_active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Empleado / receptor</label>
              <input value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="Nombre del empleado"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
          </div>

          {/* Productos */}
          {items.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Productos</p>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="text-center px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider w-20">Cant.</th>
                      <th className="text-right px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider w-28">Precio</th>
                      <th className="text-right px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wider w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const sub = (parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
                      return (
                        <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                          <td className="px-3 py-2 font-medium text-gray-700">{item.product_name}</td>
                          <td className="px-2 py-1.5 text-center">
                            <input type="number" min="0" value={item.quantity} placeholder="0"
                              onChange={e => updateItem(i, { quantity: e.target.value })}
                              className={`w-16 text-center border rounded-lg px-1 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 ${parseInt(item.quantity) > 0 ? 'border-emerald-300 text-emerald-700 bg-emerald-50 focus:ring-emerald-400' : 'border-gray-200 text-gray-400 focus:ring-emerald-300'}`} />
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <div className="relative flex items-center justify-end">
                              <span className="absolute left-2 text-gray-400 text-[10px]">$</span>
                              <input type="number" min="0" value={item.unit_price}
                                onChange={e => updateItem(i, { unit_price: e.target.value })}
                                className="w-24 pl-5 pr-2 py-1.5 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 text-right" />
                            </div>
                          </td>
                          <td className={`px-3 py-2 text-right font-black text-sm ${sub > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                            {sub > 0 ? formatPrice(sub) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-700">Total despacho</span>
            <span className="text-xl font-black text-emerald-700">{formatPrice(total)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notas</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100 shrink-0">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar despacho'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'clientes' | 'despachos' | 'resumen'

export default function CompanyDispatchPage() {
  const [tab, setTab] = useState<Tab>('despachos')
  const [clients, setClients] = useState<CompanyClient[]>([])
  const [dispatches, setDispatches] = useState<CompanyDispatch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<CompanyClient | undefined>()
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [summaryDispatches, setSummaryDispatches] = useState<CompanyDispatch[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)

  const week = getWeekBounds(weekOffset)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, d, p] = await Promise.all([
        companyDispatchApi.listClients(),
        companyDispatchApi.listDispatches(),
        productsApi.list({ limit: 500 }),
      ])
      setClients(c)
      setDispatches(d)
      setProducts(p.data)
    } catch (err) {
      showToast('error', 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const data = await companyDispatchApi.weeklySummary(week.from, week.to)
      setSummaryDispatches(data)
    } catch {
      showToast('error', 'Error al cargar resumen')
    } finally {
      setSummaryLoading(false)
    }
  }, [week.from, week.to])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (tab === 'resumen') loadSummary() }, [tab, loadSummary])

  const handleDeleteClient = async (id: string) => {
    if (!confirm('¿Eliminar esta empresa?')) return
    try {
      await companyDispatchApi.deleteClient(id)
      showToast('success', 'Empresa eliminada')
      load()
    } catch {
      showToast('error', 'Error al eliminar')
    }
  }

  const handleDeleteDispatch = async (id: string) => {
    if (!confirm('¿Eliminar este despacho?')) return
    try {
      await companyDispatchApi.deleteDispatch(id)
      showToast('success', 'Despacho eliminado')
      load()
    } catch {
      showToast('error', 'Error al eliminar')
    }
  }

  const exportSummary = () => {
    // Group by client
    const byClient: Record<string, { clientName: string; rows: { date: string; employee: string; product: string; qty: number; price: number; subtotal: number }[] }> = {}
    for (const d of summaryDispatches) {
      const cname = (d.client as { name: string })?.name || 'Desconocido'
      if (!byClient[d.client_id]) byClient[d.client_id] = { clientName: cname, rows: [] }
      for (const item of d.items || []) {
        byClient[d.client_id].rows.push({
          date: d.date,
          employee: d.employee_name || '',
          product: item.product_name,
          qty: item.quantity,
          price: item.unit_price,
          subtotal: item.subtotal,
        })
      }
    }

    const wb = XLSX.utils.book_new()
    for (const { clientName, rows } of Object.values(byClient)) {
      const sheetRows = [
        ['Fecha', 'Empleado', 'Producto', 'Cantidad', 'Precio unit.', 'Subtotal'],
        ...rows.map(r => [r.date, r.employee, r.product, r.qty, r.price, r.subtotal]),
        [],
        ['TOTAL', '', '', rows.reduce((s, r) => s + r.qty, 0), '', rows.reduce((s, r) => s + r.subtotal, 0)],
      ]
      const ws = XLSX.utils.aoa_to_sheet(sheetRows)
      ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws, clientName.slice(0, 31))
    }
    XLSX.writeFile(wb, `despachos-${week.from}-${week.to}.xlsx`)
  }

  // Summary grouped by client
  const summaryByClient = summaryDispatches.reduce((acc, d) => {
    const cname = (d.client as { name: string })?.name || 'Desconocido'
    if (!acc[d.client_id]) acc[d.client_id] = { name: cname, total: 0, dispatches: [] }
    acc[d.client_id].total += d.total
    acc[d.client_id].dispatches.push(d)
    return acc
  }, {} as Record<string, { name: string; total: number; dispatches: CompanyDispatch[] }>)

  const grandTotal = Object.values(summaryByClient).reduce((s, c) => s + c.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Despachos a Empresas</h1>
            <p className="text-xs text-gray-400">Registrá envíos semanales y generá resúmenes para facturar</p>
          </div>
        </div>
        <div className="flex gap-2">
          {tab === 'clientes' && (
            <Button onClick={() => { setEditingClient(undefined); setShowClientModal(true) }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nueva empresa
            </Button>
          )}
          {tab === 'despachos' && (
            <Button onClick={() => setShowDispatchModal(true)} disabled={clients.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> Registrar despacho
            </Button>
          )}
          {tab === 'resumen' && summaryDispatches.length > 0 && (
            <Button onClick={exportSummary}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
        {([
          { key: 'despachos', label: 'Despachos' },
          { key: 'resumen', label: 'Resumen semanal' },
          { key: 'clientes', label: 'Empresas' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>
      ) : (
        <>
          {/* ── TAB: Despachos ── */}
          {tab === 'despachos' && (
            <div className="space-y-3">
              {dispatches.length === 0 ? (
                <Card className="p-12 text-center">
                  <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-semibold">Sin despachos registrados</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {clients.length === 0 ? 'Primero creá una empresa en el tab "Empresas"' : 'Usá el botón "Registrar despacho" para agregar'}
                  </p>
                </Card>
              ) : (
                dispatches.map(d => {
                  const cname = (d.client as { name: string })?.name || '—'
                  return (
                    <Card key={d.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900 text-sm">{cname}</span>
                            <span className="text-xs text-gray-400">{d.date}</span>
                            {d.employee_name && <span className="text-xs text-gray-400">· {d.employee_name}</span>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(d.items || []).filter(it => it.quantity > 0).map(it => (
                              <span key={it.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                {it.quantity}× {it.product_name} <span className="text-gray-400">({formatPrice(it.unit_price)})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-black text-emerald-600 text-base">{formatPrice(d.total)}</span>
                          <button onClick={() => handleDeleteDispatch(d.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {/* ── TAB: Resumen semanal ── */}
          {tab === 'resumen' && (
            <div className="space-y-4">
              {/* Week navigation */}
              <div className="flex items-center justify-between">
                <button onClick={() => setWeekOffset(wo => wo - 1)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-800">{week.label}</p>
                  <p className="text-xs text-gray-400">Semana de despachos</p>
                </div>
                <button onClick={() => setWeekOffset(wo => wo + 1)} disabled={weekOffset >= 0}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {summaryLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-gray-300 animate-spin" /></div>
              ) : Object.keys(summaryByClient).length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-gray-400 font-semibold">Sin despachos esta semana</p>
                </Card>
              ) : (
                <>
                  {/* Grand total */}
                  <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Total semana</p>
                      <p className="text-2xl font-black text-indigo-700">{formatPrice(grandTotal)}</p>
                    </div>
                    <p className="text-xs text-indigo-400">{Object.keys(summaryByClient).length} empresa{Object.keys(summaryByClient).length !== 1 ? 's' : ''}</p>
                  </div>

                  {/* Per client */}
                  {Object.values(summaryByClient).sort((a, b) => a.name.localeCompare(b.name, 'es')).map(client => {
                    // Aggregate items across all dispatches
                    const itemMap: Record<string, { name: string; qty: number; price: number; subtotal: number }> = {}
                    for (const d of client.dispatches) {
                      for (const it of d.items || []) {
                        const key = it.product_name
                        if (!itemMap[key]) itemMap[key] = { name: it.product_name, qty: 0, price: it.unit_price, subtotal: 0 }
                        itemMap[key].qty += it.quantity
                        itemMap[key].subtotal += it.subtotal
                      }
                    }
                    const rows = Object.values(itemMap).sort((a, b) => a.name.localeCompare(b.name, 'es'))

                    return (
                      <Card key={client.name} className="overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-500" />
                            <span className="font-bold text-gray-900">{client.name}</span>
                          </div>
                          <span className="font-black text-indigo-600 text-lg">{formatPrice(client.total)}</span>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-50">
                              <th className="text-left px-5 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Producto</th>
                              <th className="text-center px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Cant.</th>
                              <th className="text-right px-3 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Precio unit.</th>
                              <th className="text-right px-5 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, i) => (
                              <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                                <td className="px-5 py-2.5 font-medium text-gray-700">{row.name}</td>
                                <td className="px-3 py-2.5 text-center font-black text-emerald-600">{row.qty}</td>
                                <td className="px-3 py-2.5 text-right text-gray-500">{formatPrice(row.price)}</td>
                                <td className="px-5 py-2.5 text-right font-bold text-gray-800">{formatPrice(row.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-indigo-50 border-t border-indigo-100">
                              <td className="px-5 py-2.5 font-black text-indigo-700" colSpan={3}>TOTAL {client.name.toUpperCase()}</td>
                              <td className="px-5 py-2.5 text-right font-black text-indigo-700">{formatPrice(client.total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </Card>
                    )
                  })}
                </>
              )}
            </div>
          )}

          {/* ── TAB: Clientes ── */}
          {tab === 'clientes' && (
            <div className="space-y-3">
              {clients.length === 0 ? (
                <Card className="p-12 text-center">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-semibold">Sin empresas cargadas</p>
                  <p className="text-xs text-gray-300 mt-1">Creá la primera empresa con el botón de arriba</p>
                </Card>
              ) : (
                clients.map(c => (
                  <Card key={c.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{c.name}</span>
                          {!c.is_active && <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-semibold">Inactiva</span>}
                        </div>
                        {c.contact_name && <p className="text-xs text-gray-500">Contacto: {c.contact_name}</p>}
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                        {(c.prices || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(c.prices || []).map(p => {
                              const prod = products.find(pr => pr.id === p.product_id)
                              return prod ? (
                                <span key={p.id} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">
                                  {prod.name}: {formatPrice(p.price)}
                                </span>
                              ) : null
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { setEditingClient(c); setShowClientModal(true) }}
                          className="p-1.5 text-gray-300 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteClient(c.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}

      {showClientModal && (
        <ClientModal
          client={editingClient}
          products={products}
          onSave={load}
          onClose={() => { setShowClientModal(false); setEditingClient(undefined) }}
        />
      )}
      {showDispatchModal && (
        <DispatchModal
          clients={clients}
          products={products}
          onSave={load}
          onClose={() => setShowDispatchModal(false)}
        />
      )}
    </div>
  )
}
