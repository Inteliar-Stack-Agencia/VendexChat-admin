# Security Audit — VendexChat Admin

**Fecha:** 2026-04-22
**Auditor:** Claude (gsd-code-reviewer)
**Profundidad:** Standard + Deep (cross-file)
**Archivos revisados:** src/supabaseClient.ts, src/main.tsx, src/App.tsx, src/contexts/AuthContext.tsx, src/components/layout/ProtectedRoute.tsx, src/components/FeatureGuard.tsx, src/components/billing/MPPaymentBrick.tsx, src/components/products/PexelsImageSuggestions.tsx, src/services/\*, src/pages/client/AIImporterPage.tsx, src/pages/client/AIAssistantPage.tsx, functions/api/google-image-search.ts, .env, package.json

---

## Resumen Ejecutivo

La app tiene buenas bases: usa Supabase correctamente para auth, no tiene `eval()` ni `innerHTML` sin sanitizar, y las variables de entorno siguen el patrón correcto (`VITE_` prefix). Sin embargo, se encontraron **3 issues críticos** y **6 warnings** que deben ser corregidos antes de ir a producción con usuarios reales o datos sensibles.

| Severidad | Cantidad |
|-----------|----------|
| CRÍTICA   | 3        |
| ALTA      | 4        |
| MEDIA     | 3        |
| BAJA      | 3        |

---

## CRÍTICOS

### CR-01: Credenciales reales en `.env` commiteado al repo

**Archivo:** `.env` — líneas 1-4
**Severidad:** CRÍTICA

El archivo `.env` contiene valores reales de producción:
- URL de Supabase con ID de proyecto: `pjrhfbhqdbyoljactdkj`
- `VITE_SUPABASE_ANON_KEY` completo (JWT firmado)
- `VITE_MP_PUBLIC_KEY` de MercadoPago

Aunque la `anon key` de Supabase es técnicamente "pública" (está diseñada para exponerse en el browser), tener el `.env` real en el repo significa que si el repositorio es público o es comprometido, un atacante tiene el ID de tu proyecto y puede intentar explotar cualquier RLS mal configurada o hacer peticiones masivas. La MercadoPago Public Key también queda expuesta.

**Fix:**
```bash
# 1. Agregar .env al .gitignore si no está
echo ".env" >> .gitignore

# 2. Revocar y rotar las keys expuestas en:
#    - Supabase Dashboard > Settings > API
#    - MercadoPago Dashboard

# 3. Usar solo .env.example con valores placeholder (como ya existe)
```

---

### CR-02: `changePassword` no verifica la contraseña actual

**Archivo:** `src/services/authApi.ts` — líneas 197-200
**Severidad:** CRÍTICA

```typescript
changePassword: async (_currentPassword: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    // ^^^^^^ _currentPassword es ignorado completamente
```

El parámetro `_currentPassword` tiene el prefijo `_` indicando que está deliberadamente ignorado. Esto significa que cualquier usuario autenticado puede cambiar su contraseña sin conocer la contraseña actual. Si un atacante obtiene una sesión activa (ej: XSS, sesión robada, acceso físico), puede cambiar la contraseña y tomar control permanente de la cuenta sin necesidad de conocer la contraseña original.

**Fix:**
```typescript
changePassword: async (currentPassword: string, newPassword: string) => {
    // Primero re-autenticar con la contraseña actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('No hay sesión activa')

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
    })
    if (signInError) throw new Error('Contraseña actual incorrecta')

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    return { message: 'Contraseña cambiada correctamente' }
}
```

---

### CR-03: `inviteStaff` promueve a superadmin por email sin verificación

**Archivo:** `src/services/superadminApi.ts` — líneas 349-358
**Severidad:** CRÍTICA

```typescript
inviteStaff: async (email: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'superadmin' })
        .eq('email', email)   // Busca por email en profiles
        .select()
        .single()
```

El campo `email` en la tabla `profiles` puede no estar sincronizado con el email de auth de Supabase. Si la RLS de `profiles` no es estricta, un usuario podría manipular su propio campo `email` en `profiles` para hacer que otro superadmin lo promueva accidentalmente. Además, no hay confirmación de ownership ni verificación de identidad antes de dar el rol más privilegiado del sistema.

**Fix:**
```typescript
inviteStaff: async (email: string) => {
    // Buscar por auth.users via admin API (server-side) o al menos
    // cruzar con auth_user_id para garantizar que el email coincide
    // con el email verificado de Supabase Auth
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'superadmin' })
        .eq('email', email)
        .eq('email_confirmed', true)  // si tienes este campo
        .select()
        .single()

    // Mejor práctica: mover esta operación a una Edge Function
    // que use el service_role key para acceder a auth.admin.listUsers()
    // y verificar por auth email, no por el campo profiles.email
```

---

## ALTOS

### AL-01: Token JWT almacenado en localStorage

**Archivo:** `src/contexts/AuthContext.tsx` — líneas 35, 51, 84, 119
**Severidad:** ALTA

```typescript
const [token, setToken] = useState<string | null>(localStorage.getItem('vendexchat_token'))
// ...
localStorage.setItem('vendexchat_token', authToken)
```

Los tokens JWT en `localStorage` son vulnerables a ataques XSS: cualquier script inyectado en la página puede leer `localStorage` y robar la sesión. El SDK de Supabase ya maneja la persistencia de sesión internamente de forma segura (usando cookies httpOnly cuando es posible o su propio mecanismo). Guardar el token manualmente en `localStorage` es redundante y añade riesgo.

**Fix:**
```typescript
// Eliminar todo el manejo manual de vendexchat_token en localStorage.
// El SDK de Supabase ya persiste la sesión. Para obtener el token cuando
// sea necesario, usar:
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

---

### AL-02: CORS wildcard (`*`) en el proxy de Google Images

**Archivo:** `functions/api/google-image-search.ts` — líneas 8-12
**Severidad:** ALTA

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',   // Acepta requests de cualquier origen
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}
```

Este endpoint de Cloudflare Pages usa tu `GOOGLE_API_KEY` y `GOOGLE_CX` del servidor. Con CORS `*`, cualquier sitio externo puede hacer POST a este endpoint y consumir tu cuota de API de Google (10,000 requests/día gratis). Podría resultar en costos inesperados o agotamiento de cuota.

**Fix:**
```typescript
const ALLOWED_ORIGINS = [
  'https://admin.vendexchat.app',
  'https://vendexchat.app',
  // para dev local:
  'http://localhost:5173'
]

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
})
```

---

### AL-03: `productsApi.get()` no verifica que el producto pertenece a la tienda del usuario

**Archivo:** `src/services/productsApi.ts` — líneas 39-43
**Severidad:** ALTA

```typescript
get: async (id: string | number) => {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
    // No filtra por store_id
```

A diferencia de `productsApi.list()` que filtra por `store_id`, el método `get` obtiene cualquier producto por ID sin verificar que pertenezca a la tienda del usuario autenticado. Si RLS no está configurada correctamente en Supabase para la tabla `products`, un merchant podría acceder a productos de otro merchant conociendo su UUID.

**Fix:**
```typescript
get: async (id: string | number) => {
    const storeId = await getStoreId()
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('store_id', storeId)  // Verificar ownership
        .single()
    if (error) throw error
    return data as Product
},
```

---

### AL-04: Contraseña auto-generada con entropía insuficiente para tenants

**Archivo:** `src/services/superadminApi.ts` — línea 138
**Severidad:** ALTA

```typescript
password: data.password || Math.random().toString(36).slice(-12),
```

`Math.random()` no es criptográficamente seguro. Genera contraseñas predecibles si el atacante conoce el estado del PRNG del motor V8. Para cuentas de usuarios reales, esto representa un riesgo.

**Fix:**
```typescript
password: data.password || Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    b => b.toString(16).padStart(2, '0')
).join('').slice(0, 16),
```

---

## MEDIOS

### ME-01: `console.log` con datos sensibles en producción

**Archivos:**
- `src/main.tsx:1` — `console.log('--- VENDEX_ADMIN_MAIN_V4 ---')`
- `src/contexts/AuthContext.tsx:77` — `console.log('[AuthContext] Auth Event:', event, !!session)`
- `src/contexts/AuthContext.tsx:104` — `console.log('[AuthContext] Selecting store:', storeId)`
- `src/services/billingApi.ts:41` — `console.log(\`Iniciando checkout para el plan ${planId} en la tienda ${storeId}\`)`
- `src/pages/client/SubscriptionPage.tsx:89` — `console.log('Payment Success ID:', paymentId)`

**Severidad:** MEDIA

Los `console.log` en producción exponen en las DevTools del browser:
- Store IDs (UUIDs de las tiendas de clientes)
- Eventos de auth y estado de sesión
- IDs de pagos

Un usuario del admin en un dispositivo compartido o con extensiones de browser maliciosas podría capturar esta información.

**Fix:**
```typescript
// Crear un logger condicional
const isDev = import.meta.env.DEV
export const devLog = (...args: unknown[]) => {
    if (isDev) console.log(...args)
}
// Reemplazar todos los console.log con devLog()
// Los console.error pueden mantenerse (errores reales deben loguearse)
```

---

### ME-02: Contenido del AI Assistant se renderiza como texto plano, pero el snapshot incluye datos de clientes

**Archivo:** `src/pages/client/AIAssistantPage.tsx` — líneas 121-128
**Severidad:** MEDIA

El snapshot enviado a la IA externa (Groq/Llama) incluye:
- Nombres y números de WhatsApp de clientes reales (`customer_name`, `customer_whatsapp`)
- Datos de pedidos con totales y estados

Esto implica que datos PII (Información Personal Identificable) de los clientes del merchant están siendo enviados a una API de terceros (Groq). Dependiendo de la jurisdicción (GDPR en EU, Ley 25.326 en Argentina), esto puede requerir consentimiento explícito o estar directamente prohibido sin un DPA (Data Processing Agreement) con Groq.

**Fix:**
```typescript
// Anonimizar datos antes de enviar al snapshot
recentOrders: recentOrdersRes.data.slice(0, 50).map(o => ({
    id: o.id.slice(0, 8),
    num: o.order_number,
    cliente: o.customer_name ? o.customer_name.split(' ')[0] + ' ***' : 'Cliente',
    // NO incluir customer_whatsapp ni datos de contacto completos
    total: o.total,
    estado: o.status,
    fecha: o.created_at?.slice(0, 10),
})),
```

---

### ME-03: `updateUser` y `createUser` en superadminApi aceptan `Record<string, unknown>`

**Archivo:** `src/services/superadminApi.ts` — líneas 215-225
**Severidad:** MEDIA

```typescript
createUser: async (data: Record<string, unknown>) => {
    const { data: newUser, error } = await supabase.from('profiles').insert(data)...

updateUser: async (id: string | number, data: Record<string, unknown>) => {
    const { data: updated, error } = await supabase.from('profiles').update(data)...
```

Acepta cualquier campo sin validación. Un superadmin podría (accidentalmente o no) escribir campos arbitrarios en `profiles`, incluyendo `role: 'superadmin'` en cualquier perfil, o campos que Supabase no espera.

**Fix:**
```typescript
interface UserUpdateData {
    name?: string
    email?: string
    role?: 'client' | 'empresa'  // No permitir promover a superadmin aquí
    store_id?: string
}
updateUser: async (id: string | number, data: UserUpdateData) => { ... }
```

---

## BAJOS

### BA-01: Impersonation via localStorage sin firma/verificación

**Archivo:** `src/services/superadminApi.ts` — líneas 440-448
**Archivo:** `src/services/coreApi.ts` — línea 10-12
**Severidad:** BAJA

```typescript
impersonate: async (storeId: string) => {
    localStorage.setItem('vendexchat_impersonated_store', storeId)
```

Cualquier script que acceda a `localStorage` puede inyectar un `vendexchat_impersonated_store` arbitrario. El sistema de impersonation no verifica que el valor en localStorage haya sido puesto por un superadmin autenticado. La seguridad real recae enteramente en RLS de Supabase (que es el lugar correcto), pero si RLS tiene huecos, este mecanismo no añade protección.

**Fix:** Documentar explícitamente que la seguridad de impersonation depende de RLS en Supabase, no de la clave de localStorage. Idealmente, agregar una nota en el código y verificar RLS policies para `stores`, `products`, `orders` etc.

---

### BA-02: Imágenes externas descargadas y subidas a Supabase sin validación de tipo MIME

**Archivo:** `src/components/products/PexelsImageSuggestions.tsx` — líneas 108-127
**Severidad:** BAJA

```typescript
async function uploadImageToSupabase(imageUrl: string): Promise<string> {
    const res = await fetch(imageUrl)  // Descarga URL arbitraria de Google Images
    const blob = await res.blob()
    const ext = blob.type.split('/')[1]?.split(';')[0] || 'jpg'
    // No valida que sea realmente una imagen
    const { error } = await supabase.storage.from('product-images').upload(...)
```

Se descarga contenido de URLs arbitrarias de Google Images y se sube a Supabase Storage sin verificar que el MIME type sea una imagen válida. Podría subirse un SVG con JavaScript embebido u otro archivo no-imagen.

**Fix:**
```typescript
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
if (!ALLOWED_MIME_TYPES.includes(blob.type)) {
    throw new Error(`Tipo de archivo no permitido: ${blob.type}`)
}
```

---

### BA-03: `VITE_GROQ_API_KEY` expuesta al bundle del browser

**Archivo:** `src/services/aiService.ts` — línea 1
**Severidad:** BAJA

```typescript
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
// ...
Authorization: `Bearer ${GROQ_API_KEY}`,
```

Cualquier variable con prefijo `VITE_` en Vite es embebida en el bundle JavaScript que recibe el browser. La `VITE_GROQ_API_KEY` queda visible en el source del sitio (aunque minificado) para cualquier usuario que abra las DevTools. Esto permite que usuarios del admin (o cualquier visitante) usen tu cuota de Groq directamente.

**Fix:** Mover las llamadas a Groq a una Edge Function de Supabase o Cloudflare Worker (server-side). El cliente del browser llama a tu función, que llama a Groq con la key del servidor (no expuesta).

```
Browser → POST /functions/v1/ai-chat → Supabase Edge Function → Groq API
```

La Edge Function usa `Deno.env.get('GROQ_API_KEY')` (no expuesto al cliente).

---

## Dependencias con Riesgos Conocidos

| Paquete | Versión | Riesgo |
|---------|---------|--------|
| `xlsx` | `^0.18.5` | **Conocido por múltiples CVEs de prototipo pollution y ReDoS** (CVE-2023-30533). Versión 0.18.x no recibe parches. Considera migrar a `exceljs` o `@xlsx-reader/xlsx`. |
| `tesseract.js` | `^7.0.0` | Sin CVEs activos conocidos, pero carga ~12MB de WASM en el cliente. Considera moverlo a server-side. |

---

## Checklist de RLS en Supabase (Verificar Manualmente)

Los siguientes patrones en el código dependen de que RLS esté correctamente configurada. Verificar en Supabase Dashboard > Authentication > Policies:

- [ ] `products`: SELECT/INSERT/UPDATE/DELETE requiere que `store_id = auth.uid()` (vía profiles)
- [ ] `orders`: Solo accesible para el merchant de esa tienda
- [ ] `profiles`: UPDATE solo puede modificar el propio registro (`id = auth.uid()`)
- [ ] `gateways`: Solo accesible para el store_id correspondiente
- [ ] `stores`: UPDATE solo para el owner (`owner_id = auth.uid()`)
- [ ] `subscriptions`: Solo lectura para el merchant, escritura solo para superadmin
- [ ] `global_settings`: Solo superadmin puede leer/escribir

---

_Generado: 2026-04-22 | Reviewer: Claude Sonnet 4.6_
