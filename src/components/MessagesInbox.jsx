import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  Loader2, Trash2, ChevronLeft, Send, Bell, MessageSquare, RefreshCw
} from 'lucide-react';

/**
 * MessagesInbox
 * Props:
 *   memberId        — team_members.id of current user
 *   recipientAuthId — auth.uid() of current user (for RLS)
 *   orgId           — organization_id (for composing messages)
 *   session         — Supabase session
 *   colors          — Dashboard color object
 *   isDarkMode      — boolean
 *   onUnreadChange  — (count) => void  called when unread count changes
 */
export default function MessagesInbox({
  memberId, recipientAuthId, orgId, session, colors, isDarkMode, onUnreadChange
}) {
  const [messages, setMessages]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null); // full message view
  const [composing, setComposing]   = useState(false);
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending]       = useState(false);
  const [leaders, setLeaders]       = useState([]);
  const [toMember, setToMember]     = useState(null);

  const c = colors;

  // ── Fetch messages ───────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!recipientAuthId) return;
    const { data, error } = await supabase
      .from('member_messages')
      .select('*')
      .eq('recipient_auth_id', recipientAuthId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMessages(data);
      const unread = data.filter(m => !m.is_read).length;
      onUnreadChange?.(unread);
    }
    setLoading(false);
  }, [recipientAuthId, onUnreadChange]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ── Realtime: new messages ───────────────────────────────────────────
  useEffect(() => {
    if (!recipientAuthId) return;
    const channel = supabase
      .channel('member-messages-inbox')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'member_messages',
        filter: `recipient_auth_id=eq.${recipientAuthId}`
      }, payload => {
        setMessages(prev => {
          const updated = [payload.new, ...prev];
          const unread = updated.filter(m => !m.is_read).length;
          onUnreadChange?.(unread);
          return updated;
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [recipientAuthId, onUnreadChange]);

  // ── Fetch leaders for compose ────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    const fetchLeaders = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, display_name, role, team_member_id')
        .eq('organization_id', orgId)
        .in('role', ['admin', 'org_leader', 'leader']);
      if (data) setLeaders(data);
    };
    fetchLeaders();
  }, [orgId]);

  // ── Mark as read ─────────────────────────────────────────────────────
  const markRead = async (msg) => {
    if (msg.is_read) return;
    await supabase.from('member_messages').update({ is_read: true }).eq('id', msg.id);
    setMessages(prev => {
      const updated = prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m);
      onUnreadChange?.(updated.filter(m => !m.is_read).length);
      return updated;
    });
  };

  // ── Delete ───────────────────────────────────────────────────────────
  const deleteMsg = async (id, e) => {
    e.stopPropagation();
    await supabase.from('member_messages').delete().eq('id', id);
    setMessages(prev => {
      const updated = prev.filter(m => m.id !== id);
      onUnreadChange?.(updated.filter(m => !m.is_read).length);
      return updated;
    });
    if (selected?.id === id) setSelected(null);
  };

  // ── Open message ─────────────────────────────────────────────────────
  const openMsg = (msg) => {
    setSelected(msg);
    markRead(msg);
  };

  // ── Send message to leader ────────────────────────────────────────────
  const sendMessage = async () => {
    if (!composeBody.trim() || !toMember) return;
    setSending(true);
    try {
      // Find recipient team_member and auth id
      const target = leaders.find(l => l.id === toMember);
      if (!target) return;

      // Get their auth id from user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', toMember)
        .single();

      // Get their team_member id
      const { data: myProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .single();

      const senderName = myProfile?.display_name || session.user.email;

      await supabase.from('member_messages').insert({
        organization_id:     orgId,
        recipient_member_id: target.team_member_id || null,
        recipient_auth_id:   toMember, // user_profiles.id = auth.uid()
        sender_auth_id:      session.user.id,
        sender_name:         senderName,
        subject:             'Message from team member',
        body:                composeBody.trim(),
        message_type:        'direct'
      });

      setComposeBody('');
      setComposing(false);
      setToMember(null);
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  const fmtDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const typeIcon = (type) => type === 'notification'
    ? <Bell size={13} style={{ flexShrink: 0 }} />
    : <MessageSquare size={13} style={{ flexShrink: 0 }} />;

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: `1px solid ${c.border}`, background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
    color: c.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box'
  };

  // ── Compose view ─────────────────────────────────────────────────────
  if (composing) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => { setComposing(false); setComposeBody(''); setToMember(null); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, display: 'flex', padding: '4px' }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontWeight: '700', fontSize: '14px', color: c.heading }}>New Message</span>
      </div>

      <div>
        <label style={{ fontSize: '11px', fontWeight: '700', color: c.text, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
          To
        </label>
        {leaders.length === 0 ? (
          <div style={{
            padding: '10px 12px', borderRadius: '8px', border: `1px solid ${c.border}`,
            fontSize: '13px', color: c.text, opacity: 0.5
          }}>
            No leaders found in your organization
          </div>
        ) : (
          <select
            value={toMember || ''}
            onChange={e => setToMember(e.target.value || null)}
            style={{ ...inputStyle, appearance: 'auto' }}
          >
            <option value="">Select a leader...</option>
            {leaders.map(l => (
              <option key={l.id} value={l.id}>
                {l.display_name || l.id} ({l.role})
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <label style={{ fontSize: '11px', fontWeight: '700', color: c.text, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
          Message
        </label>
        <textarea
          value={composeBody}
          onChange={e => setComposeBody(e.target.value)}
          placeholder="Type your message..."
          style={{
            ...inputStyle, flex: 1, resize: 'none', lineHeight: '1.5',
            minHeight: '120px', fontFamily: 'inherit'
          }}
        />
      </div>

      <button
        onClick={sendMessage}
        disabled={sending || !composeBody.trim() || !toMember}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '11px', borderRadius: '10px', border: 'none',
          background: c.primary, color: '#fff',
          fontWeight: '600', fontSize: '14px', cursor: 'pointer',
          opacity: (sending || !composeBody.trim() || !toMember) ? 0.5 : 1
        }}
      >
        {sending ? <Loader2 size={15} /> : <Send size={15} />}
        {sending ? 'Sending...' : 'Send Message'}
      </button>
    </div>
  );

  // ── Detail view ──────────────────────────────────────────────────────
  if (selected) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setSelected(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, display: 'flex', padding: '4px' }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontWeight: '700', fontSize: '14px', color: c.heading, flex: 1 }}>
          {selected.subject}
        </span>
        <button
          onClick={(e) => { deleteMsg(selected.id, e); setSelected(null); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', padding: '4px' }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div style={{
        background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        borderRadius: '10px', padding: '14px 16px', marginBottom: '16px',
        border: `1px solid ${c.border}`
      }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: c.heading, marginBottom: '2px' }}>
          {selected.sender_name}
        </div>
        <div style={{ fontSize: '11px', color: c.text, opacity: 0.5 }}>
          {new Date(selected.created_at).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit'
          })}
        </div>
      </div>

      <div style={{ flex: 1, fontSize: '14px', color: c.text, lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>
        {selected.body}
      </div>
    </div>
  );

  // ── List view ────────────────────────────────────────────────────────
  const unread = messages.filter(m => !m.is_read).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {unread > 0 && (
            <span style={{
              fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px',
              background: `${c.primary}22`, color: c.primary
            }}>
              {unread} unread
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={fetchMessages}
            title="Refresh"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, display: 'flex', padding: '5px', borderRadius: '6px' }}
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setComposing(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px', border: 'none',
              background: c.primary, color: '#fff',
              fontSize: '12px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            <Send size={12} /> Message Leader
          </button>
        </div>
      </div>

      {/* Message list */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: c.text, opacity: 0.5 }}>
          <Loader2 size={16} style={{ marginRight: '8px' }} /> Loading...
        </div>
      ) : messages.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '10px',
          color: c.text, opacity: 0.4, fontSize: '13px'
        }}>
          <Bell size={32} />
          No messages yet
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', margin: '0 -4px' }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              onClick={() => openMsg(msg)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 8px', borderRadius: '10px',
                cursor: 'pointer', marginBottom: '2px',
                background: !msg.is_read
                  ? (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                  : 'transparent',
                borderLeft: !msg.is_read ? `3px solid ${c.primary}` : '3px solid transparent',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = !msg.is_read
                ? (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
                : 'transparent'
              }
            >
              {/* Icon */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.primary
              }}>
                {typeIcon(msg.message_type)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{
                    fontSize: '13px', fontWeight: msg.is_read ? '500' : '700',
                    color: c.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {msg.subject}
                  </div>
                  <div style={{ fontSize: '11px', color: c.text, opacity: 0.5, flexShrink: 0 }}>
                    {fmtDate(msg.created_at)}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: c.text, opacity: 0.6, marginTop: '2px' }}>
                  {msg.sender_name}
                </div>
                <div style={{
                  fontSize: '12px', color: c.text, opacity: 0.5, marginTop: '3px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {msg.body}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => deleteMsg(msg.id, e)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: c.text, opacity: 0.3, display: 'flex', padding: '4px', flexShrink: 0,
                  borderRadius: '6px'
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#EF4444'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 0.3; e.currentTarget.style.color = c.text; }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
