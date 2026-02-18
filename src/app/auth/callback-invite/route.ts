import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type')
    const role = requestUrl.searchParams.get('role')
    const clinicId = requestUrl.searchParams.get('clinicId')

    const supabase = await createClient()

    // Handle PKCE code exchange
    if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data?.user) {
            await ensureInvitedUserProfile(data.user.id, data.user.email || '', role, clinicId)
        }
        redirect('/dashboard')
    }

    // Handle token_hash flow (magic link)
    if (token_hash && type) {
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
        })
        if (!error && data?.user) {
            await ensureInvitedUserProfile(data.user.id, data.user.email || '', role, clinicId)
        }
        redirect('/dashboard')
    }

    // Fallback
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await ensureInvitedUserProfile(user.id, user.email || '', role, clinicId)
    }

    redirect('/dashboard')
}

async function ensureInvitedUserProfile(
    userId: string,
    email: string,
    role: string | null,
    clinicId: string | null
) {
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update user metadata
    await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
            invited: true,
            ...(role ? { role } : {}),
            ...(clinicId ? { clinic_id: clinicId } : {}),
        },
    })

    // Update or create professional profile
    const updateData: Record<string, any> = { is_onboarded: true }
    if (role) updateData.role = role
    if (clinicId) updateData.clinic_id = clinicId

    const { data: existing } = await supabaseAdmin
        .from('professional')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

    if (existing) {
        await supabaseAdmin.from('professional').update(updateData).eq('id', userId)
    } else {
        await supabaseAdmin.from('professional').insert({ id: userId, ...updateData })
    }

    // Mark invite as accepted if found
    await supabaseAdmin
        .from('invites')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('email', email)
        .eq('status', 'pending')
}
