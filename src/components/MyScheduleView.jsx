import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Calendar, Clock, Mic2, Guitar, Loader2,
  ChevronLeft, ChevronRight, CalendarOff, MessageSquare, Mail,
  User, HelpCircle, Lightbulb, X, Users, Check,
} from 'lucide-react';
import MessagesInbox from './MessagesInbox';
import SabbathPanel, { useSabbath } from './SabbathPanel';

// Roles that manage people (they can open the Teams roster) see the team's rest status here too.
const LEADER_ROLES = ['admin', 'org_leader', 'leader', 'weekly_scheduler', 'campus_leader', 'editor'];

export default function MyScheduleView({ session, isDarkMode, colors, orgId, onNavigate, userRole, services = [] }) {
  const isLeader = LEADER_ROLES.includes(userRole);
  const sabbath  = useSabbath(orgId, services, isLeader);
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
  const statusColor = s => s === 'confirmed' ? 'var(--positive)' : s === 'declined' ? 'var(--negative)' : 'var(--warning)';
  const statusLabel = s => s === 'confirmed' ? 'Confirmed' : s === 'declined' ? 'Declined' : 'Waiting for you';

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: c.muted, fontSize: '14px', gap: '8px' }}>
      <Loader2 size={16} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} /> Loading your schedule…
    </div>
  );

  const muted = 'var(--text-3)';
  const btnBase = { height: '36px', padding: '0 14px', borderRadius: 'var(--r-control)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)' };
  const btnSecondary = { ...btnBase, border: '1px solid var(--line-2)', background: c.card, color: c.heading };
  const btnPrimary = { ...btnBase, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' };
  const DateBlock = ({ d, size = 24 }) => (
    <div style={{ minWidth: '48px', textAlign: 'center' }}>
      <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: muted }}>{d.toLocaleDateString('en-US', { month: 'short' })}</div>
      <div style={{ fontSize: `${size}px`, fontWeight: 500, color: c.heading, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{d.getDate()}</div>
    </div>
  );

  // ── Pending card (full-width, action-focused) ─────────────────────────
  const PendingCard = ({ pos }) => {
    const d    = new Date(pos.service.date);
    const busy = responding === pos.id;
    const RoleIcon = pos.role_name?.toLowerCase().includes('vocal') ? Mic2 : Guitar;

    return (
      <div style={{
        background: c.card, borderRadius: 'var(--r-card)', border: `1px solid ${c.border}`,
        boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px 16px 16px 12px', marginBottom: '8px', flexWrap: 'wrap',
      }}>
        <DateBlock d={d} />
        <div style={{ width: '1px', alignSelf: 'stretch', background: c.border }} />
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ fontWeight: 500, fontSize: '15px', color: c.heading, marginBottom: '4px' }}>
            {pos.service.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: c.text }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RoleIcon size={14} strokeWidth={1.5} color={muted} /> {pos.role_name}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontVariantNumeric: 'tabular-nums' }}>
              <Clock size={14} strokeWidth={1.5} color={muted} /> {fmtDate(pos.service.date)} · {fmtTime(pos.service.date)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button onClick={() => handleResponse(pos.id, 'declined')} disabled={busy} style={{ ...btnSecondary, opacity: busy ? 0.5 : 1 }}>
            Can't make it
          </button>
          <button onClick={() => handleResponse(pos.id, 'confirmed')} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.5 : 1 }}>
            {busy ? <Loader2 size={16} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} strokeWidth={1.5} />}
            I'll be there
          </button>
        </div>
      </div>
    );
  };

  // ── Confirmed / Declined row (compact list) ───────────────────────────
  const StatusRow = ({ pos, isLast }) => {
    const d  = new Date(pos.service.date);
    const sc = statusColor(pos.status);
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px 12px 12px',
        borderBottom: isLast ? 'none' : `1px solid ${c.border}`,
        transition: 'background-color var(--t-fast) var(--ease)',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--raised)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <DateBlock d={d} size={20} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: '14px', color: c.heading, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pos.service.name}
          </div>
          <div style={{ fontSize: '13px', color: c.text, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
            {pos.role_name} · {fmtDate(pos.service.date)} · {fmtTime(pos.service.date)}
          </div>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: c.text, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc }} />
          {statusLabel(pos.status)}
        </span>
      </div>
    );
  };

  // ── Section header ────────────────────────────────────────────────────
  const SectionHeader = ({ label, count, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '24px 0 12px' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '14px', fontWeight: 500, color: c.heading }}>{label}</span>
      <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: muted, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </div>
  );

  // ── Calendar panel content ────────────────────────────────────────────
  const CalendarPanelContent = () => (
    <div>
      {/* Mini calendar */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="wo-icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, width: '28px', height: '28px', borderRadius: 'var(--r-control)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 500, color: c.heading }}>{monthLabel}</span>
          <button onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="wo-icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, width: '28px', height: '28px', borderRadius: 'var(--r-control)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '2px' }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: muted, padding: '2px 0' }}>{d}</div>
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
                  width: '28px', height: '28px', margin: '0 auto',
                  borderRadius: 'var(--r-control)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontVariantNumeric: 'tabular-nums',
                  fontWeight: hasService || isToday ? 500 : 400,
                  color: isToday ? 'var(--on-accent)' : hasService ? 'var(--accent-ink)' : day ? c.text : 'transparent',
                  background: isToday ? 'var(--accent)' : hasService ? 'var(--accent-soft)' : 'transparent',
                  cursor: day ? 'pointer' : 'default',
                }}>
                  {day || ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming list */}
      <div style={{ overflowY: 'auto' }}>
        {sidebarGroups.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: muted, fontSize: '13px' }}>
            No upcoming services
          </div>
        ) : sidebarGroups.map(([label, items]) => (
          <div key={label} style={{ marginBottom: '4px' }}>
            <div style={{ padding: '12px 16px 4px', fontSize: '12px', color: muted }}>
              {label}
            </div>
            {items.map(p => (
              <div key={p.id} style={{
                padding: '4px 16px 4px 12px',
                borderLeft: `2px solid ${statusColor(p.status || 'pending')}`,
                margin: '0 0 4px 16px',
              }}>
                <div style={{ fontWeight: 500, fontSize: '13px', color: c.heading }}>{p.service.name}</div>
                <div style={{ fontSize: '12px', color: c.text }}>{p.role_name} · {fmtTime(p.service.date)}</div>
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
        <div style={{ padding: '32px 16px', textAlign: 'center', color: muted, fontSize: '13px' }}>
          No upcoming services yet
        </div>
      ) : sidebarGroups.map(([label, items]) => {
        const serviceId = items[0]?.service?.id;
        const team = teammates[serviceId] || [];
        return (
          <div key={label} style={{ borderBottom: `1px solid ${c.border}`, padding: '16px' }}>
            <div style={{ fontSize: '12px', color: muted, marginBottom: '2px' }}>{label}</div>
            <div style={{ fontWeight: 500, fontSize: '14px', color: c.heading, marginBottom: '8px' }}>{items[0]?.service?.name}</div>
            {/* Your role */}
            {items.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '4px 8px', borderRadius: 'var(--r-control)',
                background: 'var(--raised)', marginBottom: '2px',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: c.heading, flex: 1 }}>{member?.name ? `${member.name} (you)` : 'You'}</span>
                <span style={{ fontSize: '12px', color: c.text }}>{p.role_name}</span>
              </div>
            ))}
            {/* Teammates */}
            {team.length > 0 ? team.map(sp => (
              <div key={sp.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '4px 8px', marginBottom: '2px',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor(sp.status || 'pending'), flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: c.heading, flex: 1 }}>{sp.member?.name}</span>
                <span style={{ fontSize: '12px', color: c.text }}>{sp.role_name}</span>
              </div>
            )) : (
              <div style={{ fontSize: '12px', color: muted, padding: '4px 8px' }}>Loading teammates…</div>
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
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: isActive ? c.heading : c.text,
          minHeight: '88px', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', fontFamily: 'inherit',
          boxShadow: isActive ? 'inset 2px 0 0 var(--accent)' : 'none',
          transition: 'color var(--t-fast) var(--ease)',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = c.heading; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = c.text; }}
      >
        <div style={{ transform: 'rotate(-90deg)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <Icon size={14} strokeWidth={1.5} />
          <span style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1 }}>{label}</span>
        </div>
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: '8px', right: '6px',
            minWidth: '16px', height: '16px', borderRadius: '8px',
            background: 'var(--accent)', color: 'var(--on-accent)',
            fontSize: '11px', fontWeight: 500, fontVariantNumeric: 'tabular-nums',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
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
      style={{ ...btnSecondary, position: 'relative' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--raised)'}
      onMouseLeave={e => e.currentTarget.style.background = c.card}
    >
      <Icon size={16} strokeWidth={1.5} color={muted} />
      {label}
      {badge > 0 && (
        <span style={{
          minWidth: '18px', height: '18px', borderRadius: '9px',
          background: 'var(--accent)', color: 'var(--on-accent)',
          fontSize: '11px', fontWeight: 500, fontVariantNumeric: 'tabular-nums',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
        }}>
          {badge}
        </span>
      )}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>

      {/* ── MAIN SCHEDULE ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>

        {/* Page header */}
        <div style={{
          padding: '32px 32px 0',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '16px', flexWrap: 'wrap',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px', lineHeight: 1.15, fontWeight: 500, color: c.heading }}>
              My schedule
            </h2>
            {member && (
              <div style={{ marginTop: '4px', fontSize: '14px', color: c.text }}>
                {member.name}
              </div>
            )}
          </div>

          {/* Stats */}
          {positions.length > 0 && (
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', fontSize: '13px', color: c.text }}>
              {[
                { n: pending.length,   label: 'waiting for you', color: 'var(--warning)' },
                { n: confirmed.length, label: 'confirmed',       color: 'var(--positive)' },
              ].filter(x => x.n > 0).map(x => (
                <span key={x.label} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: x.color, transform: 'translateY(-2px)' }} />
                  <span style={{ fontSize: '20px', fontWeight: 500, color: c.heading, fontVariantNumeric: 'tabular-nums' }}>{x.n}</span>
                  {x.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action row */}
        <div style={{
          padding: '20px 32px',
          display: 'flex', gap: '8px', flexWrap: 'wrap',
          borderBottom: `1px solid ${c.border}`,
        }}>
          <ActionBtn icon={CalendarOff} label="Block out dates" onClick={() => setShowBlockOut(true)} />
          <ActionBtn
            icon={MessageSquare}
            label="Messages"
            badge={unreadCount}
            onClick={() => togglePanel('messages')}
          />
          <ActionBtn icon={Mail} label="Email my leader" onClick={() => window.location.href = 'mailto:leader@worshipops.com'} />
          <ActionBtn icon={User} label="Profile" onClick={() => onNavigate?.('profile')} />
        </div>

        {/* The Sabbath Feature — leaders see their team's rest before their own schedule */}
        {isLeader && sabbath.loaded && sabbath.enabled && (
          <div style={{ padding: '24px 32px 0' }}>
            <SabbathPanel
              framed
              members={sabbath.members}
              burnoutMap={sabbath.burnoutMap}
              warningThreshold={sabbath.warningThreshold}
              autoThreshold={sabbath.autoThreshold}
              onOpenRoster={() => onNavigate?.('team')}
            />
          </div>
        )}

        {/* Schedule content */}
        <div style={{ padding: '0 32px 32px' }}>

          {/* Empty state */}
          {positions.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '64px 24px', marginTop: '24px',
              border: '1px dashed var(--line-2)', borderRadius: 'var(--r-card)', background: c.card,
            }}>
              <Calendar size={24} strokeWidth={1.5} color={muted} style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 500, color: c.heading }}>
                Nothing scheduled yet
              </h3>
              <p style={{ margin: 0, color: c.text, fontSize: '14px', lineHeight: '22px' }}>
                You're not on any upcoming services. Your team leader can add you.
              </p>
            </div>
          )}

          {/* Pending — needs action, shown as prominent cards */}
          {pending.length > 0 && (
            <div>
              <SectionHeader label="Waiting for your reply" count={pending.length} color="var(--warning)" />
              {pending.map(p => <PendingCard key={p.id} pos={p} />)}
            </div>
          )}

          {/* Confirmed — compact rows inside a card */}
          {confirmed.length > 0 && (
            <div>
              <SectionHeader label="Confirmed" count={confirmed.length} color="var(--positive)" />
              <div style={{
                background: c.card,
                borderRadius: 'var(--r-card)',
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
              <SectionHeader label="Declined" count={declined.length} color="var(--negative)" />
              <div style={{
                background: c.card,
                borderRadius: 'var(--r-card)',
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
          background: 'var(--deep)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{
            height: '52px', padding: '0 12px 0 16px', borderBottom: `1px solid ${c.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: c.card, flexShrink: 0,
          }}>
            <span style={{ fontWeight: 500, fontSize: '14px', color: c.heading }}>
              {activePanel === 'calendar' ? 'Calendar' : 'Team'}
            </span>
            <button onClick={() => setActivePanel(null)} title="Close" className="wo-icon-btn"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, width: '28px', height: '28px', borderRadius: 'var(--r-control)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} strokeWidth={1.5} />
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
            padding: '8px 12px',
            display: 'flex', gap: '4px', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {[
              { icon: HelpCircle,  title: 'Support',          href: 'mailto:support@worshipops.com' },
              { icon: Lightbulb,   title: 'Suggest a feature', href: 'mailto:feedback@worshipops.com' },
            ].map(({ icon: Icon, title, href }) => (
              <button key={title} title={title} onClick={() => window.location.href = href}
                className="wo-icon-btn"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, width: '32px', height: '32px', borderRadius: 'var(--r-control)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon size={16} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── RIGHT TAB STRIP ──────────────────────────────────────────── */}
      <div style={{
        width: '40px', minWidth: '40px',
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
            background: c.card, borderRadius: 'var(--r-panel)', padding: '20px 24px 24px',
            width: '540px', maxWidth: 'calc(100vw - 32px)',
            height: '560px', maxHeight: 'calc(100vh - 64px)',
            border: '1px solid var(--line-2)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, color: c.heading, fontSize: '16px', fontWeight: 500 }}>Messages</h3>
              <button onClick={() => setActivePanel(null)}
                title="Close" className="wo-icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, width: '32px', height: '32px', borderRadius: 'var(--r-control)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} strokeWidth={1.5} />
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
            background: c.card, borderRadius: 'var(--r-panel)', padding: '20px 24px 24px', width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            border: '1px solid var(--line-2)', boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: c.heading, fontSize: '16px', fontWeight: 500 }}>Block out dates</h3>
              <button onClick={() => setShowBlockOut(false)}
                title="Close" className="wo-icon-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, width: '32px', height: '32px', borderRadius: 'var(--r-control)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <p style={{ color: c.text, fontSize: '14px', lineHeight: '22px', margin: '0 0 16px' }}>
              Mark the dates you can't serve, and your team leader will see them.
            </p>
            <div style={{
              padding: '32px', border: '1px dashed var(--line-2)', borderRadius: 'var(--r-control)',
              textAlign: 'center', color: muted, fontSize: '13px', marginBottom: '16px',
            }}>
              Picking dates isn't available yet
            </div>
            <button onClick={() => setShowBlockOut(false)} style={{ ...btnSecondary, width: '100%', justifyContent: 'center' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
