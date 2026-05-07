# VendexChat — Contexto para agentes

## Repos
- Admin: este repo (`VendexChat-admin`)
- Storefront: `C:\Users\oscar\VendexChat-front` / `github.com/Inteliar-Stack-Agencia/VendexChat-front`
- Supabase project ID: `pjrhfbhqdbyoljactdkj` (us-east-2)
- Deploy: Cloudflare Pages (storefront en `vendexchat.app`) + Cloudflare Workers (`vendexchat-domain-proxy`)
- Sin Vercel.

## Stack
React + Vite, Supabase, Cloudflare Pages + Workers, MercadoPago.

## Slugs actuales en DB
| Store | slug | custom_domain | custom_path |
|-------|------|---------------|-------------|
| Morfi Viandas CABA | `caba` | morfiviandas.com.ar | caba |
| Morfi La Plata | `laplata` | morfiviandas.com.ar | laplata |
| Morfi Empresas | `empresas` | morfiviandas.com.ar | empresas |

## Reglas críticas

1. **No cambiar slugs en DB sin actualizar el frontend.** El storefront tiene slugs hardcodeados en:
   - `VendexChat-front/src/shop/components/CartDrawer.tsx` → `CUSTOMER_TYPE_STORES`, `MORFI_EMPRESAS_SLUG`
   - `VendexChat-front/src/shop/pages/ShopPage.tsx` → `isMorfiEmpresas`

2. **El slug es la fuente de verdad.** El worker proxea a `vendexchat.app/{slug}`. El storefront busca datos por `slug = identifier`. Si el slug cambia y el frontend no, la tienda queda en blanco.

3. **Verificar `is_active = true`** después de cualquier migración que toque stores.

4. **Probar siempre en incógnito** para evitar caché.

---

## Manual: activar dominio propio para una tienda

### Caso A — Cliente delega nameservers (recomendado)
1. Pedirle que cambie los NS en su registrador por los de tu Cloudflare
2. Cloudflare → Add a domain → plan Free
3. Cloudflare → Workers & Pages → `vendexchat-domain-proxy` → Settings → Domains & Routes → Add → Custom Domain
4. SSL/TLS → modo **Full**
5. Actualizar Supabase (ver abajo)
6. Probar en incógnito

### Caso B — Cliente usa subdominio (ej: `shop.tienda.com`, más fácil)
1. El cliente agrega en su DNS: `CNAME shop vendexchat-domain-proxy.oscarelias.workers.dev`
2. Cloudflare → `vendexchat-domain-proxy` → Domains & Routes → agregar `shop.tienda.com`
3. SSL automático. El cliente mantiene su dominio raíz intacto.
4. Actualizar Supabase y probar

### Caso C — Cliente no puede delegar nameservers
- Puede agregar un CNAME apuntando al worker, pero el SSL lo gestiona él. Difícil de soportar.
- Recomendación: pedir delegación como requisito. La mayoría acepta.

### Supabase — una tienda, dominio completo
```sql
UPDATE stores SET custom_domain = 'tienda.com', custom_path = NULL WHERE slug = 'el-slug';
```

### Supabase — varias tiendas, mismo dominio con sub-rutas
```sql
UPDATE stores SET custom_domain = 'tienda.com', custom_path = 'sucursal-a' WHERE slug = 'slug-a';
UPDATE stores SET custom_domain = 'tienda.com', custom_path = 'sucursal-b' WHERE slug = 'slug-b';
```
- `custom_path` = primer segmento de la URL (sin `/`)
- Ninguna sub-tienda con `custom_path = NULL` (sería el fallback y rompería el routing)

### Checklist
- [ ] DNS configurado (nameservers delegados o CNAME para subdominio)
- [ ] Dominio agregado en `vendexchat-domain-proxy` → Domains & Routes
- [ ] SSL/TLS en modo Full
- [ ] `custom_domain` y `custom_path` en Supabase
- [ ] `is_active = true` en todos los stores
- [ ] Slugs hardcodeados en frontend actualizados si cambiaron
- [ ] Probar en incógnito

### Costos Cloudflare
- Workers free: 100.000 req/día — suficiente para varios clientes
- Pages, SSL, custom domains: siempre gratis
- Workers Paid ($5/mes): solo si superás las 100k req/día
