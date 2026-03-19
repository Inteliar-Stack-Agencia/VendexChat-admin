#!/usr/bin/env node

/**
 * Migration script: Move existing images from Supabase Storage to Cloudflare R2.
 *
 * Prerequisites:
 *   - R2 bucket "vendexchat-images" created with public access
 *   - Cloudflare API token with R2 write permissions
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   CF_ACCOUNT_ID=your_cf_account_id \
 *   CF_R2_ACCESS_KEY_ID=your_access_key \
 *   CF_R2_SECRET_ACCESS_KEY=your_secret_key \
 *   R2_BUCKET_NAME=vendexchat-images \
 *   R2_PUBLIC_URL=https://img.vendexchat.app \
 *   node scripts/migrate-to-r2.js
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID
const CF_R2_ACCESS_KEY_ID = process.env.CF_R2_ACCESS_KEY_ID
const CF_R2_SECRET_ACCESS_KEY = process.env.CF_R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'vendexchat-images'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}
if (!CF_ACCOUNT_ID || !CF_R2_ACCESS_KEY_ID || !CF_R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error('Missing Cloudflare R2 credentials (CF_ACCOUNT_ID, CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Use AWS SDK v3 for S3-compatible R2 uploads
let S3Client, PutObjectCommand
try {
  const s3 = require('@aws-sdk/client-s3')
  S3Client = s3.S3Client
  PutObjectCommand = s3.PutObjectCommand
} catch {
  console.error('Install @aws-sdk/client-s3 first: npm install @aws-sdk/client-s3')
  process.exit(1)
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CF_R2_ACCESS_KEY_ID,
    secretAccessKey: CF_R2_SECRET_ACCESS_KEY,
  },
})

async function downloadFromSupabase(bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error) throw error
  return data
}

async function uploadToR2(key, body, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: Buffer.from(await body.arrayBuffer()),
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
}

async function listBucketFiles(bucket) {
  const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1000 })
  if (error) throw error

  const files = []
  for (const item of data || []) {
    if (item.id) {
      files.push(item.name)
    } else {
      // It's a folder, list its contents
      const { data: subFiles, error: subError } = await supabase.storage
        .from(bucket)
        .list(item.name, { limit: 1000 })
      if (subError) {
        console.warn(`  Warning: Could not list ${bucket}/${item.name}:`, subError.message)
        continue
      }
      for (const sf of subFiles || []) {
        if (sf.id) files.push(`${item.name}/${sf.name}`)
      }
    }
  }
  return files
}

async function migrateImages() {
  const buckets = ['product-images', 'stores']
  let migrated = 0
  let failed = 0

  for (const bucket of buckets) {
    console.log(`\nMigrating bucket: ${bucket}`)
    const files = await listBucketFiles(bucket)
    console.log(`  Found ${files.length} files`)

    for (const filePath of files) {
      try {
        const blob = await downloadFromSupabase(bucket, filePath)
        const r2Key = `${bucket}/${filePath}`
        const r2Url = await uploadToR2(r2Key, blob, blob.type || 'image/webp')
        console.log(`  ✓ ${filePath} → ${r2Url}`)
        migrated++
      } catch (err) {
        console.error(`  ✗ ${filePath}: ${err.message}`)
        failed++
      }
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${failed} failed`)

  // Now update database URLs
  console.log('\nUpdating database URLs...')
  const supabaseStoragePrefix = `${SUPABASE_URL}/storage/v1/object/public/`

  // Update product images
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, image_url')
    .like('image_url', `${supabaseStoragePrefix}%`)

  if (pErr) {
    console.error('Error fetching products:', pErr.message)
  } else {
    let updated = 0
    for (const p of products || []) {
      const oldPath = p.image_url.replace(supabaseStoragePrefix, '')
      const newUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${oldPath}`
      const { error } = await supabase.from('products').update({ image_url: newUrl }).eq('id', p.id)
      if (error) {
        console.error(`  ✗ Product ${p.id}: ${error.message}`)
      } else {
        updated++
      }
    }
    console.log(`  Products updated: ${updated}/${(products || []).length}`)
  }

  // Update store logos and banners
  const { data: stores, error: sErr } = await supabase
    .from('stores')
    .select('id, logo_url, banner_url, sliders')

  if (sErr) {
    console.error('Error fetching stores:', sErr.message)
  } else {
    let updated = 0
    for (const s of stores || []) {
      const updates = {}
      if (s.logo_url?.startsWith(supabaseStoragePrefix)) {
        updates.logo_url = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${s.logo_url.replace(supabaseStoragePrefix, '')}`
      }
      if (s.banner_url?.startsWith(supabaseStoragePrefix)) {
        updates.banner_url = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${s.banner_url.replace(supabaseStoragePrefix, '')}`
      }
      if (s.sliders?.length) {
        updates.sliders = s.sliders.map(sl => ({
          ...sl,
          url: sl.url?.startsWith(supabaseStoragePrefix)
            ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${sl.url.replace(supabaseStoragePrefix, '')}`
            : sl.url
        }))
      }
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('stores').update(updates).eq('id', s.id)
        if (error) {
          console.error(`  ✗ Store ${s.id}: ${error.message}`)
        } else {
          updated++
        }
      }
    }
    console.log(`  Stores updated: ${updated}/${(stores || []).length}`)
  }

  console.log('\nDone! All images migrated and URLs updated.')
}

migrateImages().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
