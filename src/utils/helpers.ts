// ========================================
// VENDExChat Admin - Funciones auxiliares
// ========================================

// Mapa de moneda → locale para formateo
const CURRENCY_LOCALE_MAP: Record<string, string> = {
  ARS: 'es-AR',
  UYU: 'es-UY',
  CLP: 'es-CL',
  MXN: 'es-MX',
  EUR: 'es-ES',
  COP: 'es-CO',
  PEN: 'es-PE',
  PYG: 'es-PY',
  BOB: 'es-BO',
  USD: 'en-US',
}

// Formatear precio en formato moneda
export function formatPrice(price: number, currency = 'ARS'): string {
  const locale = CURRENCY_LOCALE_MAP[currency] ?? 'es-AR'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

// Formatear fecha legible
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Formatear fecha corta (solo día)
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

// Generar slug desde texto
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9]+/g, '-')     // Reemplazar caracteres especiales con guiones
    .replace(/^-+|-+$/g, '')          // Quitar guiones al inicio y final
}

// Generar link de WhatsApp (con soporte para números argentinos sin código de país)
export function whatsappLink(phone: string, message?: string): string {
  let clean = phone.replace(/\D/g, '')
  // Si el número tiene 10 dígitos (formato local argentino sin código de país),
  // agregar +54 9 (prefijo para móviles en Argentina via WhatsApp)
  if (clean.length === 10) {
    clean = `549${clean}`
  } else if (clean.length === 11 && clean.startsWith('9')) {
    // Tiene el 9 de móvil pero le falta el 54
    clean = `54${clean}`
  }
  const url = `https://wa.me/${clean}`
  return message ? `${url}?text=${encodeURIComponent(message)}` : url
}

// Colores para los estados de pedidos
export const orderStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-800', bg: 'bg-yellow-100' },
  confirmed: { label: 'Confirmado', color: 'text-blue-800', bg: 'bg-blue-100' },
  completed: { label: 'Completado', color: 'text-green-800', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelado', color: 'text-red-800', bg: 'bg-red-100' },
}

// Truncar texto
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Validar email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Normaliza los datos de un producto siguiendo la regla:
 * - Nombre: SIEMPRE EN MAYÚSCULAS
 * - Descripción: siempre en minúsculas
 */
export function normalizeProductData(name: string, description: string = '') {
  return {
    name: name.toUpperCase().trim(),
    description: (description || '').toLowerCase().trim()
  }
}
