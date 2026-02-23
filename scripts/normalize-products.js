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

async function normalizeAllProducts() {
    console.log('--- Iniciando Normalización Masiva ---')

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, description')

    if (error) {
        console.error('Error al obtener productos:', error)
        return
    }

    console.log(`Encontrados ${products.length} productos. Procesando...`)

    let updatedCount = 0
    for (const product of products) {
        const newName = product.name.toUpperCase().trim()
        const newDescription = (product.description || '').toLowerCase().trim()

        if (newName !== product.name || newDescription !== product.description) {
            const { error: updateError } = await supabase
                .from('products')
                .update({
                    name: newName,
                    description: newDescription
                })
                .eq('id', product.id)

            if (updateError) {
                console.error(`Error actualizando producto ${product.id}:`, updateError)
            } else {
                console.log(`✅ Normalizado: ${newName}`)
                updatedCount++
            }
        }
    }

    console.log(`--- Normalización Completada (${updatedCount} actualizados) ---`)
}

normalizeAllProducts()
