import { supabase } from '../supabaseClient'

export const storageApi = {
    uploadImage: async (file: File, bucket: string, path: string) => {
        const { error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                upsert: true,
                cacheControl: '3600'
            })

        if (error) {
            console.error('storageApi.uploadImage error:', error)
            throw error
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path)

        return publicUrl
    }
}
