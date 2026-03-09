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
import MyScheduleView from './components/MyScheduleView';
import InviteManager from './components/InviteManager';
import OrgInviteManager from './components/OrgInviteManager';
import FeatureRequestPage from './components/FeatureRequestPage';

// --- ICONS ---
import {
  Trash2, Plus, Calendar, Music, User,
  LayoutGrid, Sun, Moon,
  LogOut, Folder, ArrowLeft, Users, FolderInput, Zap,
  Grid3x3, Settings, LayoutTemplate, Monitor, CalendarCheck, Bell, X,
  Link, Lightbulb, UserPlus
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
  myschedule: { first: 'myschedule', items: [
    { id: 'myschedule',  label: 'My Schedule', icon: CalendarCheck },
  ]},
  planner:    { first: 'dashboard',  items: [
    { id: 'dashboard',   label: 'Plans',      icon: LayoutGrid },
    { id: 'templates',   label: 'Templates',  icon: LayoutTemplate },
    { id: 'songs',       label: 'Songs',      icon: Music },
    { id: 'team',        label: 'Teams',      icon: Users },
  ]},
  production: { first: 'lighting', items: [
    { id: 'lighting',   label: 'Lighting',   icon: Zap },
    { id: 'stage',      label: 'Stage View', icon: Monitor },
    { id: 'rehearsals', label: 'Rehearsals', icon: Calendar },
  ]},
  admin:      { first: 'profile', items: [
    { id: 'profile',          label: 'Profile',           icon: User },
    { id: 'organization',     label: 'Organization',      icon: FolderInput },
    { id: 'billing',          label: 'Billing',           icon: Settings },
    { id: 'org-invites',      label: 'Invitations',       icon: UserPlus },
    { id: 'invites',          label: 'Beta Invites',      icon: Link },
    { id: 'featurerequests',  label: 'Feature Requests',  icon: Lightbulb },
  ]},
};

const getActiveCategory = (tab) =>
  Object.entries(NAV_CATEGORIES).find(([, { items }]) =>
    items.some(i => i.id === tab)
  )?.[0] || 'planner';

// --- MASTER ACCOUNT ---
const MASTER_EMAIL = 'billy@worshipops.com';

// --- ROLE-BASED TAB PERMISSIONS ---
const ROLE_TABS = {
  admin:             ['dashboard','templates','songs','team','myschedule','lighting','stage','rehearsals','profile','organization','billing','org-invites','featurerequests'],
  org_leader:        ['dashboard','templates','songs','team','myschedule','lighting','stage','rehearsals','profile','organization','org-invites','featurerequests'],
  leader:            ['dashboard','templates','songs','team','myschedule','lighting','stage','rehearsals','profile','organization','org-invites','featurerequests'],
  weekly_scheduler:  ['dashboard','templates','songs','team','myschedule','lighting','stage','rehearsals','profile'],
  music_director:    ['songs','templates','dashboard','myschedule','stage','rehearsals','profile'],
  campus_leader:     ['dashboard','team','myschedule','profile'],
  schedule_viewer:   ['dashboard','myschedule','profile'],
  editor:            ['dashboard','templates','songs','team','myschedule','lighting','stage','rehearsals','profile','organization','featurerequests'],
  viewer:            ['myschedule'],
  scheduled_viewer:  ['myschedule'],
  guest:             [], // computed dynamically from permissions
};

const ROLE_LABELS = {
  admin:            'Admin',
  org_leader:       'Org Leader',
  leader:           'Leader',
  weekly_scheduler: 'Weekly Scheduler',
  music_director:   'Music Director',
  campus_leader:    'Campus Leader',
  schedule_viewer:  'Schedule Viewer',
  editor:           'Editor',
  viewer:           'Volunteer',
  scheduled_viewer: 'Volunteer',
  guest:            'Guest',
};

// Guest permission keys → tabs
const GUEST_PERM_TABS = {
  teams:      ['team'],
  planner:    ['dashboard', 'templates'],
  production: ['lighting', 'stage', 'rehearsals'],
  songs:      ['songs'],
};

const getAllowedTabs = (role, email, guestPermissions = {}) => {
  if (role === 'guest') {
    const tabs = ['myschedule', 'profile'];
    for (const [perm, permTabs] of Object.entries(GUEST_PERM_TABS)) {
      if (guestPermissions[perm]) tabs.push(...permTabs);
    }
    return tabs;
  }
  const tabs = [...(ROLE_TABS[role] ?? [])];
  if (email === MASTER_EMAIL) tabs.push('invites');
  return tabs;
};

// Active tab highlight: lighter in dark mode, darker in light mode
const tabActiveBg  = (isDark) => isDark ? '#1F1F22' : '#E4E4E7';
const subNavBg     = (isDark) => isDark ? '#0A0A0A' : '#F4F4F5';

// --- HEADER COMPONENT ---
const CAT_DISPLAY = { myschedule: 'My Schedule', planner: 'Planner', production: 'Production', admin: 'Admin' };

const Header = ({ colors, activeTab, setActiveTab, isDarkMode, setIsDarkMode, setSelectedService, refreshData, onLogout, session, realRole, guestPermissions }) => {
  const activeCategory = getActiveCategory(activeTab);
  const allowed = getAllowedTabs(realRole, session?.user?.email, guestPermissions);

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
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              style={{
                background: isActive ? tabActiveBg(isDarkMode) : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? colors.heading : 'transparent'}`,
                cursor: 'pointer',
                padding: '0 24px',
                fontSize: '14px',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? colors.heading : colors.text,
                textTransform: 'capitalize',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!isActive) { e.currentTarget.style.background = tabActiveBg(isDarkMode); e.currentTarget.style.color = colors.heading; }
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
const SubNav = ({ colors, activeTab, setActiveTab, setSelectedService, isDarkMode, realRole, session, guestPermissions }) => {
  const activeCategory = getActiveCategory(activeTab);
  const allowed = getAllowedTabs(realRole, session?.user?.email, guestPermissions);
  const allItems = NAV_CATEGORIES[activeCategory]?.items || [];
  const items = allItems.filter(item => allowed.includes(item.id));

  // Hide subnav for single-item categories (e.g. My Schedule)
  if (items.length <= 1) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2px',
      padding: '0 30px',
      height: '44px',
      borderBottom: `1px solid ${colors.border}`,
      background: subNavBg(isDarkMode),
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
              background: isActive ? tabActiveBg(isDarkMode) : 'transparent',
              color: isActive ? colors.heading : colors.text,
              fontWeight: isActive ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) { e.currentTarget.style.background = tabActiveBg(isDarkMode); e.currentTarget.style.color = colors.heading; }
            }}
            onMouseLeave={(e) => {
              if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text; }
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


// --- ORG SWITCHER ---
function OrgSwitcher({ orgName, allOrgs, currentOrgId, onSwitch, isDarkMode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (allOrgs.length <= 1) {
    return (
      <span style={{ fontSize: '11px', fontWeight: '700', color: '#f97316', background: 'rgba(255,255,255,0.95)', padding: '2px 12px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {orgName}
      </span>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#f97316', background: 'rgba(255,255,255,0.95)', padding: '3px 10px 3px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        {orgName}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '220px', background: isDarkMode ? '#1f1f22' : '#ffffff', border: `1px solid ${isDarkMode ? '#27272a' : '#e5e7eb'}`, borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: '700', color: isDarkMode ? '#6b7280' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: `1px solid ${isDarkMode ? '#27272a' : '#e5e7eb'}` }}>
            Switch Organization
          </div>
          {allOrgs.map(org => {
            const isCurrent = org.organization_id === currentOrgId;
            return (
              <button
                key={org.organization_id}
                onClick={() => { setOpen(false); if (!isCurrent) onSwitch(org); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: isCurrent ? (isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)') : 'transparent', border: 'none', cursor: isCurrent ? 'default' : 'pointer', textAlign: 'left', gap: '8px' }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = isDarkMode ? '#27272a' : '#f3f4f6'; }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '13px', fontWeight: isCurrent ? '700' : '500', color: isCurrent ? '#3b82f6' : (isDarkMode ? '#d1d5db' : '#27272a') }}>{org.name}</span>
                <span style={{ fontSize: '10px', color: isDarkMode ? '#6b7280' : '#9ca3af', textTransform: 'capitalize' }}>{org.role}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- MAIN DASHBOARD ---
export default function Dashboard() {
  const router = useNavigate();
  const [session, setSession] = useState(null); 
  const [orgId, setOrgId] = useState(null);
  const [allOrgs, setAllOrgs] = useState([]); // [{organization_id, role, name}]

  const [realRole, setRealRole] = useState('viewer');
  const userRole = realRole; // always reflect true role — no volunteer toggle
  const [guestPermissions, setGuestPermissions] = useState({});
  const [guestExpiry,      setGuestExpiry]      = useState(null);

  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [currentFolder, setCurrentFolder] = useState(null); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  
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
  const [alertOverlay, setAlertOverlay] = useState(null); // { message, sender_name, serviceName, thread }

  const colors = {
    bg:      isDarkMode ? '#000000' : '#F7F8FA',
    bgSolid: isDarkMode ? '#0A0A0A' : '#FFFFFF',
    card:    isDarkMode ? '#111111' : '#FFFFFF',
    text:    isDarkMode ? '#A1A1AA' : '#52525B',
    heading: isDarkMode ? '#EDEDED' : '#09090B',
    border:  isDarkMode ? '#27272A' : '#E4E4E7',
    hover:   isDarkMode ? '#1F1F22' : '#F4F4F5',
    primary: '#0070F3',
    accent:  '#10B981',
    danger:  '#EF4444',
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

  // --- ALERT OVERLAY: listen for cross-screen alert events from ChatPanel ---
  useEffect(() => {
    const handler = (e) => setAlertOverlay(e.detail);
    window.addEventListener('worship-alert', handler);
    return () => window.removeEventListener('worship-alert', handler);
  }, []);

  // --- 2. FETCH ORG DATA (The "Data Loss" Fix) ---
  const fetchOrgData = async (userId) => {
      const { data: rows, error } = await supabase
          .from('organization_members')
          .select('organization_id, role, permissions, account_expires_at')
          .eq('user_id', userId);

      if (error) {
          console.error("Org Fetch Error:", error);
          return;
      }

      if (!rows || rows.length === 0) {
          console.warn("User has no organization linked!");
          return;
      }

      // Fetch org names for all memberships
      const orgIds = rows.map(r => r.organization_id);
      const { data: orgRows } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);

      const orgsWithMeta = rows.map(r => ({
          organization_id:   r.organization_id,
          role:              r.role || 'viewer',
          name:              orgRows?.find(o => o.id === r.organization_id)?.name || 'My Organization',
          permissions:       r.permissions || {},
          account_expires_at: r.account_expires_at || null,
      }));
      setAllOrgs(orgsWithMeta);

      // Use first org by default
      const first = orgsWithMeta[0];
      setOrgId(first.organization_id);
      const role = first.role;
      setRealRole(role);
      setGuestPermissions(first.permissions || {});
      setGuestExpiry(first.account_expires_at || null);
      if (ROLE_TABS[role]?.length === 1 && ROLE_TABS[role][0] === 'myschedule') {
          setActiveTab('myschedule');
      } else if (role === 'guest') {
          setActiveTab('myschedule');
      }
      refreshAllData(first.organization_id);
  };

  const switchOrg = (orgMeta) => {
      setOrgId(orgMeta.organization_id);
      setRealRole(orgMeta.role);
      setGuestPermissions(orgMeta.permissions || {});
      setGuestExpiry(orgMeta.account_expires_at || null);
      setSelectedService(null);
      setActiveTab(orgMeta.role === 'guest' ? 'myschedule' : 'dashboard');
      refreshAllData(orgMeta.organization_id);
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

  // Guest expired screen
  if (realRole === 'guest' && guestExpiry && new Date(guestExpiry) < new Date()) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', background: colors.bg, fontFamily: 'sans-serif', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px' }}>⏳</div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: colors.heading }}>Your guest access has expired</h2>
        <p style={{ margin: 0, fontSize: '14px', color: colors.text, maxWidth: '360px', lineHeight: '1.6' }}>
          Your temporary access ended on {new Date(guestExpiry).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Contact your organization admin to request renewed access.
        </p>
        <button onClick={handleLogout} style={{ marginTop: '8px', padding: '10px 28px', borderRadius: '9px', background: colors.primary, color: '#fff', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', background: colors.bg, color: colors.text }}>

      {/* ALERT OVERLAY — shown on any screen when an alert message is sent */}
      {alertOverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '60px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(480px, 92vw)', background: isDarkMode ? '#111111' : '#ffffff', borderRadius: '16px', border: '2px solid #ef4444', boxShadow: '0 0 0 4px rgba(239,68,68,0.15), 0 24px 60px rgba(0,0,0,0.5)', overflow: 'hidden', fontFamily: 'sans-serif' }}>
            {/* Red header */}
            <div style={{ background: '#ef4444', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} color="#fff" />
                <span style={{ fontWeight: '800', fontSize: '13px', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>Alert</span>
                {alertOverlay.serviceName && (
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: '400' }}>— {alertOverlay.serviceName}</span>
                )}
              </div>
              <button onClick={() => setAlertOverlay(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 22px 24px' }}>
              <div style={{ fontSize: '12px', color: colors.text, marginBottom: '10px', opacity: 0.7 }}>
                From <strong style={{ color: colors.heading }}>{alertOverlay.sender_name}</strong>
                {alertOverlay.thread && alertOverlay.thread !== 'global' && (
                  <span> in <strong style={{ color: colors.heading }}>{alertOverlay.thread}</strong></span>
                )}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: colors.heading, lineHeight: '1.6' }}>
                {alertOverlay.message}
              </div>
              <button
                onClick={() => setAlertOverlay(null)}
                style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

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
          <OrgSwitcher
            orgName={orgName}
            allOrgs={allOrgs}
            currentOrgId={orgId}
            onSwitch={switchOrg}
            isDarkMode={isDarkMode}
          />
        )}
      </div>

      <Header colors={colors} activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} setSelectedService={setSelectedService} refreshData={() => refreshAllData(orgId)} onLogout={handleLogout} session={session} realRole={realRole} guestPermissions={guestPermissions} />

      <SubNav colors={colors} activeTab={activeTab} setActiveTab={setActiveTab} setSelectedService={setSelectedService} isDarkMode={isDarkMode} realRole={realRole} session={session} guestPermissions={guestPermissions} />

      {/* GUEST EXPIRY BANNER */}
      {realRole === 'guest' && guestExpiry && (() => {
        const daysLeft = Math.ceil((new Date(guestExpiry) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 3 || daysLeft <= 0) return null;
        return (
          <div style={{ background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.3)', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#92400e' }}>
            <span style={{ fontWeight: '600' }}>Guest access expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.</span>
            <span style={{ opacity: 0.7 }}>Contact your admin to extend access.</span>
          </div>
        );
      })()}

      {/* MAIN CONTENT - height adjusts: 64px header + optional 44px subnav */}
      <div style={{ display: 'flex', height: `calc(100vh - ${activeTab === 'myschedule' ? 93 : 137}px)` }}>

        {/* Main Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'team' && <TeamManager orgId={orgId} isDarkMode={isDarkMode} userRole={userRole} services={services} session={session} />}

          {activeTab === 'myschedule' && (
            <MyScheduleView session={session} isDarkMode={isDarkMode} colors={colors} />
          )}

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

          {/* ORG INVITATIONS TAB */}
          {activeTab === 'org-invites' && (
            <OrgInviteManager isDarkMode={isDarkMode} orgId={orgId} session={session} />
          )}

          {/* BETA INVITES TAB — master account only */}
          {activeTab === 'invites' && session?.user?.email === MASTER_EMAIL && (
            <InviteManager isDarkMode={isDarkMode} session={session} />
          )}

          {/* FEATURE REQUESTS TAB */}
          {activeTab === 'featurerequests' && (
            <FeatureRequestPage isDarkMode={isDarkMode} session={session} orgId={orgId} userRole={userRole} />
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
        <div style={{ display: 'flex', height: 'calc(100vh - 137px)' }}>

          {/* LEFT SIDEBAR - Folders & Calendar */}
          <div style={{
            width: '280px',
            background: isDarkMode ? '#0a0a0a' : '#f8f9fa',
            borderRight: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}>

            {/* Folders Header */}
            <div style={{
              padding: '20px 20px 15px',
              borderBottom: `1px solid ${isDarkMode ? '#111111' : '#e1e4e8'}`
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
                    <div style={{ display: 'flex', gap: '4px', background: isDarkMode ? '#1f1f22' : '#f3f4f6', padding: '4px', borderRadius: '6px' }}>
                      <button
                        onClick={() => setFolderViewMode('list')}
                        style={{
                          background: folderViewMode === 'list' ? (isDarkMode ? '#27272a' : 'white') : 'transparent',
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
                          background: folderViewMode === 'matrix' ? (isDarkMode ? '#27272a' : 'white') : 'transparent',
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
                session={session}
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

      {/* SUPPORT WIDGET - floating contact buttons on admin pages */}
      {getActiveCategory(activeTab) === 'admin' && <SupportWidget />}
    </div>
  );
}