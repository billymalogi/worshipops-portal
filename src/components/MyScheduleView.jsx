import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Calendar, Clock, Mic2, Guitar, Loader2, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, CalendarOff, MessageSquare, Mail,
  User, HelpCircle, Lightbulb, X
} from 'lucide-react';
import MessagesInbox from './MessagesInbox';

export default function MyScheduleView({ session, isDarkMode, colors, orgId, onNavigate }) {
  const [loading, setLoading]           = useState(true);
  const [positions, setPositions]       = useState([]);
  const [member, setMember]             = useState(null);
  const [responding, setResponding]     = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBlockOut, setShowBlockOut] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadCount, setUnreadCount]   = useState(0);

  const c = colors;

  useEffect(() => { fetchData(); }, [session]);

  const fetchData = async () => {
    try {
      if (!session?.user?.email) return;

      const { data: mem } = await supabase
        .from('team_members')
        .select('id, name, email')
        .eq('email', session.user.email)
        .single();

      if (!mem) { setLoading(false); return; }
      setMember(mem);

      const { data: pos } = await supabase
        .from('service_positions')
        .select(`id, role_name, status, service:services (id, name, date, items)`)
        .eq('member_id', mem.id)
        .order('service(date)', { ascending: true });

      if (pos) {
        const now = new Date();
        const valid = pos
          .filter(p => p.service !== null)
          .filter(p => new Date(p.service.date) >= now)
          .sort((a, b) => new Date(a.service.date) - new Date(b.service.date));
        setPositions(valid);
      }
    } catch (err) {
      console.error('MyScheduleView error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (id, status) => {
    setResponding(id);
    try {
      await supabase.from('service_positions').update({ status }).eq('id', id);
      setPositions(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    } catch (err) {
      console.error(err);
    } finally {
      setResponding(null);
    }
  };

  // ── Calendar helpers ─────────────────────────────────────────────────
  const calDays = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const total    = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }, [currentMonth]);

  const serviceDays = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const set = new Set();
    positions.forEach(p => {
      const d = new Date(p.service.date);
      if (d.getFullYear() === y && d.getMonth() === m) set.add(d.getDate());
    });
    return set;
  }, [positions, currentMonth]);

  // ── Sidebar grouping ─────────────────────────────────────────────────
  const sidebarGroups = useMemo(() => {
    const groups = {};
    positions.forEach(p => {
      const d = new Date(p.service.date);
      const key = d.toLocaleDateString('en-US', {
        weekday: 'long', month: '2-digit', day: '2-digit', year: '2-digit'
      }).toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups);
  }, [positions]);

  // ── Partition by status ───────────────────────────────────────────────
  const confirmed = positions.filter(p => p.status === 'confirmed');
  const pending   = positions.filter(p => !p.status || p.status === 'pending');
  const declined  = positions.filter(p => p.status === 'declined');

  // ── Helpers ──────────────────────────────────────────────────────────
  const statusColor = s => s === 'confirmed' ? '#10B981' : s === 'declined' ? '#EF4444' : '#F59E0B';

  const fmtTime = dateStr => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const today = new Date();

  // ── Service card ─────────────────────────────────────────────────────
  const ServiceCard = ({ pos }) => {
    const d   = new Date(pos.service.date);
    const mon = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const sc  = statusColor(pos.status || 'pending');
    const busy = responding === pos.id;

    return (
      <div style={{
        background: c.card, borderRadius: '12px', border: `1px solid ${c.border}`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ height: '3px', background: sc }} />
        <div style={{ padding: '16px', flex: 1 }}>

          {/* Date + status dot */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: c.text, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {mon}
              </div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: c.heading, lineHeight: 1 }}>
                {day}
              </div>
            </div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc, marginTop: '6px' }} />
          </div>

          {/* Service name */}
          <div style={{ fontWeight: '700', fontSize: '14px', color: c.heading, marginBottom: '4px' }}>
            {pos.service.name}
          </div>

          {/* Role */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', color: c.text, opacity: 0.65, marginBottom: '10px'
          }}>
            {pos.role_name?.toLowerCase().includes('vocal') ? <Mic2 size={11} /> : <Guitar size={11} />}
            {pos.role_name}
          </div>

          {/* Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: c.text, opacity: 0.5 }}>
            <Clock size={11} />
            {fmtTime(pos.service.date)}
          </div>
        </div>

        {/* Accept / Decline */}
        {(!pos.status || pos.status === 'pending') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 14px 14px' }}>
            <button
              onClick={() => handleResponse(pos.id, 'declined')}
              disabled={busy}
              style={{
                padding: '7px', borderRadius: '8px', border: `1px solid ${c.border}`,
                background: 'transparent', color: c.text,
                fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                opacity: busy ? 0.5 : 1
              }}
            >
              <XCircle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Decline
            </button>
            <button
              onClick={() => handleResponse(pos.id, 'confirmed')}
              disabled={busy}
              style={{
                padding: '7px', borderRadius: '8px', border: 'none',
                background: c.primary, color: '#fff',
                fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                opacity: busy ? 0.5 : 1
              }}
            >
              {busy
                ? <Loader2 size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                : <CheckCircle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              }
              Accept
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Section with card grid ────────────────────────────────────────────
  const Section = ({ label, badge, badgeColor, items }) => (
    <div style={{ marginBottom: '28px' }}>
      <h3 style={{
        margin: '0 0 14px', fontSize: '13px', fontWeight: '700',
        color: c.heading, display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        {label}
        <span style={{
          fontSize: '11px', fontWeight: '700', padding: '2px 8px',
          borderRadius: '20px', background: `${badgeColor}18`, color: badgeColor
        }}>
          {items.length}
        </span>
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: '14px'
      }}>
        {items.map(p => <ServiceCard key={p.id} pos={p} />)}
      </div>
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: c.text }}>
      <Loader2 size={18} style={{ marginRight: '8px' }} /> Loading your schedule...
    </div>
  );

  // ── Sidebar icon button ───────────────────────────────────────────────
  const SideBtn = ({ icon: Icon, title, onClick }) => (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: c.text, padding: '7px', borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s'
      }}
      onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <Icon size={17} />
    </button>
  );

  // ── Action button ─────────────────────────────────────────────────────
  const ActionBtn = ({ icon: Icon, label, onClick }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 18px', borderRadius: '10px',
        border: `1px solid ${c.border}`, background: c.card,
        color: c.text, fontWeight: '600', fontSize: '13px',
        cursor: 'pointer', whiteSpace: 'nowrap'
      }}
      onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = c.card}
    >
      <Icon size={15} />
      {label}
    </button>
  );

  // ── Modal wrapper ─────────────────────────────────────────────────────
  const Modal = ({ title, onClose, children }) => (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: c.card, borderRadius: '16px', padding: '28px', width: '420px',
        border: `1px solid ${c.border}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: c.heading, fontSize: '16px', fontWeight: '700' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'sans-serif', overflow: 'hidden' }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
      <div style={{
        width: '236px', minWidth: '236px',
        borderRight: `1px solid ${c.border}`,
        background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>

        {/* Mini calendar */}
        <div style={{ padding: '16px 14px', borderBottom: `1px solid ${c.border}` }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button
              onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: '2px', display: 'flex' }}
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: '700', color: c.heading }}>{monthLabel}</span>
            <button
              onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: '2px', display: 'flex' }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '2px' }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ fontSize: '9px', fontWeight: '700', color: c.text, opacity: 0.45, padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', rowGap: '1px' }}>
            {calDays.map((day, i) => {
              const hasService = day && serviceDays.has(day);
              const isToday    = day &&
                today.getDate() === day &&
                today.getMonth() === currentMonth.getMonth() &&
                today.getFullYear() === currentMonth.getFullYear();

              return (
                <div key={i} style={{ position: 'relative', padding: '3px 0' }}>
                  <div style={{
                    width: '22px', height: '22px', margin: '0 auto',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: hasService ? '700' : '400',
                    color: isToday ? '#fff' : hasService ? c.primary : day ? c.text : 'transparent',
                    background: isToday ? c.primary : 'transparent',
                    cursor: day ? 'pointer' : 'default'
                  }}>
                    {day || ''}
                  </div>
                  {hasService && !isToday && (
                    <div style={{
                      position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)',
                      width: '3px', height: '3px', borderRadius: '50%', background: c.primary
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {sidebarGroups.length === 0
            ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: c.text, opacity: 0.4, fontSize: '12px' }}>
                No upcoming services
              </div>
            )
            : sidebarGroups.map(([label, items]) => (
              <div key={label} style={{ marginBottom: '6px' }}>
                <div style={{
                  padding: '5px 14px',
                  fontSize: '9px', fontWeight: '800',
                  color: c.text, opacity: 0.4,
                  letterSpacing: '0.8px', textTransform: 'uppercase'
                }}>
                  {label}
                </div>
                {items.map(p => (
                  <div key={p.id} style={{
                    padding: '7px 14px 7px 11px',
                    borderLeft: `3px solid ${statusColor(p.status || 'pending')}`,
                    marginLeft: '10px', marginBottom: '3px',
                    borderRadius: '0 6px 6px 0'
                  }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', color: c.heading, marginBottom: '1px' }}>
                      {p.service.name}
                    </div>
                    <div style={{ fontSize: '11px', color: c.text, opacity: 0.55 }}>
                      {p.role_name} · {fmtTime(p.service.date)}
                    </div>
                  </div>
                ))}
              </div>
            ))
          }
        </div>

        {/* Bottom icon buttons */}
        <div style={{
          borderTop: `1px solid ${c.border}`,
          padding: '10px 14px',
          display: 'flex', gap: '4px', justifyContent: 'center'
        }}>
          <SideBtn icon={User}        title="Profile"          onClick={() => onNavigate?.('profile')} />
          <SideBtn icon={HelpCircle}  title="Support"          onClick={() => window.location.href = 'mailto:support@worshipops.com'} />
          <SideBtn icon={Lightbulb}   title="Suggest a Feature" onClick={() => window.location.href = 'mailto:feedback@worshipops.com'} />
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

        {/* Top action buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <ActionBtn icon={CalendarOff}    label="Block Out Dates" onClick={() => setShowBlockOut(true)} />
          <button
            onClick={() => setShowMessages(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px', borderRadius: '10px',
              border: `1px solid ${c.border}`, background: c.card,
              color: c.text, fontWeight: '600', fontSize: '13px',
              cursor: 'pointer', whiteSpace: 'nowrap', position: 'relative'
            }}
            onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = c.card}
          >
            <MessageSquare size={15} />
            My Messages
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                minWidth: '18px', height: '18px', borderRadius: '9px',
                background: c.primary, color: '#fff',
                fontSize: '10px', fontWeight: '800',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
          <ActionBtn icon={Mail}           label="Email My Leader" onClick={() => window.location.href = 'mailto:leader@worshipops.com'} />
        </div>

        {/* Empty state */}
        {positions.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            border: `2px dashed ${c.border}`, borderRadius: '16px', background: c.card
          }}>
            <Calendar size={44} color={c.text} style={{ opacity: 0.25, marginBottom: '14px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: c.heading }}>
              No Upcoming Assignments
            </h3>
            <p style={{ margin: 0, color: c.text, opacity: 0.6, fontSize: '14px' }}>
              You are not currently scheduled for any future services. Contact your team leader to be added.
            </p>
          </div>
        )}

        {confirmed.length > 0 && (
          <Section label="Confirmed"         badge={confirmed.length} badgeColor="#10B981" items={confirmed} />
        )}
        {pending.length > 0 && (
          <Section label="Pending Response"  badge={pending.length}   badgeColor="#F59E0B" items={pending}   />
        )}
        {declined.length > 0 && (
          <Section label="Declined"          badge={declined.length}  badgeColor="#EF4444" items={declined}  />
        )}
      </div>

      {/* ── BLOCK OUT DATES MODAL ────────────────────────────────────── */}
      {showBlockOut && (
        <Modal title="Block Out Dates" onClose={() => setShowBlockOut(false)}>
          <p style={{ color: c.text, fontSize: '14px', opacity: 0.65, margin: '0 0 18px' }}>
            Select dates you are unavailable. Your team leader will be notified.
          </p>
          <div style={{
            padding: '28px', border: `1px dashed ${c.border}`, borderRadius: '10px',
            textAlign: 'center', color: c.text, opacity: 0.45, fontSize: '13px', marginBottom: '16px'
          }}>
            Date picker coming soon
          </div>
          <button
            onClick={() => setShowBlockOut(false)}
            style={{
              width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
              background: c.primary, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer'
            }}
          >
            Close
          </button>
        </Modal>
      )}

      {/* ── MY MESSAGES MODAL ───────────────────────────────────────── */}
      {showMessages && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: c.card, borderRadius: '16px', padding: '24px',
            width: '540px', maxWidth: 'calc(100vw - 32px)',
            height: '560px', maxHeight: 'calc(100vh - 64px)',
            border: `1px solid ${c.border}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, color: c.heading, fontSize: '16px', fontWeight: '700' }}>My Messages</h3>
              <button onClick={() => setShowMessages(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, display: 'flex' }}>
                <X size={18} />
              </button>
            </div>
            {/* Inbox */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <MessagesInbox
                memberId={member?.id}
                recipientAuthId={session?.user?.id}
                orgId={orgId}
                session={session}
                colors={c}
                isDarkMode={isDarkMode}
                onUnreadChange={setUnreadCount}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
