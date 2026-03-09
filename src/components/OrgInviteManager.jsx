import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  UserPlus, Copy, Trash2, Check, Mail, Clock, Users,
  Link, RotateCcw, X, CheckCircle2, AlertCircle,
} from 'lucide-react';

export default function OrgInviteManager({ isDarkMode, orgId, session }) {
  const [invites,      setInvites]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState({ name: '', email: '', role: 'volunteer', guestWeeks: 1, guestPerms: { teams: false, planner: false, production: false, songs: false } });
  const [sending,      setSending]      = useState(false);
  const [sendResult,   setSendResult]   = useState(null); // { url, error }
  const [copiedId,     setCopiedId]     = useState(null);
  const [resendingId,  setResendingId]  = useState(null);

  const c = {
    bg:      isDarkMode ? '#000000' : '#F7F8FA',
    card:    isDarkMode ? '#111111' : '#FFFFFF',
    text:    isDarkMode ? '#A1A1AA' : '#52525B',
    heading: isDarkMode ? '#EDEDED' : '#09090B',
    border:  isDarkMode ? '#27272A' : '#E4E4E7',
    hover:   isDarkMode ? '#1F1F22' : '#F4F4F5',
    input:   isDarkMode ? '#18181B' : '#F4F4F5',
    primary: '#3B82F6',
    green:   '#10B981',
    red:     '#EF4444',
    amber:   '#F59E0B',
  };

  const inp = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: `1px solid ${c.border}`, background: c.input,
    color: c.heading, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: '600', color: c.text,
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px',
  };

  const SUPABASE_URL = 'https://whlmswwvbyysolaxihez.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobG1zd3d2Ynl5c29sYXhpaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTMwNzcsImV4cCI6MjA4MTUyOTA3N30.cOl0v_qwTcDytpg5fjXX__njOz8hOZkaX0ICqnBXfcw';

  const loadInvites = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('org_invitations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    setInvites(data || []);
    setLoading(false);
  };

  useEffect(() => { if (orgId) loadInvites(); }, [orgId]);

  const callSendFn = async (email, name, role, permissions, guestDurationWeeks) => {
    const { data: { session: sess } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-org-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${sess?.access_token}`,
      },
      body: JSON.stringify({ organizationId: orgId, email, name, role, permissions: permissions || {}, guestDurationWeeks: guestDurationWeeks || 1 }),
    });
    return res.json();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    try {
      const isGuest = form.role === 'guest';
      const json = await callSendFn(
        form.email.trim(),
        form.name.trim() || null,
        form.role,
        isGuest ? form.guestPerms : {},
        isGuest ? form.guestWeeks : 1,
      );
      if (json.error) {
        setSendResult({ error: json.error });
      } else {
        setSendResult({ url: json.inviteUrl, warning: json.warning });
        setForm({ name: '', email: '', role: 'volunteer', guestWeeks: 1, guestPerms: { teams: false, planner: false, production: false, songs: false } });
        loadInvites();
      }
    } catch (err) {
      setSendResult({ error: `Network error: ${err.message}` });
    }
    setSending(false);
  };

  const handleResend = async (invite) => {
    setResendingId(invite.id);
    try {
      await callSendFn(invite.email, invite.name, invite.role, invite.permissions || {}, invite.guest_duration_weeks || 1);
    } catch {}
    setResendingId(null);
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this invite? The link will no longer work.')) return;
    await supabase.from('org_invitations').delete().eq('id', id);
    loadInvites();
  };

  const handleCopy = (invite) => {
    const url = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const isExpired = (inv) => !inv.accepted_at && new Date(inv.expires_at) < new Date();

  const pending  = invites.filter(i => !i.accepted_at && !isExpired(i));
  const accepted = invites.filter(i =>  i.accepted_at);
  const expired  = invites.filter(i =>  isExpired(i));

  const ROLE_LABELS = {
    volunteer:        'Volunteer',
    weekly_scheduler: 'Weekly Scheduler',
    schedule_viewer:  'Schedule Viewer',
    music_director:   'Music Director',
    campus_leader:    'Campus Leader',
    org_leader:       'Org Leader',
    leader:           'Ministry Leader',
    guest:            'Guest (Temporary)',
  };

  const InviteRow = ({ invite }) => {
    const acc = !!invite.accepted_at;
    const exp = isExpired(invite);
    const url = `${window.location.origin}/invite/${invite.token}`;

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', borderRadius: '10px',
        border: `1px solid ${c.border}`, background: c.card,
        marginBottom: '8px',
      }}>
        {/* Status dot */}
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: acc ? c.green : exp ? c.amber : c.primary }} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: c.heading }}>
              {invite.name || invite.email}
            </span>
            {invite.name && (
              <span style={{ fontSize: '12px', color: c.text }}>{invite.email}</span>
            )}
            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px',
              background: acc ? 'rgba(16,185,129,0.12)' : exp ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
              color:      acc ? c.green                 : exp ? c.amber                 : c.primary,
            }}>
              {acc ? 'ACCEPTED' : exp ? 'EXPIRED' : 'PENDING'}
            </span>
            <span style={{ fontSize: '11px', color: c.text, background: c.hover, padding: '1px 7px', borderRadius: '20px' }}>
              {ROLE_LABELS[invite.role] || invite.role}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: c.text, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={10} /> Sent {formatDate(invite.created_at)}
            </span>
            {acc && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: c.green }}>
                <CheckCircle2 size={10} /> Accepted {formatDate(invite.accepted_at)}
              </span>
            )}
            {exp && !acc && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: c.amber }}>
                <AlertCircle size={10} /> Expired {formatDate(invite.expires_at)}
              </span>
            )}
          </div>
          {!acc && !exp && (
            <code style={{ display: 'block', marginTop: '5px', fontSize: '11px', color: c.text, background: c.input, padding: '3px 8px', borderRadius: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px' }}>
              {url}
            </code>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {!acc && !exp && (
            <>
              <button
                onClick={() => handleCopy(invite)}
                title="Copy invite link"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, background: copiedId === invite.id ? 'rgba(16,185,129,0.1)' : c.input, color: copiedId === invite.id ? c.green : c.text, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                {copiedId === invite.id ? <Check size={13} /> : <Copy size={13} />}
                {copiedId === invite.id ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => handleResend(invite)}
                disabled={resendingId === invite.id}
                title="Resend invite email"
                style={{ padding: '6px 10px', borderRadius: '7px', border: `1px solid ${c.border}`, background: 'transparent', color: c.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: resendingId === invite.id ? 0.5 : 1 }}
              >
                <RotateCcw size={13} />
              </button>
            </>
          )}
          <button
            onClick={() => handleRevoke(invite.id)}
            title={acc ? 'Delete record' : 'Revoke invite'}
            style={{ padding: '6px 10px', borderRadius: '7px', border: `1px solid ${c.border}`, background: 'transparent', color: c.red, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '32px', maxWidth: '820px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: c.heading, letterSpacing: '-0.5px' }}>
            Invitations
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: c.text, lineHeight: '1.5' }}>
            Invite volunteers and leaders to join your organization. They'll receive an email with a signup link.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSendResult(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '9px', background: c.primary, color: '#fff', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: '20px' }}
        >
          <UserPlus size={15} /> Invite Person
        </button>
      </div>

      {/* Send form */}
      {showForm && (
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: c.heading }}>New Invitation</span>
            <button onClick={() => { setShowForm(false); setSendResult(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: c.text, padding: '4px', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>

          {/* Success */}
          {sendResult && !sendResult.error && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: sendResult.url ? '10px' : 0 }}>
                <CheckCircle2 size={16} color={c.green} />
                <span style={{ fontSize: '13px', fontWeight: '600', color: c.green }}>
                  {sendResult.warning ? 'Invite created (email not sent — Resend not configured)' : 'Invite sent successfully!'}
                </span>
              </div>
              {sendResult.warning && (
                <p style={{ margin: '4px 0 10px', fontSize: '12px', color: c.amber }}>{sendResult.warning}</p>
              )}
              {sendResult.url && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: c.input, borderRadius: '7px', padding: '8px 12px' }}>
                  <code style={{ flex: 1, fontSize: '12px', color: c.text, wordBreak: 'break-all' }}>{sendResult.url}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(sendResult.url)}
                    style={{ background: 'transparent', border: `1px solid ${c.border}`, borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: c.text, flexShrink: 0 }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {sendResult?.error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: c.red }}>
              {sendResult.error}
            </div>
          )}

          <form onSubmit={handleSend} style={{ display: 'grid', gridTemplateColumns: form.role === 'guest' ? '1fr 1fr 1fr' : '1fr 1fr 160px', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Name (optional)</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" style={inp} />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" style={inp} />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inp}>
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
            {form.role === 'guest' && (
              <div style={{ gridColumn: '1 / -1', background: c.hover, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: c.heading, marginBottom: '14px' }}>Guest Access Settings</div>

                {/* Duration */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Access Duration</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, guestWeeks: w }))}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${form.guestWeeks === w ? c.primary : c.border}`, background: form.guestWeeks === w ? `${c.primary}18` : 'transparent', color: form.guestWeeks === w ? c.primary : c.text, fontWeight: form.guestWeeks === w ? '700' : '500', fontSize: '13px', cursor: 'pointer' }}
                      >
                        {w} week{w > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: c.text }}>Access automatically expires after {form.guestWeeks} week{form.guestWeeks > 1 ? 's' : ''}. Max 3 weeks.</p>
                </div>

                {/* Permissions */}
                <div>
                  <label style={labelStyle}>What can they access?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { key: 'teams',      label: 'Teams',             desc: 'View & edit team roster for their week' },
                      { key: 'planner',    label: 'Planner',           desc: 'View & edit assigned service plans' },
                      { key: 'production', label: 'Stage & Production', desc: 'Stage view, lighting, rehearsals' },
                      { key: 'songs',      label: 'Songs',             desc: 'Browse and edit the song library' },
                    ].map(({ key, label, desc }) => (
                      <label
                        key={key}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${form.guestPerms[key] ? c.primary : c.border}`, background: form.guestPerms[key] ? `${c.primary}10` : 'transparent', cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={form.guestPerms[key]}
                          onChange={e => setForm(f => ({ ...f, guestPerms: { ...f.guestPerms, [key]: e.target.checked } }))}
                          style={{ marginTop: '1px', flexShrink: 0, accentColor: c.primary }}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: c.heading }}>{label}</div>
                          <div style={{ fontSize: '11px', color: c.text, marginTop: '2px' }}>{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: c.text }}>Guests never get access to Billing or Admin settings.</p>
                </div>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <button type="button" onClick={() => { setShowForm(false); setSendResult(null); }} style={{ padding: '9px 18px', borderRadius: '8px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={sending || !form.email.trim()} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: c.primary, color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: (sending || !form.email.trim()) ? 0.65 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={14} /> {sending ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Pending',  value: pending.length,  color: c.primary },
          { label: 'Accepted', value: accepted.length, color: c.green },
          { label: 'Expired',  value: expired.length,  color: c.amber },
        ].map(s => (
          <div key={s.label} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '26px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: c.text, marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: c.text }}>Loading invitations...</div>
      ) : invites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: c.text }}>
          <Users size={40} style={{ opacity: 0.25, margin: '0 auto 14px', display: 'block' }} />
          <div style={{ fontSize: '15px', fontWeight: '700', color: c.heading, marginBottom: '6px' }}>No invitations yet</div>
          <div style={{ fontSize: '13px' }}>Click "Invite Person" to send your first invite.</div>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Link size={11} /> Pending ({pending.length})
              </div>
              {pending.map(i => <InviteRow key={i.id} invite={i} />)}
            </div>
          )}
          {accepted.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={11} /> Accepted ({accepted.length})
              </div>
              {accepted.map(i => <InviteRow key={i.id} invite={i} />)}
            </div>
          )}
          {expired.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={11} /> Expired ({expired.length})
              </div>
              {expired.map(i => <InviteRow key={i.id} invite={i} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
