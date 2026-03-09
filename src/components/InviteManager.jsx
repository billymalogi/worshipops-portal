import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  Plus, Copy, Trash2, Check, Mail, Link, Users, Clock,
  ChevronDown, ChevronRight, Save, Image, Bold, Italic,
  Underline, AlignLeft, AlignCenter, AlignRight, List,
  ListOrdered, Link2, Upload, X,
} from 'lucide-react';

const TEMPLATE_KEY = 'worshipops_invite_template';

const DEFAULT_SUBJECT = "You're invited to beta test WorshipOps";

const DEFAULT_BODY_HTML = `<p>Hi <strong>[First Name]</strong>,</p>
<p>[Write your personal message here]</p>
<p>Click the link below to create your account and get started:</p>
<p><strong>{invite_link}</strong></p>
<p>This link is for you only — please don't share it.</p>
<p>Looking forward to hearing your thoughts!</p>
<p>Billy<br>WorshipOps</p>`;

export default function InviteManager({ isDarkMode, session }) {
  const [invites,         setInvites]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [creating,        setCreating]        = useState(false);
  const [inviteEmail,     setInviteEmail]     = useState('');
  const [inviteNote,      setInviteNote]      = useState('');
  const [copiedId,        setCopiedId]        = useState(null);
  const [copiedBodyId,    setCopiedBodyId]    = useState(null);
  const [sendingEmailId,  setSendingEmailId]  = useState(null);
  const [sentEmailId,     setSentEmailId]     = useState(null);
  const [showForm,        setShowForm]        = useState(false);
  const [showTemplate,    setShowTemplate]    = useState(false);
  const [templateSubject, setTemplateSubject] = useState(DEFAULT_SUBJECT);
  const [templateSaved,   setTemplateSaved]   = useState(false);
  const [editorInitHtml,  setEditorInitHtml]  = useState('');
  const [showImgModal,    setShowImgModal]    = useState(false);
  const [imgUrl,          setImgUrl]          = useState('');
  const [imgWidth,        setImgWidth]        = useState('');

  const editorRef   = useRef(null);
  const fileRef     = useRef(null);

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

  // ── Load saved template ───────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(TEMPLATE_KEY);
    let html    = DEFAULT_BODY_HTML;
    let subject = DEFAULT_SUBJECT;
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.subject) subject = p.subject;
        if (p.body)    html    = p.body;
      } catch {}
    }
    setTemplateSubject(subject);
    setEditorInitHtml(html);
  }, []);

  // ── Populate editor when panel opens ─────────────────────
  useEffect(() => {
    if (showTemplate && editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = editorInitHtml || DEFAULT_BODY_HTML;
    }
  }, [showTemplate, editorInitHtml]);

  const handleSaveTemplate = () => {
    const html = editorRef.current?.innerHTML || '';
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify({ subject: templateSubject, body: html }));
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  };

  // ── execCommand helper (keeps editor focus) ───────────────
  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const SUPABASE_URL = 'https://whlmswwvbyysolaxihez.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobG1zd3d2Ynl5c29sYXhpaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTMwNzcsImV4cCI6MjA4MTUyOTA3N30.cOl0v_qwTcDytpg5fjXX__njOz8hOZkaX0ICqnBXfcw';

  // ── Send email via Resend, fallback to clipboard + mailto ──
  const handleSendEmail = async (invite) => {
    if (!invite.invited_email) return;
    const inviteUrl = getInviteUrl(invite.token);
    const rawHtml   = editorRef.current?.innerHTML || '';
    const finalHtml = rawHtml.replace(
      /\{invite_link\}/g,
      `<a href="${inviteUrl}" style="color:#3b82f6;font-weight:600">${inviteUrl}</a>`
    );

    setSendingEmailId(invite.id);
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-beta-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${sess?.access_token}`,
        },
        body: JSON.stringify({
          toEmail:  invite.invited_email,
          subject:  templateSubject,
          htmlBody: finalHtml,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSentEmailId(invite.id);
      setTimeout(() => setSentEmailId(null), 4000);
    } catch {
      // Fallback: clipboard + mailto
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': new Blob([finalHtml], { type: 'text/html' }) }),
        ]);
        setCopiedBodyId(invite.id);
        setTimeout(() => setCopiedBodyId(null), 5000);
      } catch {}
      window.open(
        `mailto:${invite.invited_email}?subject=${encodeURIComponent(templateSubject)}`,
        '_blank'
      );
    }
    setSendingEmailId(null);
  };

  // ── Insert image by URL ───────────────────────────────────
  const handleInsertImgUrl = () => {
    if (!imgUrl.trim()) return;
    const style = imgWidth ? `max-width:${imgWidth}px;width:100%;height:auto;` : `max-width:100%;height:auto;`;
    exec('insertHTML', `<img src="${imgUrl}" style="${style}" />`);
    setShowImgModal(false);
    setImgUrl('');
    setImgWidth('');
  };

  // ── Insert image from file (base64) ──────────────────────
  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => exec('insertImage', ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Insert link ───────────────────────────────────────────
  const handleInsertLink = () => {
    const url = prompt('Enter URL (include https://):');
    if (url) exec('createLink', url);
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

  // ── Toolbar primitives ────────────────────────────────────
  const TB = ({ onClick, title, children }) => (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        padding: '4px 7px', border: `1px solid ${c.border}`, borderRadius: '5px',
        background: 'transparent', color: c.text, cursor: 'pointer',
        fontSize: '12px', fontWeight: '600',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
        minWidth: '28px',
      }}
    >
      {children}
    </button>
  );

  const Sep = () => (
    <div style={{ width: '1px', background: c.border, margin: '2px 4px', alignSelf: 'stretch' }} />
  );

  const selStyle = {
    padding: '4px 6px', borderRadius: '5px', border: `1px solid ${c.border}`,
    background: c.input, color: c.heading, fontSize: '11px', cursor: 'pointer',
    outline: 'none',
  };

  // ── Invite row ───────────────────────────────────────────
  const InviteRow = ({ invite }) => {
    const isUsed      = !!invite.used_at;
    const isRevoked   = !invite.is_active && !invite.used_at;
    const bodyWasCopied = copiedBodyId  === invite.id;
    const isSending   = sendingEmailId  === invite.id;
    const wasSent     = sentEmailId     === invite.id;

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', borderRadius: '10px',
        border: `1px solid ${c.border}`, background: c.card,
        marginBottom: '8px', opacity: isUsed || isRevoked ? 0.65 : 1,
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: isUsed ? c.green : isRevoked ? c.red : c.blue }} />

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
            {isUsed && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={10} /> Used {formatDate(invite.used_at)}</span>}
            {invite.note && <span style={{ fontStyle: 'italic', opacity: 0.8 }}>{invite.note}</span>}
          </div>
          {!isUsed && !isRevoked && (
            <code style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: c.text, background: c.input, padding: '3px 8px', borderRadius: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}>
              {getInviteUrl(invite.token)}
            </code>
          )}
          {bodyWasCopied && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: c.green, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={11} /> Email body copied — paste it (Ctrl+V) into the email window that just opened.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {!isUsed && !isRevoked && (
            <>
              {invite.invited_email && (
                <button
                  onClick={() => handleSendEmail(invite)}
                  disabled={isSending}
                  title="Send invite email via Resend"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, background: wasSent ? 'rgba(16,185,129,0.1)' : bodyWasCopied ? 'rgba(59,130,246,0.08)' : c.input, color: wasSent ? c.green : c.blue, fontSize: '12px', fontWeight: '600', cursor: isSending ? 'not-allowed' : 'pointer', opacity: isSending ? 0.6 : 1 }}
                >
                  <Mail size={13} />
                  {isSending ? 'Sending…' : wasSent ? 'Sent!' : bodyWasCopied ? 'Copied! (fallback)' : 'Send Email'}
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
            Generate secret invite links for beta testers. Each link is single-use and places the user under the{' '}
            <strong style={{ color: c.heading }}>Beta Tester Admin</strong> organization with full access.
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
            <span style={{ fontSize: '11px', color: c.text, fontWeight: '400' }}>— compose your invite email here</span>
          </div>
          {showTemplate ? <ChevronDown size={15} style={{ color: c.text }} /> : <ChevronRight size={15} style={{ color: c.text }} />}
        </button>

        <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${c.border}`, display: showTemplate ? 'block' : 'none' }}>
            <p style={{ margin: '14px 0 16px', fontSize: '12px', color: c.text, lineHeight: '1.6' }}>
              Compose your email below with full formatting. Use{' '}
              <code style={{ background: c.input, padding: '1px 6px', borderRadius: '4px', fontSize: '11px', color: c.blue }}>{'{invite_link}'}</code>
              {' '}as a placeholder — it will be swapped for the unique invite URL when you click "Send Email".
              Clicking "Send Email" copies the formatted body to your clipboard and opens your email client — just paste it in.
            </p>

            {/* Subject */}
            <div style={{ marginBottom: '14px' }}>
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

              {/* ── Toolbar ── */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center',
                padding: '8px 10px', background: c.hover,
                border: `1px solid ${c.border}`, borderBottom: 'none',
                borderRadius: '8px 8px 0 0',
              }}>
                {/* Text style */}
                <TB onClick={() => exec('bold')}          title="Bold">          <Bold size={12} /></TB>
                <TB onClick={() => exec('italic')}        title="Italic">        <Italic size={12} /></TB>
                <TB onClick={() => exec('underline')}     title="Underline">     <Underline size={12} /></TB>
                <TB onClick={() => exec('strikeThrough')} title="Strikethrough"> <s style={{ fontSize: '11px', lineHeight: 1 }}>S</s></TB>

                <Sep />

                {/* Font family */}
                <select
                  style={selStyle}
                  title="Font family"
                  onChange={e => { exec('fontName', e.target.value); e.target.selectedIndex = 0; }}
                  defaultValue=""
                >
                  <option value="" disabled>Font</option>
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Trebuchet MS">Trebuchet</option>
                  <option value="Courier New">Monospace</option>
                </select>

                {/* Font size */}
                <select
                  style={selStyle}
                  title="Font size"
                  onChange={e => { exec('fontSize', e.target.value); e.target.selectedIndex = 0; }}
                  defaultValue=""
                >
                  <option value="" disabled>Size</option>
                  <option value="1">Tiny</option>
                  <option value="2">Small</option>
                  <option value="3">Normal</option>
                  <option value="4">Medium</option>
                  <option value="5">Large</option>
                  <option value="6">X-Large</option>
                  <option value="7">Huge</option>
                </select>

                {/* Text color */}
                <label
                  title="Text color"
                  style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '3px 6px', border: `1px solid ${c.border}`, borderRadius: '5px', background: 'transparent' }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '800', color: c.heading }}>A</span>
                  <input
                    type="color"
                    defaultValue="#f3f4f6"
                    onChange={e => exec('foreColor', e.target.value)}
                    style={{ width: '16px', height: '16px', border: 'none', padding: 0, cursor: 'pointer', background: 'transparent', borderRadius: '3px' }}
                  />
                </label>

                {/* Background/highlight color */}
                <label
                  title="Highlight color"
                  style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '3px 6px', border: `1px solid ${c.border}`, borderRadius: '5px', background: 'transparent' }}
                >
                  <span style={{ fontSize: '10px', fontWeight: '800', color: c.heading, background: '#fbbf24', padding: '0 3px', borderRadius: '2px' }}>A</span>
                  <input
                    type="color"
                    defaultValue="#fbbf24"
                    onChange={e => exec('hiliteColor', e.target.value)}
                    style={{ width: '16px', height: '16px', border: 'none', padding: 0, cursor: 'pointer', background: 'transparent', borderRadius: '3px' }}
                  />
                </label>

                <Sep />

                {/* Alignment */}
                <TB onClick={() => exec('justifyLeft')}   title="Align left">   <AlignLeft size={12} /></TB>
                <TB onClick={() => exec('justifyCenter')} title="Center">       <AlignCenter size={12} /></TB>
                <TB onClick={() => exec('justifyRight')}  title="Align right">  <AlignRight size={12} /></TB>

                <Sep />

                {/* Lists */}
                <TB onClick={() => exec('insertUnorderedList')} title="Bullet list">   <List size={12} /></TB>
                <TB onClick={() => exec('insertOrderedList')}   title="Numbered list"> <ListOrdered size={12} /></TB>

                <Sep />

                {/* Indent */}
                <TB onClick={() => exec('indent')}   title="Indent">   <span style={{ fontSize: '11px' }}>→</span></TB>
                <TB onClick={() => exec('outdent')}  title="Outdent">  <span style={{ fontSize: '11px' }}>←</span></TB>

                <Sep />

                {/* Link & image */}
                <TB onClick={handleInsertLink}           title="Insert link">  <Link2 size={12} /></TB>
                <TB onClick={() => setShowImgModal(true)} title="Insert image"> <Image size={12} /></TB>

                {/* Hidden file input */}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
                <TB onClick={() => fileRef.current?.click()} title="Upload image from computer">
                  <Upload size={12} />
                </TB>

                <Sep />

                {/* Horizontal rule */}
                <TB onClick={() => exec('insertHorizontalRule')} title="Insert divider">
                  <span style={{ fontSize: '11px' }}>—</span>
                </TB>
              </div>

              {/* ── Image Insert Modal ── */}
              {showImgModal && (
                <div style={{
                  border: `1px solid ${c.border}`, background: c.card,
                  borderRadius: '0', padding: '12px 14px', borderTop: 'none',
                  display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end',
                }}>
                  <div style={{ flex: '2 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: c.text, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Image URL</label>
                    <input
                      autoFocus
                      value={imgUrl}
                      onChange={e => setImgUrl(e.target.value)}
                      placeholder="https://example.com/meme.jpg"
                      onKeyDown={e => e.key === 'Enter' && handleInsertImgUrl()}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: `1px solid ${c.border}`, background: c.input, color: c.heading, fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: '0 0 100px' }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '600', color: c.text, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Width (px)</label>
                    <input
                      value={imgWidth}
                      onChange={e => setImgWidth(e.target.value)}
                      placeholder="500"
                      type="number"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: `1px solid ${c.border}`, background: c.input, color: c.heading, fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button
                    onMouseDown={e => { e.preventDefault(); handleInsertImgUrl(); }}
                    style={{ padding: '7px 16px', borderRadius: '6px', background: c.blue, color: '#fff', fontWeight: '700', fontSize: '12px', border: 'none', cursor: 'pointer' }}
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => { setShowImgModal(false); setImgUrl(''); setImgWidth(''); }}
                    style={{ padding: '7px 10px', borderRadius: '6px', background: 'transparent', color: c.text, fontSize: '12px', border: `1px solid ${c.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* ── ContentEditable Editor ── */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                style={{
                  minHeight: '300px', padding: '16px',
                  outline: 'none', color: c.heading,
                  fontSize: '14px', lineHeight: '1.8',
                  background: c.input,
                  border: `1px solid ${c.border}`,
                  borderTop: showImgModal ? 'none' : undefined,
                  borderRadius: showImgModal ? '0 0 8px 8px' : '0 0 8px 8px',
                  overflowY: 'auto', wordBreak: 'break-word',
                  fontFamily: 'Arial, sans-serif',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleSaveTemplate}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '7px', background: templateSaved ? 'rgba(16,185,129,0.1)' : c.blue, color: templateSaved ? c.green : '#fff', fontWeight: '700', fontSize: '12px', border: templateSaved ? `1px solid ${c.green}` : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {templateSaved ? <Check size={13} /> : <Save size={13} />}
                {templateSaved ? 'Saved!' : 'Save Template'}
              </button>
              <span style={{ fontSize: '11px', color: c.text }}>
                Tip: Save often. Your template is stored in this browser.
              </span>
            </div>
          </div>
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
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Email (optional)</label>
              <input
                type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="tester@example.com"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: `1px solid ${c.border}`, background: c.input, color: c.heading, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Note (optional)</label>
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
