import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Eye, EyeOff, CheckCircle, XCircle, Loader,
  Music, Users, Calendar, Layers,
  AlertTriangle, ArrowRight, Download, RefreshCw, Info,
} from 'lucide-react';

// ── Call pco-import Edge Function ─────────────────────────────────────────────
async function callPCO(appId, secret, action, params = {}) {
  const { data, error } = await supabase.functions.invoke('pco-import', {
    body: { app_id: appId, secret, action, params },
  });
  if (error) {
    const msg = error.message || String(error);
    // Surface the actual PCO error if it came back as JSON
    if (data?.error) throw new Error(data.error);
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Data mappers ──────────────────────────────────────────────────────────────
function mapSong(pcSong, orgId) {
  const a = pcSong.attributes;
  return {
    name:             a.title  || 'Untitled',
    artist:           a.author || '',
    year:             null,
    is_public_domain: false,
    organization_id:  orgId,
    notes:            a.ccli_number ? `CCLI: ${a.ccli_number}` : (a.copyright || ''),
  };
}

function mapPerson(pcPerson, included, orgId) {
  const a = pcPerson.attributes;
  const fullName = a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unknown';
  const emailIds = pcPerson.relationships?.emails?.data?.map(e => e.id) || [];
  const phoneIds = pcPerson.relationships?.phone_numbers?.data?.map(p => p.id) || [];
  const email = (included || []).find(i => i.type === 'Email'       && emailIds.includes(i.id))?.attributes?.address || '';
  const phone = (included || []).find(i => i.type === 'PhoneNumber' && phoneIds.includes(i.id))?.attributes?.number  || '';
  return { name: fullName, email, phone, organization_id: orgId };
}

function mapPlanItems(pcItems) {
  return (pcItems || []).map((item, idx) => {
    const a = item.attributes;
    return {
      id:       item.id,
      type:     a.item_type === 'song' ? 'song' : a.item_type === 'header' ? 'header' : 'item',
      title:    a.title || '',
      duration: a.length ? Math.round(a.length / 60 * 10) / 10 : 0,
      notes:    a.description || '',
      sequence: a.sequence ?? idx,
    };
  }).sort((a, b) => a.sequence - b.sequence);
}

function mapPlan(pcPlan, folderId, orgId) {
  const a = pcPlan.attributes;
  const date = a.sort_date ? a.sort_date.slice(0, 10) : null;
  const name = a.title || a.series_title || (date ? `Service ${date}` : 'Untitled Service');
  return {
    name,
    date,
    organization_id: orgId,
    folder_id:       folderId || null,
    items:           mapPlanItems(pcPlan._items || []),
  };
}

// ── Step bar ──────────────────────────────────────────────────────────────────
const STEPS = ['Connect', 'Options', 'Importing', 'Complete'];

function StepBar({ step, colors }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {STEPS.map((label, i) => {
        const done = i < step, active = i === step;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#22c55e' : active ? colors.primary : colors.border,
                color: done || active ? '#fff' : colors.text, fontSize: 12, fontWeight: '700', transition: 'all 0.25s',
              }}>
                {done ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? '700' : '500', color: active ? colors.primary : colors.text, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#22c55e' : colors.border, margin: '0 4px', marginBottom: 16, transition: 'background 0.25s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function LogLine({ entry }) {
  const icon =
    entry.type === 'ok'    ? <CheckCircle size={12} color="#22c55e" /> :
    entry.type === 'error' ? <XCircle     size={12} color="#ef4444" /> :
    entry.type === 'skip'  ? <ArrowRight  size={12} color="#f59e0b" /> :
                             <Loader      size={12} color="#6366f1" />;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '2px 0', fontSize: 11, lineHeight: 1.5 }}>
      <span style={{ marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: entry.type === 'error' ? '#ef4444' : '#6b7280' }}>{entry.msg}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlanningCenterImport({ orgId, isDarkMode, userRole }) {
  const isAdmin = userRole === 'admin';

  const [step,       setStep]       = useState(0);
  const [appId,      setAppId]      = useState('');
  const [secret,     setSecret]     = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connErr,    setConnErr]    = useState('');
  const [orgName,    setOrgName]    = useState('');
  const [overview,   setOverview]   = useState(null);
  const [showSetup,  setShowSetup]  = useState(false);

  const [importSongs,    setImportSongs]    = useState(true);
  const [importPeople,   setImportPeople]   = useState(true);
  const [importServices, setImportServices] = useState(true);
  const [monthsBack,     setMonthsBack]     = useState(12);

  const [log,      setLog]      = useState([]);
  const [progress, setProgress] = useState(0);
  const [phase,    setPhase]    = useState('');
  const [results,  setResults]  = useState(null);
  const logRef = useRef(null);

  const c = {
    bg:      isDarkMode ? '#111111' : '#f9fafb',
    card:    isDarkMode ? '#1f1f22' : '#ffffff',
    text:    isDarkMode ? '#d1d5db' : '#374151',
    heading: isDarkMode ? '#f9fafb' : '#111111',
    border:  isDarkMode ? '#27272a' : '#e5e7eb',
    muted:   isDarkMode ? '#6b7280' : '#9ca3af',
    primary: '#6366f1',
    success: '#22c55e',
    danger:  '#ef4444',
    inputBg: isDarkMode ? '#111111' : '#ffffff',
  };

  const addLog = (msg, type = 'info') => {
    setLog(prev => [...prev, { msg, type }]);
    setTimeout(() => { logRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }); }, 50);
  };
  const ok   = (msg) => addLog(msg, 'ok');
  const err  = (msg) => addLog(msg, 'error');
  const skip = (msg) => addLog(msg, 'skip');

  // ── Step 0 → 1: Test connection ──────────────────────────────────────────
  const handleConnect = async () => {
    if (!appId.trim() || !secret.trim()) { setConnErr('Enter both Application ID and Secret.'); return; }
    setConnecting(true); setConnErr('');
    try {
      const root = await callPCO(appId.trim(), secret.trim(), 'test_connection');
      setOrgName(root.org_name || 'Planning Center');

      const ov = await callPCO(appId.trim(), secret.trim(), 'fetch_overview');
      setOverview(ov);
      setStep(1);
    } catch (e) {
      const msg = e.message || '';
      const isEdgeFnError = msg.includes('Failed to send') || msg.includes('not found') || msg.includes('Edge Function') || msg.includes('FunctionsHttpError');
      setConnErr(
        isEdgeFnError
          ? 'Edge Function not deployed — click "Setup help" above to deploy it first.'
          : msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('unauthorized')
          ? 'Invalid credentials — double-check your Application ID and Secret.'
          : msg.includes('NetworkError') || msg.includes('Failed to fetch')
          ? 'Network error — check your internet connection.'
          : `Connection failed: ${msg}`
      );
      if (isEdgeFnError) setShowSetup(true);
    } finally {
      setConnecting(false);
    }
  };

  // ── Step 1 → 2 → 3: Run import ───────────────────────────────────────────
  const handleImport = async () => {
    setLog([]); setProgress(0); setPhase(''); setResults(null);
    setStep(2);

    const stats = { songs: 0, people: 0, folders: 0, services: 0, skipped: 0, errors: 0 };

    try {
      // ── Songs ──────────────────────────────────────────────────────────
      if (importSongs) {
        setPhase('Fetching songs from Planning Center…');
        addLog('Fetching songs…');
        const { songs: pcSongs } = await callPCO(appId.trim(), secret.trim(), 'fetch_songs');
        addLog(`Found ${pcSongs.length} songs.`);

        const { data: existing } = await supabase.from('songs').select('name').eq('organization_id', orgId);
        const existingNames = new Set((existing || []).map(s => s.name.toLowerCase().trim()));

        setPhase('Importing songs…');
        for (let i = 0; i < pcSongs.length; i++) {
          const mapped = mapSong(pcSongs[i], orgId);
          const key = mapped.name.toLowerCase().trim();
          if (existingNames.has(key)) {
            skip(`Skipped (exists): "${mapped.name}"`); stats.skipped++;
          } else {
            const { error: e } = await supabase.from('songs').insert(mapped);
            if (e) { err(`Song "${mapped.name}": ${e.message}`); stats.errors++; }
            else   { ok(`Song: "${mapped.name}"`); stats.songs++; existingNames.add(key); }
          }
          setProgress(Math.round(((i + 1) / pcSongs.length) * 28));
        }
      }

      // ── People ─────────────────────────────────────────────────────────
      if (importPeople) {
        setPhase('Fetching people from Planning Center…');
        addLog('Fetching people…');
        const { people: pcPeople, included } = await callPCO(appId.trim(), secret.trim(), 'fetch_people');
        addLog(`Found ${pcPeople.length} people.`);

        const { data: existing } = await supabase.from('team_members').select('name, email').eq('organization_id', orgId);
        const existEmails = new Set((existing || []).map(m => (m.email || '').toLowerCase()).filter(Boolean));
        const existNames  = new Set((existing || []).map(m => m.name.toLowerCase().trim()));

        setPhase('Importing people…');
        for (let i = 0; i < pcPeople.length; i++) {
          const mapped   = mapPerson(pcPeople[i], included || [], orgId);
          const nameKey  = mapped.name.toLowerCase().trim();
          const emailKey = (mapped.email || '').toLowerCase();
          if ((emailKey && existEmails.has(emailKey)) || existNames.has(nameKey)) {
            skip(`Skipped (exists): ${mapped.name}`); stats.skipped++;
          } else {
            const { error: e } = await supabase.from('team_members').insert({
              name: mapped.name, email: mapped.email || null, phone: mapped.phone || null, organization_id: orgId,
            });
            if (e) { err(`Person "${mapped.name}": ${e.message}`); stats.errors++; }
            else   { ok(`Person: ${mapped.name}`); stats.people++; existNames.add(nameKey); if (emailKey) existEmails.add(emailKey); }
          }
          setProgress(28 + Math.round(((i + 1) / pcPeople.length) * 25));
        }
      }

      // ── Service types → folders + plans ───────────────────────────────
      if (importServices) {
        setPhase('Fetching service types…');
        addLog('Fetching service types…');
        const { service_types } = await callPCO(appId.trim(), secret.trim(), 'fetch_service_types');
        addLog(`Found ${service_types.length} service type(s).`);

        const { data: existFolders } = await supabase.from('service_folders').select('id, name').eq('organization_id', orgId);
        const folderByName = Object.fromEntries((existFolders || []).map(f => [f.name.toLowerCase().trim(), f.id]));

        for (let si = 0; si < service_types.length; si++) {
          const st     = service_types[si];
          const stName = st.attributes.name || `Service Type ${st.id}`;

          // Folder
          let folderId = folderByName[stName.toLowerCase().trim()];
          if (!folderId) {
            const { data: nf, error: fe } = await supabase
              .from('service_folders').insert({ name: stName, organization_id: orgId }).select().single();
            if (fe) { err(`Folder "${stName}": ${fe.message}`); stats.errors++; }
            else    { folderId = nf.id; folderByName[stName.toLowerCase().trim()] = folderId; stats.folders++; ok(`Folder: "${stName}"`); }
          } else {
            skip(`Folder exists: "${stName}"`);
          }

          // Plans
          setPhase(`Fetching plans for "${stName}"…`);
          addLog(`Fetching plans for "${stName}" (last ${monthsBack || 'all'} months)…`);
          try {
            const { plans } = await callPCO(appId.trim(), secret.trim(), 'fetch_service_type_full', {
              service_type_id: st.id,
              months_back: monthsBack || undefined,
            });
            addLog(`  ${plans.length} plan(s) found.`);

            for (let pi = 0; pi < plans.length; pi++) {
              const mapped = mapPlan(plans[pi], folderId, orgId);
              const { error: pe } = await supabase.from('services').insert(mapped);
              if (pe) { err(`Plan "${mapped.name}": ${pe.message}`); stats.errors++; }
              else    { ok(`Plan: "${mapped.name}" (${mapped.items.length} items)`); stats.services++; }

              const totalPlans = Math.max(service_types.length * plans.length, 1);
              setProgress(53 + Math.round(((si * plans.length + pi + 1) / totalPlans) * 42));
            }
          } catch (e) {
            err(`Plans for "${stName}": ${e.message}`); stats.errors++;
          }
        }
      }
    } catch (e) {
      err(`Import stopped: ${e.message}`); stats.errors++;
    }

    setProgress(100); setPhase('');
    setResults(stats);
    setStep(3);
  };

  if (!isAdmin) return (
    <div style={{ padding: 40, textAlign: 'center', color: c.muted, fontSize: 14 }}>
      Only admins can run a Planning Center import.
    </div>
  );

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 9, border: `1px solid ${c.border}`, background: c.inputBg, color: c.heading, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelStyle = { fontSize: 11, fontWeight: '600', color: c.muted, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' };

  const Card = ({ children, style = {} }) => (
    <div style={{ background: c.card, borderRadius: 14, border: `1px solid ${c.border}`, padding: '24px 28px', ...style }}>
      {children}
    </div>
  );

  const PrimaryBtn = ({ label, onClick, disabled, loading }) => (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: disabled ? c.border : c.primary, color: '#fff', fontWeight: '700', fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.6 : 1, transition: 'opacity 0.15s' }}>
      {loading && <Loader size={14} />}
      {label}
    </button>
  );

  return (
    <div style={{ padding: '28px 24px', maxWidth: 680, margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Download size={18} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: '800', color: c.heading }}>Planning Center Import</h2>
          <p style={{ margin: 0, fontSize: 12, color: c.muted }}>Migrate songs, people and service plans directly into WorshipOps.</p>
        </div>
      </div>

      {/* One-time setup notice */}
      <div style={{ margin: '16px 0 24px', borderRadius: 10, border: `1px solid ${isDarkMode ? '#3b3b3b' : '#e5e7eb'}`, overflow: 'hidden' }}>
        <button
          onClick={() => setShowSetup(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: isDarkMode ? '#1a1a1e' : '#f3f4f6', border: 'none', cursor: 'pointer', color: c.text, fontSize: 12, fontWeight: '600', textAlign: 'left' }}>
          <Info size={13} color={c.primary} />
          One-time setup required — deploy Edge Function
          <span style={{ marginLeft: 'auto', fontSize: 10, color: c.muted }}>{showSetup ? '▲ hide' : '▼ show'}</span>
        </button>
        {showSetup && (
          <div style={{ padding: '14px 16px', fontSize: 12, color: c.text, lineHeight: 1.8, background: c.card }}>
            <p style={{ margin: '0 0 10px' }}>
              This feature requires a <strong>Supabase Edge Function</strong> named <code style={{ background: isDarkMode ? '#2a2a2e' : '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>pco-import</code> to be deployed once.
              This is a server-side proxy that securely relays requests to Planning Center's API.
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Open your <strong>Supabase Dashboard</strong> → <strong>Edge Functions</strong> (left sidebar)</li>
              <li>Click <strong>Deploy a new function</strong></li>
              <li>Name it exactly: <code style={{ background: isDarkMode ? '#2a2a2e' : '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>pco-import</code></li>
              <li>Paste the contents of <code style={{ background: isDarkMode ? '#2a2a2e' : '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>supabase/functions/pco-import/index.ts</code> from your project</li>
              <li>Click <strong>Deploy</strong> — that's it, no CLI needed</li>
            </ol>
            <p style={{ margin: '10px 0 0', color: c.muted }}>
              Once deployed you only need to do this once. Refresh this page and try connecting again.
            </p>
          </div>
        )}
      </div>

      <StepBar step={step} colors={c} />

      {/* ── Step 0: Connect ── */}
      {step === 0 && (
        <Card>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: '700', color: c.heading }}>Connect to Planning Center</h3>
          <p style={{ margin: '0 0 20px', fontSize: 12, color: c.muted, lineHeight: 1.7 }}>
            Go to{' '}
            <a href="https://api.planningcenteronline.com/oauth/applications" target="_blank" rel="noopener noreferrer" style={{ color: c.primary }}>
              api.planningcenteronline.com/oauth/applications
            </a>
            {' '}→ open your Personal Access Token → copy the <strong style={{ color: c.text }}>Application ID</strong> and <strong style={{ color: c.text }}>Secret</strong>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Application ID</label>
              <input style={inputStyle} value={appId} onChange={e => setAppId(e.target.value)}
                placeholder="Paste your Application ID" autoComplete="off" onKeyDown={e => e.key === 'Enter' && handleConnect()} />
            </div>
            <div>
              <label style={labelStyle}>Secret</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: 42 }}
                  type={showSecret ? 'text' : 'password'}
                  value={secret} onChange={e => setSecret(e.target.value)}
                  placeholder="Paste your Secret" autoComplete="off"
                  onKeyDown={e => e.key === 'Enter' && handleConnect()} />
                <button onClick={() => setShowSecret(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: c.muted, display: 'flex', padding: 4 }}>
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {connErr && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, background: isDarkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2', border: '1px solid rgba(239,68,68,0.3)', color: c.danger, fontSize: 12, marginBottom: 16 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {connErr}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PrimaryBtn label="Test Connection & Continue" onClick={handleConnect} disabled={!appId.trim() || !secret.trim()} loading={connecting} />
          </div>
        </Card>
      )}

      {/* ── Step 1: Options ── */}
      {step === 1 && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', borderRadius: 10, background: isDarkMode ? 'rgba(34,197,94,0.1)' : '#f0fdf4', border: '1px solid rgba(34,197,94,0.3)' }}>
            <CheckCircle size={16} color={c.success} />
            <span style={{ fontSize: 13, fontWeight: '700', color: c.heading }}>Connected to <em>{orgName}</em></span>
          </div>

          {/* Overview chips */}
          {overview && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
              {[
                { icon: Music,    label: 'Songs',         val: overview.songs },
                { icon: Users,    label: 'People',        val: overview.people },
                { icon: Layers,   label: 'Service Types', val: overview.service_types },
                { icon: Calendar, label: 'Teams',         val: overview.teams },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} style={{ flex: '1 1 120px', padding: '10px 12px', borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg, textAlign: 'center' }}>
                  <Icon size={13} color={c.primary} />
                  <div style={{ fontSize: 20, fontWeight: '800', color: c.heading, margin: '3px 0 2px' }}>{val.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: c.muted }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: '700', color: c.heading, textTransform: 'uppercase', letterSpacing: '0.5px' }}>What to import</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {[
              { label: 'Songs',                  desc: 'All songs from your PCO song library',                   val: importSongs,    set: setImportSongs,    icon: Music },
              { label: 'People → Team Members',  desc: 'PCO contacts imported to your team roster',             val: importPeople,   set: setImportPeople,   icon: Users },
              { label: 'Services & Plans',       desc: 'Service types become folders, plans become services',   val: importServices, set: setImportServices, icon: Calendar },
            ].map(({ label, desc, val, set, icon: Icon }) => (
              <label key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${val ? c.primary : c.border}`, cursor: 'pointer', background: val ? (isDarkMode ? 'rgba(99,102,241,0.08)' : '#eef2ff') : 'transparent', transition: 'all 0.15s' }}>
                <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ marginTop: 3, accentColor: c.primary, width: 15, height: 15, flexShrink: 0 }} />
                <Icon size={15} color={val ? c.primary : c.muted} style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: '700', color: val ? c.primary : c.heading }}>{label}</div>
                  <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>

          {importServices && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Plans date range</label>
              <select value={monthsBack} onChange={e => setMonthsBack(Number(e.target.value))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value={3}>Last 3 months</option>
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
                <option value={24}>Last 24 months</option>
                <option value={0}>All time (may be slow)</option>
              </select>
            </div>
          )}

          <div style={{ padding: '10px 14px', borderRadius: 8, background: isDarkMode ? 'rgba(245,158,11,0.08)' : '#fffbeb', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: isDarkMode ? '#fbbf24' : '#92400e', display: 'flex', gap: 8, marginBottom: 20 }}>
            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            Existing records with the same name/email are skipped — safe to re-run.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(0)} style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontWeight: '600', fontSize: 13, cursor: 'pointer' }}>Back</button>
            <PrimaryBtn label="Start Import" onClick={handleImport} disabled={!importSongs && !importPeople && !importServices} />
          </div>
        </Card>
      )}

      {/* ── Step 2: Importing ── */}
      {step === 2 && (
        <Card>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: '700', color: c.heading }}>Importing…</h3>
          {phase && <p style={{ margin: '0 0 14px', fontSize: 12, color: c.primary, fontWeight: '600' }}>{phase}</p>}
          <div style={{ height: 6, borderRadius: 99, background: c.border, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: c.primary, width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
          <div ref={logRef} style={{ maxHeight: 340, overflowY: 'auto', padding: '12px 14px', borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, fontFamily: 'ui-monospace, monospace' }}>
            {log.length === 0
              ? <span style={{ fontSize: 11, color: c.muted }}>Starting…</span>
              : log.map((entry, i) => <LogLine key={i} entry={entry} />)}
          </div>
        </Card>
      )}

      {/* ── Step 3: Complete ── */}
      {step === 3 && results && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <CheckCircle size={22} color={c.success} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: '800', color: c.heading }}>Import Complete</h3>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { label: 'Songs',    val: results.songs,    color: '#8b5cf6' },
              { label: 'People',   val: results.people,   color: '#3b82f6' },
              { label: 'Folders',  val: results.folders,  color: '#10b981' },
              { label: 'Services', val: results.services, color: '#6366f1' },
              { label: 'Skipped',  val: results.skipped,  color: c.muted },
              { label: 'Errors',   val: results.errors,   color: results.errors > 0 ? c.danger : c.muted },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ flex: '1 1 90px', padding: '12px 10px', borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: '800', color }}>{val}</div>
                <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {results.errors > 0 && (
            <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: isDarkMode ? 'rgba(239,68,68,0.08)' : '#fef2f2', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: c.danger }}>
              Some records had errors — see the log below for details.
            </div>
          )}

          <details style={{ marginBottom: 20 }}>
            <summary style={{ fontSize: 12, fontWeight: '600', color: c.muted, cursor: 'pointer', userSelect: 'none', marginBottom: 8 }}>
              Full import log ({log.length} entries)
            </summary>
            <div style={{ maxHeight: 260, overflowY: 'auto', padding: '10px 12px', borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, fontFamily: 'ui-monospace, monospace' }}>
              {log.map((entry, i) => <LogLine key={i} entry={entry} />)}
            </div>
          </details>

          <button onClick={() => { setStep(1); setLog([]); setProgress(0); setResults(null); }}
            style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontWeight: '600', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Run Again
          </button>
        </Card>
      )}
    </div>
  );
}
