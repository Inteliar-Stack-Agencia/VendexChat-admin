import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Leer .env manualmente
const envPath = path.resolve(__dirname, '../.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = Object.fromEntries(
    envContent.split('\n')
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            const [key, ...rest] = line.split('=')
            return [key.trim(), rest.join('=').trim().replace(/^"(.*)"$/, '$1')]
        })
)

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateImages() {
    console.log('--- Iniciando Migración de Imágenes a Storage ---')

    // 0. Asegurar que el bucket existe
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.find(b => b.id === 'product-images')) {
        console.log('Creando bucket "product-images"...')
        const { error: bucketError } = await supabase.storage.createBucket('product-images', {
            public: true
        })
        if (bucketError) {
            console.error('Error al crear bucket:', bucketError.message)
            console.log('Intentando continuar de todas formas...')
        }
    }

    // 1. Obtener productos con base64
    const { data: products, error } = await supabase
        .from('products')
        .select('id, image_url')
        .not('image_url', 'is', null)

    if (error) {
        console.error('Error al obtener productos:', error)
        return
    }

    const base64Products = products.filter(p => p.image_url.startsWith('data:image/'))
    console.log(`Encontrados ${base64Products.length} productos con imágenes base64 para migrar.`)

    let migratedCount = 0
    for (const product of base64Products) {
        try {
            // 2. Extraer datos del base64
            const matches = product.image_url.match(/^data:(image\/(\w+));base64,(.+)$/)
            if (!matches) {
                console.log(`⚠️ Formato base64 no reconocido para producto ${product.id}`)
                continue
            }

            const contentType = matches[1]
            const extension = matches[2]
            const base64Data = matches[3]
            const buffer = Buffer.from(base64Data, 'base64')

            const fileName = `${product.id}-${Date.now()}.${extension}`
            const filePath = `products/${fileName}`

            // 3. Subir a Storage
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, buffer, {
                    contentType,
                    upsert: true
                })

            if (uploadError) {
                console.error(`Error subiendo imagen de producto ${product.id}:`, uploadError.message)
                continue
            }

            // 4. Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath)

            // 5. Actualizar en base de datos
            const { error: updateError } = await supabase
                .from('products')
                .update({ image_url: publicUrl })
                .eq('id', product.id)

            if (updateError) {
                console.error(`Error actualizando URL de producto ${product.id}:`, updateError.message)
            } else {
                console.log(`✅ Migrado producto ${product.id}: ${filePath}`)
                migratedCount++
            }
        } catch (err) {
            console.error(`Error procesando producto ${product.id}:`, err)
        }
    }

    console.log(`--- Migración Completada (${migratedCount} actualizados) ---`)
}

migrateImages()
