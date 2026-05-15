/**
 * WorshipOps — Supabase Edge Function: pco-import
 *
 * Proxies Planning Center Online API calls server-side to avoid CORS issues.
 * Handles pagination internally and returns complete datasets.
 *
 * Deploy via Supabase Dashboard:
 *   Dashboard → Edge Functions → New Function → name: "pco-import" → paste this file
 *
 * Auth: Planning Center Personal Access Token (App ID + Secret)
 * PCO API docs: https://developer.planning.center/docs
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const PCO_BASE = 'https://api.planningcenteronline.com'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

// ── PCO fetch (single page) ───────────────────────────────────────────────────
async function pcoGet(creds: string, path: string): Promise<any> {
  const url = path.startsWith('http') ? path : `${PCO_BASE}${path}`
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${creds}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`PCO ${res.status} on ${path}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

// ── Paginate through all pages of a PCO collection ───────────────────────────
// Returns both data items AND included sideloaded objects (for relationships)
async function fetchAll(creds: string, path: string): Promise<{ data: any[]; included: any[] }> {
  const data: any[] = []
  const included: any[] = []
  const sep = path.includes('?') ? '&' : '?'
  let url: string | null = `${path}${sep}per_page=100`

  while (url) {
    const page = await pcoGet(creds, url)
    if (Array.isArray(page.data))     data.push(...page.data)
    if (Array.isArray(page.included)) included.push(...page.included)
    // links.next is a full URL — use as-is
    url = page.links?.next || null
  }

  return { data, included }
}

// ── Rate-limit-friendly delay ─────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { app_id, secret, action, params = {} } = await req.json()

    if (!app_id || !secret) return json({ error: 'Missing app_id or secret' }, 400)

    const creds = btoa(`${app_id}:${secret}`)

    // ── test_connection ──────────────────────────────────────────────────────
    if (action === 'test_connection') {
      const page = await pcoGet(creds, '/services/v2')
      return json({ ok: true, org_name: page.data?.attributes?.name || 'Planning Center' })
    }

    // ── fetch_overview: counts only ──────────────────────────────────────────
    if (action === 'fetch_overview') {
      const [st, songs, people, teams] = await Promise.all([
        pcoGet(creds, '/services/v2/service_types?per_page=1'),
        pcoGet(creds, '/services/v2/songs?per_page=1'),
        pcoGet(creds, '/people/v2/people?per_page=1'),
        pcoGet(creds, '/services/v2/teams?per_page=1'),
      ])
      return json({
        service_types: st.meta?.total_count     ?? 0,
        songs:         songs.meta?.total_count  ?? 0,
        people:        people.meta?.total_count ?? 0,
        teams:         teams.meta?.total_count  ?? 0,
      })
    }

    // ── fetch_songs ──────────────────────────────────────────────────────────
    if (action === 'fetch_songs') {
      const { data: songs } = await fetchAll(creds, '/services/v2/songs')
      return json({ songs })
    }

    // ── fetch_people (includes emails + phone numbers as sideloaded) ─────────
    if (action === 'fetch_people') {
      const { data: people, included } = await fetchAll(
        creds,
        '/people/v2/people?include=emails,phone_numbers'
      )
      return json({ people, included })
    }

    // ── fetch_service_types ──────────────────────────────────────────────────
    if (action === 'fetch_service_types') {
      const { data: service_types } = await fetchAll(creds, '/services/v2/service_types')
      return json({ service_types })
    }

    // ── fetch_teams ──────────────────────────────────────────────────────────
    if (action === 'fetch_teams') {
      const { data: teams } = await fetchAll(creds, '/services/v2/teams')
      return json({ teams })
    }

    // ── fetch_service_type_full ──────────────────────────────────────────────
    // Returns all plans (optionally filtered by date) + items for each plan.
    if (action === 'fetch_service_type_full') {
      const { service_type_id, months_back } = params as { service_type_id: string; months_back?: number }
      if (!service_type_id) return json({ error: 'service_type_id required' }, 400)

      let planPath = `/services/v2/service_types/${service_type_id}/plans`
      if (months_back) {
        const since = new Date()
        since.setMonth(since.getMonth() - months_back)
        planPath += `?filter=after_date&after_date=${since.toISOString().slice(0, 10)}`
      }

      const { data: plans } = await fetchAll(creds, planPath)

      // For each plan fetch its items (rate-limit friendly)
      const plansWithItems: any[] = []
      for (const plan of plans) {
        try {
          const { data: items } = await fetchAll(
            creds,
            `/services/v2/service_types/${service_type_id}/plans/${plan.id}/items`
          )
          plansWithItems.push({ ...plan, _items: items })
        } catch {
          plansWithItems.push({ ...plan, _items: [] })
        }
        await sleep(120) // ~8 req/s — well within 100 req/20s limit
      }

      return json({ plans: plansWithItems })
    }

    return json({ error: `Unknown action: ${action}` }, 400)

  } catch (err: any) {
    return json({ error: err?.message ?? String(err) }, 500)
  }
})
