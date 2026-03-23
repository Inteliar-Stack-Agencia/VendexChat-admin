import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button, Input, Select } from '../../components/common'
import { showToast } from '../../components/common/Toast'
import { generateSlug } from '../../utils/helpers'

const COUNTRIES = [
  { value: 'Argentina', label: 'Argentina' },
  { value: 'Uruguay', label: 'Uruguay' },
  { value: 'Chile', label: 'Chile' },
  { value: 'México', label: 'México' },
  { value: 'España', label: 'España' },
  { value: 'Colombia', label: 'Colombia' },
  { value: 'Perú', label: 'Perú' },
  { value: 'Ecuador', label: 'Ecuador' },
  { value: 'Paraguay', label: 'Paraguay' },
  { value: 'Bolivia', label: 'Bolivia' },
  { value: 'Puerto Rico', label: 'Puerto Rico' },
  { value: 'Estados Unidos', label: 'Estados Unidos' },
  { value: 'Otro', label: 'Otro (Especificar)' },
]

export default function RegisterPage() {
  const [storeName, setStoreName] = useState('')
  const [email, setEmail] = useState('')
  const [slug, setSlug] = useState('')
  const [country, setCountry] = useState('Argentina')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { register, user } = useAuth()
  const navigate = useNavigate()

  // Auto-generar slug cuando cambia el nombre de la tienda
  useEffect(() => {
    if (!slugEdited && storeName) {
      setSlug(generateSlug(storeName))
    }
  }, [storeName, slugEdited])

  // Redirigir si ya está autenticado (pero NO si acabamos de registrar)
  if (user && !registered) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!storeName.trim()) newErrors.storeName = 'El nombre de la tienda es obligatorio'
    if (!email) newErrors.email = 'El email es obligatorio'
    if (!slug.trim()) newErrors.slug = 'El slug es obligatorio'
    if (!country) newErrors.country = 'Debes seleccionar un país'
    if (!city.trim()) newErrors.city = 'La ciudad es obligatoria'
    if (!phone.trim()) newErrors.phone = 'El teléfono es obligatorio'
    if (!acceptTerms) newErrors.terms = 'Debes aceptar los términos y condiciones'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      await register({ store_name: storeName, email, slug, country, city, phone })
      setRegistered(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la cuenta'
      showToast('error', message)
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">¡Tienda creada!</h1>
            <p className="text-gray-500 mt-1">Solo falta un paso más</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-gray-700 mb-2">
              Te enviamos un email a <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Hacé click en el enlace del email para establecer tu contraseña y acceder a tu tienda.
            </p>
            <Link to="/login" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md py-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="VENDExChat" className="inline-block w-16 h-16 rounded-2xl object-contain mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Crear mi tienda</h1>
          <p className="text-gray-500 mt-1">Registra tu tienda en VENDExChat</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre de la tienda"
              placeholder="Ej: Morfi Almuerzos"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              error={errors.storeName}
            />

            <div>
              <Input
                label="Slug de la tienda (URL)"
                placeholder="morfi-almuerzos"
                value={slug}
                onChange={(e) => {
                  setSlug(generateSlug(e.target.value))
                  setSlugEdited(true)
                }}
                error={errors.slug}
                helperText={slug ? `Tu tienda estará en: vendexchat.app/${slug}` : undefined}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="País"
                options={COUNTRIES}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                error={errors.country}
              />
              <Input
                label="Ciudad"
                placeholder="Ej: Buenos Aires"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                error={errors.city}
              />
            </div>

            <Input
              label="Teléfono (WhatsApp)"
              type="tel"
              placeholder="Ej: +54 11 1234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
              autoComplete="tel"
            />

            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <label className="flex items-start gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-600">
                Acepto los{' '}
                <Link to="/terms" target="_blank" className="text-emerald-600 hover:underline">
                  Términos y Condiciones
                </Link>
                {' '}y la{' '}
                <Link to="/privacy" target="_blank" className="text-emerald-600 hover:underline">
                  Política de Privacidad
                </Link>
              </span>
            </label>
            {errors.terms && <p className="text-xs text-red-600">{errors.terms}</p>}

            <Button type="submit" loading={loading} className="w-full h-12 text-base">
              Crear mi tienda
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
