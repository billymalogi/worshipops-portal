import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Calendar, Clock, Mic2, Guitar, Loader2, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, CalendarOff, MessageSquare, Mail,
  User, HelpCircle, Lightbulb, X, Users, Check, AlertCircle,
} from 'lucide-react';
import MessagesInbox from './MessagesInbox';

export default function MyScheduleView({ session, isDarkMode, colors, orgId, onNavigate }) {
  const [loading, setLoading]         = useState(true);
  const [positions, setPositions]     = useState([]);
  const [member, setMember]           = useState(null);
  const [responding, setResponding]   = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBlockOut, setShowBlockOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activePanel, setActivePanel] = useState(null); // 'calendar' | 'team' | 'messages'
  const [teammates, setTeammates]     = useState({}); // keyed by service_id

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

  const fetchTeammates = async (serviceIds) => {
    if (!serviceIds.length) return;
    const { data } = await supabase
      .from('service_positions')
      .select(`id, role_name, status, member:team_members (id, name), service_id`)
      .in('service_id', serviceIds);
    if (!data) return;
    const byService = {};
    data.forEach(sp => {
      if (!byService[sp.service_id]) byService[sp.service_id] = [];
      if (sp.member?.id !== member?.id) byService[sp.service_id].push(sp);
    });
    setTeammates(byService);
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

  const togglePanel = (key) => {
    if (activePanel === key) { setActivePanel(null); return; }
    setActivePanel(key);
    if (key === 'team' && Object.keys(teammates).length === 0) {
      fetchTeammates(positions.map(p => p.service.id));
    }
  };

  // ── Calendar helpers ──────────────────────────────────────────────────
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

  const sidebarGroups = useMemo(() => {
    const groups = {};
    positions.forEach(p => {
      const d = new Date(p.service.date);
      const key = d.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups);
  }, [positions]);

  // ── Partition ─────────────────────────────────────────────────────────
  const confirmed = positions.filter(p => p.status === 'confirmed');
  const pending   = positions.filter(p => !p.status || p.status === 'pending');
  const declined  = positions.filter(p => p.status === 'declined');

  // ── Helpers ───────────────────────────────────────────────────────────
  const statusColor = s => s === 'confirmed' ? '#10B981' : s === 'declined' ? '#EF4444' : '#F59E0B';
  const statusLabel = s => s === 'confirmed' ? 'Confirmed' : s === 'declined' ? 'Declined' : 'Pending';

  const fmtDate = dateStr => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const fmtTime = dateStr => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date();

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: c.text }}>
      <Loader2 size={18} style={{ marginRight: '8px' }} /> Loading your schedule...
    </div>
  );

  // ── Pending card (full-width, action-focused) ─────────────────────────
  const PendingCard = ({ pos }) => {
    const d   = new Date(pos.service.date);
    const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.getDate();
    const busy = responding === pos.id;

    return (
      <div style={{
        background: c.card,
        borderRadius: '14px',
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid #F59E0B`,
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        overflow: 'hidden',
        marginBottom: '10px',
        boxShadow: isDarkMode
          ? '0 2px 16px rgba(0,0,0,0.4)'
          : '0 2px 12px rgba(0,0,0,0.07)',
      }}>
        {/* Date block */}
        <div style={{
          minWidth: '64px',
          padding: '18px 12px',
          textAlign: 'center',
          borderRight: `1px solid ${c.border}`,
          background: isDarkMode ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.05)',
        }}>
          <div style={{ fontSize: '9px', fontWeight: '800', color: '#F59E0B', letterSpacing: '1px' }}>{mon}</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: c.heading, lineHeight: 1, margin: '2px 0' }}>{day}</div>
          <div style={{ fontSize: '9px', color: c.text, opacity: 0.5 }}>{d.getFullYear()}</div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, padding: '16px 18px' }}>
          <div style={{ fontWeight: '800', fontSize: '15px', color: c.heading, marginBottom: '5px' }}>
            {pos.service.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: c.text, opacity: 0.7 }}>
              {pos.role_name?.toLowerCase().includes('vocal') ? <Mic2 size={12} /> : <Guitar size={12} />}
              {pos.role_name}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: c.text, opacity: 0.55 }}>
              <Clock size={11} />
              {fmtDate(pos.service.date)} · {fmtTime(pos.service.date)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', padding: '0 18px', flexShrink: 0 }}>
          <button
            onClick={() => handleResponse(pos.id, 'declined')}
            disabled={busy}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: `1px solid ${c.border}`,
              background: 'transparent', color: c.text,
              fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
              opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap',
            }}
          >
            <XCircle size={13} /> Decline
          </button>
          <button
            onClick={() => handleResponse(pos.id, 'confirmed')}
            disabled={busy}
            style={{
              padding: '8px 20px', borderRadius: '8px',
              border: 'none',
              background: '#10B981', color: '#fff',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
              opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap',
            }}
          >
            {busy
              ? <Loader2 size={13} />
              : <Check size={13} />
            }
            Accept
          </button>
        </div>
      </div>
    );
  };

  // ── Confirmed / Declined row (compact list) ───────────────────────────
  const StatusRow = ({ pos }) => {
    const d   = new Date(pos.service.date);
    const sc  = statusColor(pos.status);
    const sl  = statusLabel(pos.status);

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '12px 18px',
        borderBottom: `1px solid ${c.border}`,
        background: 'transparent',
        transition: 'background 0.12s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Color stripe + date */}
        <div style={{
          minWidth: '48px', textAlign: 'center',
          padding: '6px 0',
          borderRadius: '8px',
          background: `${sc}12`,
        }}>
          <div style={{ fontSize: '9px', fontWeight: '800', color: sc, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {d.toLocaleDateString('en-US', { month: 'short' })}
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: sc, lineHeight: 1 }}>
            {d.getDate()}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: c.heading, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pos.service.name}
          </div>
          <div style={{ fontSize: '12px', color: c.text, opacity: 0.6, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span>{pos.role_name}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span><Clock size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />{fmtTime(pos.service.date)}</span>
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          fontSize: '11px', fontWeight: '700', color: sc,
          padding: '4px 10px', borderRadius: '20px',
          background: `${sc}14`, flexShrink: 0,
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc }} />
          {sl}
        </div>
      </div>
    );
  };

  // ── Section header ────────────────────────────────────────────────────
  const SectionHeader = ({ label, count, color, icon: Icon }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '20px 0 12px',
    }}>
      {Icon && <Icon size={14} color={color} />}
      <span style={{ fontSize: '11px', fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: '1px' }}>
        {label}
      </span>
      <span style={{
        fontSize: '10px', fontWeight: '700',
        padding: '2px 7px', borderRadius: '20px',
        background: `${color}18`, color,
      }}>{count}</span>
    </div>
  );

  // ── Calendar panel content ────────────────────────────────────────────
  const CalendarPanelContent = () => (
    <div>
      {/* Mini calendar */}
      <div style={{ padding: '16px 14px', borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: '2px', display: 'flex' }}>
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontSize: '12px', fontWeight: '700', color: c.heading }}>{monthLabel}</span>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: '2px', display: 'flex' }}>
            <ChevronRight size={15} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '2px' }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ fontSize: '9px', fontWeight: '700', color: c.text, opacity: 0.45, padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', rowGap: '1px' }}>
          {calDays.map((day, i) => {
            const hasService = day && serviceDays.has(day);
            const isToday = day &&
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
                  cursor: day ? 'pointer' : 'default',
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
      <div style={{ overflowY: 'auto' }}>
        {sidebarGroups.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: c.text, opacity: 0.4, fontSize: '12px' }}>
            No upcoming services
          </div>
        ) : sidebarGroups.map(([label, items]) => (
          <div key={label} style={{ marginBottom: '4px' }}>
            <div style={{ padding: '8px 14px 4px', fontSize: '9px', fontWeight: '800', color: c.text, opacity: 0.4, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              {label}
            </div>
            {items.map(p => (
              <div key={p.id} style={{
                padding: '7px 14px 7px 11px',
                borderLeft: `3px solid ${statusColor(p.status || 'pending')}`,
                marginLeft: '10px', marginBottom: '3px',
                borderRadius: '0 6px 6px 0',
              }}>
                <div style={{ fontWeight: '600', fontSize: '12px', color: c.heading, marginBottom: '1px' }}>{p.service.name}</div>
                <div style={{ fontSize: '11px', color: c.text, opacity: 0.55 }}>{p.role_name} · {fmtTime(p.service.date)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Team panel content ────────────────────────────────────────────────
  const TeamPanelContent = () => (
    <div>
      {sidebarGroups.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: c.text, opacity: 0.4, fontSize: '12px' }}>
          No upcoming services to show team for
        </div>
      ) : sidebarGroups.map(([label, items]) => {
        const serviceId = items[0]?.service?.id;
        const team = teammates[serviceId] || [];
        return (
          <div key={label} style={{ borderBottom: `1px solid ${c.border}`, padding: '14px 16px' }}>
            <div style={{ fontSize: '10px', fontWeight: '800', color: c.text, opacity: 0.5, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
              {label}
            </div>
            <div style={{ fontWeight: '700', fontSize: '13px', color: c.heading, marginBottom: '8px' }}>{items[0]?.service?.name}</div>
            {/* Your role */}
            {items.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '5px 8px', borderRadius: '6px',
                background: isDarkMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.06)',
                marginBottom: '4px',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.primary, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: '700', color: c.primary, flex: 1 }}>{member?.name || 'You'}</span>
                <span style={{ fontSize: '11px', color: c.text, opacity: 0.6 }}>{p.role_name}</span>
              </div>
            ))}
            {/* Teammates */}
            {team.length > 0 ? team.map(sp => (
              <div key={sp.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '5px 8px', borderRadius: '6px', marginBottom: '3px',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.border, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: '500', color: c.heading, flex: 1 }}>{sp.member?.name}</span>
                <span style={{ fontSize: '11px', color: c.text, opacity: 0.55 }}>{sp.role_name}</span>
              </div>
            )) : (
              <div style={{ fontSize: '11px', color: c.text, opacity: 0.4, padding: '4px 8px' }}>Loading teammates...</div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Vertical tab button ───────────────────────────────────────────────
  const TabBtn = ({ label, icon: Icon, panelKey, badge }) => {
    const isActive = activePanel === panelKey;
    return (
      <button
        onClick={() => togglePanel(panelKey)}
        title={label}
        style={{
          background: isActive
            ? (isDarkMode ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.1)')
            : 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: isActive ? c.primary : c.text,
          minHeight: '76px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '0',
          transition: 'all 0.15s',
          position: 'relative',
          borderLeft: isActive ? `2px solid ${c.primary}` : '2px solid transparent',
        }}
        onMouseEnter={e => {
          if (!isActive) e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
        }}
        onMouseLeave={e => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
        }}
      >
        <div style={{ transform: 'rotate(-90deg)', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
          <Icon size={11} />
          <span style={{
            fontSize: '9px',
            fontWeight: isActive ? '800' : '500',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            {label}
          </span>
        </div>
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: '8px', right: '4px',
            minWidth: '14px', height: '14px', borderRadius: '7px',
            background: c.primary, color: '#fff',
            fontSize: '8px', fontWeight: '800',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  // ── Action button ─────────────────────────────────────────────────────
  const ActionBtn = ({ icon: Icon, label, onClick, badge }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '9px 16px', borderRadius: '9px',
        border: `1px solid ${c.border}`, background: c.card,
        color: c.text, fontWeight: '600', fontSize: '12px',
        cursor: 'pointer', whiteSpace: 'nowrap', position: 'relative',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
      onMouseLeave={e => e.currentTarget.style.background = c.card}
    >
      <Icon size={14} />
      {label}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: '-5px', right: '-5px',
          minWidth: '16px', height: '16px', borderRadius: '8px',
          background: c.primary, color: '#fff',
          fontSize: '9px', fontWeight: '800',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px',
        }}>
          {badge}
        </span>
      )}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'sans-serif', overflow: 'hidden' }}>

      {/* ── MAIN SCHEDULE ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>

        {/* Page header */}
        <div style={{
          padding: '24px 28px 0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '16px', flexWrap: 'wrap',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: c.heading, letterSpacing: '-0.5px' }}>
              My Schedule
            </h2>
            {member && (
              <div style={{ marginTop: '4px', fontSize: '13px', color: c.text, opacity: 0.6 }}>
                {member.name}
              </div>
            )}
          </div>

          {/* Stats strip */}
          {positions.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {pending.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px',
                  background: 'rgba(245,158,11,0.12)', color: '#F59E0B',
                  fontSize: '12px', fontWeight: '700',
                }}>
                  <AlertCircle size={13} />
                  {pending.length} need{pending.length === 1 ? 's' : ''} response
                </div>
              )}
              {confirmed.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px',
                  background: 'rgba(16,185,129,0.1)', color: '#10B981',
                  fontSize: '12px', fontWeight: '700',
                }}>
                  <CheckCircle size={13} />
                  {confirmed.length} confirmed
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action row */}
        <div style={{
          padding: '16px 28px',
          display: 'flex', gap: '8px', flexWrap: 'wrap',
          borderBottom: `1px solid ${c.border}`,
        }}>
          <ActionBtn icon={CalendarOff} label="Block Out Dates" onClick={() => setShowBlockOut(true)} />
          <ActionBtn
            icon={MessageSquare}
            label="My Messages"
            badge={unreadCount}
            onClick={() => togglePanel('messages')}
          />
          <ActionBtn icon={Mail} label="Email My Leader" onClick={() => window.location.href = 'mailto:leader@worshipops.com'} />
          <ActionBtn icon={User} label="Profile" onClick={() => onNavigate?.('profile')} />
        </div>

        {/* Schedule content */}
        <div style={{ padding: '8px 28px 32px' }}>

          {/* Empty state */}
          {positions.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 24px', marginTop: '24px',
              border: `2px dashed ${c.border}`, borderRadius: '16px', background: c.card,
            }}>
              <Calendar size={44} color={c.text} style={{ opacity: 0.25, marginBottom: '14px' }} />
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: c.heading }}>
                No Upcoming Assignments
              </h3>
              <p style={{ margin: 0, color: c.text, opacity: 0.6, fontSize: '14px', lineHeight: '1.6' }}>
                You are not currently scheduled for any future services.<br />Contact your team leader to be added.
              </p>
            </div>
          )}

          {/* Pending — needs action, shown as prominent cards */}
          {pending.length > 0 && (
            <div>
              <SectionHeader label="Needs Your Response" count={pending.length} color="#F59E0B" icon={AlertCircle} />
              {pending.map(p => <PendingCard key={p.id} pos={p} />)}
            </div>
          )}

          {/* Confirmed — compact rows inside a card */}
          {confirmed.length > 0 && (
            <div>
              <SectionHeader label="Confirmed" count={confirmed.length} color="#10B981" icon={CheckCircle} />
              <div style={{
                background: c.card,
                borderRadius: '12px',
                border: `1px solid ${c.border}`,
                overflow: 'hidden',
              }}>
                {confirmed.map((p, i) => (
                  <StatusRow key={p.id} pos={p} isLast={i === confirmed.length - 1} />
                ))}
              </div>
            </div>
          )}

          {/* Declined — compact rows */}
          {declined.length > 0 && (
            <div>
              <SectionHeader label="Declined" count={declined.length} color="#EF4444" icon={XCircle} />
              <div style={{
                background: c.card,
                borderRadius: '12px',
                border: `1px solid ${c.border}`,
                overflow: 'hidden',
              }}>
                {declined.map((p, i) => (
                  <StatusRow key={p.id} pos={p} isLast={i === declined.length - 1} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
      {activePanel && activePanel !== 'messages' && (
        <div style={{
          width: '300px', minWidth: '300px',
          borderLeft: `1px solid ${c.border}`,
          background: isDarkMode ? 'rgba(255,255,255,0.015)' : '#fafafa',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'width 0.2s',
        }}>
          {/* Panel header */}
          <div style={{
            padding: '14px 16px', borderBottom: `1px solid ${c.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: c.card, flexShrink: 0,
          }}>
            <span style={{ fontWeight: '800', fontSize: '13px', color: c.heading, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {activePanel === 'calendar' ? 'Calendar' : 'Team'}
            </span>
            <button onClick={() => setActivePanel(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, display: 'flex', padding: '2px' }}>
              <X size={15} />
            </button>
          </div>
          {/* Panel body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activePanel === 'calendar' && <CalendarPanelContent />}
            {activePanel === 'team'     && <TeamPanelContent />}
          </div>
          {/* Bottom utility links */}
          <div style={{
            borderTop: `1px solid ${c.border}`,
            padding: '10px 14px',
            display: 'flex', gap: '4px', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {[
              { icon: HelpCircle,  title: 'Support',          href: 'mailto:support@worshipops.com' },
              { icon: Lightbulb,   title: 'Suggest a Feature', href: 'mailto:feedback@worshipops.com' },
            ].map(({ icon: Icon, title, href }) => (
              <button key={title} title={title} onClick={() => window.location.href = href}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: '7px', borderRadius: '8px', display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── RIGHT TAB STRIP ──────────────────────────────────────────── */}
      <div style={{
        width: '38px', minWidth: '38px',
        borderLeft: `1px solid ${c.border}`,
        background: c.card,
        display: 'flex', flexDirection: 'column',
        alignItems: 'stretch',
        paddingTop: '8px',
      }}>
        <TabBtn label="Calendar" icon={Calendar}       panelKey="calendar" />
        <TabBtn label="Team"     icon={Users}          panelKey="team" />
        <TabBtn label="Messages" icon={MessageSquare}  panelKey="messages" badge={unreadCount} />
      </div>

      {/* ── MESSAGES PANEL (floating overlay, separate from side panel) ── */}
      {activePanel === 'messages' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: c.card, borderRadius: '16px', padding: '24px',
            width: '540px', maxWidth: 'calc(100vw - 32px)',
            height: '560px', maxHeight: 'calc(100vh - 64px)',
            border: `1px solid ${c.border}`,
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, color: c.heading, fontSize: '16px', fontWeight: '700' }}>My Messages</h3>
              <button onClick={() => setActivePanel(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, display: 'flex' }}>
                <X size={18} />
              </button>
            </div>
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

      {/* ── BLOCK OUT DATES MODAL ─────────────────────────────────────── */}
      {showBlockOut && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: c.card, borderRadius: '16px', padding: '28px', width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            border: `1px solid ${c.border}`, boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: c.heading, fontSize: '16px', fontWeight: '700' }}>Block Out Dates</h3>
              <button onClick={() => setShowBlockOut(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, display: 'flex' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: c.text, fontSize: '14px', opacity: 0.65, margin: '0 0 18px' }}>
              Select dates you are unavailable. Your team leader will be notified.
            </p>
            <div style={{
              padding: '28px', border: `1px dashed ${c.border}`, borderRadius: '10px',
              textAlign: 'center', color: c.text, opacity: 0.45, fontSize: '13px', marginBottom: '16px',
            }}>
              Date picker coming soon
            </div>
            <button onClick={() => setShowBlockOut(false)} style={{
              width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
              background: c.primary, color: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
            }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
