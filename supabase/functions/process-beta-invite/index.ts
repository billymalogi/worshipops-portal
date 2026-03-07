/**
 * WorshipOps — Supabase Edge Function: process-beta-invite
 *
 * Handles beta tester signup via a secret invite token.
 * - Verifies token is valid and unused
 * - Creates the auth user (via service_role key)
 * - Finds or creates the "Beta Tester Admin" organization
 * - Adds the user to that org with role = 'admin'
 * - Creates a user_profile entry
 * - Marks the invite token as used
 *
 * Deploy:
 *   supabase functions deploy process-beta-invite
 *
 * Required env vars (auto-set by Supabase):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BETA_ORG_NAME = 'Beta Tester Admin'

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

    const body = await req.json()
    const { token, email, password, firstName, lastName } = body

    if (!token || !email || !password || !firstName || !lastName) {
      throw new Error('Missing required fields: token, email, password, firstName, lastName')
    }

    // ── 1. Verify invite token ──────────────────────────────
    const { data: invite, error: inviteErr } = await supabase
      .from('beta_invitations')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .is('used_at', null)
      .maybeSingle()

    if (inviteErr) throw new Error('Failed to verify invite token')
    if (!invite)   throw new Error('Invite link is invalid or has already been used.')

    // ── 2. Check email not already registered ───────────────
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const emailTaken = existingUsers?.users?.some(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    )
    if (emailTaken) throw new Error('An account with this email already exists.')

    // ── 3. Create the auth user ─────────────────────────────
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // skip email confirmation for beta
      user_metadata: { first_name: firstName, last_name: lastName },
    })

    if (createErr || !newUser?.user) {
      throw new Error(createErr?.message || 'Failed to create user account')
    }

    const userId = newUser.user.id

    // ── 4. Find or create "Beta Tester Admin" org ───────────
    let betaOrgId: string

    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', BETA_ORG_NAME)
      .maybeSingle()

    if (existingOrg) {
      betaOrgId = existingOrg.id
    } else {
      const { data: newOrg, error: orgErr } = await supabase
        .from('organizations')
        .insert([{ name: BETA_ORG_NAME }])
        .select('id')
        .single()

      if (orgErr || !newOrg) throw new Error('Failed to create Beta Tester Admin organization')
      betaOrgId = newOrg.id
    }

    // ── 5. Add user to org as admin ─────────────────────────
    const { error: memberErr } = await supabase
      .from('organization_members')
      .insert([{
        organization_id: betaOrgId,
        user_id: userId,
        role: 'admin',
      }])

    if (memberErr) throw new Error('Failed to add user to organization')

    // ── 6. Create user_profile entry ────────────────────────
    await supabase.from('user_profiles').upsert([{
      id: userId,
      first_name: firstName,
      last_name: lastName,
      email,
    }], { onConflict: 'id' })

    // ── 7. Mark invite as used ──────────────────────────────
    await supabase
      .from('beta_invitations')
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq('id', invite.id)

    return new Response(
      JSON.stringify({ success: true, message: 'Account created! You can now log in.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
