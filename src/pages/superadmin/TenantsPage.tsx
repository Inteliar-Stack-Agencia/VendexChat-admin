import { useState, useEffect, FormEvent } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, Store, CreditCard } from 'lucide-react'
import { Card, Button, Input, Modal, Badge, LoadingSpinner, EmptyState, ConfirmDialog } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { superadminApi } from '../../services/api'
import { Tenant } from '../../types'
import { formatShortDate, generateSlug } from '../../utils/helpers'

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || 'https://vendexchat.app'

export default function TenantsPage() {
  const [stores, setStores] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formWhatsapp, setFormWhatsapp] = useState('')
  const [formActive, setFormActive] = useState(true)

  // Subscription management
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [selectedStoreForSub, setSelectedStoreForSub] = useState<Tenant | null>(null)
  const [subFormPlan, setSubFormPlan] = useState('free')
  const [subFormStatus, setSubFormStatus] = useState('active')
  const [subFormCycle, setSubFormCycle] = useState('monthly')
  const [subFormEnd, setSubFormEnd] = useState('')
  const [subFormNotes, setSubFormNotes] = useState('')
  const [subSaving, setSubSaving] = useState(false)

  const loadStores = async () => {
    try {
      const data = await superadminApi.listTenants()
      setStores(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error cargando tiendas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStores()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setFormName('')
    setFormSlug('')
    setFormEmail('')
    setFormPassword('')
    setFormWhatsapp('')
    setFormActive(true)
    setModalOpen(true)
  }

  const openEdit = (tenant: Tenant) => {
    setEditing(tenant)
    setFormName(tenant.name)
    setFormSlug(tenant.slug)
    setFormEmail(tenant.email || '')
    setFormPassword('')
    setFormWhatsapp(tenant.whatsapp || '')
    setFormActive(tenant.is_active)
    setModalOpen(true)
  }

  const openSubscription = async (tenant: Tenant) => {
    setSelectedStoreForSub(tenant)
    setSubModalOpen(true)
    setSubSaving(true) // Show loading state inside modal while fetching
    try {
      const { data: sub } = await superadminApi.listSubscriptions().then(subs => ({
        data: subs.find((s: any) => s.store_id === tenant.id)
      }))

      if (sub) {
        setSubFormPlan(sub.plan_type)
        setSubFormStatus(sub.status)
        setSubFormCycle(sub.billing_cycle || 'monthly')
        setSubFormEnd(sub.current_period_end ? new Date(sub.current_period_end).toISOString().split('T')[0] : '')
        setSubFormNotes(sub.internal_notes || '')
      } else {
        setSubFormPlan('free')
        setSubFormStatus('active')
        setSubFormCycle('monthly')
        setSubFormEnd('')
        setSubFormNotes('')
      }
    } catch (err) {
      console.error('Error fetching sub:', err)
      showToast('error', 'Error al cargar suscripción')
    } finally {
      setSubSaving(false)
    }
  }

  const handleSubSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedStoreForSub) return
    setSubSaving(true)
    try {
      await superadminApi.updateSubscription(selectedStoreForSub.id, {
        plan_type: subFormPlan,
        status: subFormStatus,
        billing_cycle: subFormCycle,
        current_period_end: subFormEnd || null,
        internal_notes: subFormNotes,
        is_manual: true
      })
      showToast('success', 'Suscripción actualizada')
      setSubModalOpen(false)
    } catch {
      showToast('error', 'Error al actualizar suscripción')
    } finally {
      setSubSaving(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      showToast('error', 'El nombre es obligatorio')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await superadminApi.updateTenant(editing.id, {
          name: formName,
          whatsapp: formWhatsapp,
          is_active: formActive,
        })
        showToast('success', 'Tienda actualizada')
      } else {
        if (!formEmail || !formPassword) {
          showToast('error', 'Email y contraseña son obligatorios para crear')
          setSaving(false)
          return
        }
        await superadminApi.createTenant({
          name: formName,
          slug: formSlug || generateSlug(formName),
          email: formEmail,
          password: formPassword,
          whatsapp: formWhatsapp,
          is_active: formActive,
        })
        showToast('success', 'Tienda creada')
      }
      setModalOpen(false)
      loadStores()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await superadminApi.deleteTenant(deleteId)
      showToast('success', 'Tienda eliminada')
      setDeleteId(null)
      loadStores()
    } catch {
      showToast('error', 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Tiendas</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nueva Tienda
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Cargando tiendas..." />
      ) : stores.length === 0 ? (
        <EmptyState
          icon={<Store className="w-16 h-16" />}
          title="No hay tiendas"
          description="Crea la primera tienda del sistema"
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Crear tienda</Button>}
        />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">WhatsApp</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Creada</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stores.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{tenant.slug}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{tenant.whatsapp || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{formatShortDate(tenant.created_at)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        color={tenant.is_active ? 'text-green-800' : 'text-red-800'}
                        bg={tenant.is_active ? 'bg-green-100' : 'bg-red-100'}
                      >
                        {tenant.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`${STOREFRONT_URL}/${tenant.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button onClick={() => openEdit(tenant)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => openSubscription(tenant)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600" title="Gestionar Suscripción">
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(tenant.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal crear/editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar tienda' : 'Nueva tienda'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={formName} onChange={(e) => { setFormName(e.target.value); if (!editing) setFormSlug(generateSlug(e.target.value)) }} />
          {!editing && (
            <>
              <Input label="Slug" value={formSlug} onChange={(e) => setFormSlug(generateSlug(e.target.value))} helperText={formSlug ? `URL: vendexchat.app/${formSlug}` : undefined} />
              <Input label="Email del dueño" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              <Input label="Contraseña" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
            </>
          )}
          <Input label="WhatsApp" value={formWhatsapp} onChange={(e) => setFormWhatsapp(e.target.value)} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
            <span className="text-sm text-gray-700">Tienda activa</span>
          </label>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar tienda"
        message="¿Estás seguro? Se eliminarán todos los datos de esta tienda."
        confirmText="Eliminar"
        loading={deleting}
      />

      {/* Modal Suscripción */}
      <Modal isOpen={subModalOpen} onClose={() => setSubModalOpen(false)} title={`Suscripción: ${selectedStoreForSub?.name}`}>
        <form onSubmit={handleSubSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={subFormPlan}
                onChange={(e) => setSubFormPlan(e.target.value)}
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={subFormStatus}
                onChange={(e) => setSubFormStatus(e.target.value)}
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="active">Activo</option>
                <option value="trial">Prueba</option>
                <option value="past_due">Vencido</option>
                <option value="canceled">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo</label>
              <select
                value={subFormCycle}
                onChange={(e) => setSubFormCycle(e.target.value)}
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <Input
              label="Vence el"
              type="date"
              value={subFormEnd}
              onChange={(e) => setSubFormEnd(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas (Admin)</label>
            <textarea
              value={subFormNotes}
              onChange={(e) => setSubFormNotes(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:ring-emerald-500 focus:border-emerald-500"
              rows={3}
              placeholder="Ej: Pago recibido por transferencia bancaria..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setSubModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={subSaving}>Guardar Suscripción</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
