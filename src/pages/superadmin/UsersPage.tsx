import { useState, useEffect, FormEvent } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { Card, Button, Input, Select, Modal, Badge, LoadingSpinner, EmptyState, ConfirmDialog } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { superadminApi } from '../../services/api'
import { SuperadminUser, Tenant } from '../../types'
import { formatShortDate } from '../../utils/helpers'

export default function UsersPage() {
  const [users, setUsers] = useState<SuperadminUser[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SuperadminUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SuperadminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form fields
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('client')
  const [formStoreId, setFormStoreId] = useState('')

  const loadData = async () => {
    try {
      const [usersData, tenantsData] = await Promise.all([
        superadminApi.listUsers(),
        superadminApi.listTenants(),
      ])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setTenants(Array.isArray(tenantsData) ? tenantsData : [])
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setFormEmail('')
    setFormName('')
    setFormPassword('')
    setFormRole('client')
    setFormStoreId('')
    setModalOpen(true)
  }

  const openEdit = (user: SuperadminUser) => {
    setEditing(user)
    setFormEmail(user.email)
    setFormName(user.name)
    setFormPassword('')
    setFormRole(user.role)
    setFormStoreId(user.store_id ? String(user.store_id) : '')
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formEmail || !formName) {
      showToast('error', 'Email y nombre son obligatorios')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const updateData: Record<string, unknown> = {
          email: formEmail,
          name: formName,
          role: formRole,
          store_id: formStoreId ? Number(formStoreId) : null,
        }
        if (formPassword) updateData.password = formPassword
        await superadminApi.updateUser(editing.id, updateData as Parameters<typeof superadminApi.updateUser>[1])
        showToast('success', 'Usuario actualizado')
      } else {
        if (!formPassword) {
          showToast('error', 'La contraseña es obligatoria')
          setSaving(false)
          return
        }
        await superadminApi.createUser({
          email: formEmail,
          name: formName,
          password: formPassword,
          role: formRole,
          store_id: formStoreId ? Number(formStoreId) : undefined,
        })
        showToast('success', 'Usuario creado')
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await superadminApi.deleteUser(deleteTarget.id)
      showToast('success', 'Usuario eliminado')
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar'
      showToast('error', msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Cargando usuarios..." />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="w-16 h-16" />}
          title="No hay usuarios"
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Crear usuario</Button>}
        />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Tienda</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Creado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{user.email}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{user.store_name || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge
                        color={user.role === 'superadmin' ? 'text-purple-800' : 'text-blue-800'}
                        bg={user.role === 'superadmin' ? 'bg-purple-100' : 'bg-blue-100'}
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{formatShortDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(user)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
          <Input label="Nombre" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <Input
            label={editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            type="password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
          />
          <Select
            label="Rol"
            value={formRole}
            onChange={(e) => setFormRole(e.target.value)}
            options={[
              { value: 'client', label: 'Cliente' },
              { value: 'superadmin', label: 'Superadmin' },
            ]}
          />
          {formRole === 'client' && (
            <Select
              label="Tienda asociada"
              value={formStoreId}
              onChange={(e) => setFormStoreId(e.target.value)}
              placeholder="Seleccionar tienda"
              options={tenants.map((t) => ({ value: t.id, label: t.name }))}
            />
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        message={`¿Seguro que querés eliminar a ${deleteTarget?.email}? Esta acción eliminará el perfil y la cuenta de acceso. No se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  )
}
