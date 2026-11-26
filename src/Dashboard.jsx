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
import PlanningCenterImport from './components/PlanningCenterImport';
import HubIcon from './components/HubIcon';
import { applyTheme } from './theme';


// --- ICONS ---
import {
  Trash2, Plus, Calendar, Music, User,
  LayoutGrid, Sun, Moon,
  LogOut, Folder, ArrowLeft, Users, FolderInput, Zap,
  Grid3x3, Settings, LayoutTemplate, Monitor, CalendarCheck, Bell, X,
  Link, Lightbulb, UserPlus, Download
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
    { id: 'stage',      label: 'Slate',      icon: Monitor },
    { id: 'rehearsals', label: 'Rehearsals', icon: Calendar },
  ]},
  admin:      { first: 'profile', items: [
    { id: 'profile',          label: 'Profile',           icon: User },
    { id: 'organization',     label: 'Organization',      icon: FolderInput },
    { id: 'billing',          label: 'Billing',           icon: Settings },
    { id: 'org-invites',      label: 'Invitations',       icon: UserPlus },
    { id: 'invites',          label: 'Beta Invites',      icon: Link },
    { id: 'featurerequests',  label: 'Feature Requests',  icon: Lightbulb },
    { id: 'import-pco',       label: 'Import from PCO',   icon: Download },
  ]},
};

const getActiveCategory = (tab) =>
  Object.entries(NAV_CATEGORIES).find(([, { items }]) =>
    items.some(i => i.id === tab)
  )?.[0] || 'planner';

// --- RESPONSIVE HOOK ---
function useWindowWidth() {
  const [width, setWidth] = React.useState(window.innerWidth);
  React.useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return width;
}

// --- MASTER ACCOUNT ---
const MASTER_EMAIL = 'billy@worshipops.com';

// --- ROLE-BASED TAB PERMISSIONS ---
const ROLE_TABS = {
  admin:             ['dashboard','templates','songs','team','myschedule','lighting','stage','rehearsals','profile','organization','billing','org-invites','featurerequests','import-pco'],
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

// Active tab highlight: one surface step up from the bar it sits on
const tabActiveBg  = () => 'var(--raised)';
const subNavBg     = () => 'var(--page)';

// --- HEADER COMPONENT ---
const CAT_DISPLAY = { myschedule: 'My Schedule', planner: 'Planner', production: 'Production', admin: 'Admin' };
const CAT_SHORT   = { myschedule: 'Schedule',    planner: 'Planner', production: 'Production', admin: 'Admin' };

const Header = ({ colors, activeTab, setActiveTab, isDarkMode, setIsDarkMode, setSelectedService, refreshData, onLogout, session, realRole, guestPermissions, isMobile, isTablet }) => {
  const activeCategory = getActiveCategory(activeTab);
  const allowed = getAllowedTabs(realRole, session?.user?.email, guestPermissions);

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

  const headerH = isMobile ? '52px' : '64px';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'auto 1fr auto' : '1fr auto 1fr',
      alignItems: 'center',
      height: headerH,
      borderBottom: `1px solid ${colors.navBorder}`,
      background: colors.headerBg,
      boxShadow: `inset 0 2px 0 ${colors.primary}`,
      position: 'sticky',
      top: 0,
      zIndex: 200,
      padding: isMobile ? '0 12px' : '0 24px',
    }}>
      {/* LEFT: Logo */}
      <div onClick={() => { setSelectedService(null); setActiveTab('dashboard'); refreshData(); }}
        style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '10px', cursor: 'pointer', justifySelf: 'start' }}>
        <div style={{
          height: isMobile ? '28px' : '32px', width: isMobile ? '28px' : '32px', borderRadius: '8px',
          background: colors.primary, display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <HubIcon size={isMobile ? 16 : 18} color="var(--on-accent)" />
        </div>
        {!isMobile && (
          <span style={{ fontWeight: 500, fontSize: isTablet ? '16px' : '17px', color: colors.navText }}>WorshipOps</span>
        )}
      </div>

      {/* CENTER: Category tabs (hidden on mobile — bottom nav handles this) */}
      {!isMobile && (
        <div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
          {visibleCats.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                style={{
                  background: isActive ? colors.navTabActiveBg : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? colors.primary : 'transparent'}`,
                  cursor: 'pointer',
                  padding: isTablet ? '0 16px' : '0 20px',
                  fontSize: isTablet ? '13px' : '14px',
                  fontWeight: 500,
                  color: isActive ? colors.navText : colors.navSubText,
                  transition: 'background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) { e.currentTarget.style.background = colors.navTabActiveBg; e.currentTarget.style.color = colors.navText; }
                }}
                onMouseLeave={e => {
                  if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.navSubText; }
                }}
              >
                {isTablet ? CAT_SHORT[cat] : CAT_DISPLAY[cat]}
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile: app name centered */}
      {isMobile && (
        <span style={{ textAlign: 'center', fontWeight: 500, fontSize: '16px', color: colors.navText }}>
          WorshipOps
        </span>
      )}

      {/* RIGHT: Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: isMobile ? '4px' : '8px', justifySelf: 'end' }}>
        {!isMobile && (
          <span style={{ fontSize: 'var(--fs-meta)', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', padding: '0 4px', whiteSpace: 'nowrap' }}>
            {ROLE_LABELS[realRole] || realRole}
          </span>
        )}
        <button onClick={() => setIsDarkMode(!isDarkMode)} title={isDarkMode ? 'Light mode' : 'Dark mode'} className="wo-icon-btn"
          style={{ background: 'transparent', color: colors.navSubText, border: 'none', padding: '8px', borderRadius: 'var(--r-control)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          {isDarkMode ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
        </button>
        <button onClick={onLogout} title="Log out" className="wo-icon-btn"
          style={{ background: 'transparent', color: colors.navSubText, border: 'none', padding: '8px', borderRadius: 'var(--r-control)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <LogOut size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

// --- SUB-NAV BAR ---
const SubNav = ({ colors, activeTab, setActiveTab, setSelectedService, isDarkMode, realRole, session, guestPermissions, isMobile, isTablet, topOffset }) => {
  const activeCategory = getActiveCategory(activeTab);
  const allowed = getAllowedTabs(realRole, session?.user?.email, guestPermissions);
  const allItems = NAV_CATEGORIES[activeCategory]?.items || [];
  const items = allItems.filter(item => allowed.includes(item.id));

  if (items.length <= 1) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: isMobile ? 'flex-start' : 'center',
      gap: '4px',
      padding: isMobile ? '0 8px' : '0 24px',
      height: isMobile ? '40px' : '44px',
      borderBottom: `1px solid ${colors.border}`,
      background: subNavBg(isDarkMode),
      position: 'sticky',
      top: `${topOffset}px`,
      zIndex: 199,
      overflowX: isMobile ? 'auto' : 'visible',
      scrollbarWidth: 'none',
      WebkitOverflowScrolling: 'touch',
      flexShrink: 0,
    }}
    className={isMobile ? 'mobile-subnav' : undefined}
    >
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setSelectedService(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '32px',
              padding: '0 12px',
              borderRadius: 'var(--r-control)',
              border: 'none',
              background: isActive ? tabActiveBg(isDarkMode) : 'transparent',
              boxShadow: isActive ? 'inset 0 0 0 1px var(--line)' : 'none',
              color: isActive ? colors.heading : colors.text,
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive) { e.currentTarget.style.background = tabActiveBg(isDarkMode); e.currentTarget.style.color = colors.heading; }
            }}
            onMouseLeave={(e) => {
              if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = colors.text; }
            }}
          >
            <Icon size={16} strokeWidth={1.5} style={{ color: isActive ? 'var(--text-1)' : 'var(--text-3)' }} />
            {label}
          </button>
        );
      })}
    </div>
  );
};

// --- MOBILE BOTTOM NAV ---
const CAT_ICONS = {
  myschedule: CalendarCheck,
  planner:    LayoutGrid,
  production: Monitor,
  admin:      Settings,
};

const MobileBottomNav = ({ colors, isDarkMode, activeCategory, visibleCats, onCategoryChange }) => (
  <div
    className="mobile-bottom-nav"
    style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
      height: '60px',
      background: colors.card,
      borderTop: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'stretch',
    }}
  >
    {visibleCats.map(cat => {
      const Icon    = CAT_ICONS[cat] || LayoutGrid;
      const isActive = activeCategory === cat;
      return (
        <button key={cat} onClick={() => onCategoryChange(cat)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '4px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: isActive ? 'var(--accent-ink)' : colors.muted,
            transition: 'color var(--t-fast) var(--ease)',
          }}>
          <Icon size={20} strokeWidth={1.5} />
          <span style={{ fontSize: '11px', fontWeight: 500 }}>
            {CAT_SHORT[cat]}
          </span>
        </button>
      );
    })}
  </div>
);


// --- ORG SWITCHER ---
function OrgSwitcher({ orgName, allOrgs, currentOrgId, onSwitch, isDarkMode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  const currentOrg  = allOrgs.find(o => o.organization_id === currentOrgId);
  const activeColor = currentOrg?.brand_color || 'var(--text-3)';
  const textCol     = 'var(--text-2)';

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Quiet pattern: a small accent dot + plain text, not a filled/glowing pill —
  // the org's brand color is still unmistakably there, just not shouting.
  const pill = (children, onClick, extra = {}) => (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        fontSize: '12px', fontWeight: '500', color: textCol,
        padding: '4px 8px', borderRadius: '8px',
        whiteSpace: 'nowrap', flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        ...extra,
      }}
    >
      {children}
    </span>
  );

  if (allOrgs.length <= 1) {
    return pill(
      <><span style={{ width: 6, height: 6, borderRadius: '50%', background: activeColor, display: 'inline-block' }} />{orgName}</>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {pill(
        <>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: activeColor, display: 'inline-block' }} />
          {orgName}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke={textCol} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </>,
        () => setOpen(v => !v)
      )}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: '240px', background: 'var(--card)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-card)', boxShadow: 'var(--shadow-lg)', zIndex: 9999, overflow: 'hidden', padding: '4px' }}>
          <div style={{ padding: '8px 12px 4px', fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
            Switch organization
          </div>
          {allOrgs.map(org => {
            const isCurrent = org.organization_id === currentOrgId;
            const dot = org.brand_color || 'var(--text-3)';
            return (
              <button
                key={org.organization_id}
                onClick={() => { setOpen(false); if (!isCurrent) onSwitch(org); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', height: '36px', padding: '0 8px', borderRadius: 'var(--r-control)', background: isCurrent ? 'var(--raised)' : 'transparent', border: 'none', cursor: isCurrent ? 'default' : 'pointer', textAlign: 'left', transition: 'background-color var(--t-fast) var(--ease)' }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--raised)'; }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Brand color dot */}
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: isCurrent ? 'var(--text-1)' : 'var(--text-2)' }}>{org.name}</span>
                <span style={{ fontSize: 'var(--fs-meta)', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{ROLE_LABELS[org.role] || org.role}</span>
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
  const router    = useNavigate();
  const winWidth  = useWindowWidth();
  const isMobile  = winWidth < 640;
  const isTablet  = winWidth >= 640 && winWidth < 1024;

  const [session, setSession] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [allOrgs, setAllOrgs] = useState([]); // [{organization_id, role, name}]

  const [realRole, setRealRole] = useState('viewer');
  const userRole = realRole; // always reflect true role — no volunteer toggle
  const [guestPermissions, setGuestPermissions] = useState({});
  const [guestExpiry,      setGuestExpiry]      = useState(null);

  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [currentFolder, setCurrentFolder] = useState(null); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [brandColor,            setBrandColor]            = useState(null);
  const [brandHeaderColor,      setBrandHeaderColor]      = useState(null);
  const [brandSidebarColor,     setBrandSidebarColor]     = useState(null);
  const [brandNavTextColor,     setBrandNavTextColor]     = useState(null);
  const [brandHeaderTextColor,  setBrandHeaderTextColor]  = useState(null);
  const [brandSidebarTextColor, setBrandSidebarTextColor] = useState(null);
  
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

  // --- Accent-only brand color ---
  // The church's brand color is the accent: primary buttons, the active-tab
  // underline, a 2px rule under the header. It no longer fills the nav bar,
  // verse bar, or sidebar — those stay neutral regardless of brandColor /
  // brandHeaderColor / brandSidebarColor, so the brand color reads as a
  // deliberate highlight instead of a wall of color. The old manual
  // text-color overrides (brandNavTextColor etc.) are intentionally ignored
  // here — they were computed for contrast against a solid colored fill
  // that no longer exists, so honoring them just makes text disappear
  // (e.g. white verse text saved for an orange bar, now sitting on a
  // neutral light strip). These surfaces always follow light/dark mode.

  const colors = {
    bg:      'var(--page)',
    bgSolid: 'var(--card)',
    card:    'var(--card)',
    text:    'var(--text-2)',
    heading: 'var(--text-1)',
    muted:   'var(--text-3)',
    border:  'var(--line)',
    hover:   'var(--raised)',
    primary: 'var(--accent)',
    accent:  'var(--accent)',
    danger:  'var(--negative)',
    // Nav bar: neutral. The brand color shows only as the 2px rule and the
    // active tab underline.
    headerBg:       'var(--card)',
    navText:        'var(--text-1)',
    navSubText:     'var(--text-2)',
    navBorder:      'var(--line)',
    navTabActiveBg: 'var(--raised)',
    sidebarBg:   'var(--deep)',
    sidebarText: 'var(--text-1)',
    verseBg:     'var(--deep)',
    verseText:   'var(--text-2)',
  };

  // Push mode + church brand color into the CSS variables every screen reads.
  useEffect(() => {
    applyTheme(isDarkMode ? 'dark' : 'light', brandColor || '#3b82f6');
  }, [isDarkMode, brandColor]);

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
    const checkSession = () => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                console.log("No session found. Redirecting to login.");
                router('/login', { replace: true });
            } else {
                console.log("Session found:", session.user.email);
                setSession(session);
                fetchOrgData(session.user.id);
            }
        });
    };
    checkSession();

    // If this page is restored from the back/forward cache (e.g. after pressing
    // Back), re-verify session + org/role instead of showing whatever tab/role
    // was frozen in the cached snapshot.
    const handlePageShow = (e) => { if (e.persisted) checkSession(); };
    window.addEventListener('pageshow', handlePageShow);

    // B. Listen for auth events — only redirect on explicit sign-out, not on token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            setSession(null);
            router('/login', { replace: true });
        } else if (session) {
            setSession(session);
            // If we have a session but no Org ID yet, fetch it
            if (!orgId) fetchOrgData(session.user.id);
        }
    });

    return () => {
        window.removeEventListener('pageshow', handlePageShow);
        subscription.unsubscribe();
    };
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

      // Brand colors — dedicated table, graceful if migration not yet run
      const { data: brandRows, error: brandErr } = await supabase
          .from('organization_brand_colors')
          .select('org_id, brand_color, brand_header_color, brand_sidebar_color, brand_nav_text_color, brand_header_text_color, brand_sidebar_text_color')
          .in('org_id', orgIds);
      const brandMap = (!brandErr && brandRows)
          ? Object.fromEntries(brandRows.map(r => [r.org_id, r]))
          : {};

      const orgsWithMeta = rows.map(r => ({
          organization_id:       r.organization_id,
          role:                  r.role || 'viewer',
          name:                  orgRows?.find(o => o.id === r.organization_id)?.name || 'My Organization',
          brand_color:           brandMap[r.organization_id]?.brand_color            || null,
          brand_header_color:    brandMap[r.organization_id]?.brand_header_color     || null,
          brand_sidebar_color:   brandMap[r.organization_id]?.brand_sidebar_color    || null,
          brand_nav_text_color:     brandMap[r.organization_id]?.brand_nav_text_color     || null,
          brand_header_text_color:  brandMap[r.organization_id]?.brand_header_text_color  || null,
          brand_sidebar_text_color: brandMap[r.organization_id]?.brand_sidebar_text_color || null,
          permissions:           r.permissions || {},
          account_expires_at:    r.account_expires_at || null,
      }));
      setAllOrgs(orgsWithMeta);

      // Use first org by default
      const first = orgsWithMeta[0];
      setOrgId(first.organization_id);
      const role = first.role;
      setRealRole(role);
      setBrandColor(first.brand_color || null);
      setBrandHeaderColor(first.brand_header_color || null);
      setBrandSidebarColor(first.brand_sidebar_color || null);
      setBrandNavTextColor(first.brand_nav_text_color      || null);
      setBrandHeaderTextColor(first.brand_header_text_color  || null);
      setBrandSidebarTextColor(first.brand_sidebar_text_color || null);
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
      setBrandColor(orgMeta.brand_color || null);
      setBrandHeaderColor(orgMeta.brand_header_color || null);
      setBrandSidebarColor(orgMeta.brand_sidebar_color || null);
      setBrandNavTextColor(orgMeta.brand_nav_text_color      || null);
      setBrandHeaderTextColor(orgMeta.brand_header_text_color  || null);
      setBrandSidebarTextColor(orgMeta.brand_sidebar_text_color || null);
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

      // Brand colors — dedicated table, graceful if migration not yet run
      const { data: brandData, error: brandErr2 } = await supabase
          .from('organization_brand_colors')
          .select('brand_color, brand_header_color, brand_sidebar_color, brand_nav_text_color, brand_header_text_color, brand_sidebar_text_color')
          .eq('org_id', oid)
          .maybeSingle();
      if (!brandErr2 && brandData) {
          setBrandColor(brandData.brand_color || null);
          setBrandHeaderColor(brandData.brand_header_color || null);
          setBrandSidebarColor(brandData.brand_sidebar_color || null);
          setBrandNavTextColor(brandData.brand_nav_text_color      || null);
          setBrandHeaderTextColor(brandData.brand_header_text_color  || null);
          setBrandSidebarTextColor(brandData.brand_sidebar_text_color || null);
      }

  };

  // --- ACTIONS ---
  const handleLogout = async () => {
      await supabase.auth.signOut();
      router('/login', { replace: true });
  };

  const handleCreateFolder = async () => { if (userRole !== 'admin') return; const name = prompt("Series Name (e.g., Weekend Services, Night of Worship):"); if(!name) return; await supabase.from('service_folders').insert([{ name, organization_id: orgId }]); refreshAllData(orgId); };
  const handleDeleteFolder = async (e, id) => { e.stopPropagation(); if (userRole !== 'admin') return; if(!confirm("Delete this series? All services in it will become uncategorized.")) return; await supabase.from('service_folders').delete().eq('id', id); refreshAllData(orgId); };
  const handleQuickCreateService = async (dateStr) => { if (userRole !== 'admin' && userRole !== 'editor') return; const { data } = await supabase.from('services').insert([{ name: 'Weekend Service', date: dateStr, organization_id: orgId }]).select().single(); refreshAllData(orgId); if (data) openService(data.id); };
  const openService = async (serviceId) => { const { data } = await supabase.from('services').select('*').eq('id', serviceId).single(); setSelectedService(data); };
  const handleSavePlan = async (updatedStart, updatedItems, updatedTimes) => { if (userRole === 'viewer') return; await supabase.from('services').update({ date: updatedStart, items: updatedItems, times: updatedTimes ?? selectedService.times ?? [] }).eq('id', selectedService.id); refreshAllData(orgId); setSelectedService({...selectedService, items: updatedItems, date: updatedStart, times: updatedTimes ?? selectedService.times ?? []}); };
  const handleSaveTemplate = async (_, updatedItems, updatedTimes) => { if (userRole === 'viewer') return; await supabase.from('service_templates').update({ items: updatedItems, times: updatedTimes ?? selectedTemplate.times ?? [] }).eq('id', selectedTemplate.id); refreshAllData(orgId); setSelectedTemplate({...selectedTemplate, items: updatedItems, times: updatedTimes ?? selectedTemplate.times ?? []}); };
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

  const headerH  = isMobile ? 52  : 64;
  const subNavH  = isMobile ? 40  : 44;
  const bottomH  = isMobile ? 60  : 0;
  const verseH   = isMobile ? 0   : 28;
  const activeCategory = getActiveCategory(activeTab);
  const allowed = getAllowedTabs(realRole, session?.user?.email, guestPermissions);
  const visibleCats = Object.keys(NAV_CATEGORIES).filter(cat =>
    NAV_CATEGORIES[cat].items.some(item => allowed.includes(item.id))
  );
  const catHasSubNav = (NAV_CATEGORIES[activeCategory]?.items || [])
    .filter(item => allowed.includes(item.id)).length > 1;
  const topBarTotal = headerH + (catHasSubNav ? subNavH : 0) + verseH;

  const handleCategoryChange = (cat) => {
    setSelectedService(null);
    const firstAllowed = NAV_CATEGORIES[cat].items.find(item => allowed.includes(item.id));
    if (firstAllowed) setActiveTab(firstAllowed.id);
  };

  return (
    <div style={{ minHeight: isMobile ? '100dvh' : '100vh', fontFamily: 'var(--font-sans)', background: colors.bg, color: colors.text, overflowX: 'hidden' }}>

      {/* ALERT OVERLAY — shown on any screen when an alert message is sent */}
      {alertOverlay && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '60px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 'min(480px, 92vw)', background: 'var(--card)', borderRadius: 'var(--r-panel)', border: '1px solid var(--line-2)', borderTop: '3px solid var(--negative)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} strokeWidth={1.5} color="var(--negative)" />
                <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--negative)' }}>Alert</span>
                {alertOverlay.serviceName && (
                  <span style={{ fontSize: '13px', color: colors.muted }}>· {alertOverlay.serviceName}</span>
                )}
              </div>
              <button onClick={() => setAlertOverlay(null)} title="Close" className="wo-icon-btn" style={{ background: 'transparent', border: 'none', borderRadius: 'var(--r-control)', width: '28px', height: '28px', cursor: 'pointer', color: colors.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div style={{ padding: '12px 20px 20px' }}>
              <div style={{ fontSize: '13px', color: colors.muted, marginBottom: '8px' }}>
                From <strong style={{ color: colors.heading, fontWeight: 500 }}>{alertOverlay.sender_name}</strong>
                {alertOverlay.thread && alertOverlay.thread !== 'global' && (
                  <span> in <strong style={{ color: colors.heading, fontWeight: 500 }}>{alertOverlay.thread}</strong></span>
                )}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 500, color: colors.heading, lineHeight: '24px' }}>
                {alertOverlay.message}
              </div>
              <button
                onClick={() => setAlertOverlay(null)}
                style={{ marginTop: '20px', width: '100%', height: '40px', background: 'var(--text-1)', color: 'var(--card)', border: 'none', borderRadius: 'var(--r-control)', fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERSE STATUS BAR — hidden on mobile */}
      <div style={{
        background: colors.verseBg,
        borderBottom: `1px solid ${colors.navBorder}`,
        padding: '0 24px',
        display: isMobile ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        height: '28px',
      }}>
        <span style={{
          fontSize: '14px',
          fontFamily: 'var(--font-verse)',
          color: colors.verseText,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {verseOfDay ? <>&ldquo;{verseOfDay.text}&rdquo; <cite style={{ fontStyle: 'normal', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-meta)', color: colors.muted, marginLeft: '8px' }}>{verseOfDay.ref}</cite></> : ''}
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

      <Header colors={colors} activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} setSelectedService={setSelectedService} refreshData={() => refreshAllData(orgId)} onLogout={handleLogout} session={session} realRole={realRole} guestPermissions={guestPermissions} isMobile={isMobile} isTablet={isTablet} />

      <SubNav colors={colors} activeTab={activeTab} setActiveTab={setActiveTab} setSelectedService={setSelectedService} isDarkMode={isDarkMode} realRole={realRole} session={session} guestPermissions={guestPermissions} isMobile={isMobile} isTablet={isTablet} topOffset={headerH + verseH} />

      {/* GUEST EXPIRY BANNER */}
      {realRole === 'guest' && guestExpiry && (() => {
        const daysLeft = Math.ceil((new Date(guestExpiry) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 3 || daysLeft <= 0) return null;
        return (
          <div style={{ background: 'var(--deep)', borderBottom: '1px solid var(--line)', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-1)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning, #d97706)' }} />
            <span style={{ fontWeight: 500 }}>Guest access ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
            <span style={{ color: 'var(--text-3)' }}>Ask your admin to extend it</span>
          </div>
        );
      })()}

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <MobileBottomNav
          colors={colors}
          isDarkMode={isDarkMode}
          activeCategory={activeCategory}
          visibleCats={visibleCats}
          onCategoryChange={handleCategoryChange}
        />
      )}

      {/* MAIN CONTENT */}
      <div style={{ display: 'flex', height: `calc(100vh - ${topBarTotal}px - ${bottomH}px)` }}>

        {/* Main Content Area */}
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: isMobile ? `${bottomH}px` : 0 }}>
          {activeTab === 'team' && <TeamManager orgId={orgId} isDarkMode={isDarkMode} userRole={userRole} services={services} session={session} />}

          {activeTab === 'myschedule' && (
            <MyScheduleView
              session={session}
              isDarkMode={isDarkMode}
              colors={colors}
              orgId={orgId}
              onNavigate={setActiveTab}
              userRole={userRole}
              services={services}
            />
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
            <OrgSettings
              orgId={orgId}
              isDarkMode={isDarkMode}
              userRole={userRole}
              session={session}
              onBrandColorsChange={(primary, header, sidebar, navText, headerText, sidebarText) => {
                setBrandColor(primary || null);
                setBrandHeaderColor(header || null);
                setBrandSidebarColor(sidebar || null);
                setBrandNavTextColor(navText || null);
                setBrandHeaderTextColor(headerText || null);
                setBrandSidebarTextColor(sidebarText || null);
              }}
            />
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

          {/* PLANNING CENTER IMPORT TAB */}
          {activeTab === 'import-pco' && (
            <PlanningCenterImport isDarkMode={isDarkMode} orgId={orgId} userRole={userRole} />
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
        <div style={{ display: 'flex', height: `calc(100vh - ${topBarTotal}px - ${bottomH}px)` }}>

          {/* LEFT SIDEBAR - Folders & Calendar — hidden on mobile */}
          {!isMobile && (
          <div style={{
            width: isTablet ? '220px' : '280px',
            background: colors.sidebarBg,
            borderRight: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}>

            {/* Folders Header */}
            <div style={{
              padding: '16px 16px 8px 20px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 500,
                  color: colors.muted,
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
                      color: colors.text,
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--r-tag)',
                      transition: 'background-color var(--t-fast) var(--ease)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--raised)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    title="New series"
                  >
                    <Plus size={16} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>

            {/* Folders List */}
            <div style={{ flex: 1, padding: '0 8px 8px' }}>

              {/* Individual Folders (Series) */}
              {folders.map(folder => (
                <div
                  key={folder.id}
                  style={{
                    height: '32px',
                    padding: '0 4px 0 12px',
                    margin: '0 0 2px',
                    borderRadius: 'var(--r-control)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    background: currentFolder?.id === folder.id ? 'var(--raised)' : 'transparent',
                    boxShadow: currentFolder?.id === folder.id ? 'inset 0 0 0 1px var(--line)' : 'none',
                    color: currentFolder?.id === folder.id ? colors.heading : colors.text,
                    fontWeight: 500,
                    fontSize: '13px',
                    transition: 'background-color var(--t-fast) var(--ease)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (currentFolder?.id === folder.id) return;
                    e.currentTarget.style.background = 'var(--raised)';
                  }}
                  onMouseLeave={(e) => {
                    if (currentFolder?.id === folder.id) return;
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div
                    onClick={() => setCurrentFolder(folder)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, height: '100%' }}
                  >
                    <Folder size={16} strokeWidth={1.5} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
                  </div>
                  {userRole === 'admin' && (
                    <div style={{ display: 'flex', gap: '0' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Settings for "${folder.name}" are not available yet`);
                        }}
                        title="Series settings"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: colors.muted,
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--r-tag)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color var(--t-fast) var(--ease)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = colors.heading;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = colors.muted;
                        }}
                      >
                        <Settings size={14} strokeWidth={1.5}/>
                      </button>
                      <button
                        onClick={(e) => handleDeleteFolder(e, folder.id)}
                        title="Delete series"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: colors.muted,
                          width: '24px',
                          height: '24px',
                          borderRadius: 'var(--r-tag)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color var(--t-fast) var(--ease)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = colors.danger;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = colors.muted;
                        }}
                      >
                        <Trash2 size={14} strokeWidth={1.5}/>
                      </button>
                    </div>
                  )}
                </div>
              ))}

            </div>
          </div>
          )} {/* end !isMobile sidebar */}

          {/* MAIN CONTENT AREA - All Services Overview */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            background: colors.bg
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '16px' : '32px' }}>

              {/* Header */}
              <div style={{ marginBottom: isMobile ? '16px' : '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {currentFolder && (
                    <button
                      onClick={() => setCurrentFolder(null)}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--line-2)',
                        height: '36px',
                        padding: '0 12px',
                        borderRadius: 'var(--r-control)',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '13px',
                        color: colors.heading,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <ArrowLeft size={16} strokeWidth={1.5} /> Back
                    </button>
                  )}
                  <div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '22px' : '28px', lineHeight: 1.15, color: colors.heading, fontWeight: 500 }}>
                      {currentFolder ? currentFolder.name : 'All Services'}
                    </h1>
                    <p style={{ margin: '4px 0 0', color: colors.muted, fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                      {visibleServices.length} service{visibleServices.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {currentFolder && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* View Toggle */}
                    <div style={{ display: 'flex', gap: '2px', background: 'var(--raised)', padding: '2px', borderRadius: 'var(--r-control)', border: '1px solid var(--line)' }}>
                      <button
                        onClick={() => setFolderViewMode('list')}
                        style={{
                          background: folderViewMode === 'list' ? 'var(--card)' : 'transparent',
                          boxShadow: folderViewMode === 'list' ? 'var(--shadow-sm)' : 'none',
                          color: folderViewMode === 'list' ? colors.heading : colors.text,
                          border: 'none',
                          height: '28px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 500,
                          transition: 'background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <LayoutGrid size={16} strokeWidth={1.5}/> List
                      </button>
                      <button
                        onClick={() => setFolderViewMode('matrix')}
                        style={{
                          background: folderViewMode === 'matrix' ? 'var(--card)' : 'transparent',
                          boxShadow: folderViewMode === 'matrix' ? 'var(--shadow-sm)' : 'none',
                          color: folderViewMode === 'matrix' ? colors.heading : colors.text,
                          border: 'none',
                          height: '28px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 500,
                          transition: 'background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Grid3x3 size={16} strokeWidth={1.5}/> Matrix
                      </button>
                    </div>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => alert('Series settings are not available yet')}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--line-2)',
                          height: '36px',
                          padding: '0 12px',
                          borderRadius: 'var(--r-control)',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '13px',
                          color: colors.heading,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Settings size={16} strokeWidth={1.5} /> Settings
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
                  padding: '64px 24px',
                  background: colors.card,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`
                }}>
                  <Calendar size={24} strokeWidth={1.5} color="var(--text-3)" style={{ marginBottom: '12px' }} />
                  <p style={{ color: colors.text, fontSize: '14px', margin: 0 }}>
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
                          padding: '12px 16px 12px 20px',
                          borderBottom: index < visibleServices.length - 1 ? `1px solid ${colors.border}` : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'background-color var(--t-fast) var(--ease)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--raised)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '48px',
                          textAlign: 'center',
                          marginRight: '16px',
                          flexShrink: 0,
                        }}>
                          <div style={{
                            fontSize: '12px',
                            color: colors.muted,
                            marginBottom: '4px',
                            fontFamily: 'var(--font-mono)',
                          }}>
                            {localDate.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div style={{
                            fontSize: '18px',
                            fontWeight: '500',
                            color: colors.heading,
                            lineHeight: '1',
                            fontFamily: 'var(--font-mono)',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {localDate.getDate()}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '500',
                            color: colors.heading,
                            marginBottom: '2px'
                          }}>
                            {service.name}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: colors.muted,
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {localDate.toLocaleDateString('en-US', { weekday: 'long' })} · {service.start_time ? formatTime(service.start_time) : '9:00 AM'} · {localDate.toLocaleDateString('en-US', { year: 'numeric' })}
                          </div>
                        </div>
                        {!isMobile && (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            onClick={(e) => handleMoveService(e, service.id)}
                            title="Move to series"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: colors.muted,
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--r-control)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = colors.heading;
                              e.currentTarget.style.background = 'var(--card)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = colors.muted;
                              e.currentTarget.style.background = 'none';
                            }}
                          >
                            <FolderInput size={16} strokeWidth={1.5}/>
                          </button>
                          {userRole === 'admin' && (
                            <button
                              onClick={(e) => handleDeleteService(e, service.id)}
                              title="Delete plan"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: colors.muted,
                                width: '32px',
                                height: '32px',
                                borderRadius: 'var(--r-control)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = colors.danger;
                                e.currentTarget.style.background = 'var(--card)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = colors.muted;
                                e.currentTarget.style.background = 'none';
                              }}
                            >
                              <Trash2 size={16} strokeWidth={1.5}/>
                            </button>
                          )}
                        </div>
                        )}
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
            <div style={{ padding: isMobile ? '12px' : '24px', background: colors.bg, flex: 1, overflowY: 'auto' }}>
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

        {/* PERSISTENT CALENDAR - Right panel, hidden on mobile */}
        {!isMobile && activeTab === 'dashboard' && !selectedService && !selectedTemplate && (
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