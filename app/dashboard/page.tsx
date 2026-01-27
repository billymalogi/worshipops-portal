'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// --- IMPORTS ---
import VolunteerDashboard from '@/components/VolunteerDashboard';
import ScheduleTable from '@/components/ScheduleTable'; 
import OrganizationProfile from '@/components/OrganizationProfile'; 


// --- ICONS ---
// FIX: Removed 'as CalIcon' alias so we can just use 'Calendar' everywhere
import { 
  Trash2, Plus, Calendar, Music, User, X, 
  ChevronLeft, ChevronRight, LayoutGrid, Sun, Moon, 
  LogOut, Settings, Clock, CheckCircle 
} from 'lucide-react';

// ==========================================
// 1. VOLUNTEER VIEW SUB-COMPONENT
// ==========================================
// ==========================================
// 1. VOLUNTEER VIEW SUB-COMPONENT
// ==========================================
// ... inside app/dashboard/page.tsx

const VolunteerView = ({ user, onLogout }: any) => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Volunteer Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 mb-8">
        <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <div className="bg-blue-600 text-white p-1 rounded"><LayoutGrid size={16}/></div>
                <span className="font-bold text-gray-900">Worship Ops</span>
             </div>
             <button onClick={onLogout} className="text-sm font-medium text-gray-500 hover:text-red-500 flex items-center gap-2">
                <LogOut size={16}/> <span className="hidden sm:inline">Sign Out</span>
             </button>
        </div>
      </div>

      {/* The New Dashboard Component */}
      <div className="px-4">
         <VolunteerDashboard user={user} />
      </div>
    </div>
  );
};

// ==========================================
// 2. ADMIN VIEW SUB-COMPONENT
// ==========================================
const Modal = ({ title, onClose, children, colors }: any) => (
  <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 1000, backdropFilter: 'blur(3px)'}}>
    <div style={{background: colors.card, padding:'25px', borderRadius:'12px', width:'400px', border: `1px solid ${colors.border}`, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'}}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
        <h3 style={{margin:0, color: colors.heading}}>{title}</h3>
        <button onClick={onClose} style={{background:'none', border:'none', color: colors.text, cursor:'pointer'}}><X size={20}/></button>
      </div>
      {children}
    </div>
  </div>
);

const Header = ({ colors, activeTab, setActiveTab, isDarkMode, setIsDarkMode, setSelectedService, fetchServices, onLogout, toggleViewMode, viewMode }: any) => (
  <div style={{ padding: '15px 30px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.card }}>
    <div onClick={() => { setSelectedService(null); setActiveTab('dashboard'); fetchServices(); }} style={{display:'flex', alignItems:'center', gap:'10px', cursor: 'pointer'}}>
      <LayoutGrid color={colors.primary} />
      <span style={{ fontWeight: 'bold', fontSize: '18px', color: colors.heading }}>Worship Ops</span>
    </div>
    <div style={{display:'flex', gap:'15px', alignItems: 'center'}}>
      {/* ADMIN TOGGLE */}
      <button onClick={toggleViewMode} style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
         {viewMode === 'admin' ? 'Switch to Volunteer View' : 'Switch to Admin View'}
      </button>

      <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500' }}>
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <button onClick={onLogout} style={{ background: colors.danger, color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500' }}>
          <LogOut size={16} />
      </button>
    </div>
  </div>
);

// ==========================================
// 3. MAIN PAGE COMPONENT
// ==========================================
export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [session, setSession] = useState<any>(null); 
  const [orgId, setOrgId] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'volunteer'>('admin'); // Toggle State

  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [songs, setSongs] = useState<any[]>([]); 
  const [services, setServices] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]); 
  const [selectedService, setSelectedService] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null); 
  const [calendarDate, setCalendarDate] = useState(new Date()); 
  const [isSaving, setIsSaving] = useState(false); 

  // Form State
  const [newMember, setNewMember] = useState({ name: '', role: '' });
  const [newSong, setNewSong] = useState({ title: '', artist: '', key: '', bpm: '', link: '' });
  const [newService, setNewService] = useState({ name: '', date: '' });

  const colors = {
    bg: isDarkMode ? '#1a1b1e' : '#f8f9fa',
    card: isDarkMode ? '#25262b' : '#ffffff',
    text: isDarkMode ? '#c1c2c5' : '#1f2937',
    heading: isDarkMode ? '#ffffff' : '#111827',
    border: isDarkMode ? '#2c2e33' : '#e5e7eb',
    primary: '#228be6', accent: '#40c057', danger: '#fa5252',
  };

  const cleanDate = (dateStr: string) => dateStr ? dateStr.split('T')[0] : '';

  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/login'); } 
        else { setSession(session); setLoading(false); }
    };
    checkUser();
  }, [router, supabase]);

  useEffect(() => { if (session) fetchOrgAndData(); }, [session]);

  const fetchOrgAndData = async () => {
    const { data: memberData } = await supabase.from('organization_members').select('organization_id').eq('user_id', session.user.id).maybeSingle();
    if (memberData) {
        setOrgId(memberData.organization_id);
        fetchSongs(memberData.organization_id); 
        fetchServices(memberData.organization_id); 
        fetchTeam(memberData.organization_id); 
    } else {
        fetchSongs(null); fetchServices(null); fetchTeam(null);
    }
  };
  
  const fetchSongs = async (oid: any) => { const { data } = await supabase.from('songs').select('*'); setSongs(data || []); };
  const fetchServices = async (oid: any) => { const { data } = await supabase.from('services').select('*').order('date', { ascending: true }); setServices(data || []); };
  const fetchTeam = async (oid: any) => { const { data } = await supabase.from('team_members').select('*').order('name', { ascending: true }); setTeamMembers(data || []); };
  
  const openService = async (serviceId: any) => {
    try {
        const { data: serviceData } = await supabase.from('services').select('*').eq('id', serviceId).single();
        const simpleDate = cleanDate(serviceData.date);
        let formattedItems: any[] = [];
        if (serviceData.items && serviceData.items.length > 0) { formattedItems = serviceData.items; } 
        else {
             const { data: itemsData } = await supabase.from('service_items').select('*').eq('service_date', simpleDate).order('sort_order', { ascending: true });
             if (itemsData) { formattedItems = itemsData.map(item => ({ id: item.id, type: item.item_type, title: item.title, length: item.duration_seconds, bpm: item.bpm, key: item.song_key, notes: item.notes, personId: item.person_id, role: item.role_name })); }
        }
        setSelectedService({ id: serviceData.id, name: serviceData.name, date: serviceData.date, items: formattedItems });
    } catch (err) { console.error(err); }
  };

  const handleQuickCreateService = async (dateStr: string) => {
    const { data } = await supabase.from('services').insert([{ name: 'Weekend Service', date: dateStr, organization_id: orgId }]).select().single();
    await fetchServices(orgId); if (data) await openService(data.id);
  };
  const handleDeleteService = async (e: any, id: any, date: any) => {
    e.stopPropagation(); if (!window.confirm("Delete this service?")) return;
    await supabase.from('service_items').delete().eq('service_date', cleanDate(date));
    await supabase.from('services').delete().eq('id', id);
    setServices(services.filter(s => s.id !== id)); if (selectedService?.id === id) setSelectedService(null);
  };
  const handleSavePlan = async (updatedStart: any, updatedItems: any) => {
    if (!selectedService || isSaving) return; setIsSaving(true);
    const serviceId = selectedService.id; const simpleDate = cleanDate(updatedStart); 
    try {
        await supabase.from('services').update({ date: simpleDate, items: updatedItems }).eq('id', serviceId);
        await supabase.from('service_items').delete().eq('service_date', simpleDate);
        const itemsToInsert = updatedItems.map((item: any, index: number) => ({ service_date: simpleDate, sort_order: index, title: item.title, item_type: item.type, duration_seconds: item.length || 0, bpm: item.bpm, song_key: item.key, notes: item.notes, person_id: item.personId || null, role_name: item.role || '' }));
        if (itemsToInsert.length) await supabase.from('service_items').insert(itemsToInsert);
        await openService(serviceId); 
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };
  const handleServiceSubmit = async (e: any) => { e.preventDefault(); await supabase.from('services').insert([{ name: newService.name, date: newService.date, organization_id: orgId }]); await fetchServices(orgId); setNewService({ name: '', date: '' }); setActiveModal(null); };
  const handleSongSubmit = async (e: any) => { e.preventDefault(); await supabase.from('songs').insert([{ ...newSong, bpm: newSong.bpm ? parseInt(newSong.bpm) : null, organization_id: orgId }]); fetchSongs(orgId); setNewSong({ title: '', artist: '', key: '', bpm: '', link: '' }); setActiveModal(null); };
  const handleMemberSubmit = async (e: any) => { e.preventDefault(); await supabase.from('team_members').insert([{...newMember, organization_id: orgId}]); fetchTeam(orgId); setNewMember({ name: '', role: '' }); setActiveModal(null); };

  const getDaysInMonth = (date: Date) => { const year = date.getFullYear(); const month = date.getMonth(); return { days: new Date(year, month + 1, 0).getDate(), firstDay: new Date(year, month, 1).getDay(), year, month }; };
  const renderCalendar = () => {
    const { days, firstDay, year, month } = getDaysInMonth(calendarDate);
    const blanks = Array(firstDay).fill(null);
    const daySlots = Array.from({ length: days }, (_, i) => i + 1);
    const allSlots = [...blanks, ...daySlots];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginTop: '10px' }}>
        {/* FIX: Use index (i) as key to avoid 'Encountered two children with same key' error */}
        {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{textAlign:'center', fontSize:'12px', color:'#888', padding:'5px'}}>{d}</div>)}
        {allSlots.map((day, index) => {
          if (!day) return <div key={index}></div>;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const serviceOnDay = services.find(s => cleanDate(s.date) === dateStr);
          const isToday = dateStr === cleanDate(new Date().toISOString());
          return (
            <div key={index} onClick={() => { if (serviceOnDay) openService(serviceOnDay.id); else if(window.confirm(`Create service for ${dateStr}?`)) handleQuickCreateService(dateStr); }} style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', cursor: 'pointer', background: serviceOnDay ? (isDarkMode ? '#2c2e33' : '#e9ecef') : 'transparent', border: isToday ? `1px solid ${colors.primary}` : '1px solid transparent', color: isToday ? colors.primary : colors.text, }} onMouseOver={(e) => { if(!serviceOnDay) e.currentTarget.style.backgroundColor = isDarkMode ? '#25262b' : '#f1f3f5'; }} onMouseOut={(e) => { if(!serviceOnDay) e.currentTarget.style.backgroundColor = 'transparent'; }}>
              <span style={{fontSize:'14px'}}>{day}</span>
              {serviceOnDay && <div style={{width:'4px', height:'4px', borderRadius:'50%', background: colors.accent, marginTop:'2px'}}></div>}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bg, color: colors.text}}>Loading Command Center...</div>;

  // --- RENDER TOGGLE ---
  // If "Volunteer Mode" is active, show the Volunteer View
  if (viewMode === 'volunteer') {
      return <VolunteerView user={session.user} onLogout={async () => { await supabase.auth.signOut(); router.push('/login'); }} />;
  }

  // Otherwise, Render ADMIN Dashboard
  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: colors.bg, color: colors.text }}>
      <Header 
        colors={colors} activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} setSelectedService={setSelectedService} fetchServices={fetchServices} 
        onLogout={async () => { await supabase.auth.signOut(); router.push('/login'); }}
        toggleViewMode={() => setViewMode('volunteer')}
        viewMode={viewMode}
      />

      {activeTab === 'profile' && <OrganizationProfile session={session} orgId={orgId} isDarkMode={isDarkMode} />}

      {activeTab === 'dashboard' && !selectedService && (
        <div style={{ display: 'flex', padding: '30px', gap: '30px', maxWidth: '1400px', margin: '0 auto', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '24px', color: colors.heading }}>Upcoming Plans</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                {services.length === 0 && <div style={{color:'#777'}}>No upcoming services. Check the calendar or add one!</div>}
                {services.map(service => (
                    <div key={service.id} onClick={() => openService(service.id)} style={{ background: colors.card, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '140px', transition: 'transform 0.2s', position:'relative' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div>
                            <div style={{fontSize: '12px', textTransform:'uppercase', color: colors.primary, fontWeight:'bold', marginBottom:'5px'}}>Weekend Service</div>
                            <h3 style={{ margin: 0, color: colors.heading, fontSize: '18px' }}>{service.name || 'Untitled Service'}</h3>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${colors.border}`, paddingTop: '15px' }}>
                            {/* FIX: Now correctly uses Calendar icon */}
                            <div style={{display:'flex', alignItems:'center', gap:'6px', color:'#777', fontSize:'14px'}}><Calendar size={14} /> {service.date}</div>
                            <button onClick={(e) => handleDeleteService(e, service.id, service.date)} style={{ background: 'transparent', border: 'none', color: colors.danger, cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
          <div style={{ flex: '0 0 300px' }}>
             <div style={{ background: colors.card, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                    <h3 style={{margin:0, fontSize:'16px', color: colors.heading}}>{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                    <div style={{display:'flex', gap:'5px'}}>
                        <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth()-1)))} style={{background:'none', border:'none', cursor:'pointer', color:colors.text}}><ChevronLeft size={16}/></button>
                        <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth()+1)))} style={{background:'none', border:'none', cursor:'pointer', color:colors.text}}><ChevronRight size={16}/></button>
                    </div>
                </div>
                {renderCalendar()}
             </div>
             <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => setActiveModal('service')} style={{ padding: '12px', borderRadius: '8px', border: 'none', background: colors.primary, color: 'white', fontWeight: '600', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}> <Plus size={18} /> Plan Service </button>
                <button onClick={() => setActiveModal('song')} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontWeight: '500', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}> <Music size={18} /> Add Song </button>
                <button onClick={() => setActiveModal('team')} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontWeight: '500', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}> <User size={18} /> Add Person </button>
             </div>
          </div>
        </div>
      )}

      {selectedService && (
        <div style={{ padding: '20px' }}>
        <ScheduleTable 
            isDarkMode={isDarkMode} 
            serviceData={selectedService} 
            availableSongs={songs} 
            teamMembers={teamMembers} 
            services={services} 
            onServiceSelect={openService} 
            onCreateService={handleQuickCreateService} 
            onBack={() => { setSelectedService(null); fetchServices(orgId); }} 
            onSave={handleSavePlan} 
            activePlanId={selectedService.id} 
            orgId={orgId} 
        />
        </div>
      )}

      {activeModal === 'service' && (
        <Modal title="Plan New Service" onClose={() => setActiveModal(null)} colors={colors}>
            <form onSubmit={handleServiceSubmit} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                <input placeholder="Service Name" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bg, color: colors.text}} />
                <input type="date" value={newService.date} onChange={e => setNewService({...newService, date: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bg, color: colors.text}} />
                <button type="submit" style={{padding:'12px', borderRadius:'6px', border:'none', background: colors.accent, color:'white', fontWeight:'bold', cursor:'pointer'}}>Create Plan</button>
            </form>
        </Modal>
      )}

      {activeModal === 'song' && (
        <Modal title="Add to Library" onClose={() => setActiveModal(null)} colors={colors}>
            <form onSubmit={handleSongSubmit} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                <input placeholder="Title" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bg, color: colors.text}} />
                <input placeholder="Artist" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bg, color: colors.text}} />
                <div style={{display:'flex', gap:'10px'}}>
                    <input placeholder="Key" style={{flex:1, padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bg, color: colors.text}} value={newSong.key} onChange={e => setNewSong({...newSong, key: e.target.value})} />
                    <input placeholder="BPM" style={{flex:1, padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bg, color: colors.text}} value={newSong.bpm} onChange={e => setNewSong({...newSong, bpm: e.target.value})} />
                </div>
                <div style={{position:'relative'}}>
                    <input placeholder="Paste Link (YouTube, Drive...)" value={newSong.link} onChange={e => setNewSong({...newSong, link: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bg, color: colors.text, width: '100%', boxSizing: 'border-box'}} />
                </div>
                <button type="submit" style={{padding:'12px', borderRadius:'6px', border:'none', background: colors.primary, color:'white', fontWeight:'bold', cursor:'pointer'}}>Save Song</button>
            </form>
        </Modal>
      )}

      {activeModal === 'team' && (
        <Modal title="Add Team Member" onClose={() => setActiveModal(null)} colors={colors}>
            <form onSubmit={handleMemberSubmit} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                <input placeholder="Full Name" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bg, color: colors.text}} />
                <input placeholder="Role (e.g. Bass)" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bg, color: colors.text}} />
                <button type="submit" style={{padding:'12px', borderRadius:'6px', border:'none', background: colors.primary, color:'white', fontWeight:'bold', cursor:'pointer'}}>Add Person</button>
            </form>
        </Modal>
      )}
    </div>
  );
}