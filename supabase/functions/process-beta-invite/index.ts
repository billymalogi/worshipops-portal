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
 * Deploy via Supabase Dashboard:
 *   Edge Functions → Create new function → name: "process-beta-invite" → paste this file
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

const ok  = (body: unknown) => new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const err = (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { token, email, password, firstName, lastName } = body

    if (!token || !email || !password || !firstName || !lastName) {
      return err('Missing required fields: token, email, password, firstName, lastName')
    }

    // ── 1. Verify invite token ──────────────────────────────
    const { data: invite, error: inviteErr } = await supabase
      .from('beta_invitations')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .is('used_at', null)
      .maybeSingle()

    if (inviteErr) return err('Failed to verify invite token')
    if (!invite)   return err('Invite link is invalid or has already been used.')

    // ── 2. Create the auth user (Supabase will reject duplicate emails) ──
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // skip email confirmation for beta
      user_metadata: { first_name: firstName, last_name: lastName },
    })

    if (createErr) {
      // Surface the real Supabase auth error (e.g. "User already registered")
      return err(createErr.message || 'Failed to create user account')
    }
    if (!newUser?.user) return err('Failed to create user account')

    const userId = newUser.user.id

    // ── 3. Find or create "Beta Tester Admin" org ───────────
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

      if (orgErr || !newOrg) return err('Failed to create Beta Tester Admin organization')
      betaOrgId = newOrg.id
    }

    // ── 4. Add user to org as admin ─────────────────────────
    const { error: memberErr } = await supabase
      .from('organization_members')
      .insert([{
        organization_id: betaOrgId,
        user_id: userId,
        role: 'admin',
      }])

    if (memberErr) return err('Failed to add user to organization')

    // ── 5. Create user_profile entry ────────────────────────
    await supabase.from('user_profiles').upsert([{
      id: userId,
      first_name: firstName,
      last_name: lastName,
      email,
    }], { onConflict: 'id' })

    // ── 6. Mark invite as used ──────────────────────────────
    await supabase
      .from('beta_invitations')
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq('id', invite.id)

    return ok({ success: true, message: 'Account created! You can now log in.' })

  } catch (e: any) {
    return err(e?.message ?? 'Unexpected server error', 500)
  }
})
