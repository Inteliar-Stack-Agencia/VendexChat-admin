# Guía de Optimización de Supabase — Para Futuros Proyectos

## Límites del Plan Gratuito (Free)

| Recurso | Límite | Qué lo consume |
|---------|--------|----------------|
| **Egress** | 5 GB/mes | Cada query, cada imagen servida, cada respuesta de API |
| **Storage** | 1 GB | Imágenes de productos, logos, banners |
| **Database** | 500 MB | Tablas, índices, datos |
| **MAU (Auth)** | 50,000 | Usuarios únicos que se loguean |
| **Edge Functions** | 500,000 | Invocaciones de funciones serverless |
| **Realtime** | 2M mensajes | Suscripciones en tiempo real |
| **RAM** | 0.5 GB (Nano) | Conexiones activas, queries en memoria |

> [!WARNING]
> Cuando se agotan los recursos, Supabase devuelve errores **sin headers CORS**, lo que hace que el error parezca un problema de CORS en el navegador cuando en realidad es un problema de límites.

---

## Estrategias de Caching

### 1. Cache del Catálogo Público (`sessionStorage`)
```typescript
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCached(key: string) {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  const { data, timestamp } = JSON.parse(raw);
  if (Date.now() - timestamp > CACHE_TTL) return null;
  return data;
}
```
**Impacto:** ~70% menos queries para visitantes que navegan la tienda.

### 2. Cache de Datos de Dashboard (`localStorage`)
```typescript
const DASHBOARD_TTL = 10 * 60 * 1000; // 10 minutos
// Guardar métricas del dashboard con timestamp
// Servir desde cache si el TTL no expiró
```
**Impacto:** ~50% menos queries para admins que recargan seguido.

### 3. Servir Imágenes desde CDN
- **No sirvas imágenes directamente desde Supabase Storage** en producción
- Usá Cloudflare como proxy/CDN delante de Supabase
- Configurá `Cache-Control: public, max-age=86400` para imágenes

---

## Patrones de Queries Eficientes

### ❌ Malo: Muchas queries separadas
```typescript
const store = await supabase.from('stores').select('*').single();
const categories = await supabase.from('categories').select('*');
const products = await supabase.from('products').select('*');
// 3 queries = 3x egress
```

### ✅ Bueno: Una sola query con JOIN
```typescript
const store = await supabase
  .from('stores')
  .select('*, categories(*, products(*))')
  .eq('slug', slug)
  .single();
// 1 query = 1x egress
```

### Seleccionar solo columnas necesarias
```typescript
// ❌ Malo
.select('*')

// ✅ Bueno
.select('id, name, price, image_url')
```

---

## Gestión de Sesiones

### Limpiar sesiones expiradas de Supabase
```typescript
// Cuando la restauración de sesión falla:
await supabase.auth.signOut().catch(() => {});
localStorage.removeItem('my_app_token');
```

> [!IMPORTANT]
> Si NO limpiás la sesión interna de Supabase al detectar un token expirado, el cliente intentará renovar el refresh token en cada petición, generando errores CORS fantasma.

### No duplicar estados de carga
```typescript
// ❌ Malo: loading global + loading local
setGlobalLoading(true);  // En AuthContext
setLocalLoading(true);   // En LoginPage

// ✅ Bueno: Solo loading local para UI
setLocalLoading(true);   // Solo en LoginPage (para el botón)
// AuthContext solo usa loading para el mount inicial
```

---

## Checklist Pre-Lanzamiento

- [ ] **Imágenes:** ¿Se sirven a través de CDN o directamente desde Supabase?
- [ ] **Catálogo público:** ¿Tiene cache con TTL?
- [ ] **Dashboard admin:** ¿Cachea métricas que no cambian frecuentemente?
- [ ] **Sesiones:** ¿Se limpia la sesión de Supabase al fallar la restauración?
- [ ] **Queries:** ¿Se usan JOINs donde sea posible?
- [ ] **Select:** ¿Se seleccionan solo las columnas necesarias?
- [ ] **RLS:** ¿Las políticas de Row Level Security son eficientes?
- [ ] **Índices:** ¿Las columnas filtradas frecuentemente tienen índices?
- [ ] **Monitor:** ¿Revisás el uso semanal en Supabase Dashboard → Usage?

---

## Cuándo Upgradar al Plan Pro ($25/mes)

Considerá upgradar si:
- Tu app tiene **más de 50 visitantes diarios** en la tienda pública
- Subís **muchas imágenes** de productos (>500 MB)
- Necesitás **uptime garantizado** (el Free puede pausar por inactividad)
- El egress supera **3 GB en la primera mitad** del ciclo

El Pro te da:
- 250 GB de egress (50x más)
- 100 GB de storage
- 8 GB de database
- Mejor compute (más RAM y CPU)
- Sin pausas automáticas
