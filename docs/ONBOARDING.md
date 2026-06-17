# Onboarding de Nuevos Clientes — VendexChat

Pasos completos para incorporar una tienda nueva a la plataforma.

---

## Paso 1 — Registro de la tienda

El cliente se registra en `https://admin.vendexchat.app/register`. El sistema crea automáticamente:
- Usuario en `auth.users`
- Registro en `stores` (con `is_active = true`)
- Perfil en `profiles` (con `role = 'client'`)

### Si el registro falla o el cliente fue creado manualmente

```sql
-- Crear store
INSERT INTO stores (name, slug, email, owner_id, is_active)
VALUES ('Nombre Tienda', 'el-slug', 'email@tienda.com', 'uuid-del-usuario', true)
RETURNING id;

-- Crear profile
INSERT INTO profiles (id, role, store_id)
VALUES ('uuid-del-usuario', 'client', 'uuid-del-store');
```

---

## Paso 2 — Verificar el acceso

1. El cliente entra a `https://admin.vendexchat.app` con su email y contraseña
2. Debe ver el dashboard de su tienda
3. Si ve "sin permisos" o pantalla en blanco: verificar que `profiles.store_id` no es NULL

```sql
-- Diagnóstico rápido
SELECT u.email, p.role, p.store_id, s.slug, s.is_active
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN stores s ON s.id = p.store_id
WHERE u.email = 'email@cliente.com';
```

---

## Paso 3 — Configuración inicial de la tienda

El cliente debe completar en **Configuración → Mi tienda**:
- Nombre y descripción
- Logo y banner
- Ciudad y país
- Teléfono de contacto (WhatsApp)
- Colores de la tienda

---

## Paso 4 — Agregar productos

El cliente puede:
- Crear categorías y productos manualmente
- Usar el **AI Importer** (planes VIP) para importar desde texto, CSV o foto

---

## Paso 5 — Configurar dominio propio (opcional)

Ver detalle completo en `CLAUDE.md` → sección "Manual: activar dominio propio".

### Resumen rápido

**Opción A — El cliente delega nameservers (recomendado):**
1. Cliente cambia NS en su registrador a los de Cloudflare
2. Cloudflare → Add a domain → plan Free
3. Workers & Pages → `vendexchat-domain-proxy` → Domains & Routes → Add → Custom Domain
4. SSL/TLS → modo **Full**
5. Actualizar Supabase:
```sql
UPDATE stores SET custom_domain = 'tienda.com', custom_path = NULL WHERE slug = 'el-slug';
```

**Opción B — Subdominio (más fácil para el cliente):**
1. Cliente agrega CNAME: `shop CNAME vendexchat-domain-proxy.oscarelias.workers.dev`
2. Cloudflare → `vendexchat-domain-proxy` → Domains & Routes → agregar `shop.tienda.com`
3. Supabase:
```sql
UPDATE stores SET custom_domain = 'shop.tienda.com', custom_path = NULL WHERE slug = 'el-slug';
```

### Checklist dominio propio
- [ ] DNS configurado
- [ ] Dominio en `vendexchat-domain-proxy` → Domains & Routes
- [ ] SSL/TLS en Full
- [ ] `custom_domain` + `custom_path` en Supabase
- [ ] `is_active = true` verificado
- [ ] Probar en incógnito

---

## Paso 6 — Asignar plan de suscripción

En la consola de superadmin (`/sa`):
1. Ir a la tienda del cliente → **Suscripción**
2. Asignar plan: Free, Pro, VIP, o Ultra
3. El cliente puede gestionar su suscripción desde **Configuración → Suscripción** con MercadoPago

---

## Paso 7 — Conectar pasarela de pago (MercadoPago)

El cliente conecta su cuenta de MercadoPago en **Configuración → Pagos**:
1. Ingresar su **Access Token** de MP (de su cuenta de vendedor)
2. Guardar
3. El storefront usará ese token para procesar pagos de sus clientes

---

## Resolución de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| Pantalla en blanco al entrar | `profiles.store_id` es NULL | Insertar profile con SQL (Paso 1) |
| No puede crear productos | RLS bloqueando | Verificar `profiles.store_id` no es NULL |
| Tienda no aparece en storefront | `is_active = false` o slug incorrecto | `UPDATE stores SET is_active = true` |
| Dominio propio muestra 404 | `custom_domain` no coincide con DNS | Verificar DNS propagado + campo en Supabase |
| Error al pagar | Access Token de MP incorrecto | Pedir al cliente que regenere su token |
| AI Importer no aparece | Plan no es VIP | Actualizar plan desde `/sa` |

---

## Contacto y soporte post-onboarding

Canal de soporte: definir (WhatsApp Business / email / Intercom)

SLA recomendado:
- Bugs críticos (tienda caída): respuesta en 4 hs
- Consultas de uso: respuesta en 24 hs hábiles
