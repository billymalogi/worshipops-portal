import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import SabbathPanel, { calcBurnout, STATUS_META, StatusDot } from './SabbathPanel';
import {
  Search, Plus, Trash2, Mail, Phone, X, Save, Edit2,
  ChevronRight, User, Info, Heart, Calendar, AlertTriangle,
  CheckCircle, Clock, Star, ExternalLink, UserPlus, Copy, CheckCheck,
} from 'lucide-react';

const ROLES = ['Worship Leader', 'Vocalist', 'Guitarist', 'Bassist', 'Drummer', 'Keyboardist',
               'Sound Tech', 'Lighting Tech', 'Video Tech', 'Presenter', 'Pastor', 'Other'];

// ─────────────────────────────────────────────────────────────────────────────
export default function TeamManager({ orgId, isDarkMode, userRole, services = [], session }) {
  const isAdmin  = userRole === 'admin';
  const isEditor = userRole === 'admin' || userRole === 'editor';

  const [members,        setMembers]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [linkedProfile,  setLinkedProfile]  = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showEditModal,  setShowEditModal]  = useState(false);
  const [editingMember,  setEditingMember]  = useState(null);
  const [saving,         setSaving]         = useState(false);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm,      setInviteForm]      = useState({ name: '', email: '', role: 'volunteer', guestWeeks: 1, guestPerms: { teams: false, planner: false, production: false, songs: false } });
  const [inviteSending,   setInviteSending]   = useState(false);
  const [inviteResult,    setInviteResult]    = useState(null); // { url, warning, error }

  // Burnout settings (from organizations table)
  const [burnoutEnabled,   setBurnoutEnabled]   = useState(true);
  const [warningThreshold, setWarningThreshold] = useState(3);
  const [autoThreshold,    setAutoThreshold]    = useState(6);
  const [burnoutQueue,     setBurnoutQueue]     = useState([]); // members needing break email

  // Org ministries & positions
  const [orgMinistries,    setOrgMinistries]    = useState([]); // [{name, positions:[]}]
  const [addPositionPrompt,setAddPositionPrompt]= useState(null); // { role, resolve } when new role detected

  // Edit form
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: '', bio: '', notes: '',
    date_of_birth: '', ministries: [], household: [],
  });

  const c = {
    bg:       'var(--page)',
    card:     'var(--card)',
    text:     'var(--text-2)',
    heading:  'var(--text-1)',
    border:   'var(--line)',
    border2:  'var(--line-2)',
    muted:    'var(--text-3)',
    hover:    'var(--raised)',
    input:    'var(--page)',
    sidebar:  'var(--deep)',
    deep:     'var(--deep)',
    primary:  'var(--accent)',
    ink:      'var(--accent-ink)',
    soft:     'var(--accent-soft)',
    onAccent: 'var(--on-accent)',
    success:  'var(--positive)',
    warning:  'var(--warning)',
    danger:   'var(--negative)',
  };

  const inp = (disabled = false) => ({
    height: '36px', padding: '0 12px', borderRadius: 'var(--r-control)',
    border: `1px solid ${c.border2}`, background: disabled ? c.hover : c.input,
    color: disabled ? c.muted : c.heading, fontSize: '14px', outline: 'none', fontFamily: 'inherit',
    width: '100%', boxSizing: 'border-box',
  });
  const area = (minHeight) => ({ ...inp(), height: 'auto', minHeight, padding: '8px 12px', lineHeight: '20px', resize: 'vertical' });
  const fieldLabel = { fontSize: '13px', fontWeight: 500, color: c.text, display: 'block', marginBottom: '8px' };
  const btnBase = { height: '36px', padding: '0 14px', borderRadius: 'var(--r-control)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit', whiteSpace: 'nowrap' };
  const btnPrimary = { ...btnBase, border: 'none', background: c.primary, color: c.onAccent, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' };
  const btnSecondary = { ...btnBase, border: `1px solid ${c.border2}`, background: c.card, color: c.heading };
  const iconBtn = { background: 'none', border: 'none', borderRadius: 'var(--r-control)', width: '28px', height: '28px', cursor: 'pointer', color: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const chip = { fontSize: '12px', background: c.hover, border: `1px solid ${c.border}`, color: c.text, padding: '0 6px', lineHeight: '20px', borderRadius: 'var(--r-tag)', whiteSpace: 'nowrap' };

  // ── Fetch team + burnout settings ─────────────────────────────────────────
  const fetchTeam = async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: members }, { data: org }] = await Promise.all([
      supabase.from('team_members').select('*').eq('organization_id', orgId).order('name', { ascending: true }),
      supabase.from('organizations').select('burnout_prevention_enabled, burnout_warning_threshold, burnout_auto_threshold, ministries').eq('id', orgId).maybeSingle(),
    ]);
    setMembers(members || []);
    if (org) {
      setBurnoutEnabled(org.burnout_prevention_enabled ?? true);
      setWarningThreshold(org.burnout_warning_threshold ?? 3);
      setAutoThreshold(org.burnout_auto_threshold ?? 6);
      setOrgMinistries(Array.isArray(org.ministries) ? org.ministries : []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTeam(); }, [orgId]);

  // ── Compute burnout for all members ──────────────────────────────────────
  const burnoutMap = useMemo(() => {
    if (!burnoutEnabled) return {};
    const map = {};
    for (const m of members) {
      map[m.id] = calcBurnout(m, services, warningThreshold, autoThreshold);
    }
    return map;
  }, [members, services, burnoutEnabled, warningThreshold, autoThreshold]);

  // Detect auto-break triggers and build queue for admin notifications
  useEffect(() => {
    if (!isAdmin || !burnoutEnabled) return;
    const triggered = members.filter(m => {
      const b = burnoutMap[m.id];
      return b && b.status === 'burnout' && !(m.available_until && new Date(m.available_until) > new Date());
    });
    setBurnoutQueue(triggered);
  }, [burnoutMap, isAdmin, burnoutEnabled, members]);

  // ── Fetch linked user profile when selecting a member ────────────────────
  useEffect(() => {
    if (!selectedMember?.linked_user_id) { setLinkedProfile(null); return; }
    setLoadingProfile(true);
    supabase.from('user_profiles').select('*').eq('id', selectedMember.linked_user_id).maybeSingle()
      .then(({ data }) => { setLinkedProfile(data || null); setLoadingProfile(false); });
  }, [selectedMember?.linked_user_id]);

  // ── Save member ───────────────────────────────────────────────────────────
  // Derive flat list of all positions from all org ministries
  const orgPositions = useMemo(() => {
    const flat = [];
    for (const min of orgMinistries) {
      if (Array.isArray(min.positions)) {
        for (const p of min.positions) {
          if (p && !flat.includes(p)) flat.push(p);
        }
      }
    }
    return flat;
  }, [orgMinistries]);

  const handleSave = async () => {
    const role = form.role.trim();

    // Check if entered role is new (not in any org ministry positions)
    if (role && orgPositions.length > 0 && !orgPositions.includes(role)) {
      // Prompt user to add it as an org position
      const confirmed = await new Promise(resolve => setAddPositionPrompt({ role, resolve }));
      if (confirmed) {
        // Add role to first ministry's positions (or create a "General" ministry if none exist)
        const updated = orgMinistries.length > 0
          ? orgMinistries.map((min, i) => i === 0 ? { ...min, positions: [...(min.positions || []), role] } : min)
          : [{ name: 'General', positions: [role] }];
        await supabase.from('organizations').update({ ministries: updated }).eq('id', orgId);
        setOrgMinistries(updated);
      }
    }

    setSaving(true);
    const payload = {
      name: form.name, email: form.email, phone: form.phone, role: form.role,
      bio: form.bio, notes: form.notes, date_of_birth: form.date_of_birth || null,
      ministries: form.ministries, household: form.household,
      organization_id: orgId,
    };
    let saveError = null;
    if (editingMember?.id) {
      const { error } = await supabase.from('team_members').update(payload).eq('id', editingMember.id);
      saveError = error;
    } else {
      const { error } = await supabase.from('team_members').insert([payload]);
      saveError = error;
    }
    setSaving(false);
    if (saveError) {
      alert(`Save failed: ${saveError.message}`);
      return;
    }
    setShowEditModal(false);
    setEditingMember(null);
    await fetchTeam();
    // Refresh selected member if open
    if (selectedMember && editingMember?.id === selectedMember.id) {
      const { data } = await supabase.from('team_members').select('*').eq('id', editingMember.id).single();
      if (data) setSelectedMember(data);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this person from the team? This cannot be undone.')) return;
    await supabase.from('team_members').delete().eq('id', id);
    if (selectedMember?.id === id) setSelectedMember(null);
    await fetchTeam();
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteSending(true);
    setInviteResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        'https://whlmswwvbyysolaxihez.supabase.co/functions/v1/send-org-invite',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobG1zd3d2Ynl5c29sYXhpaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTMwNzcsImV4cCI6MjA4MTUyOTA3N30.cOl0v_qwTcDytpg5fjXX__njOz8hOZkaX0ICqnBXfcw',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            organizationId: orgId,
            email: inviteForm.email.trim(),
            name: inviteForm.name.trim() || null,
            role: inviteForm.role,
            permissions: inviteForm.role === 'guest' ? inviteForm.guestPerms : {},
            guestDurationWeeks: inviteForm.role === 'guest' ? inviteForm.guestWeeks : 1,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        setInviteResult({ error: json.error || 'Failed to send invite.' });
      } else {
        setInviteResult({ url: json.inviteUrl, warning: json.warning });
        setInviteForm({ name: '', email: '', role: 'volunteer', guestWeeks: 1, guestPerms: { teams: false, planner: false, production: false, songs: false } });
      }
    } catch (err) {
      setInviteResult({ error: `Error: ${err.message}` });
    }
    setInviteSending(false);
  };

  const openEdit = (member = null) => {
    setEditingMember(member);
    setForm({
      name:          member?.name          || '',
      email:         member?.email         || '',
      phone:         member?.phone         || '',
      role:          member?.role          || '',
      bio:           member?.bio           || '',
      notes:         member?.notes         || '',
      date_of_birth: member?.date_of_birth || '',
      ministries:    Array.isArray(member?.ministries) ? member.ministries : [],
      household:     Array.isArray(member?.household)  ? member.household  : [],
    });
    setShowEditModal(true);
  };

  const triggerBreak = async (member) => {
    const until = new Date();
    until.setDate(until.getDate() + 14);
    await supabase.from('team_members').update({ available_until: until.toISOString().slice(0, 10) }).eq('id', member.id);
    // Queue notification record
    await supabase.from('burnout_notifications').insert([{
      organization_id: orgId,
      team_member_id: member.id,
      email: member.email,
      member_name: member.name,
    }]).select();
    await fetchTeam();
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = members.filter(m =>
    (m.name  || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.role  || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const getInitials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const ministriesForMember = (m) => Array.isArray(m.ministries) ? m.ministries : [];

  // ── Merge profile (linked user_profile overrides team_member fields) ──────
  const mergedProfile = useMemo(() => {
    if (!selectedMember) return null;
    if (!linkedProfile) return selectedMember;
    return {
      ...selectedMember,
      display_name: linkedProfile.display_name || selectedMember.name,
      avatar_url:   linkedProfile.avatar_url   || selectedMember.avatar_url,
      bio:          linkedProfile.bio          || selectedMember.bio,
      date_of_birth:linkedProfile.date_of_birth|| selectedMember.date_of_birth,
    };
  }, [selectedMember, linkedProfile]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: 'calc(100vh - 108px)', display: 'flex', flexDirection: 'column', background: c.bg, overflow: 'hidden' }}>

      {/* ── Burnout alert banner ────────────────────────────────────────────── */}
      {isAdmin && burnoutEnabled && burnoutQueue.length > 0 && (
        <div style={{ background: c.deep, borderBottom: `1px solid ${c.border}`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.warning, flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: c.heading, flex: 1 }}>
            <span style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{burnoutQueue.length}</span> volunteer{burnoutQueue.length !== 1 ? 's' : ''} may need a Sabbath rest
          </span>
          <button
            onClick={() => {
              const links = burnoutQueue
                .filter(m => m.email)
                .map(m => `mailto:${m.email}?subject=You%27ve%20been%20scheduled%20for%20a%20rest&body=Hi%20${encodeURIComponent(m.name)}%2C%0A%0AWe%20appreciate%20everything%20you%20do!%20To%20prevent%20burnout%2C%20we%27re%20giving%20you%20the%20next%202%20weeks%20off%20from%20serving.%20Enjoy%20some%20time%20as%20a%20congregant!%0A%0ABlessings%2C%0ALeadership%20Team`);
              links.forEach((url, i) => setTimeout(() => window.open(url), i * 400));
            }}
            style={{ ...btnSecondary, height: '32px' }}
          >
            <Mail size={16} strokeWidth={1.5} /> Email them
          </button>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px', background: c.card, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '24px', lineHeight: '32px', fontWeight: 500, color: c.heading }}>Team roster</h1>
          <p style={{ margin: 0, fontSize: '13px', color: c.muted, fontVariantNumeric: 'tabular-nums' }}>{members.length} {members.length === 1 ? 'person' : 'people'}</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={16} strokeWidth={1.5} color={c.muted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp(), paddingLeft: '34px', width: '220px', marginRight: '8px' }}
          />
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowInviteModal(true); setInviteResult(null); }}
            style={btnSecondary}
          >
            <UserPlus size={16} strokeWidth={1.5} /> Invite
          </button>
        )}
        {isEditor && (
          <button
            onClick={() => openEdit()}
            style={btnPrimary}
          >
            <Plus size={16} strokeWidth={1.5} /> Add person
          </button>
        )}
      </div>

      {/* The Sabbath Feature: rest status for the whole team, always in view */}
      {burnoutEnabled && (
        <SabbathPanel members={members} burnoutMap={burnoutMap} warningThreshold={warningThreshold} autoThreshold={autoThreshold} />
      )}

      {/* ── Table + Profile Panel ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '64px', textAlign: 'center', color: c.muted, fontSize: '14px' }}>Loading team…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center', color: c.text, fontSize: '14px' }}>
              {search ? `No one matches “${search}”` : 'No one on the team yet. Use Add person to start.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: c.deep, borderBottom: `1px solid ${c.border}` }}>
                  {['Name', 'Role', 'Phone', 'Email', 'Ministries', 'Last served', 'Status', ''].map(h => (
                    <th key={h} style={{ height: '36px', padding: '0 16px', textAlign: 'left', fontSize: '12px', fontWeight: 400, color: c.muted, whiteSpace: 'nowrap', position: 'sticky', top: 0, background: c.deep, zIndex: 1 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => {
                  const b = burnoutMap[member.id] || { status: 'active', lastServe: null };
                  const sm = STATUS_META[b.status] || STATUS_META.active;
                  const mins = ministriesForMember(member);
                  const isSelected = selectedMember?.id === member.id;
                  return (
                    <tr
                      key={member.id}
                      onClick={() => setSelectedMember(isSelected ? null : member)}
                      style={{
                        borderBottom: `1px solid ${c.border}`,
                        cursor: 'pointer',
                        background: isSelected ? c.hover : 'transparent',
                        boxShadow: isSelected ? `inset 2px 0 0 ${c.primary}` : 'none',
                        transition: 'background-color var(--t-fast) var(--ease)',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = c.hover; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Name + Avatar */}
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.hover, border: `1px solid ${c.border}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, color: c.text, flexShrink: 0, overflow: 'hidden' }}>
                            {member.avatar_url
                              ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : getInitials(member.name)}
                          </div>
                          <span style={{ fontWeight: 500, fontSize: '14px', color: c.heading }}>{member.name}</span>
                        </div>
                      </td>
                      {/* Role */}
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        {member.role
                          ? <span style={{ color: c.text, fontSize: '13px' }}>{member.role}</span>
                          : <span style={{ color: c.muted }}>—</span>}
                      </td>
                      {/* Phone */}
                      <td style={{ padding: '10px 16px', color: member.phone ? c.text : c.muted, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {member.phone || '—'}
                      </td>
                      {/* Email */}
                      <td style={{ padding: '10px 16px', color: member.email ? c.text : c.muted, fontSize: '13px', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.email || '—'}
                      </td>
                      {/* Ministries */}
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {mins.slice(0, 3).map((mn, i) => (
                            <span key={i} style={chip}>{mn}</span>
                          ))}
                          {mins.length > 3 && <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: c.muted, lineHeight: '22px' }}>+{mins.length - 3}</span>}
                          {mins.length === 0 && <span style={{ color: c.muted }}>—</span>}
                        </div>
                      </td>
                      {/* Last Serve */}
                      <td style={{ padding: '10px 16px', color: b.lastServe ? c.text : c.muted, whiteSpace: 'nowrap', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                        {b.lastServe ? formatDate(b.lastServe) : '—'}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        {burnoutEnabled ? (
                          <StatusDot meta={sm} />
                        ) : (
                          <span style={{ fontSize: '13px', color: c.muted }}>—</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                          {isEditor && (
                            <button onClick={() => openEdit(member)} title="Edit" className="wo-icon-btn" style={iconBtn}>
                              <Edit2 size={16} strokeWidth={1.5} />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDelete(member.id)} title="Remove from team" className="wo-icon-btn" style={iconBtn}>
                              <Trash2 size={16} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Profile Side Panel ───────────────────────────────────────────── */}
        {selectedMember && (
          <div style={{
            width: '360px', flexShrink: 0, borderLeft: `1px solid ${c.border}`,
            background: c.card, display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Panel header */}
            <div style={{ height: '52px', padding: '0 12px 0 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, fontWeight: 500, fontSize: '14px', color: c.heading }}>Profile</div>
              {isEditor && (
                <button onClick={() => openEdit(selectedMember)} style={{ ...btnSecondary, height: '28px', padding: '0 10px', fontSize: '12px', gap: '4px' }}>
                  <Edit2 size={14} strokeWidth={1.5} /> Edit
                </button>
              )}
              <button onClick={() => setSelectedMember(null)} title="Close" className="wo-icon-btn" style={iconBtn}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div style={{ padding: '20px', flex: 1 }}>
              {/* Avatar + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: c.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 500, color: c.text, flexShrink: 0, overflow: 'hidden', border: `1px solid ${c.border}`, boxSizing: 'border-box' }}>
                  {(mergedProfile?.avatar_url)
                    ? <img src={mergedProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(mergedProfile?.name || selectedMember.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '18px', lineHeight: '24px', color: c.heading }}>
                    {mergedProfile?.display_name || selectedMember.name}
                  </div>
                  {selectedMember.role && (
                    <div style={{ fontSize: '13px', color: c.text, marginTop: '2px' }}>{selectedMember.role}</div>
                  )}
                  {burnoutEnabled && (() => {
                    const b = burnoutMap[selectedMember.id];
                    const sm = STATUS_META[b?.status] || STATUS_META.active;
                    return (
                      <div style={{ marginTop: '4px' }}><StatusDot meta={sm} size={12} /></div>
                    );
                  })()}
                  {loadingProfile && <div style={{ fontSize: '12px', color: c.muted, marginTop: '4px' }}>Loading linked profile…</div>}
                  {linkedProfile && <div style={{ fontSize: '12px', color: c.muted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} strokeWidth={1.5} /> Linked account</div>}
                </div>
              </div>

              {/* Contact */}
              <SectionBlock title="Contact" icon={<Phone size={16} strokeWidth={1.5} />} c={c}>
                <InfoRow icon={<Mail size={16} strokeWidth={1.5} />} label="Email" value={selectedMember.email}
                  action={selectedMember.email ? <a href={`mailto:${selectedMember.email}`} title="Email" style={{ color: c.muted, display: 'flex', alignItems: 'center' }}><ExternalLink size={14} strokeWidth={1.5} /></a> : null} />
                <InfoRow icon={<Phone size={16} strokeWidth={1.5} />} label="Phone" value={selectedMember.phone} />
              </SectionBlock>

              {/* Personal */}
              <SectionBlock title="Personal" icon={<User size={16} strokeWidth={1.5} />} c={c}>
                <InfoRow icon={<Calendar size={16} strokeWidth={1.5} />} label="Birthday" value={mergedProfile?.date_of_birth ? formatDate(mergedProfile.date_of_birth) : null} />
                {(mergedProfile?.bio) && (
                  <div style={{ fontSize: '14px', color: c.text, marginTop: '8px', lineHeight: '22px' }}>{mergedProfile.bio}</div>
                )}
                {Array.isArray(selectedMember.household) && selectedMember.household.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', color: c.muted, marginBottom: '4px' }}>Household</div>
                    {selectedMember.household.map((h, i) => (
                      <div key={i} style={{ fontSize: '13px', color: c.heading, marginBottom: '4px' }}>
                        {h.name} <span style={{ color: c.muted }}>· {h.relationship}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionBlock>

              {/* Ministry */}
              <SectionBlock title="Ministry" icon={<Star size={16} strokeWidth={1.5} />} c={c}>
                {ministriesForMember(selectedMember).length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {ministriesForMember(selectedMember).map((mn, i) => (
                      <span key={i} style={chip}>{mn}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '13px', color: c.muted }}>No ministries yet</span>
                )}
                {selectedMember.notes && (
                  <div style={{ marginTop: '12px', fontSize: '13px', lineHeight: '20px', color: c.text, background: c.deep, padding: '8px 12px', borderRadius: 'var(--r-control)', border: `1px solid ${c.border}` }}>
                    <div style={{ fontSize: '12px', color: c.muted, marginBottom: '2px' }}>Admin notes</div>{selectedMember.notes}
                  </div>
                )}
              </SectionBlock>

              {/* Serve Stats */}
              {burnoutEnabled && (() => {
                const b = burnoutMap[selectedMember.id];
                if (!b) return null;
                return (
                  <SectionBlock title="Serving" icon={<Clock size={16} strokeWidth={1.5} />} c={c}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                      <StatChip label="Total" value={b.totalServes} c={c} />
                      <StatChip label="Last 60 days" value={b.serves60} c={c} accent={b.serves60 >= autoThreshold ? c.danger : b.serves60 >= autoThreshold - 2 ? c.warning : null} />
                      <StatChip label="Sundays in a row" value={b.consecutiveSundays} c={c} accent={b.consecutiveSundays >= warningThreshold ? c.warning : null} />
                    </div>
                    {b.lastServe && (
                      <div style={{ fontSize: '13px', color: c.muted }}>Last served {formatDate(b.lastServe)}</div>
                    )}
                    {selectedMember.available_until && new Date(selectedMember.available_until) > new Date() && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: c.heading, background: c.deep, border: `1px solid ${c.border}`, padding: '8px 12px', borderRadius: 'var(--r-control)' }}>
                        On break until {formatDate(selectedMember.available_until)}
                      </div>
                    )}
                    {isAdmin && b.status === 'burnout' && !(selectedMember.available_until && new Date(selectedMember.available_until) > new Date()) && (
                      <button
                        onClick={() => triggerBreak(selectedMember)}
                        style={{ ...btnSecondary, marginTop: '12px', width: '100%', justifyContent: 'center' }}
                      >
                        <Heart size={16} strokeWidth={1.5} /> Start a 14-day break
                      </button>
                    )}
                  </SectionBlock>
                );
              })()}

              {/* Admin actions */}
              {isAdmin && selectedMember.email && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${c.border}` }}>
                  <a
                    href={`mailto:${selectedMember.email}?subject=WorshipOps Update`}
                    style={{ ...btnSecondary, textDecoration: 'none', justifyContent: 'center' }}
                  >
                    <Mail size={16} strokeWidth={1.5} /> Send email
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Edit / Add modal ─────────────────────────────────────────────────── */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: c.card, borderRadius: 'var(--r-panel)', border: `1px solid ${c.border2}`, width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '16px 16px 16px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 500, fontSize: '16px', color: c.heading }}>
                {editingMember ? 'Edit person' : 'Add person'}
              </div>
              <button onClick={() => setShowEditModal(false)} title="Close" className="wo-icon-btn" style={iconBtn}><X size={16} strokeWidth={1.5} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Full name</label>
                  <input style={inp()} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
                </div>
                <div>
                  <label style={fieldLabel}>Email</label>
                  <input style={inp()} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@church.com" />
                </div>
                <div>
                  <label style={fieldLabel}>Phone</label>
                  <input style={inp()} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
                </div>
                <div>
                  <label style={fieldLabel}>Role</label>
                  <input style={inp()} list="role-list" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Vocalist" />
                  <datalist id="role-list">
                    {(orgPositions.length > 0 ? orgPositions : ROLES).map(r => <option key={r} value={r} />)}
                  </datalist>
                </div>
                <div>
                  <label style={fieldLabel}>Birthday</label>
                  <input style={inp()} type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Bio</label>
                  <textarea style={area('72px')} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="A line or two about them" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={fieldLabel}>Notes <span style={{ color: c.muted, fontWeight: 400 }}>· admins only</span></label>
                  <textarea style={area('56px')} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Only admins see these" />
                </div>
              </div>

              {/* Ministries */}
              <div>
                <label style={fieldLabel}>Ministries</label>
                <MinistryTagInput tags={form.ministries} onChange={tags => setForm(f => ({ ...f, ministries: tags }))} c={c} inp={inp} />
              </div>

              {/* Household */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ ...fieldLabel, marginBottom: 0 }}>Household</label>
                  <button onClick={() => setForm(f => ({ ...f, household: [...f.household, { name: '', relationship: '' }] }))}
                    style={{ fontSize: '13px', fontWeight: 500, color: c.ink, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit', height: '28px' }}>
                    <Plus size={14} strokeWidth={1.5} /> Add
                  </button>
                </div>
                {form.household.map((h, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input style={inp()} value={h.name} onChange={e => { const hh = [...form.household]; hh[i] = { ...hh[i], name: e.target.value }; setForm(f => ({ ...f, household: hh })); }} placeholder="Name" />
                    <input style={inp()} value={h.relationship} onChange={e => { const hh = [...form.household]; hh[i] = { ...hh[i], relationship: e.target.value }; setForm(f => ({ ...f, household: hh })); }} placeholder="Relationship" />
                    <button onClick={() => setForm(f => ({ ...f, household: f.household.filter((_, idx) => idx !== i) }))} title="Remove" className="wo-icon-btn" style={iconBtn}><X size={16} strokeWidth={1.5} /></button>
                  </div>
                ))}
                {form.household.length === 0 && <div style={{ fontSize: '13px', color: c.muted }}>No household members yet</div>}
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowEditModal(false)} style={btnSecondary}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ ...btnPrimary, opacity: (saving || !form.name.trim()) ? 0.5 : 1 }}>
                <Save size={16} strokeWidth={1.5} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: c.card, border: `1px solid ${c.border2}`, borderRadius: 'var(--r-panel)', width: 'min(440px,100%)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px 16px 16px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500, color: c.heading }}>Invite to the team</h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: c.muted }}>They get an email with a sign-up link</p>
              </div>
              <button onClick={() => { setShowInviteModal(false); setInviteResult(null); }} title="Close" className="wo-icon-btn" style={iconBtn}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Success state */}
              {inviteResult && !inviteResult.error && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <CheckCircle size={24} strokeWidth={1.5} color={c.success} style={{ margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: c.heading }}>Invite sent</p>
                    {inviteResult.warning && (
                      <p style={{ margin: '8px 0 0', fontSize: '13px', color: c.text }}>{inviteResult.warning}</p>
                    )}
                  </div>
                  {inviteResult.url && (
                    <div style={{ background: c.deep, border: `1px solid ${c.border}`, borderRadius: 'var(--r-control)', padding: '12px', marginBottom: '16px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: '12px', color: c.muted }}>Invite link</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: c.heading, flex: 1, wordBreak: 'break-all' }}>{inviteResult.url}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(inviteResult.url)}
                          style={{ ...iconBtn, border: `1px solid ${c.border2}`, background: c.card, flexShrink: 0 }}
                          title="Copy link"
                        >
                          <Copy size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setInviteResult(null); }} style={btnSecondary}>
                      Send another
                    </button>
                    <button onClick={() => { setShowInviteModal(false); setInviteResult(null); }} style={btnPrimary}>
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Form */}
              {(!inviteResult || inviteResult.error) && (
                <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={fieldLabel}>Name <span style={{ color: c.muted, fontWeight: 400 }}>· optional</span></label>
                    <input
                      value={inviteForm.name}
                      onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Smith"
                      style={inp()}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Email</label>
                    <input
                      required type="email"
                      value={inviteForm.email}
                      onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="jane@example.com"
                      style={inp()}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Role</label>
                    <select
                      value={inviteForm.role}
                      onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                      style={inp()}
                    >
                      <optgroup label="Full Members">
                        <option value="org_leader">Org Leader</option>
                        <option value="leader">Ministry Leader</option>
                        <option value="weekly_scheduler">Weekly Scheduler</option>
                        <option value="music_director">Music Director</option>
                        <option value="campus_leader">Campus Leader</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="schedule_viewer">Schedule Viewer</option>
                      </optgroup>
                      <optgroup label="Temporary">
                        <option value="guest">Guest (Temporary Access)</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Guest options */}
                  {inviteForm.role === 'guest' && (
                    <div style={{ background: c.deep, border: `1px solid ${c.border}`, borderRadius: 'var(--r-card)', padding: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: c.heading, marginBottom: '12px' }}>Guest access</div>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', color: c.text, marginBottom: '8px' }}>How long</div>
                        <div style={{ display: 'flex', gap: '2px', padding: '2px', background: c.hover, border: `1px solid ${c.border}`, borderRadius: 'var(--r-control)' }}>
                          {[1, 2, 3].map(w => (
                            <button key={w} type="button" onClick={() => setInviteForm(f => ({ ...f, guestWeeks: w }))}
                              style={{ flex: 1, height: '28px', borderRadius: '6px', border: 'none', background: inviteForm.guestWeeks === w ? c.card : 'transparent', boxShadow: inviteForm.guestWeeks === w ? 'var(--shadow-sm)' : 'none', color: inviteForm.guestWeeks === w ? c.heading : c.text, fontWeight: 500, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                              {w} week{w > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: c.text, marginBottom: '8px' }}>What they can see</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {[
                            { key: 'teams',      label: 'Teams',              desc: 'Team roster for their week' },
                            { key: 'planner',    label: 'Planner',            desc: 'Assigned service plans' },
                            { key: 'production', label: 'Production', desc: 'Stage, lighting, rehearsals' },
                            { key: 'songs',      label: 'Songs',              desc: 'Song library' },
                          ].map(({ key, label, desc }) => (
                            <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px', borderRadius: 'var(--r-control)', border: `1px solid ${inviteForm.guestPerms[key] ? 'var(--accent-line)' : c.border2}`, background: inviteForm.guestPerms[key] ? c.soft : c.card, cursor: 'pointer' }}>
                              <input type="checkbox" checked={inviteForm.guestPerms[key]}
                                onChange={e => setInviteForm(f => ({ ...f, guestPerms: { ...f.guestPerms, [key]: e.target.checked } }))}
                                style={{ marginTop: '3px', flexShrink: 0, accentColor: 'var(--accent)' }} />
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 500, color: c.heading }}>{label}</div>
                                <div style={{ fontSize: '12px', color: c.muted, marginTop: '2px' }}>{desc}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <p style={{ margin: '8px 0 0', fontSize: '12px', color: c.muted }}>Guests never see Billing or Admin</p>
                      </div>
                    </div>
                  )}
                  {inviteResult?.error && (
                    <div style={{ fontSize: '13px', color: c.heading, background: c.deep, border: `1px solid ${c.border2}`, borderRadius: 'var(--r-control)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.danger, flexShrink: 0 }} />
                      {inviteResult.error}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                    <button type="button" onClick={() => { setShowInviteModal(false); setInviteResult(null); }} style={btnSecondary}>
                      Cancel
                    </button>
                    <button type="submit" disabled={inviteSending || !inviteForm.email.trim()} style={{ ...btnPrimary, opacity: (inviteSending || !inviteForm.email.trim()) ? 0.5 : 1 }}>
                      <UserPlus size={16} strokeWidth={1.5} /> {inviteSending ? 'Sending…' : 'Send invite'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Position to Org prompt */}
      {addPositionPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: c.card, border: `1px solid ${c.border2}`, borderRadius: 'var(--r-panel)', padding: '24px', width: 'min(380px,100%)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 500, color: c.heading }}>Add this position?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: c.text, lineHeight: '22px' }}>
              <span style={{ color: c.heading, fontWeight: 500 }}>{addPositionPrompt.role}</span> isn't in your position list yet. Add it so others can pick it too?
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setAddPositionPrompt(null); addPositionPrompt.resolve(false); }}
                style={btnSecondary}
              >
                Skip
              </button>
              <button
                onClick={() => { setAddPositionPrompt(null); addPositionPrompt.resolve(true); }}
                style={btnPrimary}
              >
                Add position
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────
function SectionBlock({ title, icon, children, c }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${c.border}` }}>
        <span style={{ color: c.muted, display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: c.heading }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value, action }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px' }}>
      <span style={{ color: 'var(--text-3)', flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ color: 'var(--text-3)', flexShrink: 0, minWidth: '64px' }}>{label}</span>
      <span style={{ flex: 1, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      {action}
    </div>
  );
}

function StatChip({ label, value, c, accent }) {
  return (
    <div style={{ background: c.deep, border: `1px solid ${c.border}`, borderRadius: 'var(--r-control)', padding: '12px' }}>
      <div style={{ fontSize: '24px', lineHeight: 1, fontWeight: 500, color: c.heading, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: '12px', color: c.muted, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {accent && <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />}{label}
      </div>
    </div>
  );
}

function MinistryTagInput({ tags, onChange, c, inp }) {
  const [inputVal, setInputVal] = useState('');
  const addTag = (val) => {
    const v = val.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInputVal('');
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: tags.length ? '8px' : 0 }}>
        {tags.map((t, i) => (
          <span key={i} style={{ fontSize: '13px', background: c.hover, border: `1px solid ${c.border}`, color: c.heading, height: '28px', padding: '0 2px 0 8px', borderRadius: 'var(--r-tag)', display: 'flex', alignItems: 'center', gap: '2px', boxSizing: 'border-box' }}>
            {t}
            <button onClick={() => onChange(tags.filter((_, idx) => idx !== i))} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, width: '22px', height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} strokeWidth={1.5} /></button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          style={{ ...inp(), flex: 1 }}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(inputVal); } }}
          placeholder="Type a ministry, then press Enter"
        />
        <button onClick={() => addTag(inputVal)} style={{ border: `1px solid ${c.border2}`, borderRadius: 'var(--r-control)', height: '36px', padding: '0 14px', background: c.card, color: c.heading, fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
      </div>
    </div>
  );
}
