import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface CurrencyOption {
  country: string
  code: string
  symbol: string
  flag: string
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { country: 'Argentina',      code: 'ARS', symbol: '$',   flag: '🇦🇷' },
  { country: 'Uruguay',        code: 'UYU', symbol: '$U',  flag: '🇺🇾' },
  { country: 'Chile',          code: 'CLP', symbol: '$',   flag: '🇨🇱' },
  { country: 'México',         code: 'MXN', symbol: '$',   flag: '🇲🇽' },
  { country: 'España',         code: 'EUR', symbol: '€',   flag: '🇪🇸' },
  { country: 'Colombia',       code: 'COP', symbol: '$',   flag: '🇨🇴' },
  { country: 'Perú',           code: 'PEN', symbol: 'S/',  flag: '🇵🇪' },
  { country: 'Ecuador',        code: 'USD', symbol: '$',   flag: '🇪🇨' },
  { country: 'Paraguay',       code: 'PYG', symbol: '₲',  flag: '🇵🇾' },
  { country: 'Bolivia',        code: 'BOB', symbol: 'Bs.', flag: '🇧🇴' },
  { country: 'Puerto Rico',    code: 'USD', symbol: '$',   flag: '🇵🇷' },
  { country: 'Estados Unidos', code: 'USD', symbol: '$',   flag: '🇺🇸' },
  { country: 'Otro',           code: 'USD', symbol: '$',   flag: '🌎' },
]

interface CurrencySelectorProps {
  value: string
  onChange: (code: string) => void
  saving?: boolean
}

export default function CurrencySelector({ value, onChange, saving }: CurrencySelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = CURRENCY_OPTIONS.find((c) => c.code === value && c.country !== 'Ecuador' && c.country !== 'Puerto Rico')
    ?? CURRENCY_OPTIONS.find((c) => c.code === value)
    ?? CURRENCY_OPTIONS[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm disabled:opacity-60"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="font-bold text-gray-800">{selected.code}</span>
        <span className="text-gray-400 text-xs">{selected.symbol}</span>
        {saving ? (
          <svg className="animate-spin w-3 h-3 text-emerald-500 ml-0.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="px-3 pt-3 pb-1.5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Moneda de la tienda</p>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {CURRENCY_OPTIONS.map((opt) => {
              const isActive = opt.code === value && opt.country === selected.country
              return (
                <li key={`${opt.country}-${opt.code}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.code)
                      setOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-emerald-50 transition-colors ${isActive ? 'bg-emerald-50/60' : ''}`}
                  >
                    <span className="text-base w-6 text-center">{opt.flag}</span>
                    <span className="flex-1 text-left font-medium text-gray-700">{opt.country}</span>
                    <span className="text-xs text-gray-400 font-mono">{opt.code}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
