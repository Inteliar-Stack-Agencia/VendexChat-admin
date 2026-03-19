import { supabase } from '../supabaseClient'
import { optimizeImage } from '../utils/imageOptimizer'

type ImagePreset = 'product' | 'logo' | 'banner' | 'slider'

/**
 * Upload image to Cloudflare R2 via Pages Function.
 * Falls back to Supabase Storage if R2 is not configured.
 * Images are automatically optimized (resized + converted to WebP) before upload.
 */
async function uploadToR2(file: File, folder: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Not authenticated')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    const res = await fetch('/api/r2-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
    })

    const data = await res.json()

    if (!res.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`)
    }

    return data.url
}

async function uploadToSupabase(file: File, bucket: string, path: string): Promise<string> {
    const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            upsert: true,
            cacheControl: '31536000',
            contentType: file.type
        })

    if (error) {
        console.error('storageApi.uploadToSupabase error:', error)
        throw error
    }

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

    return publicUrl
}

export const storageApi = {
    /**
     * Upload an image with automatic optimization.
     * Tries R2 first, falls back to Supabase Storage.
     */
    uploadImage: async (
        file: File,
        bucket: string,
        path: string,
        preset: ImagePreset = 'product'
    ) => {
        // Optimize image client-side (resize + WebP)
        const optimized = await optimizeImage(file, preset)

        // Try R2 first
        try {
            const folder = `${bucket}/${path}`.replace(/\/[^/]+$/, '')
            const url = await uploadToR2(optimized, folder)
            return url
        } catch (r2Error) {
            console.warn('R2 upload failed, falling back to Supabase Storage:', r2Error)
        }

        // Fallback to Supabase Storage
        const ext = optimized.name.split('.').pop() || 'webp'
        const fallbackPath = path.replace(/\.[^.]+$/, `.${ext}`)
        return uploadToSupabase(optimized, bucket, fallbackPath)
    },

    /**
     * Upload a blob (e.g. from external URL) with optimization.
     */
    uploadBlob: async (
        blob: Blob,
        bucket: string,
        path: string,
        preset: ImagePreset = 'product'
    ) => {
        const file = new File([blob], `upload.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type })
        return storageApi.uploadImage(file, bucket, path, preset)
    }
}
