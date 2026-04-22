# Security Audit — VendexChat Admin

**Fecha:** 2026-04-22
**Auditor:** Claude (gsd-code-reviewer + sesión de revisión RLS)
**Estado:** APLICADO ✅

---

## Estado de Fixes

| ID | Severidad | Hallazgo | Estado |
|----|-----------|----------|--------|
| CR-01 | CRÍTICA | `.env` commiteado con credenciales reales | ✅ `.gitignore` reforzado — rotar keys manualmente en Supabase y MercadoPago |
| CR-02 | CRÍTICA | `changePassword` ignoraba contraseña actual | ✅ Re-autentica antes de cambiar (`authApi.ts:208`) |
| CR-03 | CRÍTICA | `inviteStaff` promovía a superadmin sin verificación real | ⚠️ Pendiente: mover a Edge Function con `service_role` |
| AL-01 | ALTA | JWT almacenado en `localStorage` (XSS) | ✅ Eliminado — token solo en estado React |
| AL-02 | ALTA | CORS `*` en proxy de Google Images | ✅ Restringido a dominios propios (`google-image-search.ts`) |
| AL-03 | ALTA | `productsApi.get()` sin filtro de `store_id` (IDOR) | ✅ Filtra por `store_id` del usuario (`productsApi.ts:42`) |
| AL-04 | ALTA | Contraseña con `Math.random()` (no criptográfico) | ✅ Reemplazado por `crypto.getRandomValues` (`superadminApi.ts:138`) |
| ME-01 | MEDIA | `console.log` con datos sensibles en producción | ✅ Eliminados en `AuthContext.tsx` |
| ME-02 | MEDIA | PII de clientes enviada a Groq sin anonimizar | ⚠️ Pendiente |
| ME-03 | MEDIA | `createUser`/`updateUser` aceptan `Record<string, unknown>` | ⚠️ Pendiente |
| BA-01 | BAJA | Impersonation via localStorage sin firma | ⚠️ Documentado — seguridad recae en RLS |
| BA-02 | BAJA | Imágenes externas subidas sin validar MIME type | ✅ Validación agregada (`PexelsImageSuggestions.tsx:128`) |
| BA-03 | BAJA | `VITE_GROQ_API_KEY` expuesta en bundle del browser | ⚠️ Pendiente: mover a Edge Function |

---

## Fixes de RLS en Supabase (aplicados via migration)

| Migration | Qué corrige |
|-----------|-------------|
| `security_audit_rls_fixes` | Elimina políticas públicas de `orders` y `order_items`; trigger `prevent_role_escalation` en profiles |
| `security_audit_rls_fixes_2` | `bot_pending_actions` restringido a `service_role`; INSERT en `profiles` restringido a roles `client`/`empresa` |
| `fix_delete_tenant_cascade_and_rls` | CASCADE en `order_items → orders`; políticas DELETE para superadmin en `orders` y `order_items` |

---

## Bug corregido: Eliminar Tenants

**Síntoma:** El superadmin veía mensaje de éxito pero el tenant seguía en la lista.

**Root cause:** La FK `order_items.order_id → orders.id` no tenía `ON DELETE CASCADE`. Al intentar borrar la store, el CASCADE de Postgres fallaba al llegar a las órdenes bloqueadas por order_items. El error era silenciado por la cadena de deletes manuales sin validación.

**Fix:** Se agregó CASCADE a la FK y se simplificó `deleteTenant` a una sola línea (`superadminApi.ts:95`). La DB maneja toda la cascada automáticamente.

---

## Pendientes (próxima sesión)

1. **CR-03 / BA-03**: Mover `inviteStaff` y llamadas a Groq a Edge Functions de Supabase/Cloudflare
2. **ME-02**: Anonimizar PII antes de enviar snapshot a Groq en `AIAssistantPage.tsx`
3. **ME-03**: Tipado estricto en `superadminApi.createUser` / `updateUser`
4. **Performance**: Agregar índices faltantes en `profiles` (`store_id`, `email`) y limpiar índices duplicados en 6 tablas

---

## Checklist RLS Supabase (verificado 2026-04-22)

- [x] `products`: INSERT/UPDATE/DELETE requiere `store_id = my_store_id()` o superadmin
- [x] `orders`: SELECT filtrado por store; DELETE solo superadmin
- [x] `order_items`: SELECT filtrado por store; DELETE solo superadmin
- [x] `profiles`: UPDATE solo propio registro + trigger bloquea escalada de rol
- [x] `profiles`: INSERT restringido a roles `client`/`empresa`
- [x] `gateways`: Solo accesible para el store correspondiente
- [x] `stores`: UPDATE solo owner; DELETE solo superadmin
- [x] `subscriptions`: Lectura solo merchant propio; escritura solo superadmin
- [x] `global_settings`: Solo superadmin
- [x] `bot_pending_actions`: Solo `service_role`

---

_Actualizado: 2026-04-22 | Reviewer: Claude Sonnet 4.6_
