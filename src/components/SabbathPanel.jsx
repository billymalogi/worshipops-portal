// The Sabbath Feature — shared rest tracking for the whole team.
// Used on the Team roster and on My Schedule (leaders only).
import React, { useEffect, useMemo, useState } from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

// ── Burnout math ──────────────────────────────────────────────────────────
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function getMemberServes(member, services) {
  const nameLC  = (member.name  || '').toLowerCase();
  const emailLC = (member.email || '').toLowerCase();
  const serves  = [];

  for (const svc of services) {
    const date = svc.date ? new Date(svc.date) : null;
    if (!date) continue;
    const items = Array.isArray(svc.items) ? svc.items : [];
    const found = items.some(item => {
      const fields = [item.assignedTo, item.member, item.name, item.email, item.volunteer]
        .map(v => (v || '').toLowerCase());
      return fields.some(f => (nameLC && f === nameLC) || (emailLC && f.includes(emailLC) && emailLC));
    });
    if (found) serves.push(date);
  }
  return serves.sort((a, b) => b - a); // newest first
}

export function calcBurnout(member, services, warningThreshold = 3, autoThreshold = 6) {
  const serves = getMemberServes(member, services);
  const now = Date.now();

  const serves60 = serves.filter(d => (now - d.getTime()) <= SIXTY_DAYS_MS);

  const sundays = serves.filter(d => d.getDay() === 0).sort((a, b) => b - a);
  let consecutiveSundays = 0;
  if (sundays.length > 0) {
    consecutiveSundays = 1;
    for (let i = 1; i < sundays.length; i++) {
      const gap = (sundays[i - 1].getTime() - sundays[i].getTime()) / (7 * 24 * 60 * 60 * 1000);
      if (gap <= 1.5) { consecutiveSundays++; } else break;
    }
  }

  const onBreak     = member.available_until && new Date(member.available_until) > new Date();
  const isAutoBreak = serves60.length >= autoThreshold;
  const isWarning   = !isAutoBreak && consecutiveSundays >= warningThreshold;

  let status = 'active';
  if (onBreak)          status = 'break';
  else if (isAutoBreak) status = 'burnout';
  else if (isWarning)   status = 'warning';

  return { status, serves60: serves60.length, consecutiveSundays, totalServes: serves.length, lastServe: serves[0] || null };
}

export const STATUS_META = {
  active:  { label: 'Active',             color: 'var(--positive)' },
  warning: { label: 'High serve load',    color: 'var(--warning)' },
  burnout: { label: 'Needs Sabbath rest', color: 'var(--negative)' },
  break:   { label: 'Sabbath break',      color: 'var(--text-3)' },
};
const ORDER = ['active', 'warning', 'burnout', 'break'];

export const StatusDot = ({ meta, size = 13 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: `${size}px`, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
    {meta.label}
  </span>
);

// ── Data hook for pages that don't already load the team ──────────────────
export function useSabbath(orgId, services = [], enabled = true) {
  const [members,  setMembers]  = useState([]);
  const [settings, setSettings] = useState({ on: true, warn: 3, auto: 6 });
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    if (!orgId || !enabled) return;
    let alive = true;
    (async () => {
      const [{ data: m }, { data: org }] = await Promise.all([
        supabase.from('team_members').select('id, name, email, available_until').eq('organization_id', orgId),
        supabase.from('organizations').select('burnout_prevention_enabled, burnout_warning_threshold, burnout_auto_threshold').eq('id', orgId).maybeSingle(),
      ]);
      if (!alive) return;
      setMembers(m || []);
      if (org) setSettings({ on: org.burnout_prevention_enabled ?? true, warn: org.burnout_warning_threshold ?? 3, auto: org.burnout_auto_threshold ?? 6 });
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, [orgId, enabled]);

  const burnoutMap = useMemo(() => {
    const map = {};
    for (const m of members) map[m.id] = calcBurnout(m, services, settings.warn, settings.auto);
    return map;
  }, [members, services, settings.warn, settings.auto]);

  return { members, burnoutMap, enabled: settings.on, warningThreshold: settings.warn, autoThreshold: settings.auto, loaded };
}

// ── The panel ─────────────────────────────────────────────────────────────
// onOpenRoster: optional — shows an "Open roster" button (used on My Schedule).
export default function SabbathPanel({ members, burnoutMap, warningThreshold = 3, autoThreshold = 6, onOpenRoster, framed = false }) {
  const [showGuidelines, setShowGuidelines] = useState(false);

  const counts = { active: 0, warning: 0, burnout: 0, break: 0 };
  members.forEach(m => { const st = burnoutMap[m.id]?.status || 'active'; counts[st] = (counts[st] || 0) + 1; });
  const needRest = counts.warning + counts.burnout;

  const btn = {
    height: '32px', padding: '0 12px', borderRadius: 'var(--r-control)', border: '1px solid var(--line-2)',
    background: 'var(--card)', color: 'var(--text-1)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit', whiteSpace: 'nowrap',
  };
  const dot = (color) => <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, transform: 'translateY(-1px)' }} />;
  const rule = { display: 'flex', gap: '8px', alignItems: 'baseline' };

  return (
    <section
      aria-label="The Sabbath Feature"
      style={framed
        ? { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)', padding: '16px 20px 20px', boxShadow: 'var(--shadow-sm)' }
        : { background: 'var(--card)', borderBottom: '1px solid var(--line)', padding: '16px 24px 20px', flexShrink: 0 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
          <span style={{ width: 36, height: 36, borderRadius: 'var(--r-control)', background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Heart size={18} strokeWidth={1.5} />
          </span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-1)' }}>The Sabbath Feature</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
              {members.length === 0 ? 'Rest tracking for every volunteer' : needRest === 0 ? 'Everyone is rested this week' : `${needRest} ${needRest === 1 ? 'person needs' : 'people need'} a lighter week`}
            </div>
          </div>
        </div>
        {ORDER.map(k => (
          <div key={k} style={{ minWidth: '88px' }}>
            <div style={{ fontSize: '24px', lineHeight: 1, fontWeight: 500, color: counts[k] ? 'var(--text-1)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{counts[k]}</div>
            <div style={{ marginTop: '8px' }}><StatusDot meta={STATUS_META[k]} size={12} /></div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button onClick={() => setShowGuidelines(v => !v)} style={{ ...btn, background: showGuidelines ? 'var(--raised)' : 'var(--card)' }}>
            {showGuidelines ? 'Hide guidelines' : 'Guidelines'}
          </button>
          {onOpenRoster && (
            <button onClick={onOpenRoster} style={btn}>
              Open roster <ArrowRight size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {members.length > 0 && (
        <div
          title={ORDER.map(k => `${STATUS_META[k].label}: ${counts[k]}`).join(' · ')}
          style={{ display: 'flex', gap: '2px', height: '6px', borderRadius: '3px', overflow: 'hidden', marginTop: '16px', background: 'var(--raised)' }}
        >
          {ORDER.map(k => counts[k] > 0 && <span key={k} style={{ flex: counts[k], background: STATUS_META[k].color }} />)}
        </div>
      )}

      {showGuidelines && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: '15px', fontFamily: 'var(--font-verse)', color: 'var(--text-2)', marginBottom: '12px', lineHeight: '22px' }}>
            &ldquo;God ordained us humans to rest a day from work. Churches are no different when it comes to volunteers.&rdquo;
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px 24px', fontSize: '13px', color: 'var(--text-2)' }}>
            <span style={rule}>{dot(STATUS_META.warning.color)}<span><span style={{ color: 'var(--text-1)' }}>High serve load</span> · {warningThreshold}+ Sundays in a row</span></span>
            <span style={rule}>{dot(STATUS_META.burnout.color)}<span><span style={{ color: 'var(--text-1)' }}>Needs Sabbath rest</span> · {autoThreshold}+ serves in 60 days, 14-day break</span></span>
            <span style={rule}>{dot(STATUS_META.break.color)}<span><span style={{ color: 'var(--text-1)' }}>Sabbath break</span> · resting, not scheduled</span></span>
            <span style={rule}><span style={{ width: 6, flexShrink: 0 }} /><span>At least 1 Sunday a month in the pews</span></span>
          </div>
        </div>
      )}
    </section>
  );
}
