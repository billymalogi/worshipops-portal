import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

// --- IMPORTS ---
import ScheduleTable from './components/ScheduleTable';
import PersistentCalendar from './components/PersistentCalendar';
import TeamManager from './components/TeamManager';
import LightingController from './components/LightingController';
import StageView from './components/StageView';
import SongsManager from './components/SongsManager';
import MatrixCalendar from './components/MatrixCalendar';
import RehearsalMixer from './components/RehearsalMixer';
import TemplatesManager from './components/TemplatesManager';
import ProfileSettings from './components/ProfileSettings';
import OrgSettings from './components/OrgSettings';
import BillingSettings from './components/BillingSettings';
import SupportWidget from './components/SupportWidget';

// --- ICONS ---
import {
  Trash2, Plus, Calendar, Music, User,
  LayoutGrid, Sun, Moon,
  LogOut, Folder, ArrowLeft, Users, FolderInput, Zap,
  Grid3x3, Settings, LayoutTemplate, Monitor
} from 'lucide-react';

// --- DEFAULT VERSES ---
const DEFAULT_VERSES = [
  { text: "The Lord your God is with you, the Mighty Warrior who saves.", ref: "Zephaniah 3:17" },
  { text: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" },
  { text: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { text: "The Lord is my shepherd, I lack nothing.", ref: "Psalm 23:1" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.", ref: "Jeremiah 29:11" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
  { text: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
  { text: "Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God.", ref: "Philippians 4:6" },
  { text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.", ref: "Numbers 6:24-25" },
  { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
  { text: "This is the day the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24" },
  { text: "Greater is he that is in you, than he that is in the world.", ref: "1 John 4:4" },
  { text: "Rejoice in the Lord always. I will say it again: Rejoice!", ref: "Philippians 4:4" },
  { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.", ref: "Isaiah 40:31" },
  { text: "The name of the Lord is a fortified tower; the righteous run to it and are safe.", ref: "Proverbs 18:10" },
  { text: "Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name.", ref: "Psalm 100:4" },
  { text: "Let everything that has breath praise the Lord.", ref: "Psalm 150:6" },
  { text: "Taste and see that the Lord is good; blessed is the one who takes refuge in him.", ref: "Psalm 34:8" },
  { text: "Sing to the Lord a new song; sing to the Lord, all the earth.", ref: "Psalm 96:1" },
  { text: "Therefore, since we are receiving a kingdom that cannot be shaken, let us be thankful.", ref: "Hebrews 12:28" },
  { text: "O come, let us worship and bow down; let us kneel before the Lord our Maker.", ref: "Psalm 95:6" },
  { text: "I will praise you, Lord, with all my heart; before the gods I will sing your praise.", ref: "Psalm 138:1" },
  { text: "How lovely is your dwelling place, Lord Almighty!", ref: "Psalm 84:1" },
  { text: "Worship the Lord with gladness; come before him with joyful songs.", ref: "Psalm 100:2" },
];

const pickVerse = (pool) => pool[Math.floor(Math.random() * pool.length)];

// --- SHARED NAV STRUCTURE ---
const NAV_CATEGORIES = {
  planner:    { first: 'dashboard',  items: [
    { id: 'dashboard',  label: 'Plans',      icon: LayoutGrid },
    { id: 'templates',  label: 'Templates',  icon: LayoutTemplate },
    { id: 'songs',      label: 'Songs',      icon: Music },
    { id: 'team',       label: 'Teams',      icon: Users },
  ]},
  production: { first: 'lighting', items: [
    { id: 'lighting',   label: 'Lighting',   icon: Zap },
    { id: 'stage',      label: 'Stage View', icon: Monitor },
    { id: 'rehearsals', label: 'Rehearsals', icon: Calendar },
  ]},
  settings:   { first: 'profile', items: [
    { id: 'profile',      label: 'Profile',       icon: User },
    { id: 'organization', label: 'Organization',  icon: FolderInput },
    { id: 'billing',      label: 'Billing',       icon: Settings },
  ]},
};

const getActiveCategory = (tab) =>
  Object.entries(NAV_CATEGORIES).find(([, { items }]) =>
    items.some(i => i.id === tab)
  )?.[0] || 'planner';

// --- ROLE-BASED TAB PERMISSIONS ---
const ROLE_TABS = {
  admin:            ['dashboard','templates','songs','team','lighting','stage','rehearsals','profile','organization','billing'],
  leader:           ['dashboard','templates','songs','team','lighting','stage','rehearsals','profile','organization'],
  campus_leader:    ['dashboard','team','profile'],
  editor:           ['dashboard','templates','songs','team','lighting','stage','rehearsals','profile','organization'],
  viewer:           [],
  scheduled_viewer: [],
};
const ROLE_CAN_TOGGLE = { admin: true, leader: true, campus_leader: true, editor: true, viewer: false, scheduled_viewer: false };
const ROLE_LABELS = { admin: 'Admin', leader: 'Leader', campus_leader: 'Campus Leader', editor: 'Editor', viewer: 'Volunteer', scheduled_viewer: 'Volunteer' };
const getAllowedTabs = (role) => ROLE_TABS[role] ?? [];

// --- CATEGORY ACCENT COLORS ---
// accent = active tab text/underline
// tabBgLight/Dark = subtle bg on the active main-nav button
// navBgLight/Dark = subnav bar background
const CAT_COLORS = {
  planner:    { accent: '#b45309', tabBgLight: '#fef9c3', tabBgDark: 'rgba(217,119,6,0.22)',  navBgLight: '#fef9c3', navBgDark: '#1c1400' },
  production: { accent: '#9b1c1c', tabBgLight: '#fce7e7', tabBgDark: 'rgba(155,28,28,0.25)',  navBgLight: '#fce7e7', navBgDark: '#1a0004' },
  settings:   { accent: '#0f766e', tabBgLight: '#ccfbf1', tabBgDark: 'rgba(15,118,110,0.22)', navBgLight: '#ccfbf1', navBgDark: '#001512' },
};

// --- HEADER COMPONENT ---
const CAT_DISPLAY = { planner: 'Planner', production: 'Production', settings: 'Settings' };

const Header = ({ colors, activeTab, setActiveTab, isDarkMode, setIsDarkMode, setSelectedService, refreshData, onLogout, session, userRole, realRole, toggleViewMode }) => {
  const activeCategory = getActiveCategory(activeTab);
  const allowed = getAllowedTabs(realRole);

  // Only show categories that have at least one accessible tab
  const visibleCats = Object.keys(NAV_CATEGORIES).filter(cat =>
    NAV_CATEGORIES[cat].items.some(item => allowed.includes(item.id))
  );

  const handleCategoryClick = (cat) => {
    setSelectedService(null);
    if (activeCategory !== cat) {
      const firstAllowed = NAV_CATEGORIES[cat].items.find(item => allowed.includes(item.id));
      if (firstAllowed) setActiveTab(firstAllowed.id);
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      height: '64px',
      borderBottom: `1px solid ${colors.border}`,
      background: colors.card,
      position: 'sticky',
      top: 0,
      zIndex: 200,
      padding: '0 20px',
    }}>
      {/* LEFT: Logo */}
      <div onClick={() => { setSelectedService(null); setActiveTab('dashboard'); refreshData(); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', justifySelf: 'start' }}>
        <img src="/favicon.ico" alt="Logo" onError={(e) => { e.target.style.display = 'none'; }} style={{ height: '40px', width: '40px', borderRadius: '8px', objectFit: 'contain' }} />
        <span style={{ fontWeight: '800', fontSize: '18px', color: colors.heading, letterSpacing: '-0.5px' }}>Worship Ops</span>
      </div>

      {/* CENTER: Category tabs — truly centered via CSS grid */}
      <div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
        {visibleCats.map(cat => {
          const isActive = activeCategory === cat;
          const cc = CAT_COLORS[cat];
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              style={{
                background: isActive ? (isDarkMode ? cc.tabBgDark : cc.tabBgLight) : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? cc.accent : 'transparent'}`,
                cursor: 'pointer',
                padding: '0 24px',
                fontSize: '14px',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? cc.accent : colors.text,
                textTransform: 'capitalize',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!isActive) { e.currentTarget.style.background = isDarkMode ? cc.tabBgDark : cc.tabBgLight; e.currentTarget.style.color = cc.accent; }
              }}
              onMouseLeave={e => {
                if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text; }
              }}
            >
              {CAT_DISPLAY[cat]}
            </button>
          );
        })}
      </div>

      {/* RIGHT: Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', justifySelf: 'end' }}>
        {/* Role badge */}
        <span style={{ fontSize: '11px', fontWeight: '600', color: colors.text, opacity: 0.6, padding: '2px 8px', border: `1px solid ${colors.border}`, borderRadius: '12px', whiteSpace: 'nowrap' }}>
          {ROLE_LABELS[realRole] || realRole}
        </span>
        {/* View toggle — only for roles that can see both views */}
        {ROLE_CAN_TOGGLE[realRole] && (
          <button
            onClick={toggleViewMode}
            style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.bgSolid, color: colors.text, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {userRole === 'admin' ? 'Volunteer View' : 'Admin View'}
          </button>
        )}
        <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background: 'transparent', color: colors.text, border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button onClick={onLogout} title="Log Out" style={{ background: 'transparent', color: colors.danger, border: 'none', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};

// --- SUB-NAV BAR ---
const SubNav = ({ colors, activeTab, setActiveTab, setSelectedService, isDarkMode, realRole }) => {
  const activeCategory = getActiveCategory(activeTab);
  const allowed = getAllowedTabs(realRole);
  const cc = CAT_COLORS[activeCategory] || CAT_COLORS.planner;
  const allItems = NAV_CATEGORIES[activeCategory]?.items || [];
  // Only show items the user's role can access
  const items = allItems.filter(item => allowed.includes(item.id));
  const navBg = isDarkMode ? cc.navBgDark : cc.navBgLight;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2px',
      padding: '0 30px',
      height: '44px',
      borderBottom: `1px solid ${colors.border}`,
      background: navBg,
      position: 'sticky',
      top: '64px',
      zIndex: 199,
    }}>
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setSelectedService(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: isActive ? (isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)') : 'transparent',
              color: isActive ? cc.accent : (isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'),
              fontWeight: isActive ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) { e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = cc.accent; }
            }}
            onMouseLeave={(e) => {
              if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'; }
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
};

// --- MAIN DASHBOARD ---
export default function Dashboard() {
  const router = useNavigate();
  const [session, setSession] = useState(null); 
  const [orgId, setOrgId] = useState(null); 

  const [realRole, setRealRole] = useState('viewer'); // Remembers true DB power
  const [userRole, setUserRole] = useState('viewer'); // Controls the current view
  const toggleViewMode = () => {
    if (realRole !== 'admin') return; 
    setUserRole(prevRole => prevRole === 'admin' ? 'viewer' : 'admin');
  };

  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [currentFolder, setCurrentFolder] = useState(null); 
  const [isDarkMode, setIsDarkMode] = useState(false); 
  
  // Data State
  const [songs, setSongs] = useState([]); 
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]); 
  const [templates, setTemplates] = useState([]); 
  const [folders, setFolders] = useState([]); 

  const [selectedService, setSelectedService] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [folderViewMode, setFolderViewMode] = useState('list'); // 'list' or 'matrix'
  const [orgName, setOrgName] = useState('');
  const [customVerses, setCustomVerses] = useState([]);
  const [verseOfDay, setVerseOfDay] = useState(() => pickVerse(DEFAULT_VERSES));

  const colors = {
    bg: isDarkMode
      ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e293b 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #f1f5f9 100%)',
    bgSolid: isDarkMode ? '#111827' : '#f3f4f6',
    card: isDarkMode ? '#1f2937' : '#ffffff',
    text: isDarkMode ? '#9ca3af' : '#4b5563',
    heading: isDarkMode ? '#f9fafb' : '#111827',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    hover: isDarkMode ? '#374151' : '#f3f4f6',
    primary: '#3b82f6', accent: '#10b981', danger: '#ef4444',
  };

  // Helper function to format TIME values (e.g., "09:00:00" -> "9:00 AM")
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const isPM = hour >= 12;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
  };

  // --- 1. ROCK SOLID AUTH (The Fix) ---
  useEffect(() => {
    // A. Check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
            console.log("No session found. Redirecting to login.");
            router('/login');
        } else {
            console.log("Session found:", session.user.email);
            setSession(session);
            fetchOrgData(session.user.id);
        }
    });

    // B. Listen for changes (Login, Logout, Auto-Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
            setSession(null);
            router('/login');
        } else {
            setSession(session);
            // If we have a session but no Org ID yet, fetch it
            if (!orgId) fetchOrgData(session.user.id);
        }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // --- 2. FETCH ORG DATA (The "Data Loss" Fix) ---
  const fetchOrgData = async (userId) => {
      
      const { data, error } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', userId)
          .maybeSingle();

      if (error) {
          console.error("Org Fetch Error:", error);
          return;
      }

      if (data) {
          console.log("Organization Found:", data.organization_id);
          setOrgId(data.organization_id);
          setRealRole(data.role || 'viewer'); // <--- ADD THIS
          setUserRole(data.role || 'viewer');
          refreshAllData(data.organization_id);
      } else {
          console.warn("User has no organization linked!");
      }
  };

  const refreshAllData = async (oid) => {
      if (!oid) return;

      const [s, so, t, f, tm, org] = await Promise.all([
          supabase.from('services').select('*').order('date', { ascending: true }).order('start_time', { ascending: true }),
          supabase.from('songs').select('*'),
          supabase.from('service_templates').select('*').eq('organization_id', oid),
          supabase.from('service_folders').select('*').eq('organization_id', oid),
          supabase.from('team_members').select('*').order('name', { ascending: true }),
          supabase.from('organizations').select('name, custom_verses').eq('id', oid).maybeSingle(),
      ]);

      if(s.data) setServices(s.data);
      if(so.data) setSongs(so.data);
      if(t.data) setTemplates(t.data);
      if(f.data) setFolders(f.data);
      if(tm.data) setTeamMembers(tm.data);
      if(org.data) {
          setOrgName(org.data.name || '');
          const cv = Array.isArray(org.data.custom_verses) ? org.data.custom_verses.filter(v => v.text) : [];
          setCustomVerses(cv);
          if (cv.length > 0) setVerseOfDay(pickVerse(cv));
      }

  };

  // --- ACTIONS ---
  const handleLogout = async () => {
      await supabase.auth.signOut();
      router('/login');
  };

  const handleCreateFolder = async () => { if (userRole !== 'admin') return; const name = prompt("Series Name (e.g., Weekend Services, Night of Worship):"); if(!name) return; await supabase.from('service_folders').insert([{ name, organization_id: orgId }]); refreshAllData(orgId); };
  const handleDeleteFolder = async (e, id) => { e.stopPropagation(); if (userRole !== 'admin') return; if(!confirm("Delete this series? All services in it will become uncategorized.")) return; await supabase.from('service_folders').delete().eq('id', id); refreshAllData(orgId); };
  const handleQuickCreateService = async (dateStr) => { if (userRole !== 'admin' && userRole !== 'editor') return; const { data } = await supabase.from('services').insert([{ name: 'Weekend Service', date: dateStr, organization_id: orgId }]).select().single(); refreshAllData(orgId); if (data) openService(data.id); };
  const openService = async (serviceId) => { const { data } = await supabase.from('services').select('*').eq('id', serviceId).single(); setSelectedService(data); };
  const handleSavePlan = async (updatedStart, updatedItems) => { if (userRole === 'viewer') return; await supabase.from('services').update({ date: updatedStart, items: updatedItems }).eq('id', selectedService.id); refreshAllData(orgId); setSelectedService({...selectedService, items: updatedItems, date: updatedStart}); };
  const handleSaveTemplate = async (_, updatedItems) => { if (userRole === 'viewer') return; await supabase.from('service_templates').update({ items: updatedItems }).eq('id', selectedTemplate.id); refreshAllData(orgId); setSelectedTemplate({...selectedTemplate, items: updatedItems}); };
  const handleDeleteService = async (e, id) => { e.stopPropagation(); if (userRole !== 'admin') return; if(!window.confirm("Delete plan?")) return; await supabase.from('services').delete().eq('id', id); setServices(services.filter(s => s.id !== id)); };
  const handleMoveService = (e, id) => { e.stopPropagation(); alert(`Moving functionality coming soon!`); };

  const visibleServices = currentFolder
    ? services.filter(s => s.folder_id === currentFolder.id)
    : services;

  // --- RENDER ---
  if (!session) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Connecting to secure server...</div>;

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', background: colors.bg, color: colors.text }}>

      {/* VERSE STATUS BAR */}
      <div style={{
        background: isDarkMode ? '#92400e' : '#f97316',
        padding: '4px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        minHeight: '28px',
      }}>
        <span style={{
          fontSize: '11px',
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.92)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {verseOfDay ? `"${verseOfDay.text}" — ${verseOfDay.ref}` : ''}
        </span>
        {orgName && (
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#f97316',
            background: 'rgba(255,255,255,0.95)',
            padding: '2px 12px',
            borderRadius: '20px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {orgName}
          </span>
        )}
      </div>

      <Header colors={colors} activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} setSelectedService={setSelectedService} refreshData={() => refreshAllData(orgId)} onLogout={handleLogout} session={session} userRole={userRole} realRole={realRole} toggleViewMode={toggleViewMode} />

      <SubNav colors={colors} activeTab={activeTab} setActiveTab={setActiveTab} setSelectedService={setSelectedService} isDarkMode={isDarkMode} realRole={realRole} />

      {/* MAIN CONTENT */}
      <div style={{ display: 'flex', height: 'calc(100vh - 137px)' }}>

        {/* Main Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'team' && <TeamManager orgId={orgId} isDarkMode={isDarkMode} userRole={userRole} services={services} />}

          {activeTab === 'lighting' && <LightingController isDarkMode={isDarkMode} userRole={userRole} />}

          {/* TEMPLATES TAB */}
          {activeTab === 'templates' && !selectedTemplate && (
            <TemplatesManager
              templates={templates}
              isDarkMode={isDarkMode}
              userRole={userRole}
              orgId={orgId}
              onRefresh={() => refreshAllData(orgId)}
              onOpen={(t) => setSelectedTemplate(t)}
            />
          )}

          {/* STAGE VIEW TAB */}
          {activeTab === 'stage' && (
            <StageView isDarkMode={isDarkMode} songs={songs} onRefresh={() => refreshAllData(orgId)} />
          )}

          {/* REHEARSALS TAB */}
          {activeTab === 'rehearsals' && (
            <RehearsalMixer isDarkMode={isDarkMode} />
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <ProfileSettings
              session={session}
              isDarkMode={isDarkMode}
              services={services}
              teamMembers={teamMembers}
            />
          )}

          {/* ORGANIZATION TAB */}
          {activeTab === 'organization' && (
            <OrgSettings orgId={orgId} isDarkMode={isDarkMode} userRole={userRole} />
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <BillingSettings isDarkMode={isDarkMode} teamMembers={teamMembers} services={services} />
          )}

          {/* SONGS TAB */}
          {activeTab === 'songs' && (
            <SongsManager
              songs={songs}
              isDarkMode={isDarkMode}
              userRole={userRole}
              orgId={orgId}
              onRefresh={() => refreshAllData(orgId)}
            />
          )}


      {activeTab === 'dashboard' && !selectedService && !selectedTemplate && (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>

          {/* LEFT SIDEBAR - Folders & Calendar */}
          <div style={{
            width: '280px',
            background: isDarkMode ? '#0d1117' : '#f8f9fa',
            borderRight: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}>

            {/* Folders Header */}
            <div style={{
              padding: '20px 20px 15px',
              borderBottom: `1px solid ${isDarkMode ? '#21262d' : '#e1e4e8'}`
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: colors.text,
                  opacity: 0.7
                }}>
                  Series
                </h3>
                {userRole === 'admin' && (
                  <button
                    onClick={handleCreateFolder}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.primary,
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    title="Create Series"
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Folders List */}
            <div style={{ flex: 1, padding: '8px' }}>
              {/* All Series (Default View) */}
              <div style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                fontWeight: '700',
                letterSpacing: '0.5px',
                color: colors.text,
                opacity: 0.5,
                marginBottom: '8px',
                padding: '0 10px'
              }}>
                Series
              </div>

              {/* Individual Folders (Series) */}
              {folders.map(folder => (
                <div
                  key={folder.id}
                  style={{
                    padding: '8px 10px',
                    margin: '1px 0',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    background: currentFolder?.id === folder.id ? (isDarkMode ? '#1c2128' : '#e1e4e8') : 'transparent',
                    color: currentFolder?.id === folder.id ? colors.heading : colors.text,
                    fontWeight: currentFolder?.id === folder.id ? '600' : '500',
                    fontSize: '13px',
                    transition: 'background 0.15s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (currentFolder?.id === folder.id) return;
                    e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    if (currentFolder?.id === folder.id) return;
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div
                    onClick={() => setCurrentFolder(folder)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}
                  >
                    <Folder size={16} style={{ opacity: 0.7 }} />
                    <span>{folder.name}</span>
                  </div>
                  {userRole === 'admin' && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Folder settings for "${folder.name}" - Coming soon!`);
                        }}
                        title="Folder Settings"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: colors.text,
                          opacity: 0.4,
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.opacity = '0.8';
                          e.target.style.color = colors.primary;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = '0.4';
                          e.target.style.color = colors.text;
                        }}
                      >
                        <Settings size={13}/>
                      </button>
                      <button
                        onClick={(e) => handleDeleteFolder(e, folder.id)}
                        title="Delete Series"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: colors.text,
                          opacity: 0.4,
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.opacity = '0.8';
                          e.target.style.color = colors.danger;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = '0.4';
                          e.target.style.color = colors.text;
                        }}
                      >
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  )}
                </div>
              ))}

            </div>
          </div>

          {/* MAIN CONTENT AREA - All Services Overview */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: colors.bg
          }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px' }}>

              {/* Header */}
              <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {currentFolder && (
                    <button
                      onClick={() => setCurrentFolder(null)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${colors.border}`,
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        color: colors.text,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                  )}
                  <div>
                    <h1 style={{ margin: 0, fontSize: '28px', color: colors.heading, fontWeight: '700' }}>
                      {currentFolder ? currentFolder.name : 'All Services'}
                    </h1>
                    <p style={{ margin: '5px 0 0', color: colors.text, fontSize: '14px' }}>
                      {visibleServices.length} service{visibleServices.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {currentFolder && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* View Toggle */}
                    <div style={{ display: 'flex', gap: '4px', background: isDarkMode ? '#1f2937' : '#f3f4f6', padding: '4px', borderRadius: '6px' }}>
                      <button
                        onClick={() => setFolderViewMode('list')}
                        style={{
                          background: folderViewMode === 'list' ? (isDarkMode ? '#374151' : 'white') : 'transparent',
                          color: folderViewMode === 'list' ? colors.heading : colors.text,
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <LayoutGrid size={14}/> List
                      </button>
                      <button
                        onClick={() => setFolderViewMode('matrix')}
                        style={{
                          background: folderViewMode === 'matrix' ? (isDarkMode ? '#374151' : 'white') : 'transparent',
                          color: folderViewMode === 'matrix' ? colors.heading : colors.text,
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Grid3x3 size={14}/> Matrix
                      </button>
                    </div>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => alert('Folder settings - Coming soon!')}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${colors.border}`,
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          color: colors.text,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Settings size={16} /> Settings
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Matrix View (when enabled for folder) */}
              {currentFolder && folderViewMode === 'matrix' ? (
                <MatrixCalendar
                  isDarkMode={isDarkMode}
                  services={visibleServices}
                  onServiceClick={openService}
                />
              ) : (
                <>
              {/* Service List */}
              {visibleServices.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: colors.card,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`
                }}>
                  <Calendar size={48} color={colors.text} style={{ opacity: 0.3, marginBottom: '15px' }} />
                  <p style={{ color: colors.text, opacity: 0.6, fontSize: '15px', margin: 0 }}>
                    No services yet. Click a date on the calendar to create one.
                  </p>
                </div>
              ) : (
                <div style={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  {visibleServices.map((service, index) => {
                    const [y, m, d] = service.date.split('T')[0].split('-');
                    const localDate = new Date(y, m - 1, d);
                    return (
                      <div
                        key={service.id}
                        onClick={() => openService(service.id)}
                        style={{
                          padding: '12px 18px',
                          borderBottom: index < visibleServices.length - 1 ? `1px solid ${colors.border}` : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '56px',
                          textAlign: 'center',
                          marginRight: '14px',
                          background: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
                          padding: '8px 6px',
                          borderRadius: '6px',
                          border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`
                        }}>
                          <div style={{
                            fontSize: '9px',
                            textTransform: 'uppercase',
                            fontWeight: '700',
                            letterSpacing: '0.5px',
                            color: colors.primary,
                            marginBottom: '1px'
                          }}>
                            {localDate.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: colors.heading,
                            lineHeight: '1'
                          }}>
                            {localDate.getDate()}
                          </div>
                          <div style={{
                            fontSize: '9px',
                            color: colors.text,
                            opacity: 0.6,
                            marginTop: '1px'
                          }}>
                            {localDate.toLocaleDateString('en-US', { year: 'numeric' })}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '600',
                            color: colors.heading,
                            marginBottom: '3px'
                          }}>
                            {service.name}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: colors.text,
                            opacity: 0.7
                          }}>
                            {localDate.toLocaleDateString('en-US', { weekday: 'long' })} · {service.start_time ? formatTime(service.start_time) : '9:00 AM'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={(e) => handleMoveService(e, service.id)}
                            title="Move to Folder"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: colors.text,
                              opacity: 0.5,
                              padding: '8px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.opacity = '1';
                              e.target.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.opacity = '0.5';
                              e.target.style.background = 'none';
                            }}
                          >
                            <FolderInput size={18}/>
                          </button>
                          {userRole === 'admin' && (
                            <button
                              onClick={(e) => handleDeleteService(e, service.id)}
                              title="Delete Plan"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: colors.danger,
                                opacity: 0.5,
                                padding: '8px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.opacity = '1';
                                e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.opacity = '0.5';
                                e.target.style.background = 'none';
                              }}
                            >
                              <Trash2 size={18}/>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </>
              )}
            </div>
          </div>
        </div>
          )}

          {/* Service/Plan Editor - Full Width */}
          {(selectedService || selectedTemplate) && (
            <div style={{ padding: '20px' }}>
            <ScheduleTable
                isDarkMode={isDarkMode}
                serviceData={selectedService || selectedTemplate}
                isTemplate={!!selectedTemplate}
                availableSongs={songs}
                teamMembers={teamMembers}
                onBack={() => { setSelectedService(null); setSelectedTemplate(null); refreshAllData(orgId); }}
                onSave={selectedTemplate ? handleSaveTemplate : handleSavePlan}
                orgId={orgId}
                onCreateService={handleQuickCreateService}
                onServiceClick={openService}
                userRole={userRole}
            />
            </div>
          )}
        </div>

        {/* PERSISTENT CALENDAR - Only on Dashboard when NOT viewing a service */}
        {activeTab === 'dashboard' && !selectedService && !selectedTemplate && (
          <PersistentCalendar
            isDarkMode={isDarkMode}
            onDateSelect={handleQuickCreateService}
            services={services}
            orgId={orgId}
            onRefresh={() => refreshAllData(orgId)}
          />
        )}
      </div>

      {/* SUPPORT WIDGET — floating contact buttons on settings pages */}
      {getActiveCategory(activeTab) === 'settings' && <SupportWidget />}
    </div>
  );
}