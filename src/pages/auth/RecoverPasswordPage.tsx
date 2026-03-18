import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Store, ArrowLeft } from 'lucide-react'
import { Button, Input } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { authApi } from '../../services/api'

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) {
      showToast('error', 'Ingresa tu email')
      return
    }

    setLoading(true)
    try {
      await authApi.requestPasswordReset(email)
      showToast('success', 'Te enviamos un enlace de acceso a tu email.')
      setSent(true)
    } catch {
      // Siempre mostrar éxito por seguridad
      setSent(true)
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
          <h1 className="text-2xl font-bold text-gray-900">Acceder a mi cuenta</h1>
          <p className="text-gray-500 mt-1">Te enviaremos un enlace de acceso por email</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Revisa tu email</h3>
              <p className="text-sm text-gray-600 mb-6">
                Si el email existe en nuestro sistema, recibirás un enlace para acceder a tu cuenta.
              </p>
              <Link to="/login" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                Volver al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              <Button type="submit" loading={loading} className="w-full">
                Enviar enlace de acceso
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
