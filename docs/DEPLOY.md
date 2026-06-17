# Guía de Deploy — VendexChat Admin

## Arquitectura

```
[Cloudflare Pages]          [Supabase]              [Cloudflare Workers]
admin.vendexchat.app  ───►  pjrhfbhqdbyoljactdkj    vendexchat-domain-proxy
  React + Vite app           Postgres + Auth           Proxy de dominios propios
  + Pages Functions          + Storage + Edge Fns
```

---

## 1. Requisitos previos

- Node.js >= 18
- Cuenta en [Cloudflare](https://dash.cloudflare.com) con acceso al proyecto `VendexChat-admin` en Pages
- Supabase CLI: `npm install -g supabase`
- Acceso al proyecto Supabase `pjrhfbhqdbyoljactdkj`

---

## 2. Variables de entorno necesarias

Configurar en **Cloudflare Pages → Settings → Environment Variables**:

### Frontend (prefijo `VITE_`)
| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública de Supabase |
| `VITE_ADMIN_URL` | `https://admin.vendexchat.app` |
| `VITE_STOREFRONT_URL` | `https://vendexchat.app` |
| `VITE_MP_PUBLIC_KEY` | Public key de MercadoPago |
| `VITE_SENTRY_DSN` | DSN de Sentry (opcional, para monitoring) |
| `VITE_APP_VERSION` | Versión del release (ej: `1.2.0`) |
| `VITE_PEXELS_API_KEY` | API key de Pexels (opcional) |

### Server-side (Pages Functions)
| Variable | Descripción |
|----------|-------------|
| `MP_ACCESS_TOKEN` | Access token privado de MercadoPago |
| `SUPABASE_URL` | URL del proyecto Supabase (igual que VITE_) |
| `SUPABASE_SERVICE_KEY` | Service role key de Supabase (⚠️ secreta) |
| `ADMIN_URL` | `https://admin.vendexchat.app` |
| `CF_ZONE_ID` | Zone ID de Cloudflare para dominios propios |
| `CF_API_TOKEN` | API Token de Cloudflare con permisos SSL/Custom Hostnames |
| `GOOGLE_API_KEY` | API key de Google Custom Search (opcional) |
| `GOOGLE_CX` | Custom Search Engine ID (opcional) |

---

## 3. Deploy del Admin (Cloudflare Pages)

### Primera vez

1. **Conectar repositorio** en Cloudflare Dashboard → Pages → Create a project → Connect to Git
2. Seleccionar `Inteliar-Stack-Agencia/VendexChat-admin`
3. Configurar build:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/` (raíz del repo)
4. Agregar todas las variables de entorno (sección anterior)
5. Deploy

### Deploys subsiguientes

Cada push a `main` dispara un deploy automático. Para deploy manual:

```bash
# Desde la raíz del proyecto
npm run build
# Subir con Wrangler (opcional, normalmente lo hace Pages automáticamente)
npx wrangler pages deploy dist --project-name VendexChat-admin
```

### Verificar el deploy

- `https://admin.vendexchat.app` carga la pantalla de login
- `https://admin.vendexchat.app/api/exchange-rate` responde con un JSON (prueba de Pages Functions)

---

## 4. Deploy de Supabase Edge Functions

Las Edge Functions viven en `supabase/functions/`. Deployan independientemente del admin.

```bash
# Login (una sola vez)
supabase login

# Deployar todas las funciones
supabase functions deploy --project-ref pjrhfbhqdbyoljactdkj

# Deployar una sola función
supabase functions deploy invite-staff --project-ref pjrhfbhqdbyoljactdkj
supabase functions deploy groq-proxy --project-ref pjrhfbhqdbyoljactdkj
supabase functions deploy store-ai-chat --project-ref pjrhfbhqdbyoljactdkj
```

### Variables de entorno en Edge Functions

Configurar en Supabase Dashboard → proyecto → Edge Functions → Manage secrets:

| Secret | Descripción |
|--------|-------------|
| `SUPABASE_URL` | Se inyecta automáticamente |
| `SUPABASE_SERVICE_ROLE_KEY` | Se inyecta automáticamente |
| `SUPABASE_ANON_KEY` | Se inyecta automáticamente |
| `GROQ_API_KEY` | API key de Groq para el AI proxy |
| `ADMIN_URL` | `https://admin.vendexchat.app` (para CORS) |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram (si se usa) |
| `TELEGRAM_CHAT_ID` | Chat ID de Telegram (si se usa) |

---

## 5. Deploy del Worker de Dominio Proxy

El worker `vendexchat-domain-proxy` mapea dominios propios de clientes a `vendexchat.app/{slug}`.

```bash
cd workers/domain-proxy

# Deploy
npx wrangler deploy
```

El `wrangler.toml` ya tiene la configuración del worker. Para agregar un dominio de cliente nuevo, ver `docs/ONBOARDING.md`.

---

## 6. Migraciones de base de datos

Las migraciones están en `supabase/migrations/`. Se ejecutan en orden numérico.

```bash
# Ver migraciones pendientes
supabase db diff --project-ref pjrhfbhqdbyoljactdkj

# Aplicar migraciones localmente (requiere Docker)
supabase db push

# Aplicar en producción directamente (⚠️ hacer backup primero)
supabase db push --project-ref pjrhfbhqdbyoljactdkj
```

Para migraciones riesgosas, ver el checklist en `supabase/BACKUP-RESTORE.md`.

---

## 7. Rollback

### Admin (Cloudflare Pages)
Cloudflare Pages guarda todos los deployments. Para revertir:
1. Cloudflare Dashboard → Pages → `VendexChat-admin` → Deployments
2. Buscar el deployment anterior → tres puntos → **Rollback to this deployment**

### Edge Functions (Supabase)
No hay rollback automático. Para revertir, hacer deploy de la versión anterior del archivo:
```bash
git checkout <commit-anterior> -- supabase/functions/nombre-funcion/
supabase functions deploy nombre-funcion --project-ref pjrhfbhqdbyoljactdkj
```

### Worker (Cloudflare Workers)
```bash
# Listar versiones anteriores
npx wrangler versions list

# Activar versión anterior
npx wrangler versions activate <version-id>
```

### Base de datos
Ver `supabase/BACKUP-RESTORE.md` → Caso 1.

---

## 8. Checklist de deploy a producción

- [ ] `npm run build` corre sin errores
- [ ] Variables de entorno actualizadas en Cloudflare Pages (si cambiaron)
- [ ] Secrets actualizados en Supabase Edge Functions (si cambiaron)
- [ ] Migraciones de DB aplicadas (si hay nuevas)
- [ ] Backup manual hecho antes de migraciones (ver BACKUP-RESTORE.md)
- [ ] Deploy verificado en `https://admin.vendexchat.app`
- [ ] Probar login, navegación y operación crítica (crear/editar producto)
- [ ] Revisar Sentry en las primeras horas post-deploy
