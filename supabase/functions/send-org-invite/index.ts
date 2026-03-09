/**
 * WorshipOps — Supabase Edge Function: send-org-invite
 *
 * Creates an org invitation record and sends an invite email via Resend.
 *
 * Deploy:
 *   supabase functions deploy send-org-invite
 *
 * Required env vars (set in Supabase Dashboard → Functions → Secrets):
 *   SUPABASE_URL              — auto-set
 *   SUPABASE_SERVICE_ROLE_KEY — auto-set
 *   RESEND_API_KEY            — get from https://resend.com
 *   APP_URL                   — your app's public URL, e.g. https://app.worshipops.com
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

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
    const APP_URL = Deno.env.get('APP_URL') ?? 'https://app.worshipops.com'

    // ── Auth: verify caller is an org admin/leader ──────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) throw new Error('Unauthorized')

    const { organizationId, email, name, role } = await req.json()
    if (!organizationId || !email) throw new Error('organizationId and email are required')

    // Verify caller is admin/leader in this org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership || !['admin', 'leader'].includes(membership.role)) {
      throw new Error('Only org admins and leaders can send invitations')
    }

    // Get org name for the email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .maybeSingle()

    const orgName = org?.name ?? 'your church'

    // ── Create invitation record ─────────────────────────────
    const { data: invite, error: insertErr } = await supabase
      .from('org_invitations')
      .insert([{
        organization_id: organizationId,
        invited_by: user.id,
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        role: role || 'volunteer',
      }])
      .select('token')
      .single()

    if (insertErr || !invite) throw new Error('Failed to create invitation: ' + insertErr?.message)

    const inviteUrl = `${APP_URL}/invite/${invite.token}`

    // ── Send email via Resend ────────────────────────────────
    if (!RESEND_API_KEY) {
      // No Resend key — still return the link so admin can share manually
      return new Response(
        JSON.stringify({ success: true, inviteUrl, warning: 'RESEND_API_KEY not set — email not sent. Share the link manually.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WorshipOps <noreply@worshipops.com>',
        to: [email.toLowerCase().trim()],
        subject: `You've been invited to join ${orgName} on WorshipOps`,
        html: `
          <div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
            <div style="background:#ffffff;border-radius:16px;padding:36px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
              <div style="text-align:center;margin-bottom:28px;">
                <h1 style="margin:0;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.4px;">WorshipOps</h1>
                <p style="margin:6px 0 0;font-size:13px;color:#64748b;">Worship Team Management</p>
              </div>

              <h2 style="margin:0 0 12px;font-size:19px;font-weight:700;color:#0f172a;">
                You've been invited${name ? `, ${name}` : ''}!
              </h2>
              <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.7;">
                You've been invited to join <strong>${orgName}</strong> on WorshipOps as a <strong>${role || 'volunteer'}</strong>.
                Click the button below to create your account and get started.
              </p>

              <div style="text-align:center;margin:28px 0;">
                <a href="${inviteUrl}"
                   style="display:inline-block;padding:14px 36px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.2px;">
                  Accept Invitation
                </a>
              </div>

              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                This link expires in 7 days. If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const errBody = await emailRes.text()
      throw new Error(`Resend error: ${errBody}`)
    }

    return new Response(
      JSON.stringify({ success: true, inviteUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
