/**
 * ChatPanel — Slide-in service chat panel.
 *
 * Features:
 *   - Global + per-section threads (from service header rows), dropdown selector
 *   - Silent background polling (spinner only on first load / thread switch)
 *   - Sender name + timestamp shown on ALL messages
 *   - Alert mode: admin/leader can send high-priority alerts (red styling)
 *   - Alert cross-screen notifications via window CustomEvent
 *   - Pinned messages bar at top
 *   - @mention highlighting
 *   - Media/image upload (drag-drop or file picker) → Supabase Storage 'chat-media' bucket
 *   - Feature toggles (admin): alerts, pins, media, @mentions — persisted to organizations.chat_features
 *   - initialThread prop: open directly to a specific thread
 *   - "Send to Phones" (admin/leader): Twilio SMS or WhatsApp modal
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  AlertCircle, Bell, CheckCircle2, ChevronDown,
  Globe, Image, Loader2, MessageSquare, Paperclip, Phone,
  Pin, Send, Settings, Smartphone, Upload, Users, X,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const ts = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const dateLabel = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function getMinistriesFromItems(items = []) {
  const set = new Set();
  for (const item of items) {
    if (item.type === 'header' && item.title) set.add(item.title.trim());
    else if (item.role || item.ministry) set.add((item.role || item.ministry).trim());
  }
  return [...set].filter(Boolean).sort();
}

// Parse @mentions in message text → highlighted spans
function renderText(text, primary) {
  if (!text) return null;
  return text.split(/(@\w[\w.]*)/g).map((part, i) =>
    /^@\w/.test(part)
      ? <span key={i} style={{ color: primary, fontWeight: '700' }}>{part}</span>
      : part
  );
}

const DEFAULT_FEATURES = { alerts: true, pins: true, media: true, mentions: true };

// ─── main component ──────────────────────────────────────────────────────────
export default function ChatPanel({
  isOpen,
  onClose,
  service,
  orgId,
  session,
  userRole,
  isDarkMode,
  colors: c,
  initialThread = 'global',
}) {
  const [thread,       setThread]       = useState(initialThread);
  const [messages,     setMessages]     = useState([]);
  const [pinned,       setPinned]       = useState([]);
  const [draft,        setDraft]        = useState('');
  const [isAlertMode,  setIsAlertMode]  = useState(false);
  const [sending,      setSending]      = useState(false);
  const [initLoading,  setInitLoading]  = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showSMS,      setShowSMS]      = useState(false);
  const [features,     setFeatures]     = useState(DEFAULT_FEATURES);
  const [dragOver,     setDragOver]     = useState(false);
  const [pendingMedia, setPendingMedia] = useState(null);  // { file, previewUrl }
  const [alertBanner,  setAlertBanner]  = useState(null);  // latest alert for in-panel banner

  const messagesEndRef = useRef(null);
  const pollRef        = useRef(null);
  const inputRef       = useRef(null);
  const fileInputRef   = useRef(null);
  const firstLoadRef   = useRef(true);
  const lastAlertRef   = useRef(null);

  const serviceId    = service?.id;
  const serviceItems = Array.isArray(service?.items) ? service.items : [];
  const ministries   = getMinistriesFromItems(serviceItems);
  const threads      = ['global', ...ministries];

  const isAdminOrLeader = ['admin', 'leader'].includes(userRole);
  const senderName = session?.user?.user_metadata?.full_name
                  || session?.user?.email?.split('@')[0]
                  || 'Unknown';
  const canPost = thread === 'global' ? isAdminOrLeader : true;

  // ─── reset thread when panel opens ───────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setThread(initialThread);
      firstLoadRef.current = true;
      setMessages([]);
      setDraft('');
      setIsAlertMode(false);
      setAlertBanner(null);
    }
  }, [isOpen, initialThread]);

  // ─── load chat feature toggles from org ───────────────────────────────────
  useEffect(() => {
    if (!isOpen || !orgId) return;
    supabase.from('organizations').select('chat_features').eq('id', orgId).single()
      .then(({ data }) => {
        if (data?.chat_features) setFeatures({ ...DEFAULT_FEATURES, ...data.chat_features });
      });
  }, [isOpen, orgId]);

  // ─── load messages (silent = don't show spinner) ──────────────────────────
  const loadMessages = useCallback(async (silent = false) => {
    if (!serviceId) return;
    if (!silent) setInitLoading(true);

    const { data: msgs } = await supabase
      .from('service_chat_messages')
      .select('*')
      .eq('service_id', serviceId)
      .eq('thread', thread)
      .order('created_at', { ascending: true })
      .limit(300);

    const list = msgs || [];
    setMessages(list);

    // Pinned messages (all threads for this service)
    const { data: pins } = await supabase
      .from('service_chat_messages')
      .select('*')
      .eq('service_id', serviceId)
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .limit(5);
    setPinned(pins || []);

    // Alert detection — dispatch cross-screen event when a new alert arrives
    const latestAlert = list.filter(m => m.message_type === 'alert').slice(-1)[0];
    if (latestAlert && latestAlert.id !== lastAlertRef.current) {
      if (lastAlertRef.current !== null) {
        // A new alert arrived since last poll
        setAlertBanner(latestAlert);
        window.dispatchEvent(new CustomEvent('worship-alert', {
          detail: { ...latestAlert, serviceName: service?.name },
        }));
      }
      lastAlertRef.current = latestAlert.id;
    }

    if (!silent) {
      setInitLoading(false);
      firstLoadRef.current = false;
    }
  }, [serviceId, thread, service?.name]);

  // ─── polling: silent every 5s, spinner only on first load / thread change ─
  useEffect(() => {
    if (!isOpen || !serviceId) return;
    loadMessages(false);
    pollRef.current = setInterval(() => loadMessages(true), 5000);
    return () => { clearInterval(pollRef.current); pollRef.current = null; };
  }, [isOpen, serviceId, thread, loadMessages]);

  // ─── scroll to bottom on new messages ────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = draft.trim();
    if ((!text && !pendingMedia) || !canPost || sending) return;

    setSending(true);
    setDraft('');
    const wasAlert = isAlertMode;
    setIsAlertMode(false);

    // Upload media if pending
    let mediaUrl = null;
    if (pendingMedia) {
      const ext = pendingMedia.file.name.split('.').pop();
      const path = `${orgId}/${serviceId}/${Date.now()}.${ext}`;
      const { data: up } = await supabase.storage
        .from('chat-media')
        .upload(path, pendingMedia.file, { upsert: true });
      if (up) {
        const { data: pub } = supabase.storage.from('chat-media').getPublicUrl(path);
        mediaUrl = pub?.publicUrl || null;
      }
      setPendingMedia(null);
    }

    const { error } = await supabase.from('service_chat_messages').insert([{
      service_id:      serviceId,
      organization_id: orgId,
      sender_id:       session.user.id,
      sender_name:     senderName,
      sender_role:     userRole,
      message:         text || '',
      thread,
      message_type:    wasAlert ? 'alert' : 'text',
      media_url:       mediaUrl,
    }]);

    if (error) {
      console.error('Chat send error:', error);
      setDraft(text);
    } else {
      loadMessages(true);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── pin / unpin ──────────────────────────────────────────────────────────
  const handlePin = async (msg) => {
    await supabase
      .from('service_chat_messages')
      .update({ is_pinned: !msg.is_pinned })
      .eq('id', msg.id);
    loadMessages(true);
  };

  // ─── feature toggle ───────────────────────────────────────────────────────
  const handleToggleFeature = async (key) => {
    const updated = { ...features, [key]: !features[key] };
    setFeatures(updated);
    await supabase.from('organizations').update({ chat_features: updated }).eq('id', orgId);
  };

  // ─── media ────────────────────────────────────────────────────────────────
  const attachMedia = (file) => {
    if (!file) return;
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPendingMedia({ file, previewUrl });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) attachMedia(file);
  };

  if (!isOpen) return null;

  // ─── color shortcuts ──────────────────────────────────────────────────────
  const panelBg  = isDarkMode ? '#111111' : '#ffffff';
  const headerBg = isDarkMode ? '#0a0a0a' : '#f4f4f5';
  const borderC  = c.border;
  const muteC    = c.text;
  const alertRed = '#ef4444';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.3)' }}
      />

      {/* Panel */}
      <div
        onDragOver={e => { e.preventDefault(); if (features.media) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(440px, 100vw)',
          zIndex: 401,
          display: 'flex', flexDirection: 'column',
          background: dragOver ? (isDarkMode ? '#0f172a' : '#eff6ff') : panelBg,
          borderLeft: `1px solid ${dragOver ? c.primary : borderC}`,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.25)',
          fontFamily: 'sans-serif',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {/* Drag-drop overlay */}
        {dragOver && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: '12px' }}>
            <Upload size={40} color={c.primary} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: c.primary }}>Drop to attach</div>
          </div>
        )}

        {/* ── HEADER ── */}
        <div style={{ background: headerBg, borderBottom: `1px solid ${borderC}`, padding: '14px 16px', flexShrink: 0 }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={15} color={c.primary} />
              <span style={{ fontWeight: '700', fontSize: '13px', color: c.heading }}>
                {service?.name || 'Service Chat'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {isAdminOrLeader && (
                <>
                  {/* Feature settings */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowFeatures(v => !v)}
                      title="Chat Settings"
                      style={{ background: showFeatures ? (isDarkMode ? '#1f1f22' : '#e4e4e7') : 'transparent', border: `1px solid ${borderC}`, cursor: 'pointer', color: muteC, padding: '4px 7px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                    >
                      <Settings size={13} />
                    </button>
                    {showFeatures && (
                      <div style={{ position: 'absolute', top: '32px', right: 0, zIndex: 20, width: '210px', background: panelBg, border: `1px solid ${borderC}`, borderRadius: '10px', padding: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: muteC, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Chat Features</div>
                        {[
                          { key: 'alerts',   label: 'Alert Messages' },
                          { key: 'pins',     label: 'Pin Messages' },
                          { key: 'media',    label: 'Media & Images' },
                          { key: 'mentions', label: '@Mentions' },
                        ].map(({ key, label }) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                            <span style={{ fontSize: '13px', color: c.heading }}>{label}</span>
                            <div
                              onClick={() => handleToggleFeature(key)}
                              style={{ width: '32px', height: '18px', borderRadius: '9px', cursor: 'pointer', background: features[key] ? c.primary : (isDarkMode ? '#3f3f46' : '#d4d4d8'), position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}
                            >
                              <div style={{ position: 'absolute', top: '2px', left: features[key] ? '16px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Send to Phones */}
                  <button
                    onClick={() => setShowSMS(true)}
                    title="Send SMS / WhatsApp"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', border: `1px solid ${borderC}`, background: 'transparent', color: muteC, cursor: 'pointer' }}
                  >
                    <Phone size={11} /> Send to Phones
                  </button>
                </>
              )}
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muteC, padding: '4px' }}>
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Thread dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={thread}
              onChange={e => { setThread(e.target.value); firstLoadRef.current = true; setMessages([]); }}
              style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none', padding: '7px 32px 7px 30px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: `1px solid ${borderC}`, background: isDarkMode ? '#1f1f22' : '#f4f4f5', color: c.heading, cursor: 'pointer', outline: 'none' }}
            >
              {threads.map(t => (
                <option key={t} value={t}>{t === 'global' ? 'Global — all assigned members' : t}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: muteC, display: 'flex' }}>
              {thread === 'global' ? <Globe size={12} /> : <Users size={12} />}
            </span>
            <span style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: muteC, display: 'flex' }}>
              <ChevronDown size={12} />
            </span>
          </div>
        </div>

        {/* ── PINNED BAR ── */}
        {features.pins && pinned.length > 0 && (
          <div style={{ background: isDarkMode ? '#1c1917' : '#fefce8', borderBottom: `1px solid ${borderC}`, padding: '8px 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <Pin size={11} color="#ca8a04" />
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pinned</span>
            </div>
            {pinned.slice(0, 2).map(p => (
              <div key={p.id} style={{ fontSize: '12px', color: c.heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>
                  <strong>{p.sender_name}:</strong> {p.message}
                </span>
                {isAdminOrLeader && (
                  <button onClick={() => handlePin(p)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: muteC, padding: 0, flexShrink: 0 }}>
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── NEW ALERT BANNER ── */}
        {alertBanner && (
          <div style={{ background: 'rgba(239,68,68,0.08)', borderBottom: `2px solid ${alertRed}`, padding: '10px 14px', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <Bell size={14} color={alertRed} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: alertRed, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                New Alert — {alertBanner.sender_name}
              </div>
              <div style={{ fontSize: '12px', color: c.heading, marginTop: '2px' }}>{alertBanner.message}</div>
            </div>
            <button onClick={() => setAlertBanner(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: alertRed, padding: 0, flexShrink: 0 }}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── MESSAGES ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {initLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: muteC }}>
              <Loader2 size={16} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} /> Loading…
            </div>
          )}

          {!initLoading && messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: muteC, opacity: 0.5 }}>
              <MessageSquare size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
              <div style={{ fontSize: '13px' }}>
                {thread === 'global'
                  ? 'No messages yet. Leaders can start the conversation.'
                  : `No messages yet in the ${thread} thread.`}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isMe    = msg.sender_id === session?.user?.id;
            const isAlert = msg.message_type === 'alert';
            const showDate = i === 0 || dateLabel(messages[i-1]?.created_at) !== dateLabel(msg.created_at);
            const isImage  = msg.media_url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(msg.media_url);

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div style={{ textAlign: 'center', fontSize: '10px', color: muteC, opacity: 0.45, padding: '4px 0' }}>
                    {dateLabel(msg.created_at)}
                  </div>
                )}

                {/* ── ALERT message ── centered banner */}
                {isAlert ? (
                  <div style={{ borderRadius: '10px', border: `1.5px solid ${alertRed}`, background: 'rgba(239,68,68,0.06)', padding: '10px 14px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                      <Bell size={12} color={alertRed} />
                      <span style={{ fontSize: '10px', fontWeight: '700', color: alertRed, textTransform: 'uppercase' }}>Alert</span>
                      <span style={{ fontSize: '10px', color: muteC, opacity: 0.7 }}>— {msg.sender_name}</span>
                      <span style={{ fontSize: '10px', color: muteC, opacity: 0.4, marginLeft: 'auto' }}>{ts(msg.created_at)}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: c.heading, fontWeight: '600', lineHeight: '1.6' }}>
                      {features.mentions ? renderText(msg.message, c.primary) : msg.message}
                    </div>
                    {msg.media_url && isImage && (
                      <img src={msg.media_url} alt="attachment" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px', display: 'block' }} />
                    )}
                    {isAdminOrLeader && features.pins && (
                      <button
                        onClick={() => handlePin(msg)}
                        title={msg.is_pinned ? 'Unpin' : 'Pin'}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: msg.is_pinned ? '#ca8a04' : muteC, opacity: msg.is_pinned ? 1 : 0.35 }}
                      >
                        <Pin size={11} />
                      </button>
                    )}
                  </div>

                ) : (
                  /* ── NORMAL message ── */
                  <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    {!isMe && (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: isDarkMode ? '#27272a' : '#e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: c.heading, marginTop: '18px' }}>
                        {msg.sender_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ maxWidth: '78%' }}>
                      {/* Name + role + time */}
                      <div style={{ fontSize: '10px', color: muteC, marginBottom: '3px', paddingLeft: isMe ? 0 : '4px', paddingRight: isMe ? '4px' : 0, display: 'flex', alignItems: 'center', gap: '5px', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <span style={{ fontWeight: '600' }}>{isMe ? 'You' : msg.sender_name}</span>
                        {['admin', 'leader'].includes(msg.sender_role) && (
                          <span style={{ fontSize: '9px', color: c.primary, fontWeight: '700', textTransform: 'uppercase' }}>
                            {msg.sender_role}
                          </span>
                        )}
                        <span style={{ opacity: 0.45 }}>{ts(msg.created_at)}</span>
                      </div>
                      {/* Bubble */}
                      <div style={{ position: 'relative', padding: (msg.media_url || msg.message) ? '8px 12px' : 0, borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? c.primary : (isDarkMode ? '#1f1f22' : '#f4f4f5'), color: isMe ? '#fff' : c.heading, fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word' }}>
                        {isImage && (
                          <img src={msg.media_url} alt="attachment" style={{ maxWidth: '100%', borderRadius: '8px', display: 'block', marginBottom: msg.message ? '6px' : 0 }} />
                        )}
                        {msg.media_url && !isImage && (
                          <a href={msg.media_url} target="_blank" rel="noopener noreferrer" style={{ color: isMe ? 'rgba(255,255,255,0.9)' : c.primary, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: msg.message ? '4px' : 0 }}>
                            <Paperclip size={11} /> Attachment
                          </a>
                        )}
                        {msg.message && (
                          <span>{features.mentions ? renderText(msg.message, isMe ? 'rgba(255,255,255,0.9)' : c.primary) : msg.message}</span>
                        )}
                        {/* Pin button (appears on hover via opacity) */}
                        {isAdminOrLeader && features.pins && (
                          <button
                            onClick={() => handlePin(msg)}
                            title={msg.is_pinned ? 'Unpin' : 'Pin'}
                            style={{ position: 'absolute', top: '-8px', right: isMe ? 'auto' : '-8px', left: isMe ? '-8px' : 'auto', background: panelBg, border: `1px solid ${borderC}`, borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: msg.is_pinned ? '#ca8a04' : muteC, opacity: msg.is_pinned ? 1 : 0.3 }}
                          >
                            <Pin size={9} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ── INPUT AREA ── */}
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${borderC}`, flexShrink: 0 }}>
          {/* Pending media preview */}
          {pendingMedia && (
            <div style={{ marginBottom: '8px', position: 'relative', display: 'inline-block' }}>
              {pendingMedia.previewUrl ? (
                <img src={pendingMedia.previewUrl} alt="preview" style={{ height: '60px', borderRadius: '8px', border: `1px solid ${borderC}`, display: 'block' }} />
              ) : (
                <div style={{ padding: '6px 10px', borderRadius: '6px', background: isDarkMode ? '#1f1f22' : '#f4f4f5', fontSize: '12px', color: c.heading, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Paperclip size={12} /> {pendingMedia.file.name}
                </div>
              )}
              <button
                onClick={() => setPendingMedia(null)}
                style={{ position: 'absolute', top: '-6px', right: '-6px', background: alertRed, border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
              >
                <X size={9} />
              </button>
            </div>
          )}

          {!canPost ? (
            <div style={{ fontSize: '12px', color: muteC, opacity: 0.6, textAlign: 'center', padding: '8px' }}>
              Only admins and leaders can post in the global thread.
            </div>
          ) : (
            <>
              {/* Alert mode active badge */}
              {isAlertMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', width: 'fit-content' }}>
                  <Bell size={11} color={alertRed} />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: alertRed }}>Alert Mode</span>
                  <button onClick={() => setIsAlertMode(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: alertRed, padding: 0, lineHeight: 1 }}>
                    <X size={10} />
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                {/* Media attach */}
                {features.media && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach image or file"
                      style={{ background: 'transparent', border: `1px solid ${borderC}`, borderRadius: '8px', cursor: 'pointer', color: muteC, width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <Image size={14} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                      style={{ display: 'none' }}
                      onChange={e => attachMedia(e.target.files?.[0])}
                    />
                  </>
                )}

                {/* Alert toggle (admin/leader only) */}
                {features.alerts && isAdminOrLeader && (
                  <button
                    onClick={() => setIsAlertMode(v => !v)}
                    title="Send as Alert — notifies all members"
                    style={{ background: isAlertMode ? 'rgba(239,68,68,0.12)' : 'transparent', border: `1px solid ${isAlertMode ? alertRed : borderC}`, borderRadius: '8px', cursor: 'pointer', color: isAlertMode ? alertRed : muteC, width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                  >
                    <Bell size={14} />
                  </button>
                )}

                {/* Text input */}
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isAlertMode ? 'Type your alert message...' : `Message ${thread === 'global' ? 'everyone' : thread}…`}
                  rows={1}
                  style={{
                    flex: 1, resize: 'none',
                    border: `1px solid ${isAlertMode ? alertRed : borderC}`,
                    borderRadius: '10px', padding: '8px 12px', fontSize: '13px',
                    background: isAlertMode ? 'rgba(239,68,68,0.04)' : (isDarkMode ? '#1f1f22' : '#f9f9f9'),
                    color: c.heading, outline: 'none', fontFamily: 'inherit',
                    lineHeight: '1.5', maxHeight: '100px', overflowY: 'auto',
                    transition: 'border-color 0.15s',
                  }}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                  }}
                />

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={(!draft.trim() && !pendingMedia) || sending}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                    background: (draft.trim() || pendingMedia)
                      ? (isAlertMode ? alertRed : c.primary)
                      : (isDarkMode ? '#27272a' : '#e4e4e7'),
                    color: (draft.trim() || pendingMedia) ? '#fff' : muteC,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: (draft.trim() || pendingMedia) ? 'pointer' : 'default',
                    flexShrink: 0, transition: 'background 0.15s',
                  }}
                >
                  {sending ? <Loader2 size={14} /> : <Send size={14} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SMS / WHATSAPP MODAL */}
      {showSMS && (
        <SendToPhoneModal
          service={service}
          orgId={orgId}
          session={session}
          isDarkMode={isDarkMode}
          colors={c}
          onClose={() => setShowSMS(false)}
        />
      )}
    </>
  );
}

// ─── Send-to-Phone modal ─────────────────────────────────────────────────────
function SendToPhoneModal({ service, orgId, session, isDarkMode, colors: c, onClose }) {
  const [channel,    setChannel]    = useState('sms');
  const [recipients, setRecipients] = useState([]);
  const [message,    setMessage]    = useState('');
  const [sending,    setSending]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [hasConfig,  setHasConfig]  = useState(null);

  const bd = c.border;
  const bg = isDarkMode ? '#111111' : '#ffffff';

  useEffect(() => {
    const load = async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('twilio_account_sid, twilio_from_phone, twilio_whatsapp_from')
        .eq('id', orgId)
        .single();

      setHasConfig(!!(org?.twilio_account_sid && (org?.twilio_from_phone || org?.twilio_whatsapp_from)));

      const { data: positions } = await supabase
        .from('service_positions')
        .select('role_name, member:team_members(id, name, phone, email)')
        .eq('service_id', service.id);

      if (positions) {
        const seen = new Set();
        const list = positions
          .map(p => p.member)
          .filter(m => m && m.phone && !seen.has(m.id) && seen.add(m.id));
        setRecipients(list.map(m => ({ ...m, selected: true })));
      }

      setMessage(
        `Hi! This is a reminder about ${service.name} on ${new Date(service.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}. Please confirm your attendance. Blessings, Leadership Team`
      );
    };
    load();
  }, [service, orgId]);

  const toggleRecipient = (id) =>
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));

  const handleSend = async () => {
    const selected = recipients.filter(r => r.selected && r.phone);
    if (!selected.length || !message.trim()) return;

    setSending(true);
    setResult(null);
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      const res = await fetch(
        `${supabase.supabaseUrl}/functions/v1/send-message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.access_token}` },
          body: JSON.stringify({
            org_id:       orgId,
            service_id:   service.id,
            channel,
            recipients:   selected.map(r => ({ name: r.name, phone: r.phone })),
            message_body: message.trim(),
          }),
        }
      );
      setResult(await res.json());
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 501, width: 'min(520px, 95vw)', maxHeight: '85vh', background: bg, borderRadius: '16px', border: `1px solid ${bd}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={16} color={c.primary} />
            <span style={{ fontWeight: '700', fontSize: '15px', color: c.heading }}>Send Message</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: c.text }}><X size={18} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
          {hasConfig === false && (
            <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: isDarkMode ? '#fca5a5' : '#991b1b', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>Twilio credentials not configured. Go to <strong>Admin → Organization → Messaging</strong>.</span>
            </div>
          )}

          {/* Channel */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Send via</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ id: 'sms', label: 'SMS', icon: <Smartphone size={13} /> }, { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={13} /> }].map(opt => (
                <button key={opt.id} onClick={() => setChannel(opt.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: `1px solid ${channel === opt.id ? c.primary : bd}`, background: channel === opt.id ? (isDarkMode ? 'rgba(0,112,243,0.15)' : 'rgba(0,112,243,0.08)') : 'transparent', color: channel === opt.id ? c.primary : c.text, cursor: 'pointer' }}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Recipients ({recipients.filter(r => r.selected).length} / {recipients.length})
            </div>
            {recipients.length === 0 ? (
              <div style={{ fontSize: '13px', color: c.text, opacity: 0.6, fontStyle: 'italic' }}>No team members with phone numbers found for this service.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                {recipients.map(r => (
                  <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', background: r.selected ? (isDarkMode ? 'rgba(0,112,243,0.08)' : 'rgba(0,112,243,0.05)') : 'transparent' }}>
                    <input type="checkbox" checked={r.selected} onChange={() => toggleRecipient(r.id)} style={{ accentColor: c.primary }} />
                    <span style={{ fontSize: '13px', color: c.heading, flex: 1 }}>{r.name}</span>
                    <span style={{ fontSize: '12px', color: c.text, opacity: 0.6, fontFamily: 'monospace' }}>{r.phone}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Message</div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${bd}`, borderRadius: '8px', padding: '10px 12px', fontSize: '13px', resize: 'vertical', background: isDarkMode ? '#1f1f22' : '#f9f9f9', color: c.heading, outline: 'none', fontFamily: 'inherit', lineHeight: '1.5' }} placeholder="Type your message…" />
            <div style={{ fontSize: '11px', color: c.text, opacity: 0.5, textAlign: 'right', marginTop: '4px' }}>{message.length} chars</div>
          </div>

          {result && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', background: result.error || result.failed > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${result.error || result.failed > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, color: result.error || result.failed > 0 ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              {result.error || result.failed > 0 ? <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} /> : <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '1px' }} />}
              <span>{result.error ? result.error : `Sent to ${result.sent} recipient${result.sent !== 1 ? 's' : ''}${result.failed > 0 ? `. ${result.failed} failed.` : '.'}`}</span>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: `1px solid ${bd}`, flexShrink: 0, display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: `1px solid ${bd}`, background: 'transparent', color: c.text, fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>Close</button>
          <button onClick={handleSend} disabled={sending || !recipients.some(r => r.selected) || !message.trim() || hasConfig === false} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: c.primary, color: '#fff', fontWeight: '600', fontSize: '13px', cursor: sending || hasConfig === false ? 'not-allowed' : 'pointer', opacity: (sending || !recipients.some(r => r.selected) || hasConfig === false) ? 0.6 : 1 }}>
            {sending ? <Loader2 size={14} /> : <Send size={14} />}
            {sending ? 'Sending…' : `Send via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`}
          </button>
        </div>
      </div>
    </>
  );
}
