import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; 
import { Calendar, Clock, Music, Mic, Guitar, Loader, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import VolunteerSchedule from './VolunteerSchedule';

export default function VolunteerDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [nextUp, setNextUp] = useState(null);
  const [futurePlans, setFuturePlans] = useState([]);
  const [setlist, setSetlist] = useState([]);
  const [responding, setResponding] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard');
  const [activePlanItems, setActivePlanItems] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user?.email) return;

        const { data: member } = await supabase.from('team_members').select('id, name').eq('email', user.email).maybeSingle();
        if (!member) { setLoading(false); return; }

        const { data: positions } = await supabase.from('service_positions')
          .select(`id, role_name, status, service:services (id, name, date, items)`) 
          .eq('member_id', member.id)
          .gte('service.date', new Date().toISOString())
          .order('service(date)', { ascending: true });

        if (positions && positions.length > 0) {
          const validPositions = positions.filter((p) => p.service !== null);
          if (validPositions.length > 0) {
              const sorted = validPositions.sort((a, b) => new Date(a.service.date).getTime() - new Date(b.service.date).getTime());
              const nextService = sorted[0];
              setNextUp(nextService);
              setFuturePlans(sorted.slice(1));
              
              if(nextService.service?.items) setActivePlanItems(nextService.service.items);

              if (nextService?.service?.id) {
                const { data: songs } = await supabase.from('service_items')
                  .select('*')
                  .eq('service_date', nextService.service.date.split('T')[0]) 
                  .eq('item_type', 'song')
                  .order('sort_order');
                const validSongs = (songs || []).filter(s => s.title && s.title.trim() !== '');
                setSetlist(validSongs);
              }
          }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchDashboardData();
  }, [user]);

  const handleResponse = async (status, e) => {
    e.stopPropagation(); 
    if (!nextUp) return;
    setResponding(true);
    try {
        await supabase.from('service_positions').update({ status: status }).eq('id', nextUp.id);
        setNextUp({ ...nextUp, status: status });
    } catch (err) { console.error(err); } finally { setResponding(false); }
  };

  const formatDate = (dateStr) => { if(!dateStr) return ''; return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }); }
  const formatTime = (dateStr) => { if(!dateStr) return ''; return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }

  if (loading) return <div style={{padding:'50px', textAlign:'center', color:'#666'}}>Loading...</div>;

  if (viewMode === 'schedule' && nextUp) {
      return <VolunteerSchedule service={nextUp.service} planItems={activePlanItems} onBack={() => setViewMode('dashboard')} />;
  }

  if (!nextUp) {
    return (
      <div style={{textAlign:'center', padding:'60px 20px', border:'2px dashed #e5e7eb', borderRadius:'16px', background:'#f9fafb', maxWidth:'600px', margin:'40px auto'}}>
        <div style={{width:'64px', height:'64px', background:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px auto', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)'}}><Calendar color="#9ca3af" size={32} /></div>
        <h3 style={{fontSize:'18px', fontWeight:'bold', color:'#111111', margin:'0 0 8px 0'}}>No Upcoming Assignments</h3>
        <p style={{color:'#6b7280', maxWidth:'300px', margin:'0 auto'}}>You are not scheduled for any future services.</p>
      </div>
    );
  }

  return (
    <div style={{maxWidth:'672px', margin:'0 auto', fontFamily:'Inter, sans-serif'}}>
      {/* HERO CARD */}
      <div style={{marginBottom:'32px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'16px'}}>
            <h2 style={{fontSize:'12px', fontWeight:'bold', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.1em', margin:0}}>Next Up</h2>
             <div style={{padding:'4px 12px', borderRadius:'999px', fontSize:'12px', fontWeight:'bold', textTransform:'uppercase', border:'1px solid', 
                borderColor: nextUp.status === 'confirmed' ? '#bbf7d0' : (nextUp.status === 'declined' ? '#fecaca' : '#fde68a'),
                background: nextUp.status === 'confirmed' ? '#f0fdf4' : (nextUp.status === 'declined' ? '#fef2f2' : '#fffbeb'),
                color: nextUp.status === 'confirmed' ? '#15803d' : (nextUp.status === 'declined' ? '#b91c1c' : '#b45309')
             }}>
                {nextUp.status === 'confirmed' ? 'Confirmed' : (nextUp.status === 'declined' ? 'Declined' : 'Pending')}
             </div>
        </div>

        <div onClick={() => setViewMode('schedule')} style={{background:'white', borderRadius:'16px', overflow:'hidden', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)', border:'1px solid #f3f4f6', cursor:'pointer', transition:'transform 0.2s'}}>
          <div style={{height:'8px', width:'100%', background: nextUp.status === 'confirmed' ? '#22c55e' : (nextUp.status === 'declined' ? '#ef4444' : '#fbbf24')}}></div>
          <div style={{padding:'24px 32px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px'}}>
                <div>
                    <h1 style={{fontSize:'24px', fontWeight:'bold', color:'#111111', margin:'0 0 8px 0'}}>{nextUp.service.name}</h1>
                    <div style={{display:'flex', gap:'16px', color:'#4b5563', fontSize:'14px', fontWeight:'500'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}><Calendar size={18} color="#3b82f6" /> {formatDate(nextUp.service.date)}</div>
                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}><Clock size={18} color="#3b82f6" /> {formatTime(nextUp.service.date)}</div>
                    </div>
                </div>
                <div style={{background:'#f9fafb', padding:'8px', borderRadius:'50%', color:'#9ca3af'}}><ChevronRight size={24} /></div>
            </div>

            <div style={{background:'#f9fafb', borderRadius:'12px', padding:'16px', display:'flex', alignItems:'center', gap:'16px', border:'1px solid #f3f4f6', marginBottom:'24px'}}>
                  <div style={{width:'48px', height:'48px', borderRadius:'50%', background:'white', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)', display:'flex', alignItems:'center', justifyContent:'center', color:'#2563eb'}}>
                    {nextUp.role_name.toLowerCase().includes('vocal') ? <Mic size={20}/> : <Guitar size={20}/>}
                  </div>
                  <div>
                    <div style={{fontSize:'10px', fontWeight:'bold', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em'}}>Your Position</div>
                    <div style={{fontSize:'16px', fontWeight:'bold', color:'#1f1f22'}}>{nextUp.role_name}</div>
                  </div>
            </div>

            {nextUp.status === 'pending' && (
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                    <button onClick={(e) => handleResponse('declined', e)} disabled={responding} style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'12px', borderRadius:'12px', border:'1px solid #e5e7eb', background:'white', color:'#4b5563', fontWeight:'bold', cursor:'pointer'}}>
                        <XCircle size={18}/> Decline
                    </button>
                    <button onClick={(e) => handleResponse('confirmed', e)} disabled={responding} style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'12px', borderRadius:'12px', border:'none', background:'#2563eb', color:'white', fontWeight:'bold', cursor:'pointer', boxShadow:'0 4px 6px -1px rgba(37, 99, 235, 0.2)'}}>
                        {responding ? <Loader className="animate-spin" size={18}/> : <CheckCircle size={18}/>} Accept
                    </button>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* SETLIST */}
      <div>
        <h2 style={{fontSize:'12px', fontWeight:'bold', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px'}}><Music size={14}/> Setlist</h2>
        <div style={{background:'white', borderRadius:'16px', boxShadow:'0 1px 2px 0 rgba(0,0,0,0.05)', border:'1px solid #e5e7eb', overflow:'hidden'}}>
          {setlist.length === 0 ? (
            <div style={{padding:'32px', textAlign:'center', color:'#9ca3af', fontStyle:'italic'}}>No songs visible for this service.</div>
          ) : (
            <div>
              {setlist.map((song) => (
                <div key={song.id} style={{padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #f3f4f6'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                    <div style={{width:'40px', height:'40px', borderRadius:'50%', background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color:'#4b5563', border:'1px solid #e5e7eb', flexShrink:0}}>{song.song_key || "-"}</div>
                    <div>
                      <div style={{fontWeight:'bold', color:'#111111'}}>{song.title}</div>
                      {song.bpm && <div style={{fontSize:'12px', fontWeight:'500', color:'#6b7280'}}>{song.bpm} BPM</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}