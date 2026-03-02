/**
 * WorshipOps — Supabase Edge Function: send-message
 *
 * Sends SMS or WhatsApp messages via Twilio on behalf of an org admin.
 * Called from the Command Center ChatPanel when admin clicks "Send to Phones".
 *
 * Deploy:
 *   supabase functions deploy send-message
 *
 * Required env vars (set in Supabase Dashboard → Functions → send-message → Secrets):
 *   SUPABASE_URL          — auto-set by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — auto-set by Supabase
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the caller is an authenticated org admin/leader
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const { org_id, service_id, channel, recipients, message_body } = body
    // recipients: [ { name: string, phone: string } ]
    // channel: 'sms' | 'whatsapp'

    if (!org_id || !channel || !recipients?.length || !message_body) {
      throw new Error('Missing required fields: org_id, channel, recipients, message_body')
    }

    // Verify caller is admin/leader of this org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', org_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership || !['admin', 'leader'].includes(membership.role)) {
      throw new Error('Only admins and leaders can send messages')
    }

    // Fetch org's Twilio credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('twilio_account_sid, twilio_auth_token, twilio_from_phone, twilio_whatsapp_from')
      .eq('id', org_id)
      .single()

    if (!org?.twilio_account_sid || !org?.twilio_auth_token) {
      throw new Error('Twilio credentials not configured. Add them in Admin → Organization → Messaging.')
    }

    const accountSid = org.twilio_account_sid
    const authToken  = org.twilio_auth_token
    const fromSMS    = org.twilio_from_phone
    const fromWA     = org.twilio_whatsapp_from

    const from = channel === 'whatsapp' ? fromWA : fromSMS
    if (!from) {
      throw new Error(`No ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} number configured for this org.`)
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const basicAuth = btoa(`${accountSid}:${authToken}`)

    // Send to all recipients
    const results = await Promise.allSettled(
      recipients.map(async (r: { name: string; phone: string }) => {
        const to = channel === 'whatsapp' ? `whatsapp:${r.phone}` : r.phone
        const res = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: to, From: from, Body: message_body }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.message || `Twilio error ${res.status}`)
        return { name: r.name, sid: json.sid }
      })
    )

    const sent    = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value)
    const failed  = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason?.message)

    // Log to outbound_messages table
    await supabase.from('outbound_messages').insert([{
      organization_id: org_id,
      service_id:      service_id || null,
      sent_by:         user.id,
      channel,
      recipients,
      message_body,
      status:   failed.length === 0 ? 'sent' : (sent.length === 0 ? 'failed' : 'partial'),
      sent_at:  new Date().toISOString(),
    }])

    return new Response(
      JSON.stringify({ sent: sent.length, failed: failed.length, errors: failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
