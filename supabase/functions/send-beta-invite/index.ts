/**
 * WorshipOps — Supabase Edge Function: send-beta-invite
 *
 * Sends a beta invitation email via Resend.
 *
 * Deploy:
 *   supabase functions deploy send-beta-invite
 *
 * Required env vars (shared with other functions):
 *   RESEND_API_KEY  — from https://resend.com
 *   APP_URL         — your app's public URL
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
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.')

    // Verify caller is authenticated
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) throw new Error('Unauthorized')

    const { toEmail, subject, htmlBody } = await req.json()
    if (!toEmail || !subject || !htmlBody) {
      throw new Error('toEmail, subject, and htmlBody are required')
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WorshipOps <noreply@worshipops.com>',
        to: [toEmail],
        subject,
        html: htmlBody,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.text()
      throw new Error(`Resend error: ${err}`)
    }

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
