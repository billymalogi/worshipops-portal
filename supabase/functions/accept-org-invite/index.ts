/**
 * WorshipOps — Supabase Edge Function: accept-org-invite
 *
 * Handles invite acceptance:
 *  1. Verifies token is valid and not expired/used
 *  2. Creates the auth user (or errors if email already registered)
 *  3. Adds user to organization_members with the invited role
 *  4. Creates a team_members record
 *  5. Creates a user_profiles record
 *  6. Marks the invite as accepted
 *
 * Deploy:
 *   supabase functions deploy accept-org-invite
 *
 * Required env vars (auto-set by Supabase):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { token, email, password, firstName, lastName } = await req.json()

    if (!token || !email || !password || !firstName || !lastName) {
      throw new Error('Missing required fields: token, email, password, firstName, lastName')
    }

    // ── 1. Verify token ──────────────────────────────────────
    const { data: invite, error: inviteErr } = await supabase
      .from('org_invitations')
      .select('*, organizations(name)')
      .eq('token', token)
      .is('accepted_at', null)
      .maybeSingle()

    if (inviteErr) throw new Error('Failed to verify invite token')
    if (!invite)   throw new Error('Invite link is invalid or has already been used.')
    if (new Date(invite.expires_at) < new Date()) throw new Error('This invite link has expired. Please ask for a new one.')

    // ── 2. Create auth user ──────────────────────────────────
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    })

    if (createErr) {
      if (createErr.message?.toLowerCase().includes('already')) {
        throw new Error('An account with this email already exists. Please log in instead.')
      }
      throw new Error(createErr.message || 'Failed to create account')
    }
    if (!newUser?.user) throw new Error('Failed to create account')

    const userId = newUser.user.id
    const fullName = `${firstName.trim()} ${lastName.trim()}`

    // ── 3. Add to organization_members ───────────────────────
    const isGuest = invite.role === 'guest'
    const guestExpiry = isGuest && invite.guest_duration_weeks
      ? new Date(Date.now() + invite.guest_duration_weeks * 7 * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { error: memberErr } = await supabase
      .from('organization_members')
      .insert([{
        organization_id:    invite.organization_id,
        user_id:            userId,
        role:               invite.role || 'volunteer',
        permissions:        invite.permissions || {},
        account_expires_at: guestExpiry,
      }])

    if (memberErr) throw new Error('Failed to add to organization: ' + memberErr.message)

    // ── 4. Create team_members record ────────────────────────
    await supabase.from('team_members').insert([{
      organization_id: invite.organization_id,
      name: fullName,
      email: email.toLowerCase().trim(),
      role: invite.role || 'volunteer',
      ministries: [],
    }])

    // ── 5. Create user_profile ───────────────────────────────
    await supabase.from('user_profiles').upsert([{
      id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.toLowerCase().trim(),
    }], { onConflict: 'id' })

    // ── 6. Mark invite accepted ──────────────────────────────
    await supabase
      .from('org_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
