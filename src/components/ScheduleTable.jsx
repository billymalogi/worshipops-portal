import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  GripVertical, Plus, Trash2, X, Save, Music,
  ChevronDown, ChevronRight, CheckCircle,
  Users, LayoutTemplate, Calendar, Search,
  Loader2, Video, FileText, ArrowLeft, Filter,
  MessageSquare, Clock,
} from 'lucide-react';

// ── Responsive hook ────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = React.useState(window.innerWidth);
  React.useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return w;
}
import EditableTitle from './EditableTitle';
import CalendarWidget from './CalendarWidget';
import ChatPanel from './ChatPanel';
import { sectionColors } from '../theme';

const MUSIC_KEYS = [
  'C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B',
  'Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm',
  'C7','D7','E7','F7','G7','A7','B7',
  'Cmaj7','Dmaj7','Emaj7','Fmaj7','Gmaj7','Amaj7','Bmaj7',
  'Cm7','Dm7','Em7','Fm7','Gm7','Am7','Bm7',
  'Csus2','Csus4','Dsus2','Dsus4','Esus4','Fsus2','Fsus4','Gsus2','Gsus4','Asus2','Asus4','Bsus4',
  'Cdim','Ddim','Edim','Fdim','Gdim','Adim','Bdim',
  'Caug','Daug','Eaug','Faug','Gaug','Aaug','Baug',
  'Cadd9','Dadd9','Eadd9','Fadd9','Gadd9','Aadd9',
  'C9','D9','E9','F9','G9','A9','B9',
  'C11','D11','E11','F11','G11','A11','B11',
  'C13','D13','E13','F13','G13','A13','B13',
];

const AVATAR_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

// Common song-arrangement segments — free text is also allowed
const SEQUENCE_PRESETS = ['Intro','Verse 1','Verse 2','Verse 3','Pre-Chorus','Chorus','Bridge','Instrumental','Interlude','Tag','Outro'];

// Named time-block types (Service / Rehearsal / Other), each tied to one plan
const TIME_TYPE_LABEL = { service: 'Service', rehearsal: 'Rehearsal', other: 'Other' };
const TIME_TYPE_COLOR = { service: '#3b82f6', rehearsal: '#a78bfa', other: '#9ca3af' };

// Preset section-header colors — lighter for dark mode, darker for light mode
// Indices match for auto-invert when switching modes
const DARK_MODE_COLORS  = ['#f87171','#fb923c','#fbbf24','#4ade80','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6','#e2e8f0'];
const LIGHT_MODE_COLORS = ['#b91c1c','#c2410c','#b45309','#15803d','#047857','#0e7490','#1d4ed8','#7c3aed','#be185d','#1e293b'];

export default function ScheduleTable({
  serviceData, isTemplate, availableSongs = [], teamMembers = [],
  onBack, onSave, isDarkMode, orgId, onCreateService,
  userRole, session, onServiceClick,
}) {
  const canEdit  = userRole === 'admin' || userRole === 'editor';
  const winWidth = useWindowWidth();
  const isMobile = winWidth < 640;
  const isTablet = winWidth >= 640 && winWidth < 1024;

  // ── State ────────────────────────────────────────────────────────────────────
  const [items,            setItems]            = useState([]);
  const [times,            setTimes]            = useState([]); // [{id,type:'service'|'rehearsal'|'other',name,date,startTime,endTime}]
  const [showTimeModal,    setShowTimeModal]     = useState(false);
  const [showAddTimeMenu,  setShowAddTimeMenu]   = useState(false);
  const [editingTimeId,    setEditingTimeId]     = useState(null);
  const [timeDraft,        setTimeDraft]         = useState(null); // draft object while the Add/Edit Time modal is open
  const [planName,         setPlanName]         = useState(serviceData?.name || 'Untitled Service');
  const [planDate,         setPlanDate]         = useState(
    typeof serviceData?.date === 'string' ? serviceData.date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [saveStatus,       setSaveStatus]       = useState('idle');
  const [showAddMenu,      setShowAddMenu]      = useState(false);
  const [currentUser,      setCurrentUser]      = useState('');
  const [ministries,       setMinistries]       = useState([]);
  const [positions,        setPositions]        = useState([]);
  const [sidebarView,      setSidebarView]      = useState('main');
  const [activeMinistryId, setActiveMinistryId] = useState(null);
  const [assigningRole,    setAssigningRole]    = useState(null);
  const [expandedSections, setExpandedSections] = useState({ library: true, teams: true, calendar: true, playlists: false });
  const [expandedMinistries, setExpandedMinistries] = useState({});
  const [songSearch,       setSongSearch]       = useState('');
  const [playlists,        setPlaylists]        = useState([]);
  const [currentPlaylist,  setCurrentPlaylist]  = useState(null);
  const [sameDayServices,  setSameDayServices]  = useState([]);
  const [peopleSearch,     setPeopleSearch]     = useState('');
  const [filterBySkill,    setFilterBySkill]    = useState(true);
  const [newRoleName,      setNewRoleName]      = useState('');
  const [showChat,           setShowChat]           = useState(false);
  const [chatThread,         setChatThread]         = useState('global');
  const [noteDrafts,         setNoteDrafts]         = useState({});
  const [selectedMinistries, setSelectedMinistries] = useState([]);
  const [draggedItemIndex,   setDraggedItemIndex]   = useState(null);
  const [draggedNewItem,   setDraggedNewItem]   = useState(null);
  const [dropTargetIndex,  setDropTargetIndex]  = useState(null);
  const [colorPopoverItemId, setColorPopoverItemId] = useState(null);
  const [activeRightPanel,   setActiveRightPanel]   = useState(null); // 'calendar'|'teams'|'songs'|'times'
  const [leaderPickerItemId, setLeaderPickerItemId] = useState(null);
  const [arrangementItemId,  setArrangementItemId]  = useState(null); // expanded sequence editor
  const [sequenceDraft,      setSequenceDraft]      = useState('');
  const [expandedItemIds,    setExpandedItemIds]    = useState({}); // item.id -> bool, click a row to expand
  const [showViewMenu,       setShowViewMenu]       = useState(false);
  const [viewSettings,       setViewSettings]       = useState({
    density: 'default', // 'condensed' | 'default' | 'expanded'
    showTime: true, showLength: true, showKey: true, showBpm: true, showLeader: true,
  });

  const prevDarkModeRef  = useRef(isDarkMode);
  const autoSaveTimer    = useRef(null);
  const userHasEdited    = useRef(false);

  // ── Colors ───────────────────────────────────────────────────────────────────
  const colors = {
    bg:           isDarkMode ? '#111111' : '#ffffff',
    text:         isDarkMode ? '#e5e7eb' : '#27272a',
    subText:      isDarkMode ? '#9ca3af' : '#6b7280',
    border:       isDarkMode ? '#27272a' : '#e5e7eb',
    hover:        isDarkMode ? '#1f1f22' : '#f9fafb',
    inputBg:      isDarkMode ? '#1f1f22' : '#ffffff',
    card:         isDarkMode ? '#18181b' : '#f8fafc',
    heading:      isDarkMode ? '#f9fafb' : '#111111',
    accent:       '#3b82f6',
    danger:       '#ef4444',
    success:      '#10b981',
    popover:      isDarkMode ? '#1f1f22' : '#ffffff',
    dropHighlight: isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hr = parseInt(h, 10);
    return `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  const parseLengthToSeconds = (lenStr) => {
    if (!lenStr) return 0;
    const s = String(lenStr).trim();
    if (s.includes(':')) { const [m, sec] = s.split(':').map(n => parseInt(n) || 0); return m * 60 + sec; }
    return (parseInt(s) || 0) * 60;
  };

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (serviceData) {
      userHasEdited.current = false;          // fresh load — don't auto-save
      setItems(serviceData.items || []);
      setTimes(serviceData.times || []);
      setPlanName(serviceData.name);
      if (serviceData.date) setPlanDate(serviceData.date.split('T')[0]);
      if (!isTemplate && serviceData.id) fetchSidebarData();
    }
  }, [serviceData, isTemplate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        const n = session.user.email.split('@')[0];
        setCurrentUser(n.charAt(0).toUpperCase() + n.slice(1));
      }
    });
  }, []);

  useEffect(() => {
    if (!isTemplate && serviceData?.date && serviceData?.id && orgId) {
      const dateOnly = serviceData.date.split('T')[0];
      supabase.from('services').select('*')
        .eq('organization_id', orgId)
        .like('date', `${dateOnly}%`)
        .neq('id', serviceData.id)
        .order('start_time', { ascending: true })
        .then(({ data }) => { if (data) setSameDayServices(data); });
    }
  }, [serviceData?.date, serviceData?.id, orgId, isTemplate]);

  // Auto-invert preset section colors when dark/light mode changes
  useEffect(() => {
    if (prevDarkModeRef.current === isDarkMode) return;
    prevDarkModeRef.current = isDarkMode;
    setItems(prev => prev.map(item => {
      if (item.type !== 'header' || !item.color) return item;
      const c = item.color.toLowerCase();
      if (isDarkMode) {
        const idx = LIGHT_MODE_COLORS.indexOf(c);
        if (idx >= 0) return { ...item, color: DARK_MODE_COLORS[idx] };
      } else {
        const idx = DARK_MODE_COLORS.indexOf(c);
        if (idx >= 0) return { ...item, color: LIGHT_MODE_COLORS[idx] };
      }
      return item;
    }));
  }, [isDarkMode]);

  // Close color/leader popovers when clicking outside
  useEffect(() => {
    if (!colorPopoverItemId) return;
    const close = () => setColorPopoverItemId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [colorPopoverItemId]);

  useEffect(() => {
    if (!showAddTimeMenu) return;
    const close = () => setShowAddTimeMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showAddTimeMenu]);

  useEffect(() => {
    if (!showViewMenu) return;
    const close = () => setShowViewMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showViewMenu]);

  useEffect(() => {
    if (!leaderPickerItemId) return;
    const close = () => setLeaderPickerItemId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [leaderPickerItemId]);

  // ── Auto-save (debounced 1.5 s after last change) ────────────────────────────
  useEffect(() => {
    if (!userHasEdited.current || !canEdit || !onSave) return;
    setSaveStatus('pending');
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave(planDate, items, times);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [items, times]);

  // ── Data ─────────────────────────────────────────────────────────────────────
  const fetchSidebarData = async () => {
    const { data: minData } = await supabase.from('ministries').select('*').eq('organization_id', orgId).order('sort_order', { ascending: true });
    const { data: posData } = await supabase.from('service_positions').select('*').eq('service_id', serviceData.id);
    setMinistries(minData || []);
    setPositions(posData || []);
    const init = {};
    if (minData) minData.forEach(m => init[m.id] = true);
    setExpandedMinistries(init);
  };

  // ── Team actions ─────────────────────────────────────────────────────────────
  const startAddRole    = (mid) => { if (!canEdit) return; setActiveMinistryId(mid); setNewRoleName(''); };
  const saveNewRole     = async () => {
    if (!newRoleName.trim()) { setActiveMinistryId(null); return; }
    const { data } = await supabase.from('service_positions').insert([{ service_id: serviceData.id, ministry_id: activeMinistryId, role_name: newRoleName, status: 'pending' }]).select().single();
    if (data) { setPositions([...positions, data]); setActiveMinistryId(null); setNewRoleName(''); }
  };
  const openPeoplePicker = (pos) => { if (!canEdit) return; setAssigningRole(pos); setSidebarView('picker'); setPeopleSearch(''); setFilterBySkill(true); };
  const assignPerson    = async (memberId) => {
    const id = assigningRole.id;
    setPositions(positions.map(p => p.id === id ? { ...p, member_id: memberId, status: memberId ? 'confirmed' : 'pending' } : p));
    await supabase.from('service_positions').update({ member_id: memberId, status: memberId ? 'confirmed' : 'pending' }).eq('id', id);
    setSidebarView('main'); setAssigningRole(null);
  };
  const handleDeleteRole = async (id) => {
    if (!canEdit || !confirm('Remove this role?')) return;
    await supabase.from('service_positions').delete().eq('id', id);
    setPositions(positions.filter(p => p.id !== id));
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleMainSave = async () => {
    if (!canEdit) return;
    clearTimeout(autoSaveTimer.current);   // cancel any pending auto-save
    setSaveStatus('saving');
    try { await onSave(planDate, items, times); setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 2000); }
    catch { setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 3000); }
  };

  // ── Times (Service / Rehearsal / Other named time blocks) ───────────────────────
  const openAddTime = (type) => {
    if (!canEdit) return;
    setEditingTimeId(null);
    setTimeDraft({ type, name: '', date: planDate, startTime: '09:00', endTime: '10:00' });
    setShowTimeModal(true);
  };
  const openEditTime = (t) => {
    if (!canEdit) return;
    setEditingTimeId(t.id);
    setTimeDraft({ ...t });
    setShowTimeModal(true);
  };
  const saveTimeDraft = () => {
    if (!timeDraft) return;
    userHasEdited.current = true;
    const draft = { ...timeDraft, id: editingTimeId || (Date.now() + Math.random().toString(36).slice(2, 9)) };
    setTimes(prev => editingTimeId ? prev.map(t => t.id === editingTimeId ? draft : t) : [...prev, draft]);
    setShowTimeModal(false);
    setTimeDraft(null);
    setEditingTimeId(null);
  };
  const deleteTime = (id) => {
    if (!canEdit) return;
    userHasEdited.current = true;
    setTimes(prev => prev.filter(t => t.id !== id));
  };
  const serviceTimes = times.filter(t => t.type === 'service').sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // ── Items ─────────────────────────────────────────────────────────────────────
  const createItem = (type, song = null) => ({
    id: Date.now() + Math.random().toString(36).slice(2, 11),
    type,
    title: song ? song.title : (type === 'header' ? 'New Section' : 'New Item'),
    length: 0, bpm: song?.bpm || '', key: song?.key || '', notes: '', color: null,
    isPreService: false,  // headers only — whole section excluded from the running total
    isBackup: false,      // songs/items only — standby/contingency, excluded from totals
    leaderId: null,       // songs/items — team member tagged as leading this one
    sequence: type === 'song' ? [] : undefined, // songs — ordered arrangement (Intro, Verse 1, ...)
  });

  const handleAddItemClick = (type, song = null) => { if (!canEdit) return; userHasEdited.current = true; setItems([...items, createItem(type, song)]); setShowAddMenu(false); };
  const handleDeleteItem   = (idx) => { if (!canEdit) return; userHasEdited.current = true; setItems(items.filter((_, i) => i !== idx)); };
  const updateItem         = (idx, field, val) => {
    if (!canEdit) return;
    userHasEdited.current = true;
    const next = [...items]; next[idx] = { ...next[idx], [field]: val }; setItems(next);
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────────
  const handleDragStart    = (e, i) => { if (!canEdit) return; setDraggedItemIndex(i); setDraggedNewItem(null); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', i); };
  const handleNewDragStart = (e, type, song = null) => { if (!canEdit) return; setDraggedItemIndex(null); setDraggedNewItem(createItem(type, song)); e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', 'new'); };
  const handleDragOver     = (e, i) => { e.preventDefault(); if (dropTargetIndex !== i) setDropTargetIndex(i); };
  const handleDrop         = (e, dropIdx) => {
    e.preventDefault(); e.stopPropagation(); setDropTargetIndex(null);
    if (!canEdit) return;
    const next = [...items];
    if (draggedNewItem) { userHasEdited.current = true; next.splice(dropIdx, 0, draggedNewItem); setItems(next); setDraggedNewItem(null); setShowAddMenu(false); }
    else if (draggedItemIndex !== null && draggedItemIndex !== dropIdx) { userHasEdited.current = true; const [m] = next.splice(draggedItemIndex, 1); next.splice(dropIdx, 0, m); setItems(next); setDraggedItemIndex(null); }
  };

  // ── Computed ──────────────────────────────────────────────────────────────────
  const isDraggingAny = draggedItemIndex !== null || draggedNewItem !== null;

  // Clock times for every row. Pre-service sections don't push the real
  // timeline forward — their items count backward from wherever the main
  // flow currently sits, so the first "real" item after them still lands on
  // time. Standby/back-up items aren't scheduled at all, so they get no slot.
  const computeTimesForAnchor = (anchorTimeStr) => {
    let cursor = new Date(`2000-01-01T${anchorTimeStr}`);
    let inPreService = false;
    const clockTimes = new Array(items.length).fill('');
    let i = 0;
    while (i < items.length) {
      const item = items[i];
      if (item.type === 'header') { inPreService = !!item.isPreService; i++; continue; }
      if (item.isBackup) { clockTimes[i] = null; i++; continue; }
      if (inPreService) {
        let j = i, blockSec = 0;
        while (j < items.length && items[j].type !== 'header') {
          if (!items[j].isBackup) blockSec += parseLengthToSeconds(items[j].length);
          j++;
        }
        let t = new Date(cursor.getTime() - blockSec * 1000);
        for (let k = i; k < j; k++) {
          if (items[k].isBackup) { clockTimes[k] = null; continue; }
          clockTimes[k] = t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          t.setSeconds(t.getSeconds() + parseLengthToSeconds(items[k].length));
        }
        i = j;
        continue;
      }
      clockTimes[i] = cursor.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      cursor.setSeconds(cursor.getSeconds() + parseLengthToSeconds(item.length));
      i++;
    }
    return clockTimes;
  };

  // One cascaded time column per Service-type time block (9:00am / 11:00am / ...).
  // Falls back to the plan's single start_time when no blocks are defined yet.
  const startTimesByColumn = serviceTimes.length > 0
    ? serviceTimes.map(t => computeTimesForAnchor(t.startTime || '09:00'))
    : [computeTimesForAnchor((serviceData?.start_time || '09:00:00').slice(0, 5))];
  const startTimes = startTimesByColumn[0];

  // Shared column grid for the list — every row (and the header above it) uses
  // the exact same template so Time/Length/Key/BPM/Leader line up down the
  // whole page instead of drifting with each row's content width.
  const timeColLabels = serviceTimes.length > 0 ? serviceTimes.map(t => t.name || formatTime(t.startTime)) : ['Time'];
  const metaGridCols = `${canEdit ? '20px ' : ''}minmax(0,1fr) repeat(${timeColLabels.length}, 64px) 50px 48px 56px 26px 20px`;

  // Whether item i sits inside a header marked Pre-Service
  const isPreServiceItem = (idx) => {
    for (let j = idx - 1; j >= 0; j--) {
      if (items[j].type === 'header') return !!items[j].isPreService;
    }
    return false;
  };

  const totalMinutes = Math.round(
    items
      .filter((it, idx) => it.type !== 'header' && !it.isBackup && !isPreServiceItem(idx))
      .reduce((a, it) => a + parseLengthToSeconds(it.length), 0) / 60
  );
  const itemCount = items.filter(it => it.type !== 'header').length;
  const isToday = planDate === new Date().toISOString().split('T')[0];

  // Minutes in the section that starts at this header, up to the next header
  // (or end of plan). Standby items don't count toward the section total either.
  const sectionMinutes = (headerIdx) => {
    let sec = 0;
    for (let j = headerIdx + 1; j < items.length && items[j].type !== 'header'; j++) {
      if (!items[j].isBackup) sec += parseLengthToSeconds(items[j].length);
    }
    return Math.round(sec / 60);
  };

  const filteredSongs  = availableSongs.filter(s => s.title.toLowerCase().includes(songSearch.toLowerCase()));
  const filteredPeople = teamMembers.filter(p => {
    const match = p.name.toLowerCase().includes(peopleSearch.toLowerCase());
    if (filterBySkill && assigningRole) {
      const role = assigningRole.role_name.toLowerCase();
      return match && p.skills?.some(sk => role.includes(sk.toLowerCase()));
    }
    return match;
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
    <style>{`
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      /* ── Ghost scrollbars — VSCode style ── */
      /* Firefox */
      .wop-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
      .wop-scroll:hover { scrollbar-color: rgba(120,120,120,0.4) transparent; }

      /* Webkit (Chrome, Edge, Safari) */
      .wop-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
      .wop-scroll::-webkit-scrollbar-track { background: transparent; }
      .wop-scroll::-webkit-scrollbar-thumb {
        background: transparent;
        border-radius: 10px;
        transition: background 0.5s ease;
      }
      .wop-scroll:hover::-webkit-scrollbar-thumb { background: rgba(120,120,120,0.3); }
      .wop-scroll::-webkit-scrollbar-thumb:hover { background: rgba(120,120,120,0.65) !important; transition: background 0.1s ease; }
    `}</style>
    <datalist id="sequence-presets">
      {SEQUENCE_PRESETS.map(p => <option key={p} value={p} />)}
    </datalist>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: colors.text, userSelect: isDraggingAny ? 'none' : 'auto' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
        <button onClick={onBack} style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: colors.text, fontSize: '13px' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!isTemplate && (
            <button onClick={() => setShowChat(true)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={15} /> Chat
            </button>
          )}
          {/* Auto-save status indicator */}
          {saveStatus === 'pending' && (
            <span style={{ fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.9 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              Unsaved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span style={{ fontSize: '12px', color: colors.subText, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
            </span>
          )}
          {saveStatus === 'success' && (
            <span style={{ fontSize: '12px', color: colors.success, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle size={12} /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span style={{ fontSize: '12px', color: colors.danger, display: 'flex', alignItems: 'center', gap: '5px' }}>
              ✕ Save failed
            </span>
          )}
          <button
            onClick={handleMainSave}
            disabled={saveStatus === 'saving' || !canEdit}
            style={{ background: !canEdit ? colors.subText : colors.accent, color: 'white', border: 'none', padding: '7px 18px', borderRadius: '8px', cursor: canEdit ? 'pointer' : 'not-allowed', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', opacity: canEdit ? 1 : 0.5 }}
          >
            <Save size={15} /> Save
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ display: 'flex', gap: '0', flex: 1, overflow: 'hidden' }}>

        {/* LEFT: PLAN EDITOR — scrollable column */}
        <div className="wop-scroll" style={{ flex: 1, overflowY: 'auto', minWidth: 0, paddingRight: activeRightPanel ? '12px' : '0' }}>

          {/* ── STICKY: service header + stats — freeze at top on scroll ── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: colors.bg, paddingBottom: '16px', marginBottom: '8px' }}>

            {/* SERVICE HEADER */}
            <div style={{ marginBottom: '18px', paddingTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0, textAlign: (isMobile || isTablet) ? 'center' : 'left' }}>
                  {canEdit
                    ? <EditableTitle initialTitle={planName} onSave={setPlanName} isDarkMode={isDarkMode} />
                    : <div style={{ fontSize: '24px', fontWeight: '600', color: colors.heading, letterSpacing: '-0.3px' }}>{planName}</div>
                  }
                  <div style={{ fontSize: '13px', color: colors.subText, marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: (isMobile || isTablet) ? 'center' : 'flex-start', gap: '6px' }}>
                    <CalendarIcon date={planDate} />
                    {!isTemplate && serviceData?.start_time && (
                      <><span style={{ opacity: 0.35 }}>•</span><span>{formatTime(serviceData.start_time)} Service</span></>
                    )}
                  </div>
                </div>
                {isToday && !isTemplate && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500', color: colors.success, flexShrink: 0, marginTop: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />Live
                  </span>
                )}
                {isTemplate && (
                  <span style={{ fontSize: '12px', fontWeight: '500', color: colors.subText, border: `1px solid ${colors.border}`, padding: '3px 10px', borderRadius: '6px', flexShrink: 0, marginTop: '4px' }}>Template</span>
                )}
              </div>

              {/* TIMES — named Service / Rehearsal / Other blocks for this plan */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                {times.map(t => (
                  <button
                    key={t.id}
                    onClick={() => openEditTime(t)}
                    title={`${t.name || TIME_TYPE_LABEL[t.type]} — click to edit`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '500',
                      padding: '4px 10px', borderRadius: '20px', border: `1px solid ${colors.border}`, background: colors.card,
                      color: colors.text, cursor: canEdit ? 'pointer' : 'default', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: TIME_TYPE_COLOR[t.type], flexShrink: 0 }} />
                    {t.name || TIME_TYPE_LABEL[t.type]}
                    <span style={{ color: colors.subText, fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{formatTime(t.startTime)}</span>
                  </button>
                ))}
                {canEdit && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAddTimeMenu(v => !v); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '500', padding: '4px 10px', borderRadius: '20px', border: `1px dashed ${colors.border}`, background: 'transparent', color: colors.subText, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <Plus size={12} /> Add time
                    </button>
                    {showAddTimeMenu && (
                      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', background: colors.popover, border: `1px solid ${colors.border}`, borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', zIndex: 60, minWidth: '140px', overflow: 'hidden' }}>
                        {['service', 'rehearsal', 'other'].map(type => (
                          <div
                            key={type}
                            onClick={() => { setShowAddTimeMenu(false); openAddTime(type); }}
                            style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: colors.text, fontWeight: '500', fontSize: '13px' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = colors.hover}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: TIME_TYPE_COLOR[type] }} />
                            {TIME_TYPE_LABEL[type]}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* STATS ROW */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: (isMobile || isTablet) ? 'center' : 'flex-start' }}>
              <div style={{ flex: (isMobile || isTablet) ? 'unset' : 1, background: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, padding: '14px 18px', textAlign: (isMobile || isTablet) ? 'center' : 'left' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: colors.subText, marginBottom: '6px' }}>Total time</div>
                <div style={{ fontSize: '20px', fontWeight: '500', color: (isMobile || isTablet) ? colors.subText : colors.heading, letterSpacing: '-0.3px', fontFamily: 'var(--font-mono)' }}>
                  {totalMinutes > 0 ? `${totalMinutes} Min` : '—'}
                </div>
              </div>
              {!isTemplate && !isMobile && !isTablet && (
                <div style={{ flex: 1, background: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, padding: '14px 18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: colors.subText, marginBottom: '10px' }}>Team status</div>

                  {/* Ministry toggle pills */}
                  {ministries.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {ministries.map(m => {
                        const active = selectedMinistries.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => setSelectedMinistries(prev => active ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                            style={{ fontSize: '10px', fontWeight: '600', padding: '3px 9px', borderRadius: '99px', border: `1px solid ${active ? colors.accent : colors.border}`, background: active ? `${colors.accent}18` : 'transparent', color: active ? colors.accent : colors.subText, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Bubbles with status badges */}
                  {(() => {
                    const filteredPos = selectedMinistries.length > 0
                      ? positions.filter(p => selectedMinistries.includes(p.ministry_id))
                      : positions;

                    if (filteredPos.length === 0) {
                      return <div style={{ fontSize: '12px', color: colors.subText, fontStyle: 'italic' }}>{positions.length === 0 ? 'No positions yet' : 'Select a ministry above'}</div>;
                    }

                    const badge = { confirmed: { bg: '#10b981', icon: '✓' }, declined: { bg: '#ef4444', icon: '✗' }, pending: { bg: '#f59e0b', icon: '!' } };

                    return (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {filteredPos.map((pos, idx) => {
                          const member = teamMembers.find(t => t.id === pos.member_id);
                          const name   = member?.name || '?';
                          const b      = badge[pos.status] || badge.pending;
                          return (
                            <div key={pos.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              <div style={{ position: 'relative' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: AVATAR_COLORS[idx % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white' }}>
                                  {name.charAt(0)}
                                </div>
                                <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '14px', height: '14px', borderRadius: '50%', background: b.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '800', color: 'white', border: `1.5px solid ${isDarkMode ? '#18181b' : '#f8fafc'}` }}>
                                  {b.icon}
                                </div>
                              </div>
                              <span style={{ fontSize: '9px', color: colors.subText, textAlign: 'center', maxWidth: '40px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {name.split(' ')[0]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Selected ministry names */}
                  {selectedMinistries.length > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '10px', color: colors.subText, opacity: 0.7 }}>
                      {ministries.filter(m => selectedMinistries.includes(m.id)).map(m => m.name).join(' · ')}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>{/* end sticky header */}

          {/* SERVICE PLAN label + Add Item */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: colors.subText }}>
              Service plan
            </span>
            {canEdit && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  style={{ background: 'transparent', border: 'none', color: colors.accent, fontSize: '13px', fontWeight: '700', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit' }}
                >
                  <Plus size={14} /> Add Item
                </button>
                {showAddMenu && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', background: colors.popover, border: `1px solid ${colors.border}`, borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 50, minWidth: '180px', overflow: 'hidden' }}>
                    {[
                      { type: 'song',   label: 'Song',    icon: Music         },
                      { type: 'header', label: 'Section', icon: LayoutTemplate },
                      { type: 'item',   label: 'Item',    icon: FileText      },
                      { type: 'media',  label: 'Media',   icon: Video         },
                    ].map(({ type, label, icon: Icon }) => (
                      <div
                        key={type}
                        draggable
                        onDragStart={(e) => handleNewDragStart(e, type)}
                        onClick={() => handleAddItemClick(type)}
                        style={{ padding: '11px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: colors.text, fontWeight: '500', fontSize: '13px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = colors.hover}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Icon size={16} color={colors.accent} />{label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowViewMenu(v => !v); }}
                title="Choose what shows on each row"
                style={{ background: showViewMenu ? colors.hover : 'transparent', border: `1px solid ${colors.border}`, borderRadius: '6px', padding: '5px 9px', color: colors.subText, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit', marginLeft: canEdit ? '8px' : 0 }}
              >
                <Filter size={12} /> View
              </button>
              {showViewMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', background: colors.popover, border: `1px solid ${colors.border}`, borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', zIndex: 60, minWidth: '220px', padding: '12px' }}
                >
                  <div style={{ fontSize: '10px', fontWeight: '700', color: colors.subText, letterSpacing: '0.04em', marginBottom: '8px' }}>SHOW ON ROW</div>
                  {[
                    ['showTime', 'Time'], ['showLength', 'Length'], ['showKey', 'Key'],
                    ['showBpm', 'BPM'], ['showLeader', 'Leader'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '13px', color: colors.text, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={viewSettings[key]}
                        onChange={() => setViewSettings(v => ({ ...v, [key]: !v[key] }))}
                        disabled={viewSettings.density !== 'default'}
                      />
                      {label}
                    </label>
                  ))}
                  <div style={{ fontSize: '10px', fontWeight: '700', color: colors.subText, letterSpacing: '0.04em', margin: '12px 0 8px' }}>DENSITY</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['condensed', 'default', 'expanded'].map(d => (
                      <button
                        key={d}
                        onClick={() => setViewSettings(v => ({ ...v, density: d }))}
                        style={{
                          flex: 1, fontSize: '11px', fontWeight: '500', textTransform: 'capitalize', padding: '5px 0', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
                          border: `1px solid ${viewSettings.density === d ? colors.accent : colors.border}`,
                          background: viewSettings.density === d ? colors.accent : 'transparent',
                          color: viewSettings.density === d ? 'white' : colors.subText,
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ITEMS LIST — one continuous card; section tint lives on the header
              band only, item rows are flat with a hairline divider between them */}
          <div
            style={{ paddingRight: '2px', paddingBottom: '32px' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, items.length)}
          >
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.subText, fontSize: '14px' }}>
                <Plus size={32} color={colors.border} style={{ margin: '0 auto 12px', display: 'block' }} />
                No items yet — click <strong>+ Add Item</strong> to begin
              </div>
            ) : (
            <div style={{ background: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            {/* Column header — same grid as every row below, so values line up like a real table */}
            {viewSettings.density !== 'condensed' && (
              <div style={{ display: 'grid', gridTemplateColumns: metaGridCols, alignItems: 'center', gap: '8px', padding: '7px 14px', borderBottom: `1px solid ${colors.border}`, fontSize: '10px', fontWeight: '600', color: colors.subText, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {canEdit && <span />}
                <span />
                {timeColLabels.map((label, ci) => <span key={ci} style={{ fontFamily: 'var(--font-mono)', textTransform: 'none' }}>{viewSettings.showTime ? label : ''}</span>)}
                <span>{viewSettings.showLength ? 'Len' : ''}</span>
                <span>{viewSettings.showKey ? 'Key' : ''}</span>
                <span>{viewSettings.showBpm ? 'BPM' : ''}</span>
                <span>{viewSettings.showLeader ? 'Lead' : ''}</span>
                <span />
              </div>
            )}
            {items.map((item, i) => {
              // ── SECTION HEADER (tinted band) ───────────────────────────────
              if (item.type === 'header') {
                const sc = sectionColors(item.color || '#3b82f6', isDarkMode ? 'dark' : 'light');
                const mins = sectionMinutes(i);
                return (
                  <div
                    key={item.id}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragLeave={() => setDropTargetIndex(null)}
                    onDrop={(e) => handleDrop(e, i)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '42px', padding: '0 14px', background: sc['--sc-soft'], borderTop: i > 0 ? `1px solid ${colors.border}` : 'none', opacity: draggedItemIndex === i ? 0.3 : 1 }}
                  >
                    {/* Drag handle */}
                    {canEdit && (
                      <div draggable onDragStart={(e) => handleDragStart(e, i)} style={{ cursor: 'grab', color: sc['--sc-ink'], opacity: 0.6, display: 'flex', flexShrink: 0 }}>
                        <GripVertical size={12} />
                      </div>
                    )}

                    {/* Color dot */}
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sc['--sc'], flexShrink: 0 }} />

                    {/* Section name — left-aligned, fills remaining space */}
                    <input
                      readOnly={!canEdit}
                      value={item.title || ''}
                      onChange={e => updateItem(i, 'title', e.target.value)}
                      placeholder="New Section"
                      style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', fontWeight: '600', color: sc['--sc-ink'], pointerEvents: isDraggingAny ? 'none' : 'auto', fontFamily: 'inherit' }}
                    />

                    {/* Pre-service flag — excludes this whole section from the running total */}
                    {canEdit ? (
                      <button
                        onClick={() => updateItem(i, 'isPreService', !item.isPreService)}
                        title={item.isPreService ? 'Pre-service — excluded from the total time. Click to unmark.' : 'Mark this section as pre-service (excluded from the total time)'}
                        style={{
                          fontSize: '10px', fontWeight: '600', flexShrink: 0, cursor: 'pointer', fontFamily: 'inherit',
                          borderRadius: '10px', padding: '2px 8px',
                          background: item.isPreService ? `${sc['--sc-ink']}22` : 'transparent',
                          border: item.isPreService ? `1px solid ${sc['--sc-ink']}55` : '1px solid transparent',
                          color: sc['--sc-ink'],
                          opacity: item.isPreService ? 0.9 : 0.22,
                        }}
                        onMouseEnter={e => { if (!item.isPreService) e.currentTarget.style.opacity = 0.6; }}
                        onMouseLeave={e => { if (!item.isPreService) e.currentTarget.style.opacity = 0.22; }}
                      >
                        Pre-service
                      </button>
                    ) : item.isPreService && (
                      <span style={{ fontSize: '10px', fontWeight: '600', color: sc['--sc-ink'], opacity: 0.85, flexShrink: 0 }}>Pre-service</span>
                    )}

                    {/* Section total */}
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: sc['--sc-ink'], opacity: 0.85, flexShrink: 0 }}>{mins} min</span>

                    {/* Controls: color popover + delete */}
                    {canEdit && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                        {/* Color swatch + popover */}
                        <div style={{ position: 'relative' }}>
                          <div
                            onClick={(e) => { e.stopPropagation(); setColorPopoverItemId(colorPopoverItemId === item.id ? null : item.id); }}
                            title="Section color"
                            style={{ width: '14px', height: '14px', borderRadius: '50%', background: item.color || '#3b82f6', border: `2px solid ${sc['--sc-soft']}`, cursor: 'pointer', flexShrink: 0 }}
                          />
                          {colorPopoverItemId === item.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{ position: 'absolute', right: 0, top: '20px', zIndex: 100, background: colors.popover, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                            >
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px', marginBottom: '8px' }}>
                                {(isDarkMode ? DARK_MODE_COLORS : LIGHT_MODE_COLORS).map(color => (
                                  <div
                                    key={color}
                                    onClick={() => { updateItem(i, 'color', color); setColorPopoverItemId(null); }}
                                    style={{ width: '20px', height: '20px', borderRadius: '50%', background: color, cursor: 'pointer', border: item.color === color ? `2px solid ${isDarkMode ? '#ffffff' : '#000000'}` : '2px solid transparent', boxSizing: 'border-box' }}
                                  />
                                ))}
                              </div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '10px', color: colors.subText, fontFamily: 'inherit' }}>
                                <input
                                  type="color"
                                  value={item.color || '#3b82f6'}
                                  onChange={(e) => updateItem(i, 'color', e.target.value)}
                                  style={{ width: '20px', height: '20px', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '4px', background: 'transparent' }}
                                />
                                Custom
                              </label>
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleDeleteItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sc['--sc-ink'], opacity: 0.6, padding: 0, display: 'flex' }}>
                          <X size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              // ── ITEM ROW (flat, hairline divider — no per-row card) ────────
              const isExpanded = viewSettings.density === 'expanded' || !!expandedItemIds[item.id];
              const toggleExpand = () => setExpandedItemIds(prev => ({ ...prev, [item.id]: !prev[item.id] }));
              const displayTime = startTimes[i] === null ? 'Standby' : startTimes[i];
              // One chip per service time when there are 2+ (e.g. "9:00 AM" / "11:00 AM")
              const multiTimes = startTimesByColumn.length > 1 ? startTimesByColumn.map(col => col[i]) : null;
              const leaderName = item.leaderId ? (teamMembers.find(p => p.id === item.leaderId)?.name || '') : '';

              if (!isExpanded) {
                const condensed = viewSettings.density === 'condensed';

                if (condensed) {
                  return (
                    <div
                      key={item.id}
                      onClick={toggleExpand}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragLeave={() => setDropTargetIndex(null)}
                      onDrop={(e) => handleDrop(e, i)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                        borderTop: i > 0 ? `1px solid ${colors.border}` : 'none',
                        padding: '8px 14px',
                        opacity: draggedItemIndex === i ? 0.4 : 1,
                        boxShadow: dropTargetIndex === i && isDraggingAny ? `inset 0 0 0 2px ${colors.accent}` : 'none',
                      }}
                    >
                      {canEdit && (
                        <div draggable onDragStart={(e) => handleDragStart(e, i)} onClick={(e) => e.stopPropagation()} style={{ cursor: 'grab', color: colors.subText, opacity: 0.35, display: 'flex', flexShrink: 0 }}>
                          <GripVertical size={14} />
                        </div>
                      )}
                      <span style={{ fontWeight: '600', fontSize: '15px', color: colors.heading, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title || 'Untitled'}
                      </span>
                      {item.isBackup && (
                        <span style={{ fontSize: '10px', fontWeight: '600', color: colors.subText, border: `1px dashed ${colors.border}`, borderRadius: '10px', padding: '1px 7px', flexShrink: 0 }}>Standby</span>
                      )}
                      <ChevronRight size={13} color={colors.subText} style={{ opacity: 0.4, flexShrink: 0, transform: 'rotate(90deg)' }} />
                    </div>
                  );
                }

                // Default density — a strict grid so every column (time, length,
                // key, bpm, leader) starts at the same x position on every row,
                // the same way a file browser's Date/Type/Size columns do.
                return (
                  <div
                    key={item.id}
                    onClick={toggleExpand}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragLeave={() => setDropTargetIndex(null)}
                    onDrop={(e) => handleDrop(e, i)}
                    style={{
                      display: 'grid', gridTemplateColumns: metaGridCols, alignItems: 'center', gap: '8px', cursor: 'pointer',
                      borderTop: i > 0 ? `1px solid ${colors.border}` : 'none',
                      padding: '10px 14px',
                      opacity: draggedItemIndex === i ? 0.4 : 1,
                      boxShadow: dropTargetIndex === i && isDraggingAny ? `inset 0 0 0 2px ${colors.accent}` : 'none',
                    }}
                  >
                    {canEdit && (
                      <div draggable onDragStart={(e) => handleDragStart(e, i)} onClick={(e) => e.stopPropagation()} style={{ cursor: 'grab', color: colors.subText, opacity: 0.35, display: 'flex' }}>
                        <GripVertical size={14} />
                      </div>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span style={{ fontWeight: '600', fontSize: '15px', color: colors.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title || 'Untitled'}
                      </span>
                      {item.isBackup && (
                        <span style={{ fontSize: '10px', fontWeight: '600', color: colors.subText, border: `1px dashed ${colors.border}`, borderRadius: '10px', padding: '1px 7px', flexShrink: 0 }}>Standby</span>
                      )}
                    </span>
                    {(multiTimes || [displayTime]).map((t, ci) => (
                      <span key={ci} style={{ fontSize: '12px', color: colors.subText, fontFamily: 'var(--font-mono)', visibility: viewSettings.showTime ? 'visible' : 'hidden' }}>
                        {t === null ? '—' : t}
                      </span>
                    ))}
                    <span style={{ fontSize: '12px', color: colors.subText, visibility: viewSettings.showLength && item.length ? 'visible' : 'hidden' }}>{item.length}</span>
                    <span style={{ fontSize: '10px', fontWeight: '500', color: colors.subText, border: `1px solid ${colors.border}`, borderRadius: '5px', padding: '2px 6px', fontFamily: 'var(--font-mono)', textAlign: 'center', visibility: viewSettings.showKey && item.key ? 'visible' : 'hidden' }}>{item.key || '—'}</span>
                    <span style={{ fontSize: '11px', color: colors.subText, visibility: viewSettings.showBpm && item.bpm ? 'visible' : 'hidden' }}>{item.bpm} bpm</span>
                    <span style={{ visibility: viewSettings.showLeader && item.leaderId ? 'visible' : 'hidden' }}>
                      <span title={leaderName} style={{ width: '18px', height: '18px', borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: 'white', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {leaderName.charAt(0)}
                      </span>
                    </span>
                    <ChevronRight size={13} color={colors.subText} style={{ opacity: 0.4, transform: 'rotate(90deg)' }} />
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragLeave={() => setDropTargetIndex(null)}
                  onDrop={(e) => handleDrop(e, i)}
                  style={{
                    borderTop: i > 0 ? `1px solid ${colors.border}` : 'none',
                    padding: '12px 14px 12px 12px',
                    opacity: draggedItemIndex === i ? 0.4 : 1,
                    boxShadow: dropTargetIndex === i && isDraggingAny ? `inset 0 0 0 2px ${colors.accent}` : 'none',
                    transition: 'box-shadow 0.1s',
                  }}
                >
                  {/* Title first — the subject of the row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {canEdit && (
                      <div draggable onDragStart={(e) => handleDragStart(e, i)} style={{ cursor: 'grab', color: colors.subText, opacity: 0.35, display: 'flex', flexShrink: 0 }}>
                        <GripVertical size={14} />
                      </div>
                    )}
                    <input
                      readOnly={!canEdit}
                      value={item.title || ''}
                      onChange={e => updateItem(i, 'title', e.target.value)}
                      style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', fontWeight: '700', fontSize: '16px', color: colors.heading, outline: 'none', letterSpacing: '-0.3px', boxSizing: 'border-box', pointerEvents: isDraggingAny ? 'none' : 'auto', fontFamily: 'inherit' }}
                    />
                    {item.isBackup && (
                      <span style={{ fontSize: '10px', fontWeight: '600', color: colors.subText, border: `1px dashed ${colors.border}`, borderRadius: '10px', padding: '1px 7px', flexShrink: 0 }}>Standby</span>
                    )}
                    {viewSettings.density !== 'expanded' && (
                      <button onClick={toggleExpand} title="Collapse" style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.subText, opacity: 0.4, padding: '2px', display: 'flex', flexShrink: 0 }}>
                        <ChevronRight size={13} style={{ transform: 'rotate(270deg)' }} />
                      </button>
                    )}
                  </div>

                  {/* Meta line — time • duration • key • bpm • leader • standby • delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', paddingLeft: canEdit ? '22px' : 0 }}>
                    {multiTimes ? (
                      <span style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {multiTimes.map((t, ci) => (
                          <span key={ci} title={serviceTimes[ci]?.name} style={{ fontSize: '12px', color: colors.subText, fontFamily: 'var(--font-mono)' }}>{t === null ? '—' : t}</span>
                        ))}
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: colors.subText, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                        {displayTime}
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: colors.subText, opacity: 0.35 }}>•</span>
                    <input
                      readOnly={!canEdit}
                      value={item.length || ''}
                      onChange={e => updateItem(i, 'length', e.target.value)}
                      placeholder="0m"
                      style={{ background: 'transparent', border: 'none', color: colors.subText, fontSize: '12px', width: '36px', outline: 'none', pointerEvents: isDraggingAny ? 'none' : 'auto', fontFamily: 'inherit' }}
                    />

                    {/* Key badge/select for songs */}
                    {item.type === 'song' && (
                      <select
                        value={item.key || ''}
                        onChange={(e) => updateItem(i, 'key', e.target.value)}
                        disabled={!canEdit}
                        title="Song Key"
                        style={{ fontSize: '10px', fontWeight: '500', background: item.key ? colors.hover : 'transparent', color: colors.subText, border: item.key ? `1px solid ${colors.border}` : `1px dashed ${colors.border}`, padding: '2px 6px', borderRadius: '5px', cursor: canEdit ? 'pointer' : 'default', outline: 'none', appearance: 'none', WebkitAppearance: 'none', fontFamily: 'var(--font-mono)' }}
                      >
                        <option value="">KEY</option>
                        {MUSIC_KEYS.map(k => <option key={k} value={k}>KEY: {k}</option>)}
                      </select>
                    )}

                    {/* BPM */}
                    {item.type === 'song' && (
                      <input readOnly={!canEdit} value={item.bpm || ''} onChange={(e) => updateItem(i, 'bpm', e.target.value)} placeholder="BPM" style={{ background: 'transparent', border: 'none', color: colors.subText, fontSize: '11px', width: '38px', outline: 'none', pointerEvents: isDraggingAny ? 'none' : 'auto', fontFamily: 'inherit' }} />
                    )}

                    {item.type === 'song' && <Music size={13} color={colors.subText} style={{ opacity: 0.4, flexShrink: 0 }} />}

                    {/* Arrangement toggle — songs only */}
                    {item.type === 'song' && (
                      <button
                        onClick={() => setArrangementItemId(arrangementItemId === item.id ? null : item.id)}
                        title="Song arrangement"
                        style={{ background: item.sequence?.length ? colors.hover : 'transparent', border: `1px solid ${colors.border}`, borderRadius: '5px', padding: '2px 6px', fontSize: '10px', color: colors.subText, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}
                      >
                        <LayoutTemplate size={11} />
                        {item.sequence?.length ? `${item.sequence.length} parts` : 'Arrangement'}
                      </button>
                    )}

                    <div style={{ flex: 1 }} />

                    {/* Leader avatar + picker */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setLeaderPickerItemId(leaderPickerItemId === item.id ? null : item.id); }}
                        title={item.leaderId ? teamMembers.find(p => p.id === item.leaderId)?.name || 'Leader' : 'Tag a leader'}
                        style={{
                          width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, cursor: canEdit ? 'pointer' : 'default',
                          background: item.leaderId ? AVATAR_COLORS[i % AVATAR_COLORS.length] : 'transparent',
                          border: item.leaderId ? 'none' : `1px dashed ${colors.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: '700', color: 'white',
                        }}
                      >
                        {item.leaderId ? (teamMembers.find(p => p.id === item.leaderId)?.name || '?').charAt(0) : (canEdit ? <Users size={10} color={colors.subText} /> : null)}
                      </button>
                      {leaderPickerItemId === item.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: 'absolute', right: 0, top: '24px', zIndex: 100, background: colors.popover, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: '160px', maxHeight: '220px', overflowY: 'auto' }}
                        >
                          <button
                            onClick={() => { updateItem(i, 'leaderId', null); setLeaderPickerItemId(null); }}
                            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '6px 8px', fontSize: '12px', color: colors.subText, cursor: 'pointer', borderRadius: '6px', fontFamily: 'inherit' }}
                            onMouseEnter={e => e.currentTarget.style.background = colors.hover}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            No leader tagged
                          </button>
                          {teamMembers.map(p => (
                            <button
                              key={p.id}
                              onClick={() => { updateItem(i, 'leaderId', p.id); setLeaderPickerItemId(null); }}
                              style={{ width: '100%', textAlign: 'left', background: item.leaderId === p.id ? colors.hover : 'none', border: 'none', padding: '6px 8px', fontSize: '12px', color: colors.text, cursor: 'pointer', borderRadius: '6px', fontFamily: 'inherit' }}
                              onMouseEnter={e => e.currentTarget.style.background = colors.hover}
                              onMouseLeave={e => e.currentTarget.style.background = item.leaderId === p.id ? colors.hover : 'transparent'}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Standby toggle */}
                    {canEdit && (
                      <button
                        onClick={() => updateItem(i, 'isBackup', !item.isBackup)}
                        title={item.isBackup ? 'On the plan as standby — click to make it a scheduled item' : 'Mark as standby / contingency (excluded from the total time)'}
                        style={{ fontSize: '10px', fontWeight: '500', background: 'none', border: 'none', color: colors.subText, opacity: item.isBackup ? 0.9 : 0.4, cursor: 'pointer', padding: '2px', fontFamily: 'inherit' }}
                      >
                        {item.isBackup ? 'Standby' : 'Mark standby'}
                      </button>
                    )}

                    {canEdit && (
                      <button onClick={() => handleDeleteItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.subText, opacity: 0.4, padding: '2px', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Arrangement editor — expanded */}
                  {item.type === 'song' && arrangementItemId === item.id && (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '8px', marginLeft: canEdit ? '22px' : 0, padding: '10px', background: colors.hover, borderRadius: '8px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: canEdit ? '8px' : 0 }}>
                        {(item.sequence || []).length === 0 && (
                          <span style={{ fontSize: '12px', color: colors.subText, fontStyle: 'italic' }}>No arrangement yet</span>
                        )}
                        {(item.sequence || []).map((part, si) => (
                          <span key={si} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '500', color: colors.text, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '6px', padding: '3px 4px 3px 8px' }}>
                            {part}
                            {canEdit && (
                              <>
                                <button onClick={() => { const seq = [...item.sequence]; if (si > 0) { [seq[si - 1], seq[si]] = [seq[si], seq[si - 1]]; updateItem(i, 'sequence', seq); } }} disabled={si === 0} style={{ background: 'none', border: 'none', cursor: si === 0 ? 'default' : 'pointer', color: colors.subText, opacity: si === 0 ? 0.25 : 0.6, padding: 0, display: 'flex' }}><ChevronRight size={10} style={{ transform: 'rotate(-90deg)' }} /></button>
                                <button onClick={() => { const seq = [...item.sequence]; if (si < seq.length - 1) { [seq[si + 1], seq[si]] = [seq[si], seq[si + 1]]; updateItem(i, 'sequence', seq); } }} disabled={si === item.sequence.length - 1} style={{ background: 'none', border: 'none', cursor: si === item.sequence.length - 1 ? 'default' : 'pointer', color: colors.subText, opacity: si === item.sequence.length - 1 ? 0.25 : 0.6, padding: 0, display: 'flex' }}><ChevronRight size={10} style={{ transform: 'rotate(90deg)' }} /></button>
                                <button onClick={() => updateItem(i, 'sequence', item.sequence.filter((_, x) => x !== si))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.subText, opacity: 0.6, padding: 0, display: 'flex' }}><X size={10} /></button>
                              </>
                            )}
                          </span>
                        ))}
                      </div>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            value={sequenceDraft}
                            onChange={e => setSequenceDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && sequenceDraft.trim()) {
                                updateItem(i, 'sequence', [...(item.sequence || []), sequenceDraft.trim()]);
                                setSequenceDraft('');
                              }
                            }}
                            list="sequence-presets"
                            placeholder="Add a part (Intro, Verse 1, Chorus...) and press Enter"
                            style={{ flex: 1, background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '6px', padding: '5px 8px', fontSize: '12px', color: colors.text, outline: 'none', fontFamily: 'inherit' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Saved notes — rendered with formatting */}
                  {item.notes && (
                    <div style={{ marginBottom: canEdit ? '4px' : '0' }}>
                      {item.notes.split('\n').map((line, li) => {
                        const match = line.match(/^"(.+)" — (.+) • (.+)$/);
                        if (match) {
                          return (
                            <div key={li} style={{ display: 'flex', gap: '5px', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '3px' }}>
                              <span style={{ fontWeight: '700', fontSize: '13px', color: colors.text }}>"{match[1]}"</span>
                              <span style={{ fontStyle: 'italic', fontSize: '12px', color: colors.subText }}>{match[2]}</span>
                              <span style={{ fontSize: '10px', color: colors.subText, fontWeight: '300', opacity: 0.7 }}>{match[3]}</span>
                            </div>
                          );
                        }
                        // Legacy plain notes
                        return <div key={li} style={{ fontSize: '13px', color: colors.subText, fontStyle: 'italic', marginBottom: '2px' }}>{line}</div>;
                      })}
                    </div>
                  )}

                  {/* Draft input — clears after Enter, appends formatted note */}
                  {canEdit && (
                    <input
                      placeholder={item.notes ? 'Add another note...' : 'Add a note...'}
                      value={noteDrafts[item.id] || ''}
                      onChange={e => setNoteDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          const text = (noteDrafts[item.id] || '').trim();
                          if (!text) return;
                          e.preventDefault();
                          const ts = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                          const formatted = `"${text}" — ${currentUser} • ${ts}`;
                          updateItem(i, 'notes', item.notes ? `${item.notes}\n${formatted}` : formatted);
                          setNoteDrafts(prev => ({ ...prev, [item.id]: '' }));
                        }
                      }}
                      style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', fontSize: '12px', color: colors.subText, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', pointerEvents: isDraggingAny ? 'none' : 'auto', opacity: 0.7 }}
                    />
                  )}
                </div>
              );
            })}
            </div>
            )}
          </div>

          {/* Same-day services */}
          {!isTemplate && sameDayServices.length > 0 && (
            <div style={{ marginTop: '20px', padding: '16px', background: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '10px', color: colors.subText }}>Other services today</div>
              {sameDayServices.map(svc => (
                <div key={svc.id} onClick={() => onServiceClick && onServiceClick(svc.id)} style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginBottom: '6px', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = colors.hover; e.currentTarget.style.borderColor = colors.accent; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = colors.border; }}>
                  <div style={{ fontWeight: '600', marginBottom: '2px', color: colors.text, fontSize: '13px' }}>{svc.name}</div>
                  <div style={{ fontSize: '12px', color: colors.subText }}>{formatTime(svc.start_time)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT AREA: vertical tab strip + conditional panel ── */}
        <div style={{ display: 'flex', flexShrink: 0, borderLeft: `1px solid ${colors.border}` }}>

          {/* Conditional panel */}
          {activeRightPanel && (
            <div className="wop-scroll" style={{ width: isTablet ? '260px' : '300px', overflowY: 'auto', height: '100%', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', background: isDarkMode ? '#000000' : '#ffffff' }}>

              {/* CALENDAR PANEL */}
              {activeRightPanel === 'calendar' && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: colors.subText, marginBottom: '10px' }}>Calendar</div>
                  <CalendarWidget isDarkMode={isDarkMode} onDateSelect={onCreateService} />
                  {!isTemplate && sameDayServices.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: colors.subText, marginBottom: '8px' }}>Other services today</div>
                      {sameDayServices.map(svc => (
                        <div key={svc.id} onClick={() => onServiceClick && onServiceClick(svc.id)} style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginBottom: '6px', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.background = colors.hover; e.currentTarget.style.borderColor = colors.accent; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = colors.border; }}>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: colors.text }}>{svc.name}</div>
                          <div style={{ fontSize: '12px', color: colors.subText }}>{formatTime(svc.start_time)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TEAMS PANEL */}
              {activeRightPanel === 'teams' && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: colors.subText, marginBottom: '10px' }}>Teams</div>
                  {ministries.map(m => {
                    const isExp = expandedMinistries[m.id];
                    const mPos  = positions.filter(p => p.ministry_id === m.id);
                    const conf  = mPos.filter(p => p.status === 'confirmed').length;
                    const need  = mPos.length - conf;
                    return (
                      <div key={m.id} style={{ marginBottom: '10px', border: `1px solid ${colors.border}`, borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: colors.hover, borderRadius: isExp ? '6px 6px 0 0' : '6px' }}>
                          <div onClick={() => setExpandedMinistries({...expandedMinistries, [m.id]: !isExp})} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                            {isExp ? <ChevronDown size={14} color={colors.subText}/> : <ChevronRight size={14} color={colors.subText}/>}
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '13px', color: colors.text }}>{m.name}</div>
                              <div style={{ fontSize: '11px', color: colors.subText, display: 'flex', gap: '8px', marginTop: '2px' }}>
                                <span style={{ color: colors.success }}>✓ {conf}</span>
                                <span style={{ color: colors.danger }}>✗ {need}</span>
                              </div>
                            </div>
                          </div>
                          {!isTemplate && <button onClick={(e) => { e.stopPropagation(); setChatThread(m.name); setShowChat(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.subText, padding: '2px 4px', display: 'flex', opacity: 0.6 }}><MessageSquare size={13}/></button>}
                          {canEdit && <button onClick={(e) => { e.stopPropagation(); startAddRole(m.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.subText }}><Plus size={16}/></button>}
                        </div>
                        {isExp && (
                          <div style={{ padding: '5px' }}>
                            {mPos.length === 0 && <div style={{ fontSize: '12px', color: colors.subText, fontStyle: 'italic', padding: '5px' }}>No positions yet.</div>}
                            {mPos.map(pos => {
                              const assigned = teamMembers.find(t => t.id === pos.member_id);
                              return (
                                <div key={pos.id} onClick={() => openPeoplePicker(pos)} style={{ display: 'flex', alignItems: 'center', padding: '8px 6px', marginBottom: '2px', borderRadius: '4px', background: assigned ? 'transparent' : 'rgba(239,68,68,0.05)', cursor: canEdit ? 'pointer' : 'default', border: `1px solid ${assigned ? 'transparent' : 'rgba(239,68,68,0.2)'}` }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: '600', color: colors.text }}>{pos.role_name}</div>
                                    <div style={{ fontSize: '12px', color: assigned ? colors.text : colors.danger, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      {assigned ? <><div style={{ width: '16px', height: '16px', background: colors.accent, borderRadius: '50%', fontSize: '9px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{assigned.name.charAt(0)}</div>{assigned.name}</> : 'Needed'}
                                    </div>
                                  </div>
                                  {canEdit && <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(pos.id); }} style={{ color: colors.subText, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}><X size={14}/></button>}
                                </div>
                              );
                            })}
                            {canEdit && activeMinistryId === m.id && (
                              <div style={{ padding: '5px', display: 'flex', gap: '5px' }}>
                                <input autoFocus placeholder="Role Name..." value={newRoleName} onChange={e => setNewRoleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNewRole()} style={{ width: '100%', fontSize: '12px', padding: '6px', borderRadius: '4px', border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text }} />
                                <button onClick={saveNewRole} style={{ background: colors.accent, color: 'white', border: 'none', borderRadius: '4px', padding: '0 8px', cursor: 'pointer' }}><CheckCircle size={14}/></button>
                                <button onClick={() => setActiveMinistryId(null)} style={{ background: 'transparent', color: colors.subText, border: 'none', cursor: 'pointer' }}><X size={14}/></button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SONGS PANEL */}
              {activeRightPanel === 'songs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: colors.subText }}>Songs</div>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} color={colors.subText} style={{ position: 'absolute', left: '10px', top: '9px' }}/>
                    <input placeholder="Search songs..." value={songSearch} onChange={e => setSongSearch(e.target.value)} style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, boxSizing: 'border-box', fontSize: '13px' }} />
                  </div>
                  {/* Playlists */}
                  <div>
                    <div onClick={() => setExpandedSections({...expandedSections, playlists: !expandedSections.playlists})} style={{ padding: '8px 10px', background: colors.hover, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '6px', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LayoutTemplate size={14} color={colors.subText}/><span style={{ fontSize: '13px', fontWeight: '500', color: colors.subText }}>Playlists</span></div>
                      {expandedSections.playlists ? <ChevronDown size={13} color={colors.subText}/> : <ChevronRight size={13} color={colors.subText}/>}
                    </div>
                    {expandedSections.playlists && (
                      <div style={{ paddingLeft: '4px' }}>
                        <div onClick={() => setCurrentPlaylist(null)} style={{ padding: '7px 10px', borderRadius: '6px', cursor: 'pointer', background: !currentPlaylist ? colors.accent : 'transparent', color: !currentPlaylist ? 'white' : colors.text, marginBottom: '3px', fontSize: '13px' }}>All Songs</div>
                        {playlists.map(pl => (
                          <div key={pl.id} onClick={() => setCurrentPlaylist(pl)} style={{ padding: '7px 10px', borderRadius: '6px', cursor: 'pointer', background: currentPlaylist?.id === pl.id ? colors.accent : 'transparent', color: currentPlaylist?.id === pl.id ? 'white' : colors.text, marginBottom: '3px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{pl.name}</span><span style={{ fontSize: '11px', opacity: 0.7 }}>({pl.songs.length})</span>
                          </div>
                        ))}
                        {canEdit && <button onClick={() => { const name = prompt('Playlist name:'); if (name) setPlaylists([...playlists, { id: Date.now(), name, songs: [] }]); }} style={{ marginTop: '6px', padding: '6px 12px', background: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: '6px', color: colors.accent, fontSize: '12px', cursor: 'pointer', width: '100%' }}>+ New Playlist</button>}
                      </div>
                    )}
                  </div>
                  {/* All Songs list */}
                  <div className="wop-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredSongs.length === 0
                      ? <div style={{ padding: '20px', textAlign: 'center', color: colors.subText, fontSize: '13px' }}>No songs found</div>
                      : filteredSongs.map(song => (
                          <div key={song.id} draggable={canEdit} onDragStart={(e) => handleNewDragStart(e, 'song', song)} onClick={() => handleAddItemClick('song', song)} style={{ padding: '8px 10px', borderRadius: '6px', cursor: canEdit ? 'grab' : 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', background: colors.hover }}>
                            <div style={{ fontSize: '13px', color: colors.text, fontWeight: '500' }}>{song.title}</div>
                            {canEdit && <Plus size={14} color={colors.accent}/>}
                          </div>
                        ))
                    }
                  </div>
                </div>
              )}

              {/* TIMES PANEL */}
              {activeRightPanel === 'times' && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: colors.subText, marginBottom: '10px' }}>Run order</div>
                  <div style={{ fontSize: '12px', color: colors.subText, marginBottom: '14px' }}>
                    {serviceData?.date && new Date(serviceData.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    {serviceData?.start_time && <span style={{ marginLeft: '8px', color: colors.accent, fontWeight: '600' }}>{formatTime(serviceData.start_time)}</span>}
                  </div>
                  {items.map((item, i) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: colors.hover, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: colors.subText, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: item.type === 'header' ? colors.accent : colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title || item.type}</div>
                        {item.type === 'song' && item.key && <div style={{ fontSize: '11px', color: colors.subText }}>Key: {item.key}</div>}
                      </div>
                      {item.type !== 'header' && item.duration && <div style={{ fontSize: '11px', color: colors.subText, flexShrink: 0 }}>{item.duration}m</div>}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Vertical tab strip */}
          <div style={{ width: '38px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '8px', borderLeft: activeRightPanel ? `1px solid ${colors.border}` : 'none' }}>
            {[
              { key: 'calendar', icon: Calendar, label: 'Calendar' },
              { key: 'teams',    icon: Users,    label: 'Teams' },
              { key: 'songs',    icon: Music,    label: 'Songs' },
              { key: 'times',    icon: Clock,    label: 'Times' },
            ].map(({ key, icon: Icon, label }) => {
              const isActive = activeRightPanel === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveRightPanel(v => v === key ? null : key)}
                  title={label}
                  style={{
                    background: isActive ? (isDarkMode ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.1)') : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? `2px solid ${colors.accent}` : '2px solid transparent',
                    cursor: 'pointer',
                    color: isActive ? colors.accent : colors.subText,
                    width: '38px',
                    minHeight: '76px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    padding: '0',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ transform: 'rotate(-90deg)', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                    <Icon size={11} />
                    <span style={{ fontSize: '10px', fontWeight: '500' }}>{label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>

    {/* ── PEOPLE PICKER MODAL ── */}
    {sidebarView === 'picker' && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: colors.bg, borderRadius: '12px', width: '360px', maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${colors.border}` }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={() => setSidebarView('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text }}><ArrowLeft size={18}/></button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: colors.subText, fontWeight: '500' }}>Assigning to</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: colors.heading }}>{assigningRole?.role_name}</div>
            </div>
            <button onClick={() => setSidebarView('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.subText }}><X size={18}/></button>
          </div>
          <div style={{ padding: '12px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <Search size={14} color={colors.subText} style={{ position: 'absolute', left: '10px', top: '9px' }}/>
              <input placeholder="Search people..." value={peopleSearch} autoFocus onChange={e => setPeopleSearch(e.target.value)} style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, boxSizing: 'border-box', fontSize: '13px' }} />
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => setFilterBySkill(!filterBySkill)} style={{ flex: 1, padding: '6px', borderRadius: '4px', border: `1px solid ${filterBySkill ? colors.accent : colors.border}`, background: filterBySkill ? colors.hover : 'transparent', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: filterBySkill ? colors.accent : colors.subText, cursor: 'pointer' }}>
                <Filter size={12}/> Match Role
              </button>
              <button onClick={() => assignPerson(null)} style={{ padding: '6px 10px', borderRadius: '4px', border: `1px solid ${colors.danger}`, background: 'transparent', color: colors.danger, fontSize: '11px', cursor: 'pointer' }}>Clear</button>
            </div>
          </div>
          <div className="wop-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px' }}>
            {filteredPeople.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: colors.subText, fontSize: '13px' }}>
                No matches found.<br/><span style={{ fontSize: '11px', opacity: 0.7 }}>(Try turning off "Match Role")</span>
              </div>
            )}
            {filteredPeople.map(person => (
              <div key={person.id} onClick={() => assignPerson(person.id)} style={{ padding: '10px', borderRadius: '6px', cursor: 'pointer', background: colors.inputBg, display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${colors.border}` }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: colors.accent, color: 'white', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{person.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: colors.text }}>{person.name}</div>
                  {person.skills && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                      {person.skills.map(s => <span key={s} style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: colors.hover, color: colors.subText }}>{s}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ── ADD / EDIT TIME MODAL ── */}
    {showTimeModal && timeDraft && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setShowTimeModal(false); setTimeDraft(null); }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: colors.bg, borderRadius: '12px', width: '360px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${colors.border}` }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: colors.heading }}>{editingTimeId ? 'Edit time' : 'Add time'}</div>
            <button onClick={() => { setShowTimeModal(false); setTimeDraft(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.subText }}><X size={18}/></button>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Type tabs */}
            <div style={{ display: 'flex', gap: '4px', background: colors.hover, borderRadius: '8px', padding: '3px' }}>
              {['service', 'rehearsal', 'other'].map(type => (
                <button
                  key={type}
                  onClick={() => setTimeDraft(d => ({ ...d, type }))}
                  style={{ flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', background: timeDraft.type === type ? colors.bg : 'transparent', color: timeDraft.type === type ? colors.heading : colors.subText, boxShadow: timeDraft.type === type ? '0 1px 3px rgba(0,0,0,0.15)' : 'none' }}
                >
                  {TIME_TYPE_LABEL[type]}
                </button>
              ))}
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: colors.subText, display: 'block', marginBottom: '5px' }}>Name</label>
              <input
                value={timeDraft.name}
                onChange={e => setTimeDraft(d => ({ ...d, name: e.target.value }))}
                placeholder={timeDraft.type === 'service' ? 'e.g. 11:00am Contemporary' : timeDraft.type === 'rehearsal' ? 'e.g. MidWeek Rehearsal' : 'e.g. Pre-service huddle'}
                style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: colors.subText, display: 'block', marginBottom: '5px' }}>Start</label>
                <input
                  type="time"
                  value={timeDraft.startTime}
                  onChange={e => setTimeDraft(d => ({ ...d, startTime: e.target.value }))}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: colors.subText, display: 'block', marginBottom: '5px' }}>End</label>
                <input
                  type="time"
                  value={timeDraft.endTime}
                  onChange={e => setTimeDraft(d => ({ ...d, endTime: e.target.value }))}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: colors.subText, display: 'block', marginBottom: '5px' }}>Date</label>
              <input
                type="date"
                value={timeDraft.date}
                onChange={e => setTimeDraft(d => ({ ...d, date: e.target.value }))}
                style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            {timeDraft.type === 'service' && (
              <div style={{ fontSize: '11px', color: colors.subText, lineHeight: '1.5', padding: '8px 10px', background: colors.hover, borderRadius: '8px' }}>
                With 2+ Service times, the run sheet below shows a separate cascading time column for each — the same items, offset to each service's own start.
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '4px' }}>
              {editingTimeId ? (
                <button onClick={() => { deleteTime(editingTimeId); setShowTimeModal(false); setTimeDraft(null); }} style={{ padding: '9px 16px', borderRadius: '8px', border: `1px solid ${colors.danger}`, background: 'transparent', color: colors.danger, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
              ) : <span />}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setShowTimeModal(false); setTimeDraft(null); }} style={{ padding: '9px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={saveTimeDraft} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Chat Panel */}
    <ChatPanel
      isOpen={showChat}
      onClose={() => { setShowChat(false); setChatThread('global'); }}
      service={serviceData}
      orgId={orgId}
      session={session}
      userRole={userRole}
      isDarkMode={isDarkMode}
      initialThread={chatThread}
      colors={{ bg: isDarkMode ? '#111111' : '#ffffff', card: isDarkMode ? '#111111' : '#ffffff', text: isDarkMode ? '#a1a1aa' : '#52525b', heading: isDarkMode ? '#ededed' : '#09090b', border: isDarkMode ? '#27272a' : '#e4e4e7', primary: '#0070F3', accent: '#10B981', danger: '#EF4444' }}
    />
    </>
  );
}

const CalendarIcon = ({ date }) => {
  if (!date) return null;
  const [y, m, d] = date.split('T')[0].split('-');
  const local = new Date(y, m - 1, d);
  return <span>{local.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>;
};
