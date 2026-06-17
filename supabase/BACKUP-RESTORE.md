# Backup & Restore — VendexChat

## Supabase project ID: `pjrhfbhqdbyoljactdkj` (us-east-2)

---

## Backups automáticos (Supabase)

| Plan | Frecuencia | Retención | Dónde se activa |
|------|-----------|-----------|-----------------|
| Free | Diario | 7 días | Automático |
| Pro ($25/mes) | Diario | 30 días | Automático |
| Pro | Point-in-Time Recovery | Hasta 7 días | Dashboard → Backups |

Los backups automáticos **no requieren acción**. Para restaurar desde uno:
1. Supabase Dashboard → proyecto → **Database → Backups**
2. Elegir el snapshot → **Restore**
3. ⚠️ La restauración reemplaza toda la base. Hacer export manual antes (ver abajo).

---

## Export manual (antes de cambios destructivos)

Requiere: `supabase` CLI instalado y logueado (`supabase login`).

```bash
# Exportar schema + datos
supabase db dump \
  --project-ref pjrhfbhqdbyoljactdkj \
  --data-only \
  -f backup-$(date +%Y%m%d-%H%M).sql

# Solo schema (sin datos)
supabase db dump \
  --project-ref pjrhfbhqdbyoljactdkj \
  -f schema-$(date +%Y%m%d).sql
```

Guardar el archivo en un lugar seguro (Google Drive / S3 / local cifrado).

---

## Restore manual desde archivo SQL

```bash
# 1. Conectarse a la DB (obtener connection string en Dashboard → Settings → Database)
psql "postgresql://postgres:[PASSWORD]@db.pjrhfbhqdbyoljactdkj.supabase.co:5432/postgres"

# 2. Restaurar (cuidado: puede generar conflictos si los datos ya existen)
psql "postgresql://postgres:[PASSWORD]@db.pjrhfbhqdbyoljactdkj.supabase.co:5432/postgres" \
  < backup-YYYYMMDD-HHMM.sql
```

Si hay conflictos de claves duplicadas, restaurar en una DB vacía primero y luego migrar selectivamente.

---

## Checklist antes de una migración riesgosa

Antes de correr cualquier `ALTER TABLE`, `DROP`, o migración que toque datos:

- [ ] Export manual completo (schema + datos)
- [ ] Verificar que el archivo SQL tiene contenido (`wc -l backup.sql`)
- [ ] Copiar archivo a storage externo (no solo local)
- [ ] Anotar la versión de migración actual (`SELECT MAX(version) FROM supabase_migrations.schema_migrations;`)
- [ ] Tener el connection string a mano para restore de emergencia

---

## Casos de desastre y respuesta

### Caso 1: Migración borró datos por error
1. **Parar el admin** (quitar `is_active = true` o desactivar el deploy en Cloudflare Pages)
2. Export del estado actual (para análisis forense)
3. Restaurar desde el backup automático más reciente (Dashboard → Backups)
4. Verificar integridad: contar filas en `stores`, `products`, `orders`
5. Re-aplicar solo las migraciones posteriores al snapshot restaurado
6. Reactivar el admin

### Caso 2: Pérdida de acceso a Supabase
1. Entrar a [supabase.com](https://supabase.com) con `inteliarstack.ia@gmail.com`
2. Si la cuenta está comprometida: contactar soporte en [supabase.com/support](https://supabase.com/support)
3. Mientras tanto, el storefront seguirá sirviendo con caché de Cloudflare

### Caso 3: Cloudflare Pages caído
- El storefront (`vendexchat.app`) no depende de Pages para servir — Cloudflare CDN tiene caché
- Si el deploy falla: revertir al deployment anterior en Cloudflare Pages → Deployments → promote anterior

### Caso 4: Worker de dominio proxy caído
- Dominios propios (ej: `morfiviandas.com.ar`) dejan de funcionar
- `vendexchat.app/{slug}` sigue funcionando
- Fix: ir a Cloudflare Workers → `vendexchat-domain-proxy` → rollback al deployment anterior

---

## Storage (imágenes de productos)

Las imágenes están en **Supabase Storage** (bucket `product-images`).

```bash
# Listar archivos del bucket
supabase storage ls product-images \
  --project-ref pjrhfbhqdbyoljactdkj

# Download de todo el bucket (requiere supabase CLI >= 1.150)
supabase storage cp -r ss:///product-images ./backup-images \
  --project-ref pjrhfbhqdbyoljactdkj
```

Los backups automáticos de Supabase **no incluyen Storage**. Hacer backup manual de imágenes antes de migraciones que toquen el bucket.

---

## Frecuencia recomendada de backups manuales

| Evento | Backup manual |
|--------|--------------|
| Antes de cada migración | ✅ Siempre |
| Alta de cliente nuevo con datos importados | ✅ Sí |
| Cambios en RLS o roles | ✅ Sí |
| Semana sin cambios | ❌ No necesario (Supabase lo hace) |

---

## Contacto de emergencia Supabase

- Dashboard: [app.supabase.com](https://app.supabase.com)
- Status: [status.supabase.com](https://status.supabase.com)
- Soporte: [supabase.com/support](https://supabase.com/support)
