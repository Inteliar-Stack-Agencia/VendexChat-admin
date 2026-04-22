import { supabase } from '../supabaseClient'
import type { User, Tenant } from '../types'

export const authApi = {
    login: async (email: string, _password: string) => {
        // 1. Authenticate with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: _password })
        if (authError) throw authError
        if (!authData.user) throw new Error('Usuario no encontrado')

        // 2. Fetch full profile and store
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, stores(*)')
            .eq('id', authData.user.id)
            .single()


        if (profileError) {
            console.warn('Profile not found, using auth metadata fallback')
            return {
                token: authData.session?.access_token || '',
                user: {
                    ...authData.user,
                    role: (authData.user.user_metadata as { role?: string })?.role || 'client'
                } as unknown as User
            }
        }


        return {
            token: authData.session?.access_token || '',
            user: {
                ...authData.user,
                role: profile.role,
                tenant_id: profile.store_id,
                store_id: profile.store_id,
                store: profile.stores
            } as unknown as User
        }
    },

    getMyStores: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const allStores: Tenant[] = []
        const seenIds = new Set<string>()

        // 1. Buscar la tienda vinculada al perfil (SIEMPRE funciona por RLS)
        const { data: profile } = await supabase
            .from('profiles')
            .select('store_id, role')
            .eq('id', user.id)
            .single()

        if (profile?.store_id) {
            const { data: profileStore } = await supabase
                .from('stores')
                .select('*')
                .eq('id', profile.store_id)
                .single()

            if (profileStore) {
                allStores.push(profileStore)
                seenIds.add(profileStore.id)
            }
        }

        // 2. Buscar otras tiendas con el mismo email
        if (user.email) {
            const { data: emailStores } = await supabase
                .from('stores')
                .select('*')
                .eq('email', user.email)

            if (emailStores) {
                for (const s of emailStores) {
                    if (!seenIds.has(s.id)) {
                        allStores.push(s)
                        seenIds.add(s.id)
                    }
                }
            }
        }

        // 3. Si es superadmin y no tiene tiendas asignadas, o quiere ver todas (opcional)
        if (profile?.role === 'superadmin') {
            const { data: moreStores } = await supabase
                .from('stores')
                .select('*')
                .order('name', { ascending: true })
                .limit(100)

            if (moreStores) {
                for (const s of moreStores) {
                    if (!seenIds.has(s.id)) {
                        allStores.push(s)
                        seenIds.add(s.id)
                    }
                }
            }
        }

        // 4. Buscar por owner_id (más seguro que email)
        const { data: ownerStores } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', user.id)

        if (ownerStores) {
            for (const s of ownerStores) {
                if (!seenIds.has(s.id)) {
                    allStores.push(s)
                    seenIds.add(s.id)
                }
            }
        }

        return allStores as Tenant[]
    },

    register: async (data: { store_name: string; email: string; slug: string; country: string; city: string; phone: string }) => {
        // Generar password aleatorio - el usuario accederá via magic link
        const randomPassword = crypto.randomUUID() + crypto.randomUUID()
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            phone: data.phone,
            password: randomPassword,
            options: {
                data: {
                    name: data.store_name,
                    slug: data.slug,
                    country: data.country,
                    city: data.city,
                    whatsapp: data.phone,
                    role: 'client'
                }
            }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('No se pudo crear el usuario')

        // Enviar magic link para que el usuario establezca su contraseña
        await supabase.auth.signInWithOtp({
            email: data.email,
            options: {
                emailRedirectTo: `${window.location.origin}/set-password`,
            }
        })

        // Cerrar sesión para que el usuario no entre al dashboard sin verificar email
        await supabase.auth.signOut()

        return {
            token: '',
            user: authData.user as unknown as User
        }
    },

    me: async () => {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !authUser) throw authError || new Error('No auth user')

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, stores(*)')
            .eq('id', authUser.id)
            .single()

        if (profileError) {
            return {
                user: {
                    ...authUser,
                    role: (authUser.user_metadata as { role?: string; store_id?: string })?.role || 'client',
                    tenant_id: (authUser.user_metadata as { store_id?: string })?.store_id,
                    store_id: (authUser.user_metadata as { store_id?: string })?.store_id
                } as unknown as User
            }
        }

        return {
            user: {
                ...authUser,
                role: profile.role,
                tenant_id: profile.store_id,
                store_id: profile.store_id,
                store: profile.stores,
                company_filter: profile.company_filter ?? null
            } as unknown as User
        }
    },

    signOut: () => supabase.auth.signOut(),

    requestPasswordReset: async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/dashboard`,
            }
        })
        if (error) throw error
        return { message: 'Se ha enviado un enlace de acceso a tu email' }
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) throw new Error('No hay sesión activa')

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        })
        if (signInError) throw new Error('Contraseña actual incorrecta')

        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
        return { message: 'Contraseña cambiada correctamente' }
    },
}
