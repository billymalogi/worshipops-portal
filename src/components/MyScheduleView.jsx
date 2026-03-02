import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, Music, Mic2, Guitar, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function MyScheduleView({ session, isDarkMode, colors }) {
  const [loading, setLoading] = useState(true);
  const [nextUp, setNextUp] = useState(null);
  const [futurePlans, setFuturePlans] = useState([]);
  const [setlist, setSetlist] = useState([]);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!session?.user?.email) return;

        // 1. Find team member by email
        const { data: member } = await supabase
          .from('team_members')
          .select('id, name')
          .eq('email', session.user.email)
          .single();

        if (!member) { setLoading(false); return; }

        // 2. Get assignments (service_positions joined with services)
        const { data: positions } = await supabase
          .from('service_positions')
          .select(`id, role_name, status, service:services (id, name, date, items)`)
          .eq('member_id', member.id)
          .order('service(date)', { ascending: true });

        if (positions && positions.length > 0) {
          const now = new Date();
          const validPositions = positions
            .filter(p => p.service !== null)
            .filter(p => new Date(p.service.date) >= now);

          if (validPositions.length > 0) {
            const sorted = validPositions.sort((a, b) =>
              new Date(a.service.date).getTime() - new Date(b.service.date).getTime()
            );
            setNextUp(sorted[0]);
            setFuturePlans(sorted.slice(1));

            // 3. Get setlist for the next service
            const svc = sorted[0].service;
            if (svc?.date) {
              const dateStr = svc.date.split('T')[0];
              const { data: songs } = await supabase
                .from('service_items')
                .select('*')
                .eq('service_date', dateStr)
                .eq('item_type', 'song')
                .order('sort_order');
              setSetlist((songs || []).filter(s => s.title?.trim()));
            }
          }
        }
      } catch (err) {
        console.error('MyScheduleView error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session]);

  const handleResponse = async (status, e) => {
    e.stopPropagation();
    if (!nextUp) return;
    setResponding(true);
    try {
      await supabase.from('service_positions').update({ status }).eq('id', nextUp.id);
      setNextUp({ ...nextUp, status });
    } catch (err) {
      console.error(err);
    } finally {
      setResponding(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: colors.text }}>
      <Loader2 size={20} style={{ marginRight: '8px' }} /> Loading your schedule...
    </div>
  );

  const c = colors;

  if (!nextUp) return (
    <div style={{ maxWidth: '640px', margin: '60px auto', textAlign: 'center', padding: '60px 24px', border: `2px dashed ${c.border}`, borderRadius: '16px', background: c.card }}>
      <Calendar size={48} color={c.text} style={{ opacity: 0.3, marginBottom: '16px' }} />
      <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: c.heading }}>No Upcoming Assignments</h3>
      <p style={{ margin: 0, color: c.text, opacity: 0.7, fontSize: '14px' }}>
        You are not currently scheduled for any future services. Contact your team leader to be added.
      </p>
    </div>
  );

  const statusColor = nextUp.status === 'confirmed' ? '#10B981' : (nextUp.status === 'declined' ? '#EF4444' : '#F59E0B');
  const statusLabel = nextUp.status === 'confirmed' ? 'Confirmed' : (nextUp.status === 'declined' ? 'Declined' : 'Pending');

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '30px 20px', fontFamily: 'sans-serif' }}>

      {/* NEXT UP CARD */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '1px' }}>Next Up</span>
          <span style={{
            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
            color: statusColor, background: `${statusColor}18`,
            padding: '3px 10px', borderRadius: '20px', border: `1px solid ${statusColor}40`
          }}>
            {statusLabel}
          </span>
        </div>

        <div style={{
          background: c.card, borderRadius: '16px', overflow: 'hidden',
          border: `1px solid ${c.border}`,
          boxShadow: isDarkMode ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ height: '3px', background: statusColor }} />
          <div style={{ padding: '24px' }}>

            {/* Service Name + Date */}
            <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: '700', color: c.heading }}>
              {nextUp.service.name}
            </h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: c.text, fontWeight: '500' }}>
                <Calendar size={15} color={c.primary} /> {formatDate(nextUp.service.date)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: c.text, fontWeight: '500' }}>
                <Clock size={15} color={c.primary} /> {formatTime(nextUp.service.date)}
              </span>
            </div>

            {/* Role */}
            <div style={{
              background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderRadius: '10px', padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: '14px',
              border: `1px solid ${c.border}`, marginBottom: '20px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: isDarkMode ? 'rgba(255,255,255,0.07)' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.primary, border: `1px solid ${c.border}`
              }}>
                {nextUp.role_name?.toLowerCase().includes('vocal') ? <Mic2 size={18} /> : <Guitar size={18} />}
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6, marginBottom: '2px' }}>
                  Your Role
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: c.heading }}>{nextUp.role_name}</div>
              </div>
            </div>

            {/* Accept / Decline buttons */}
            {nextUp.status === 'pending' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={(e) => handleResponse('declined', e)}
                  disabled={responding}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', borderRadius: '10px', border: `1px solid ${c.border}`,
                    background: 'transparent', color: c.text, fontWeight: '600', fontSize: '14px',
                    cursor: 'pointer', opacity: responding ? 0.5 : 1
                  }}
                >
                  <XCircle size={16} /> Decline
                </button>
                <button
                  onClick={(e) => handleResponse('confirmed', e)}
                  disabled={responding}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', borderRadius: '10px', border: 'none',
                    background: c.primary, color: '#fff', fontWeight: '600', fontSize: '14px',
                    cursor: 'pointer', opacity: responding ? 0.5 : 1
                  }}
                >
                  {responding ? <Loader2 size={16} /> : <CheckCircle size={16} />} Accept
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SETLIST */}
      {setlist.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            margin: '0 0 12px', fontSize: '11px', fontWeight: '700', color: c.text,
            textTransform: 'uppercase', letterSpacing: '1px',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <Music size={13} /> Setlist
          </h3>
          <div style={{ background: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
            {setlist.map((song, i) => (
              <div key={song.id} style={{
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px',
                borderBottom: i < setlist.length - 1 ? `1px solid ${c.border}` : 'none'
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f4f4f5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: '700', fontSize: '13px', color: c.heading,
                  border: `1px solid ${c.border}`, flexShrink: 0
                }}>
                  {song.song_key || '-'}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: c.heading }}>{song.title}</div>
                  {song.bpm && <div style={{ fontSize: '12px', color: c.text, opacity: 0.7 }}>{song.bpm} BPM</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPCOMING SERVICES */}
      {futurePlans.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: '700', color: c.text, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Also Upcoming
          </h3>
          <div style={{ background: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden' }}>
            {futurePlans.map((plan, i) => {
              const pStatus = plan.status || 'pending';
              const pColor = pStatus === 'confirmed' ? '#10B981' : (pStatus === 'declined' ? '#EF4444' : '#F59E0B');
              return (
                <div key={plan.id} style={{
                  padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: i < futurePlans.length - 1 ? `1px solid ${c.border}` : 'none'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: c.heading }}>{plan.service.name}</div>
                    <div style={{ fontSize: '12px', color: c.text, opacity: 0.7 }}>
                      {formatDate(plan.service.date)} · {plan.role_name}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '12px',
                    color: pColor, background: `${pColor}18`, border: `1px solid ${pColor}30`,
                    textTransform: 'capitalize'
                  }}>
                    {pStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
