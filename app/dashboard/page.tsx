'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// ── Default verse pool ────────────────────────────────────────────────────────
const DEFAULT_VERSES = [
  { text: "The Lord your God is with you, the Mighty Warrior who saves.", ref: "Zephaniah 3:17" },
  { text: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" },
  { text: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { text: "The Lord is my shepherd, I lack nothing.", ref: "Psalm 23:1" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.", ref: "Jeremiah 29:11" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
  { text: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
  { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
  { text: "This is the day the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24" },
  { text: "Rejoice in the Lord always. I will say it again: Rejoice!", ref: "Philippians 4:4" },
  { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.", ref: "Isaiah 40:31" },
  { text: "Enter his gates with thanksgiving and his courts with praise.", ref: "Psalm 100:4" },
  { text: "Let everything that has breath praise the Lord.", ref: "Psalm 150:6" },
  { text: "Sing to the Lord a new song; sing to the Lord, all the earth.", ref: "Psalm 96:1" },
  { text: "How lovely is your dwelling place, Lord Almighty!", ref: "Psalm 84:1" },
  { text: "Worship the Lord with gladness; come before him with joyful songs.", ref: "Psalm 100:2" },
];
const pickVerse = (pool: any[]) => pool[Math.floor(Math.random() * pool.length)];

// --- IMPORTS ---
import ScheduleTable from '@/components/ScheduleTable';
import OrganizationProfile from '@/components/OrganizationProfile';
import VolunteerDashboard from '@/components/VolunteerDashboard';

// --- ICONS ---
import {
  Trash2, Plus, Calendar, Music, User, X,
  ChevronLeft, ChevronRight, LayoutGrid, Sun, Moon,
  LogOut, LayoutTemplate, Monitor,
  Zap, Building2, CreditCard
} from 'lucide-react';

// ==========================================
// 1. VOLUNTEER VIEW
// ==========================================
const VolunteerView = ({ user, onLogout }: any) => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 mb-8">
        <div className="max-w-2xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1 rounded"><LayoutGrid size={16}/></div>
            <span className="font-bold text-gray-900">WorshipOps</span>
          </div>
          <button onClick={onLogout} className="text-sm font-medium text-gray-500 hover:text-red-500 flex items-center gap-2">
            <LogOut size={16}/> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
      <div className="px-4">
        <VolunteerDashboard user={user} />
      </div>
    </div>
  );
};

// ==========================================
// 2. MODAL
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

// ==========================================
// 3. SHARED NAV STRUCTURE
// ==========================================
const NAV_CATEGORIES: { [key: string]: { first: string; items: { id: string; label: string; icon: any }[] } } = {
  planner: { first: 'dashboard', items: [
    { id: 'dashboard',  label: 'Plans',     icon: LayoutGrid },
    { id: 'templates',  label: 'Templates', icon: LayoutTemplate },
    { id: 'songs',      label: 'Songs',     icon: Music },
    { id: 'team',       label: 'Teams',     icon: User },
  ]},
  production: { first: 'lighting', items: [
    { id: 'lighting',   label: 'Lighting',   icon: Zap },
    { id: 'stage',      label: 'Stage View', icon: Monitor },
    { id: 'rehearsals', label: 'Rehearsals', icon: Calendar },
  ]},
  settings: { first: 'profile', items: [
    { id: 'profile',      label: 'Profile',      icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'billing',      label: 'Billing',      icon: CreditCard },
  ]},
};

const getActiveCategory = (tab: string) =>
  Object.entries(NAV_CATEGORIES).find(([, { items }]) =>
    items.some((i: any) => i.id === tab)
  )?.[0] || 'planner';

// ==========================================
// 4. HEADER — Planner | Production | Settings
// ==========================================
const Header = ({ colors, activeTab, setActiveTab, isDarkMode, setIsDarkMode, setSelectedService, fetchServices, onLogout, toggleViewMode, viewMode, userRole }: any) => {
  const activeCategory = getActiveCategory(activeTab);

  const handleCategoryClick = (cat: string) => {
    setSelectedService(null);
    if (activeCategory !== cat) setActiveTab(NAV_CATEGORIES[cat].first);
  };

  return (
    <div style={{ padding: '0 30px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.card, height: '56px', position: 'sticky', top: 0, zIndex: 200 }}>

      {/* LOGO */}
      <div onClick={() => { setSelectedService(null); setActiveTab('dashboard'); fetchServices(); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginRight: '24px' }}>
        <LayoutGrid color={colors.primary} size={20} />
        <span style={{ fontWeight: 'bold', fontSize: '16px', color: colors.heading }}>WorshipOps</span>
      </div>

      {/* CATEGORY BUTTONS */}
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flex: 1 }}>
        {Object.keys(NAV_CATEGORIES).map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '8px 18px', fontSize: '14px',
              fontWeight: activeCategory === cat ? '700' : '600',
              color: activeCategory === cat ? colors.heading : colors.text,
              borderBottom: activeCategory === cat ? `2px solid ${colors.primary}` : '2px solid transparent',
              textTransform: 'capitalize' as const,
              height: '56px',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* RIGHT SIDE */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {(userRole === 'admin' || userRole === 'editor') && (
          <button onClick={toggleViewMode} style={{ background: colors.bgSolid, color: colors.text, border: `1px solid ${colors.border}`, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
            {viewMode === 'admin' ? 'Volunteer View' : 'Admin View'}
          </button>
        )}
        <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background: colors.bgSolid, color: colors.text, border: `1px solid ${colors.border}`, padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button onClick={onLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 5. SUB-NAV BAR
// ==========================================
const SubNav = ({ colors, activeTab, setActiveTab, setSelectedService, isDarkMode }: any) => {
  const activeCategory = getActiveCategory(activeTab);
  const items = NAV_CATEGORIES[activeCategory]?.items || [];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
      padding: '0 30px', height: '44px',
      borderBottom: `1px solid ${colors.border}`,
      background: isDarkMode ? '#0d1117' : '#f8f9fa',
      position: 'sticky', top: '56px', zIndex: 199,
    }}>
      {items.map(({ id, label, icon: Icon }: any) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setSelectedService(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '6px 14px', borderRadius: '6px', border: 'none',
              background: isActive ? colors.card : 'transparent',
              color: isActive ? colors.primary : colors.text,
              fontWeight: isActive ? '600' : '500',
              fontSize: '13px', cursor: 'pointer',
              boxShadow: isActive ? `0 1px 3px rgba(0,0,0,0.1), inset 0 0 0 1px ${colors.border}` : 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = isDarkMode ? '#1f2937' : '#efefef'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
};

// ==========================================
// 4. MAIN PAGE COMPONENT
// ==========================================
export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [orgId, setOrgId] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('viewer');
  const [orgName, setOrgName] = useState('');
  const [verseOfDay] = useState(() => pickVerse(DEFAULT_VERSES));
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'volunteer'>('admin');

  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);

  // Data
  const [songs, setSongs] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Songs Tab
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<any>(null);
  const [songSearch, setSongSearch] = useState('');

  // Form State
  const [newMember, setNewMember] = useState({ name: '', role: '' });
  const [newSong, setNewSong] = useState({ title: '', artist: '', key: '', bpm: '', link: '' });
  const [newService, setNewService] = useState({ name: '', date: '' });

  // ---- COLORS — gradient outer shell, solid content ----
  const colors = {
    bg: isDarkMode
      ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e293b 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #f1f5f9 100%)',
    bgSolid: isDarkMode ? '#111827' : '#f3f4f6',
    card: isDarkMode ? '#1f2937' : '#ffffff',
    text: isDarkMode ? '#d1d5db' : '#374151',
    heading: isDarkMode ? '#f9fafb' : '#111827',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    primary: '#3b82f6',
    accent: '#10b981',
    danger: '#ef4444',
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
    const { data: memberData } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (memberData) {
      const oid = memberData.organization_id;
      const role = memberData.role || 'viewer';
      setOrgId(oid);
      setUserRole(role);

      // Non-admin/editor users go straight to volunteer view
      if (role !== 'admin' && role !== 'editor') {
        setViewMode('volunteer');
      }

      // Fetch org name + all data in parallel
      const [, , , orgResult] = await Promise.all([
        fetchSongs(oid),
        fetchServices(oid),
        fetchTeam(oid),
        supabase.from('organizations').select('name, custom_verses').eq('id', oid).maybeSingle(),
      ]);
      if (orgResult.data) {
        setOrgName(orgResult.data.name || '');
      }
    } else {
      setViewMode('volunteer');
      fetchSongs(null); fetchServices(null); fetchTeam(null);
    }
  };

  const fetchSongs = async (oid: any) => { const q = supabase.from('songs').select('*'); const { data } = oid ? await q.eq('organization_id', oid) : await q; setSongs(data || []); };
  const fetchServices = async (oid?: any) => { const q = supabase.from('services').select('*').order('date', { ascending: true }); const { data } = oid ? await q.eq('organization_id', oid) : await q; setServices(data || []); };
  const fetchTeam = async (oid: any) => { const q = supabase.from('team_members').select('*').order('name', { ascending: true }); const { data } = oid ? await q.eq('organization_id', oid) : await q; setTeamMembers(data || []); };

  const openService = async (serviceId: any) => {
    try {
      const { data: serviceData } = await supabase.from('services').select('*').eq('id', serviceId).single();
      const simpleDate = cleanDate(serviceData.date);
      let formattedItems: any[] = [];
      if (serviceData.items && serviceData.items.length > 0) {
        formattedItems = serviceData.items;
      } else {
        const { data: itemsData } = await supabase.from('service_items').select('*').eq('service_date', simpleDate).order('sort_order', { ascending: true });
        if (itemsData) { formattedItems = itemsData.map((item: any) => ({ id: item.id, type: item.item_type, title: item.title, length: item.duration_seconds, bpm: item.bpm, key: item.song_key, notes: item.notes, personId: item.person_id, role: item.role_name })); }
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
    setServices(services.filter((s: any) => s.id !== id));
    if (selectedService?.id === id) setSelectedService(null);
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
        {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{textAlign:'center', fontSize:'12px', color:'#888', padding:'5px'}}>{d}</div>)}
        {allSlots.map((day, index) => {
          if (!day) return <div key={index}></div>;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const serviceOnDay = services.find((s: any) => cleanDate(s.date) === dateStr);
          const isToday = dateStr === cleanDate(new Date().toISOString());
          return (
            <div key={index}
              onClick={() => { if (serviceOnDay) openService(serviceOnDay.id); else if(window.confirm(`Create service for ${dateStr}?`)) handleQuickCreateService(dateStr); }}
              style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', cursor: 'pointer', background: serviceOnDay ? (isDarkMode ? '#374151' : '#e9ecef') : 'transparent', border: isToday ? `1px solid ${colors.primary}` : '1px solid transparent', color: isToday ? colors.primary : colors.text }}
              onMouseOver={(e) => { if(!serviceOnDay) e.currentTarget.style.backgroundColor = isDarkMode ? '#1f2937' : '#f3f4f6'; }}
              onMouseOut={(e) => { if(!serviceOnDay) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{fontSize:'14px'}}>{day}</span>
              {serviceOnDay && <div style={{width:'4px', height:'4px', borderRadius:'50%', background: colors.accent, marginTop:'2px'}}></div>}
            </div>
          );
        })}
      </div>
    );
  };

  // Filtered songs for Songs tab
  const filteredSongs = songs.filter(s =>
    s.title?.toLowerCase().includes(songSearch.toLowerCase())
  );
  const displayedSongs = currentPlaylist
    ? filteredSongs.filter((s: any) => currentPlaylist.songIds?.includes(s.id))
    : filteredSongs;

  // ---- PLACEHOLDER COMING SOON ----
  const ComingSoon = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px', color: colors.text, textAlign: 'center' }}>
      <div style={{ opacity: 0.3, marginBottom: '8px' }}>{icon}</div>
      <h2 style={{ margin: 0, fontSize: '24px', color: colors.heading }}>{title}</h2>
      <p style={{ margin: 0, color: colors.text, opacity: 0.7, maxWidth: '400px' }}>{description}</p>
      <div style={{ marginTop: '8px', padding: '6px 16px', borderRadius: '20px', background: isDarkMode ? '#374151' : '#e5e7eb', fontSize: '12px', fontWeight: '600', color: colors.text, opacity: 0.8 }}>Coming Soon</div>
    </div>
  );

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bgSolid, color: colors.text }}>
      Loading Command Center...
    </div>
  );

  if (viewMode === 'volunteer') {
    return <VolunteerView user={session.user} onLogout={async () => { await supabase.auth.signOut(); router.push('/login'); }} />;
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: colors.bg, color: colors.text }}>

      {/* VERSE STATUS BAR */}
      <div style={{ background: '#f97316', padding: '4px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', minHeight: '28px' }}>
        <span style={{ fontSize: '11px', fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {verseOfDay ? `"${verseOfDay.text}" — ${verseOfDay.ref}` : ''}
        </span>
        {orgName && (
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#f97316', background: 'rgba(255,255,255,0.95)', padding: '2px 12px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {orgName}
          </span>
        )}
      </div>

      <Header
        colors={colors}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        setSelectedService={setSelectedService}
        fetchServices={fetchServices}
        onLogout={async () => { await supabase.auth.signOut(); router.push('/login'); }}
        toggleViewMode={() => setViewMode(viewMode === 'admin' ? 'volunteer' : 'admin')}
        viewMode={viewMode}
        userRole={userRole}
      />

      <SubNav
        colors={colors}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelectedService={setSelectedService}
        isDarkMode={isDarkMode}
      />

      {/* ==================== PROFILE ==================== */}
      {activeTab === 'profile' && (
        <div style={{ padding: '30px', background: colors.bgSolid, minHeight: 'calc(100vh - 56px)' }}>
          <OrganizationProfile session={session} orgId={orgId} isDarkMode={isDarkMode} />
        </div>
      )}

      {/* ==================== SONGS ==================== */}
      {activeTab === 'songs' && (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: colors.bgSolid }}>
          {/* LEFT SIDEBAR */}
          <div style={{ width: '260px', borderRight: `1px solid ${colors.border}`, background: colors.card, padding: '20px 0', flexShrink: 0, overflowY: 'auto' }}>
            <div style={{ padding: '0 16px 12px', fontSize: '11px', fontWeight: '700', color: colors.text, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Library</div>

            {/* All Songs */}
            <div
              onClick={() => setCurrentPlaylist(null)}
              style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: !currentPlaylist ? (isDarkMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)') : 'transparent', borderRadius: '6px', margin: '0 8px' }}
            >
              <Music size={16} color={!currentPlaylist ? colors.primary : colors.text} />
              <span style={{ fontSize: '14px', fontWeight: '500', color: !currentPlaylist ? colors.primary : colors.text, flex: 1 }}>All Songs</span>
              <span style={{ fontSize: '12px', color: colors.text, opacity: 0.5 }}>{songs.length}</span>
            </div>

            <div style={{ padding: '16px 16px 8px', fontSize: '11px', fontWeight: '700', color: colors.text, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>Playlists</div>

            {playlists.length === 0 && (
              <div style={{ padding: '8px 16px', fontSize: '13px', color: colors.text, opacity: 0.4 }}>No playlists yet</div>
            )}
            {playlists.map((pl: any) => (
              <div
                key={pl.id}
                onClick={() => setCurrentPlaylist(pl)}
                style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: currentPlaylist?.id === pl.id ? (isDarkMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)') : 'transparent', borderRadius: '6px', margin: '0 8px' }}
              >
                <LayoutTemplate size={16} color={currentPlaylist?.id === pl.id ? colors.primary : colors.text} />
                <span style={{ fontSize: '14px', fontWeight: '500', color: currentPlaylist?.id === pl.id ? colors.primary : colors.text, flex: 1 }}>{pl.name}</span>
                <span style={{ fontSize: '12px', color: colors.text, opacity: 0.5 }}>{pl.songIds?.length || 0}</span>
              </div>
            ))}

            {/* Add Playlist */}
            <button
              onClick={() => { const name = prompt('Playlist name?'); if (name) setPlaylists([...playlists, { id: Date.now(), name, songIds: [] }]); }}
              style={{ margin: '12px 8px 0', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: `1px dashed ${colors.border}`, borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', color: colors.text, opacity: 0.6, fontSize: '13px', width: 'calc(100% - 16px)' }}
            >
              <Plus size={14} /> New Playlist
            </button>
          </div>

          {/* RIGHT CONTENT */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', color: colors.heading }}>{currentPlaylist ? currentPlaylist.name : 'All Songs'}</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  placeholder="Search songs..."
                  value={songSearch}
                  onChange={e => setSongSearch(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontSize: '14px', outline: 'none' }}
                />
                <button onClick={() => setActiveModal('song')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: colors.primary, color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <Plus size={14} /> Add Song
                </button>
              </div>
            </div>

            {displayedSongs.length === 0 ? (
              <div style={{ color: colors.text, opacity: 0.5, marginTop: '40px', textAlign: 'center' }}>
                {songSearch ? 'No songs match your search.' : 'No songs in library yet.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                {displayedSongs.map((song: any) => (
                  <div key={song.id} style={{ background: colors.card, borderRadius: '10px', padding: '16px', border: `1px solid ${colors.border}`, cursor: 'pointer', transition: 'transform 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <Music size={18} color="white" />
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: colors.heading, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
                    <div style={{ fontSize: '12px', color: colors.text, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist || 'Unknown Artist'}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      {song.key && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: isDarkMode ? '#374151' : '#e5e7eb', color: colors.text, fontWeight: '600' }}>{song.key}</span>}
                      {song.bpm && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: isDarkMode ? '#374151' : '#e5e7eb', color: colors.text, fontWeight: '600' }}>{song.bpm} BPM</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== DASHBOARD ==================== */}
      {activeTab === 'dashboard' && !selectedService && (
        <div style={{ background: colors.bgSolid, minHeight: 'calc(100vh - 56px)', padding: '30px' }}>
          <div style={{ display: 'flex', gap: '30px', maxWidth: '1400px', margin: '0 auto', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '24px', color: colors.heading }}>Upcoming Plans</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                {services.length === 0 && <div style={{color:'#777'}}>No upcoming services. Check the calendar or add one!</div>}
                {services.map((service: any) => (
                  <div key={service.id} onClick={() => openService(service.id)}
                    style={{ background: colors.card, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '140px', transition: 'transform 0.2s', position:'relative' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div>
                      <div style={{fontSize: '12px', textTransform:'uppercase', color: colors.primary, fontWeight:'bold', marginBottom:'5px'}}>Weekend Service</div>
                      <h3 style={{ margin: 0, color: colors.heading, fontSize: '18px' }}>{service.name || 'Untitled Service'}</h3>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${colors.border}`, paddingTop: '15px' }}>
                      <div style={{display:'flex', alignItems:'center', gap:'6px', color:'#777', fontSize:'14px'}}><Calendar size={14} /> {service.date}</div>
                      <button onClick={(e) => handleDeleteService(e, service.id, service.date)} style={{ background: 'transparent', border: 'none', color: colors.danger, cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CALENDAR SIDEBAR */}
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
                <button onClick={() => setActiveModal('service')} style={{ padding: '12px', borderRadius: '8px', border: 'none', background: colors.primary, color: 'white', fontWeight: '600', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}><Plus size={18} /> Plan Service</button>
                <button onClick={() => setActiveModal('song')} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontWeight: '500', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}><Music size={18} /> Add Song</button>
                <button onClick={() => setActiveModal('team')} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text, fontWeight: '500', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}><User size={18} /> Add Person</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SCHEDULE TABLE ==================== */}
      {selectedService && (
        <div style={{ padding: '20px', background: colors.bgSolid, minHeight: 'calc(100vh - 56px)' }}>
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

      {/* ==================== TEAMS ==================== */}
      {activeTab === 'team' && (
        <div style={{ background: colors.bgSolid, minHeight: 'calc(100vh - 100px)' }}>
          {/* Header */}
          <div style={{ padding: '18px 28px', background: colors.card, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: colors.heading }}>Team Roster</h1>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: colors.text, opacity: 0.6 }}>{teamMembers.length} members</p>
            </div>
            {(userRole === 'admin' || userRole === 'editor') && (
              <button onClick={() => setActiveModal('team')} style={{ border: 'none', borderRadius: '7px', padding: '8px 16px', background: colors.primary, color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={15} /> Add Person
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            {teamMembers.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: colors.text, opacity: 0.5 }}>
                No team members yet. Click &quot;Add Person&quot; to get started.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: isDarkMode ? '#161b22' : '#f8fafc', borderBottom: `2px solid ${colors.border}` }}>
                    {['Name', 'Role', 'Phone', 'Email', 'Ministries'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: colors.text, opacity: 0.6, whiteSpace: 'nowrap' as const }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((m: any) => {
                    const ministries: string[] = Array.isArray(m.ministries) ? m.ministries : [];
                    return (
                      <tr key={m.id} style={{ borderBottom: `1px solid ${colors.border}`, transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = isDarkMode ? '#1f2937' : '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Avatar + Name */}
                        <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' as const }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                              {(m.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: '600', color: colors.heading }}>{m.name}</span>
                          </div>
                        </td>
                        {/* Role */}
                        <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' as const }}>
                          {m.role ? (
                            <span style={{ background: isDarkMode ? '#374151' : '#f3f4f6', color: colors.text, padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{m.role}</span>
                          ) : <span style={{ opacity: 0.4 }}>—</span>}
                        </td>
                        {/* Phone */}
                        <td style={{ padding: '12px 20px', color: colors.text, opacity: 0.7, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' as const }}>
                          {m.phone || '—'}
                        </td>
                        {/* Email */}
                        <td style={{ padding: '12px 20px', color: colors.text, opacity: 0.7, fontFamily: 'monospace', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {m.email ? (
                            <a href={`mailto:${m.email}`} style={{ color: colors.primary, textDecoration: 'none' }}>{m.email}</a>
                          ) : '—'}
                        </td>
                        {/* Ministries */}
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                            {ministries.slice(0, 3).map((mn: string, i: number) => (
                              <span key={i} style={{ fontSize: '11px', background: 'rgba(59,130,246,0.12)', color: colors.primary, padding: '1px 8px', borderRadius: '10px', whiteSpace: 'nowrap' as const }}>{mn}</span>
                            ))}
                            {ministries.length > 3 && <span style={{ fontSize: '11px', color: colors.text, opacity: 0.5 }}>+{ministries.length - 3}</span>}
                            {ministries.length === 0 && <span style={{ opacity: 0.4 }}>—</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ==================== PLACEHOLDER TABS ==================== */}
      {activeTab === 'templates' && (
        <div style={{ background: colors.bgSolid, minHeight: 'calc(100vh - 56px)' }}>
          <ComingSoon icon={<LayoutTemplate size={64} />} title="Templates" description="Save and reuse service structures. Build once, deploy every week." />
        </div>
      )}
      {activeTab === 'lighting' && (
        <div style={{ background: colors.bgSolid, minHeight: 'calc(100vh - 56px)' }}>
          <ComingSoon icon={<Zap size={64} />} title="Lighting" description="Control your DMX lighting setup directly from the Command Center." />
        </div>
      )}
      {activeTab === 'stage' && (
        <div style={{ background: colors.bgSolid, minHeight: 'calc(100vh - 56px)' }}>
          <ComingSoon icon={<Monitor size={64} />} title="Stage View" description="A distraction-free view for stage monitors and in-ear displays." />
        </div>
      )}
      {activeTab === 'rehearsals' && (
        <div style={{ background: colors.bgSolid, minHeight: 'calc(100vh - 56px)' }}>
          <ComingSoon icon={<Music size={64} />} title="Rehearsals" description="Schedule and manage rehearsal sessions with your team." />
        </div>
      )}
      {activeTab === 'organization' && (
        <div style={{ background: colors.bgSolid, minHeight: 'calc(100vh - 56px)' }}>
          <ComingSoon icon={<Building2 size={64} />} title="Organization" description="Manage your church organization settings, branding, and locations." />
        </div>
      )}
      {activeTab === 'billing' && (
        <div style={{ background: colors.bgSolid, minHeight: 'calc(100vh - 56px)' }}>
          <ComingSoon icon={<CreditCard size={64} />} title="Billing" description="Manage your subscription, invoices, and payment details." />
        </div>
      )}

      {/* ==================== MODALS ==================== */}
      {activeModal === 'service' && (
        <Modal title="Plan New Service" onClose={() => setActiveModal(null)} colors={colors}>
          <form onSubmit={handleServiceSubmit} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            <input placeholder="Service Name" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bgSolid, color: colors.text}} />
            <input type="date" value={newService.date} onChange={e => setNewService({...newService, date: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bgSolid, color: colors.text}} />
            <button type="submit" style={{padding:'12px', borderRadius:'6px', border:'none', background: colors.accent, color:'white', fontWeight:'bold', cursor:'pointer'}}>Create Plan</button>
          </form>
        </Modal>
      )}

      {activeModal === 'song' && (
        <Modal title="Add to Library" onClose={() => setActiveModal(null)} colors={colors}>
          <form onSubmit={handleSongSubmit} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            <input placeholder="Title" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bgSolid, color: colors.text}} />
            <input placeholder="Artist" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bgSolid, color: colors.text}} />
            <div style={{display:'flex', gap:'10px'}}>
              <input placeholder="Key" style={{flex:1, padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bgSolid, color: colors.text}} value={newSong.key} onChange={e => setNewSong({...newSong, key: e.target.value})} />
              <input placeholder="BPM" style={{flex:1, padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bgSolid, color: colors.text}} value={newSong.bpm} onChange={e => setNewSong({...newSong, bpm: e.target.value})} />
            </div>
            <input placeholder="Paste Link (YouTube, Drive...)" value={newSong.link} onChange={e => setNewSong({...newSong, link: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bgSolid, color: colors.text, width: '100%', boxSizing: 'border-box'}} />
            <button type="submit" style={{padding:'12px', borderRadius:'6px', border:'none', background: colors.primary, color:'white', fontWeight:'bold', cursor:'pointer'}}>Save Song</button>
          </form>
        </Modal>
      )}

      {activeModal === 'team' && (
        <Modal title="Add Team Member" onClose={() => setActiveModal(null)} colors={colors}>
          <form onSubmit={handleMemberSubmit} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            <input placeholder="Full Name" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bgSolid, color: colors.text}} />
            <input placeholder="Role (e.g. Bass)" value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})} style={{padding:'12px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.bgSolid, color: colors.text}} />
            <button type="submit" style={{padding:'12px', borderRadius:'6px', border:'none', background: colors.primary, color:'white', fontWeight:'bold', cursor:'pointer'}}>Add Person</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
