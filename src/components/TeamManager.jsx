import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Search, Plus, Trash2, Mail, Phone, X, Save, Edit2,
  ChevronRight, User, Info, Heart, Calendar, AlertTriangle,
  CheckCircle, Clock, Star, ExternalLink, UserPlus, Copy, CheckCheck,
} from 'lucide-react';

// â”€â”€ Burnout helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

function calcBurnout(member, services, warningThreshold = 3, autoThreshold = 6) {
  const serves = getMemberServes(member, services);
  const now = Date.now();

  // Serves in last 60 days
  const serves60 = serves.filter(d => (now - d.getTime()) <= SIXTY_DAYS_MS);

  // Consecutive Sundays (day 0)
  const sundays = serves
    .filter(d => d.getDay() === 0)
    .sort((a, b) => b - a); // newest first

  let consecutiveSundays = 0;
  if (sundays.length > 0) {
    consecutiveSundays = 1;
    for (let i = 1; i < sundays.length; i++) {
      const gap = (sundays[i - 1].getTime() - sundays[i].getTime()) / (7 * 24 * 60 * 60 * 1000);
      if (gap <= 1.5) { consecutiveSundays++; } else break;
    }
  }

  const onBreak    = member.available_until && new Date(member.available_until) > new Date();
  const isAutoBreak = serves60.length >= autoThreshold;
  const isWarning  = !isAutoBreak && consecutiveSundays >= warningThreshold;

  let status = 'active';
  if (onBreak)       status = 'break';
  else if (isAutoBreak) status = 'burnout';
  else if (isWarning)   status = 'warning';

  return { status, serves60: serves60.length, consecutiveSundays, totalServes: serves.length, lastServe: serves[0] || null };
}

// â”€â”€ Color tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_META = {
  active:  { label: 'Active',          color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: '🟢' },
  warning: { label: 'High Serve Load',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  burnout: { label: 'Needs Sabbath Rest', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '🔴' },
  break:   { label: 'Sabbath Break',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: '🔵' },
};

const ROLES = ['Worship Leader', 'Vocalist', 'Guitarist', 'Bassist', 'Drummer', 'Keyboardist',
               'Sound Tech', 'Lighting Tech', 'Video Tech', 'Presenter', 'Pastor', 'Other'];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const [showBurnoutInfo,setShowBurnoutInfo]= useState(false);

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
    bg:      isDarkMode ? '#111111' : '#f9fafb',
    card:    isDarkMode ? '#1f1f22' : '#ffffff',
    text:    isDarkMode ? '#d1d5db' : '#27272a',
    heading: isDarkMode ? '#f9fafb' : '#111111',
    border:  isDarkMode ? '#27272a' : '#e5e7eb',
    muted:   isDarkMode ? '#6b7280' : '#9ca3af',
    hover:   isDarkMode ? '#27272a' : '#f3f4f6',
    input:   isDarkMode ? '#111111' : '#f9fafb',
    sidebar: isDarkMode ? '#0a0a0a' : '#f8f9fa',
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger:  '#ef4444',
  };

  const inp = (disabled = false) => ({
    padding: '8px 12px', borderRadius: '6px',
    border: `1px solid ${c.border}`, background: disabled ? (isDarkMode ? '#0a0a0a' : '#f3f4f6') : c.input,
    color: disabled ? c.muted : c.heading, fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  });

  // â”€â”€ Fetch team + burnout settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Compute burnout for all members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Fetch linked user profile when selecting a member â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!selectedMember?.linked_user_id) { setLinkedProfile(null); return; }
    setLoadingProfile(true);
    supabase.from('user_profiles').select('*').eq('id', selectedMember.linked_user_id).maybeSingle()
      .then(({ data }) => { setLinkedProfile(data || null); setLoadingProfile(false); });
  }, [selectedMember?.linked_user_id]);

  // â”€â”€ Save member â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Filtered list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filtered = members.filter(m =>
    (m.name  || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.role  || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const getInitials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const ministriesForMember = (m) => Array.isArray(m.ministries) ? m.ministries : [];

  // â”€â”€ Merge profile (linked user_profile overrides team_member fields) â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div style={{ height: 'calc(100vh - 108px)', display: 'flex', flexDirection: 'column', background: c.bg, overflow: 'hidden' }}>

      {/* â”€â”€ Burnout alert banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isAdmin && burnoutEnabled && burnoutQueue.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.1)', borderBottom: `1px solid rgba(245,158,11,0.3)`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <AlertTriangle size={16} color={c.warning} />
          <span style={{ fontSize: '13px', color: isDarkMode ? '#fcd34d' : '#92400e', flex: 1 }}>
            <strong>{burnoutQueue.length}</strong> volunteer{burnoutQueue.length !== 1 ? 's' : ''} may need a Sabbath rest — review and notify them.
          </span>
          <button
            onClick={() => {
              const links = burnoutQueue
                .filter(m => m.email)
                .map(m => `mailto:${m.email}?subject=You%27ve%20been%20scheduled%20for%20a%20rest&body=Hi%20${encodeURIComponent(m.name)}%2C%0A%0AWe%20appreciate%20everything%20you%20do!%20To%20prevent%20burnout%2C%20we%27re%20giving%20you%20the%20next%202%20weeks%20off%20from%20serving.%20Enjoy%20some%20time%20as%20a%20congregant!%0A%0ABlessings%2C%0ALeadership%20Team`);
              links.forEach((url, i) => setTimeout(() => window.open(url), i * 400));
            }}
            style={{ border: `1px solid rgba(245,158,11,0.4)`, borderRadius: '6px', padding: '5px 14px', background: 'transparent', color: isDarkMode ? '#fcd34d' : '#92400e', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Mail size={13} /> Review & Send Emails
          </button>
        </div>
      )}

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ padding: '18px 24px', background: c.card, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: c.heading }}>Team Roster</h1>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: c.muted }}>{members.length} members</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={15} color={c.muted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            placeholder="Search name, role, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp(), paddingLeft: '32px', width: '220px' }}
          />
        </div>
        {burnoutEnabled && (
          <button
            onClick={() => setShowBurnoutInfo(v => !v)}
            style={{ border: `1px solid ${c.border}`, borderRadius: '6px', padding: '7px 12px', background: 'transparent', color: c.muted, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Heart size={13} /> Sabbath Feature
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => { setShowInviteModal(true); setInviteResult(null); }}
            style={{ border: `1px solid ${c.border}`, borderRadius: '7px', padding: '8px 16px', background: 'transparent', color: c.text, fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={15} /> Invite
          </button>
        )}
        {isEditor && (
          <button
            onClick={() => openEdit()}
            style={{ border: 'none', borderRadius: '7px', padding: '8px 16px', background: c.primary, color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} /> Add Person
          </button>
        )}
      </div>

      {/* Burnout info panel */}
      {showBurnoutInfo && (
        <div style={{ background: '#ffffff', border: `1px solid rgba(245,158,11,0.3)`, borderLeft: 'none', borderRight: 'none', padding: '14px 24px', flexShrink: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#111111', marginBottom: '4px' }}>The Sabbath Feature — Guidelines</div>
          <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#374151', marginBottom: '8px' }}>”God ordained us humans to rest a day from work. Churches are no different when it comes to volunteers.”</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px', fontSize: '12px', color: '#374151' }}>
            <span>🟡 Warning: {warningThreshold}+ consecutive Sundays serving</span>
            <span>🔴 Needs Sabbath Rest: {autoThreshold}+ serves in the last 60 days (14-day break)</span>
            <span>🔵 Sabbath Break: temporarily resting, not to be scheduled</span>
            <span>✓ Aim for at least 1 Sunday/month as a congregant, not a server</span>
          </div>
        </div>
      )}

      {/* â”€â”€ Table + Profile Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: c.muted }}>Loading team…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: c.muted }}>
              {search ? 'No matches found.' : 'No team members yet. Click "Add Person" to get started.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: isDarkMode ? '#0a0a0a' : '#f8fafc', borderBottom: `2px solid ${c.border}` }}>
                  {['Name', 'Role', 'Phone', 'Email', 'Ministries', 'Last Serve', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: c.muted, whiteSpace: 'nowrap' }}>
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
                        background: isSelected ? (isDarkMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)') : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = c.hover; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Name + Avatar */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isDarkMode ? '#27272a' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: c.muted, flexShrink: 0, overflow: 'hidden' }}>
                            {member.avatar_url
                              ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : getInitials(member.name)}
                          </div>
                          <span style={{ fontWeight: '600', color: c.heading }}>{member.name}</span>
                          {isSelected && <ChevronRight size={14} color={c.primary} />}
                        </div>
                      </td>
                      {/* Role */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {member.role
                          ? <span style={{ background: isDarkMode ? '#27272a' : '#f3f4f6', color: c.text, padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{member.role}</span>
                          : <span style={{ color: c.muted }}>—</span>}
                      </td>
                      {/* Phone */}
                      <td style={{ padding: '12px 16px', color: c.muted, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {member.phone || '—'}
                      </td>
                      {/* Email */}
                      <td style={{ padding: '12px 16px', color: c.muted, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.email || '—'}
                      </td>
                      {/* Ministries */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {mins.slice(0, 3).map((mn, i) => (
                            <span key={i} style={{ fontSize: '11px', background: 'rgba(59,130,246,0.1)', color: c.primary, padding: '1px 7px', borderRadius: '10px', whiteSpace: 'nowrap' }}>{mn}</span>
                          ))}
                          {mins.length > 3 && <span style={{ fontSize: '11px', color: c.muted }}>+{mins.length - 3}</span>}
                          {mins.length === 0 && <span style={{ color: c.muted }}>—</span>}
                        </div>
                      </td>
                      {/* Last Serve */}
                      <td style={{ padding: '12px 16px', color: c.muted, whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {b.lastServe ? formatDate(b.lastServe) : '—'}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {burnoutEnabled ? (
                          <span style={{ fontSize: '11px', fontWeight: '700', color: sm.color, background: sm.bg, padding: '3px 10px', borderRadius: '20px' }}>
                            {sm.icon} {sm.label}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: c.muted }}>—</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                          {isEditor && (
                            <button onClick={() => openEdit(member)} style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: '5px', padding: '5px 7px', cursor: 'pointer', color: c.text, display: 'flex', alignItems: 'center' }}>
                              <Edit2 size={13} />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDelete(member.id)} style={{ background: 'none', border: `1px solid ${c.border}`, borderRadius: '5px', padding: '5px 7px', cursor: 'pointer', color: c.danger, display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={13} />
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

        {/* â”€â”€ Profile Side Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {selectedMember && (
          <div style={{
            width: '380px', flexShrink: 0, borderLeft: `1px solid ${c.border}`,
            background: c.card, display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Panel header */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, fontWeight: '700', fontSize: '14px', color: c.heading }}>Profile</div>
              {isEditor && (
                <button onClick={() => openEdit(selectedMember)} style={{ border: `1px solid ${c.border}`, borderRadius: '6px', padding: '5px 10px', background: 'transparent', color: c.text, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Edit2 size={12} /> Edit
                </button>
              )}
              <button onClick={() => setSelectedMember(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', flex: 1 }}>
              {/* Avatar + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: isDarkMode ? '#27272a' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: c.muted, flexShrink: 0, overflow: 'hidden', border: `2px solid ${c.border}` }}>
                  {(mergedProfile?.avatar_url)
                    ? <img src={mergedProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(mergedProfile?.name || selectedMember.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', fontSize: '17px', color: c.heading }}>
                    {mergedProfile?.display_name || selectedMember.name}
                  </div>
                  {selectedMember.role && (
                    <div style={{ fontSize: '12px', color: c.primary, fontWeight: '600', marginTop: '2px' }}>{selectedMember.role}</div>
                  )}
                  {burnoutEnabled && (() => {
                    const b = burnoutMap[selectedMember.id];
                    const sm = STATUS_META[b?.status] || STATUS_META.active;
                    return (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: sm.color, background: sm.bg, padding: '2px 8px', borderRadius: '20px', display: 'inline-block', marginTop: '4px' }}>
                        {sm.icon} {sm.label}
                      </span>
                    );
                  })()}
                  {loadingProfile && <div style={{ fontSize: '11px', color: c.muted, marginTop: '4px' }}>Loading linked profile…</div>}
                  {linkedProfile && <div style={{ fontSize: '11px', color: c.success, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}><CheckCircle size={11} /> Linked Account</div>}
                </div>
              </div>

              {/* Contact */}
              <SectionBlock title="Contact" icon={<Phone size={13} />} c={c}>
                <InfoRow icon={<Mail size={13} />} label="Email" value={selectedMember.email}
                  action={selectedMember.email ? <a href={`mailto:${selectedMember.email}`} style={{ color: c.primary, display: 'flex', alignItems: 'center' }}><ExternalLink size={12} /></a> : null} />
                <InfoRow icon={<Phone size={13} />} label="Phone" value={selectedMember.phone} />
              </SectionBlock>

              {/* Personal */}
              <SectionBlock title="Personal" icon={<User size={13} />} c={c}>
                <InfoRow icon={<Calendar size={13} />} label="Date of Birth" value={mergedProfile?.date_of_birth ? formatDate(mergedProfile.date_of_birth) : null} />
                {(mergedProfile?.bio) && (
                  <div style={{ fontSize: '13px', color: c.text, marginTop: '8px', lineHeight: '1.6' }}>{mergedProfile.bio}</div>
                )}
                {Array.isArray(selectedMember.household) && selectedMember.household.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', marginBottom: '6px' }}>Household</div>
                    {selectedMember.household.map((h, i) => (
                      <div key={i} style={{ fontSize: '12px', color: c.text, marginBottom: '3px' }}>
                        {h.name} <span style={{ color: c.muted }}>· {h.relationship}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionBlock>

              {/* Ministry */}
              <SectionBlock title="Ministry" icon={<Star size={13} />} c={c}>
                {ministriesForMember(selectedMember).length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ministriesForMember(selectedMember).map((mn, i) => (
                      <span key={i} style={{ fontSize: '12px', background: 'rgba(59,130,246,0.1)', color: c.primary, padding: '3px 10px', borderRadius: '20px' }}>{mn}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '13px', color: c.muted, fontStyle: 'italic' }}>No ministries assigned</span>
                )}
                {selectedMember.notes && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: c.muted, background: isDarkMode ? '#111111' : '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${c.border}` }}>
                    <strong>Notes:</strong> {selectedMember.notes}
                  </div>
                )}
              </SectionBlock>

              {/* Serve Stats */}
              {burnoutEnabled && (() => {
                const b = burnoutMap[selectedMember.id];
                if (!b) return null;
                return (
                  <SectionBlock title="Serve Stats" icon={<Clock size={13} />} c={c}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <StatChip label="Total Serves" value={b.totalServes} c={c} />
                      <StatChip label="Last 60 Days" value={b.serves60} c={c} accent={b.serves60 >= autoThreshold ? c.danger : b.serves60 >= autoThreshold - 2 ? c.warning : null} />
                      <StatChip label="Consec. Sundays" value={b.consecutiveSundays} c={c} accent={b.consecutiveSundays >= warningThreshold ? c.warning : null} />
                    </div>
                    {b.lastServe && (
                      <div style={{ fontSize: '12px', color: c.muted }}>Last served: {formatDate(b.lastServe)}</div>
                    )}
                    {selectedMember.available_until && new Date(selectedMember.available_until) > new Date() && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: c.primary, background: 'rgba(59,130,246,0.1)', padding: '6px 10px', borderRadius: '6px' }}>
                        On break until {formatDate(selectedMember.available_until)}
                      </div>
                    )}
                    {isAdmin && b.status === 'burnout' && !(selectedMember.available_until && new Date(selectedMember.available_until) > new Date()) && (
                      <button
                        onClick={() => triggerBreak(selectedMember)}
                        style={{ marginTop: '10px', width: '100%', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: '6px', padding: '7px 12px', background: 'rgba(239,68,68,0.08)', color: c.danger, fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Heart size={13} /> Schedule 14-Day Break
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
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, color: c.text, textDecoration: 'none', fontSize: '13px', fontWeight: '600', background: 'transparent' }}
                  >
                    <Mail size={14} color={c.primary} /> Send Email
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Edit / Add modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: c.card, borderRadius: '14px', border: `1px solid ${c.border}`, width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: '700', fontSize: '16px', color: c.heading }}>
                {editingMember ? 'Edit Member' : 'Add Team Member'}
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '5px' }}>Full Name *</label>
                  <input style={inp()} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '5px' }}>Email</label>
                  <input style={inp()} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@church.com" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '5px' }}>Phone</label>
                  <input style={inp()} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '5px' }}>Role / Position</label>
                  <input style={inp()} list="role-list" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Vocalist" />
                  <datalist id="role-list">
                    {(orgPositions.length > 0 ? orgPositions : ROLES).map(r => <option key={r} value={r} />)}
                  </datalist>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '5px' }}>Date of Birth</label>
                  <input style={inp()} type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '5px' }}>Bio</label>
                  <textarea style={{ ...inp(), minHeight: '70px', resize: 'vertical' }} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio…" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '5px' }}>Notes (admin only)</label>
                  <textarea style={{ ...inp(), minHeight: '55px', resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes…" />
                </div>
              </div>

              {/* Ministries */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '8px' }}>Ministries</label>
                <MinistryTagInput tags={form.ministries} onChange={tags => setForm(f => ({ ...f, ministries: tags }))} c={c} inp={inp} />
              </div>

              {/* Household */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: c.text }}>Household</label>
                  <button onClick={() => setForm(f => ({ ...f, household: [...f.household, { name: '', relationship: '' }] }))}
                    style={{ fontSize: '12px', color: c.primary, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Plus size={12} /> Add
                  </button>
                </div>
                {form.household.map((h, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input style={inp()} value={h.name} onChange={e => { const hh = [...form.household]; hh[i] = { ...hh[i], name: e.target.value }; setForm(f => ({ ...f, household: hh })); }} placeholder="Name" />
                    <input style={inp()} value={h.relationship} onChange={e => { const hh = [...form.household]; hh[i] = { ...hh[i], relationship: e.target.value }; setForm(f => ({ ...f, household: hh })); }} placeholder="Relationship" />
                    <button onClick={() => setForm(f => ({ ...f, household: f.household.filter((_, idx) => idx !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.danger, display: 'flex', alignItems: 'center', padding: '2px' }}><X size={14} /></button>
                  </div>
                ))}
                {form.household.length === 0 && <div style={{ fontSize: '12px', color: c.muted, fontStyle: 'italic' }}>No household members added.</div>}
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowEditModal(false)} style={{ border: `1px solid ${c.border}`, borderRadius: '7px', padding: '8px 18px', background: 'transparent', color: c.text, fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ border: 'none', borderRadius: '7px', padding: '8px 20px', background: c.primary, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', opacity: (saving || !form.name.trim()) ? 0.65 : 1 }}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '16px', width: 'min(440px,100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: c.heading }}>Invite to Team</h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: c.muted }}>They'll receive an email with a signup link.</p>
              </div>
              <button onClick={() => { setShowInviteModal(false); setInviteResult(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: c.muted, padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Success state */}
              {inviteResult && !inviteResult.error && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 10px', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: c.heading }}>Invite sent!</p>
                    {inviteResult.warning && (
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#f59e0b' }}>{inviteResult.warning}</p>
                    )}
                  </div>
                  {inviteResult.url && (
                    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
                      <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invite Link</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: c.text, flex: 1, wordBreak: 'break-all' }}>{inviteResult.url}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(inviteResult.url)}
                          style={{ background: 'transparent', border: `1px solid ${c.border}`, borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: c.muted, flexShrink: 0 }}
                          title="Copy link"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setInviteResult(null); }} style={{ padding: '8px 16px', borderRadius: '7px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      Send Another
                    </button>
                    <button onClick={() => { setShowInviteModal(false); setInviteResult(null); }} style={{ padding: '8px 16px', borderRadius: '7px', border: 'none', background: c.primary, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* Form */}
              {(!inviteResult || inviteResult.error) && (
                <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Name (optional)</label>
                    <input
                      value={inviteForm.name}
                      onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Smith"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Email *</label>
                    <input
                      required type="email"
                      value={inviteForm.email}
                      onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="jane@example.com"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Role</label>
                    <select
                      value={inviteForm.role}
                      onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
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
                    <div style={{ background: isDarkMode ? '#1a1a1a' : '#f4f4f5', border: `1px solid ${c.border}`, borderRadius: '10px', padding: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: c.heading, marginBottom: '12px' }}>Guest Access Settings</div>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Duration</div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[1, 2, 3].map(w => (
                            <button key={w} type="button" onClick={() => setInviteForm(f => ({ ...f, guestWeeks: w }))}
                              style={{ flex: 1, padding: '7px', borderRadius: '7px', border: `1px solid ${inviteForm.guestWeeks === w ? c.primary : c.border}`, background: inviteForm.guestWeeks === w ? `${c.primary}18` : 'transparent', color: inviteForm.guestWeeks === w ? c.primary : c.text, fontWeight: inviteForm.guestWeeks === w ? '700' : '500', fontSize: '12px', cursor: 'pointer' }}>
                              {w} week{w > 1 ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>What can they access?</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {[
                            { key: 'teams',      label: 'Teams',              desc: 'Team roster for their week' },
                            { key: 'planner',    label: 'Planner',            desc: 'Assigned service plans' },
                            { key: 'production', label: 'Stage & Production', desc: 'Stage, lighting, rehearsals' },
                            { key: 'songs',      label: 'Songs',              desc: 'Song library' },
                          ].map(({ key, label, desc }) => (
                            <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', borderRadius: '7px', border: `1px solid ${inviteForm.guestPerms[key] ? c.primary : c.border}`, background: inviteForm.guestPerms[key] ? `${c.primary}10` : 'transparent', cursor: 'pointer' }}>
                              <input type="checkbox" checked={inviteForm.guestPerms[key]}
                                onChange={e => setInviteForm(f => ({ ...f, guestPerms: { ...f.guestPerms, [key]: e.target.checked } }))}
                                style={{ marginTop: '2px', flexShrink: 0, accentColor: c.primary }} />
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: c.heading }}>{label}</div>
                                <div style={{ fontSize: '10px', color: c.muted, marginTop: '1px' }}>{desc}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: '10px', color: c.muted }}>Billing and Admin are always blocked for guests.</p>
                      </div>
                    </div>
                  )}
                  {inviteResult?.error && (
                    <div style={{ fontSize: '13px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
                      {inviteResult.error}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                    <button type="button" onClick={() => { setShowInviteModal(false); setInviteResult(null); }} style={{ padding: '8px 18px', borderRadius: '7px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={inviteSending || !inviteForm.email.trim()} style={{ padding: '8px 20px', borderRadius: '7px', border: 'none', background: c.primary, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', opacity: (inviteSending || !inviteForm.email.trim()) ? 0.65 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserPlus size={14} /> {inviteSending ? 'Sending…' : 'Send Invite'}
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
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '14px', padding: '28px', width: 'min(380px,100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: '700', color: c.heading }}>New Position Detected</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: c.muted, lineHeight: '1.6' }}>
              <em>{addPositionPrompt.role}</em> is not in your org's position list yet. Add it so others can reuse it?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setAddPositionPrompt(null); addPositionPrompt.resolve(false); }}
                style={{ padding: '8px 18px', borderRadius: '7px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                No, skip
              </button>
              <button
                onClick={() => { setAddPositionPrompt(null); addPositionPrompt.resolve(true); }}
                style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', background: c.primary, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                Yes, add it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ Small sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SectionBlock({ title, icon, children, c }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', paddingBottom: '6px', borderBottom: `1px solid ${c.border}` }}>
        <span style={{ color: c.primary }}>{icon}</span>
        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: c.muted }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value, action }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px', fontSize: '13px' }}>
      <span style={{ opacity: 0.5, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#6b7280', flexShrink: 0, minWidth: '60px' }}>{label}</span>
      <span style={{ flex: 1, fontWeight: '500' }}>{value}</span>
      {action}
    </div>
  );
}

function StatChip({ label, value, c, accent }) {
  return (
    <div style={{ background: accent ? `${accent}18` : (c.bg), border: `1px solid ${accent || c.border}`, borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: '800', color: accent || c.heading }}>{value}</div>
      <div style={{ fontSize: '10px', color: c.muted, marginTop: '2px' }}>{label}</div>
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {tags.map((t, i) => (
          <span key={i} style={{ fontSize: '12px', background: 'rgba(59,130,246,0.1)', color: c.primary, padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {t}
            <button onClick={() => onChange(tags.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.primary, padding: 0, display: 'flex', lineHeight: 1 }}><X size={11} /></button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          style={{ ...inp(), flex: 1 }}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(inputVal); } }}
          placeholder="Type a ministry and press Enter…"
        />
        <button onClick={() => addTag(inputVal)} style={{ border: `1px solid ${c.border}`, borderRadius: '6px', padding: '6px 12px', background: 'transparent', color: c.text, fontSize: '12px', cursor: 'pointer' }}>Add</button>
      </div>
    </div>
  );
}
