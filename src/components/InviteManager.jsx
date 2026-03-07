import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Copy, Trash2, Check, Mail, Link, Users, Clock, ChevronDown, ChevronRight, Save } from 'lucide-react';

const TEMPLATE_KEY = 'worshipops_invite_template';

const DEFAULT_SUBJECT = 'You\'re invited to beta test WorshipOps';
const DEFAULT_BODY =
`Hi [First Name],

[Write your personal message here]

Click the link below to create your account and get started:

{invite_link}

This link is for you only — please don't share it.

Looking forward to hearing your thoughts!

Billy
WorshipOps`;

export default function InviteManager({ isDarkMode, session }) {
  const [invites,         setInvites]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [creating,        setCreating]        = useState(false);
  const [inviteEmail,     setInviteEmail]     = useState('');
  const [inviteNote,      setInviteNote]      = useState('');
  const [copiedId,        setCopiedId]        = useState(null);
  const [showForm,        setShowForm]        = useState(false);
  const [showTemplate,    setShowTemplate]    = useState(false);
  const [templateSubject, setTemplateSubject] = useState(DEFAULT_SUBJECT);
  const [templateBody,    setTemplateBody]    = useState(DEFAULT_BODY);
  const [templateSaved,   setTemplateSaved]   = useState(false);

  const c = {
    bg:      isDarkMode ? '#000000' : '#F7F8FA',
    card:    isDarkMode ? '#111111' : '#FFFFFF',
    text:    isDarkMode ? '#A1A1AA' : '#52525B',
    heading: isDarkMode ? '#EDEDED' : '#09090B',
    border:  isDarkMode ? '#27272A' : '#E4E4E7',
    hover:   isDarkMode ? '#1F1F22' : '#F4F4F5',
    input:   isDarkMode ? '#18181B' : '#F4F4F5',
    green:   '#10B981',
    red:     '#EF4444',
    blue:    '#3B82F6',
  };

  const getInviteUrl = (token) => `${window.location.origin}/invite/${token}`;

  // ── Load saved template from localStorage ────────────────
  useEffect(() => {
    const saved = localStorage.getItem(TEMPLATE_KEY);
    if (saved) {
      try {
        const { subject, body } = JSON.parse(saved);
        if (subject) setTemplateSubject(subject);
        if (body)    setTemplateBody(body);
      } catch {}
    }
  }, []);

  const handleSaveTemplate = () => {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify({ subject: templateSubject, body: templateBody }));
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  };

  // ── Open email client with template pre-filled ───────────
  const handleSendEmail = (invite) => {
    const inviteUrl  = getInviteUrl(invite.token);
    const body       = templateBody.replace(/\{invite_link\}/g, inviteUrl);
    const mailto     = `mailto:${invite.invited_email || ''}?subject=${encodeURIComponent(templateSubject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  // ── Load invites ─────────────────────────────────────────
  const loadInvites = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('beta_invitations')
      .select('*')
      .order('created_at', { ascending: false });
    setInvites(data || []);
    setLoading(false);
  };

  useEffect(() => { loadInvites(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    const { error } = await supabase.from('beta_invitations').insert([{
      invited_email: inviteEmail.trim() || null,
      note:          inviteNote.trim()  || null,
      invited_by:    session?.user?.id,
    }]);
    if (!error) {
      setInviteEmail('');
      setInviteNote('');
      setShowForm(false);
      loadInvites();
    }
    setCreating(false);
  };

  const handleCopy = (token, id) => {
    navigator.clipboard.writeText(getInviteUrl(token));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this invite link? It can no longer be used.')) return;
    await supabase.from('beta_invitations').update({ is_active: false }).eq('id', id);
    loadInvites();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this invite record?')) return;
    await supabase.from('beta_invitations').delete().eq('id', id);
    loadInvites();
  };

  const active  = invites.filter(i =>  i.is_active && !i.used_at);
  const used    = invites.filter(i =>  i.used_at);
  const revoked = invites.filter(i => !i.is_active && !i.used_at);

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  // ── Invite row ───────────────────────────────────────────
  const InviteRow = ({ invite }) => {
    const isUsed    = !!invite.used_at;
    const isRevoked = !invite.is_active && !invite.used_at;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', borderRadius: '10px',
        border: `1px solid ${c.border}`, background: c.card,
        marginBottom: '8px', opacity: isUsed || isRevoked ? 0.65 : 1,
      }}>
        {/* Status dot */}
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: isUsed ? c.green : isRevoked ? c.red : c.blue }} />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: c.heading, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {invite.invited_email ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={12} style={{ opacity: 0.6 }} />
                {invite.invited_email}
              </span>
            ) : (
              <span style={{ color: c.text, fontStyle: 'italic', fontWeight: '400' }}>No email specified</span>
            )}
            {isUsed    && <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(16,185,129,0.12)', color: c.green, padding: '2px 8px', borderRadius: '20px' }}>USED</span>}
            {isRevoked && <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(239,68,68,0.1)',   color: c.red,   padding: '2px 8px', borderRadius: '20px' }}>REVOKED</span>}
          </div>
          <div style={{ fontSize: '11px', color: c.text, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} /> Created {formatDate(invite.created_at)}</span>
            {isUsed    && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={10} /> Used {formatDate(invite.used_at)}</span>}
            {invite.note && <span style={{ fontStyle: 'italic', opacity: 0.8 }}>{invite.note}</span>}
          </div>
          {!isUsed && !isRevoked && (
            <code style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: c.text, background: c.input, padding: '3px 8px', borderRadius: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}>
              {getInviteUrl(invite.token)}
            </code>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {!isUsed && !isRevoked && (
            <>
              {/* Send Email — only shown when invite has an email */}
              {invite.invited_email && (
                <button
                  onClick={() => handleSendEmail(invite)}
                  title="Open email client with template"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, background: c.input, color: c.blue, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Mail size={13} /> Send Email
                </button>
              )}
              <button
                onClick={() => handleCopy(invite.token, invite.id)}
                title="Copy invite link"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, background: copiedId === invite.id ? 'rgba(16,185,129,0.1)' : c.input, color: copiedId === invite.id ? c.green : c.text, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                {copiedId === invite.id ? <Check size={13} /> : <Copy size={13} />}
                {copiedId === invite.id ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => handleRevoke(invite.id)}
                title="Revoke invite"
                style={{ padding: '6px 10px', borderRadius: '7px', border: `1px solid ${c.border}`, background: 'transparent', color: c.red, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          {(isUsed || isRevoked) && (
            <button
              onClick={() => handleDelete(invite.id)}
              title="Delete record"
              style={{ padding: '6px 10px', borderRadius: '7px', border: `1px solid ${c.border}`, background: 'transparent', color: c.text, opacity: 0.5, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: c.heading, letterSpacing: '-0.5px' }}>
            Beta Invitations
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: c.text, lineHeight: '1.5' }}>
            Generate secret invite links for beta testers. Each link is single-use and places the user under the <strong style={{ color: c.heading }}>Beta Tester Admin</strong> organization with full access.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '9px', background: c.blue, color: '#fff', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: '20px' }}
        >
          <Plus size={15} /> New Invite
        </button>
      </div>

      {/* ── Email Template Editor ── */}
      <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '12px', marginBottom: '24px', overflow: 'hidden' }}>
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', color: c.heading }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={14} style={{ color: c.blue }} />
            <span style={{ fontSize: '13px', fontWeight: '700' }}>Email Template</span>
            <span style={{ fontSize: '11px', color: c.text, fontWeight: '400' }}>— write your invite email here</span>
          </div>
          {showTemplate ? <ChevronDown size={15} style={{ color: c.text }} /> : <ChevronRight size={15} style={{ color: c.text }} />}
        </button>

        {showTemplate && (
          <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${c.border}` }}>
            <p style={{ margin: '14px 0 16px', fontSize: '12px', color: c.text, lineHeight: '1.6' }}>
              Write your email below. Use <code style={{ background: c.input, padding: '1px 6px', borderRadius: '4px', fontSize: '11px', color: c.blue }}>{'{invite_link}'}</code> anywhere in the body — it will be automatically replaced with the unique invite URL when you click "Send Email".
            </p>

            {/* Subject */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Subject
              </label>
              <input
                value={templateSubject}
                onChange={e => setTemplateSubject(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, background: c.input, color: c.heading, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Body */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Body
              </label>
              <textarea
                value={templateBody}
                onChange={e => setTemplateBody(e.target.value)}
                rows={14}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, background: c.input, color: c.heading, fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace', lineHeight: '1.6' }}
              />
            </div>

            <button
              onClick={handleSaveTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '7px', background: templateSaved ? 'rgba(16,185,129,0.1)' : c.blue, color: templateSaved ? c.green : '#fff', fontWeight: '700', fontSize: '12px', border: templateSaved ? `1px solid ${c.green}` : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {templateSaved ? <Check size={13} /> : <Save size={13} />}
              {templateSaved ? 'Saved!' : 'Save Template'}
            </button>
          </div>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}
        >
          <div style={{ fontSize: '13px', fontWeight: '700', color: c.heading, marginBottom: '14px' }}>New Invite Link</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Email (optional)
              </label>
              <input
                type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="tester@example.com"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, background: c.input, color: c.heading, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Note (optional)
              </label>
              <input
                type="text" value={inviteNote} onChange={e => setInviteNote(e.target.value)}
                placeholder="e.g. Worship Director at Grace Church"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, background: c.input, color: c.heading, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit" disabled={creating}
              style={{ padding: '9px 20px', borderRadius: '7px', background: c.blue, color: '#fff', fontWeight: '700', fontSize: '13px', border: 'none', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}
            >
              {creating ? 'Generating...' : 'Generate Link'}
            </button>
            <button
              type="button" onClick={() => setShowForm(false)}
              style={{ padding: '9px 16px', borderRadius: '7px', background: 'transparent', color: c.text, fontWeight: '600', fontSize: '13px', border: `1px solid ${c.border}`, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Active',  value: active.length,  color: c.blue },
          { label: 'Used',    value: used.length,    color: c.green },
          { label: 'Revoked', value: revoked.length, color: c.red },
        ].map(s => (
          <div key={s.label} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: c.text, marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: c.text }}>Loading invites...</div>
      ) : invites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: c.text }}>
          <Link size={36} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: c.heading, marginBottom: '6px' }}>No invites yet</div>
          <div style={{ fontSize: '13px' }}>Generate your first invite link above.</div>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={11} /> Active ({active.length})
              </div>
              {active.map(i => <InviteRow key={i.id} invite={i} />)}
            </div>
          )}
          {used.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Used ({used.length})
              </div>
              {used.map(i => <InviteRow key={i.id} invite={i} />)}
            </div>
          )}
          {revoked.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Revoked ({revoked.length})
              </div>
              {revoked.map(i => <InviteRow key={i.id} invite={i} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
