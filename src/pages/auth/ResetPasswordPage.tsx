import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Store } from 'lucide-react'
import { Button, Input } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { authApi } from '../../services/api'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!password) newErrors.password = 'La contraseña es obligatoria'
    else if (password.length < 8) newErrors.password = 'Mínimo 8 caracteres'
    if (password !== confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await authApi.resetPassword('', password)
      showToast('success', 'Contraseña restablecida correctamente')
      navigate('/login')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al restablecer la contraseña'
      showToast('error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva contraseña</h1>
          <p className="text-gray-500 mt-1">Ingresa tu nueva contraseña</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nueva contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="new-password"
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="Repetir contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            <Button type="submit" loading={loading} className="w-full">
              Restablecer contraseña
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
