import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  GripVertical, Plus, Trash2, X, Save, Music,
  ChevronDown, ChevronRight, CheckCircle,
  Users, Monitor, LayoutTemplate, Calendar, Search,
  Loader2, Video, FileText, ArrowLeft, Filter,
  MessageSquare
} from 'lucide-react';
import EditableTitle from './EditableTitle';
import CalendarWidget from './CalendarWidget';
import ChatPanel from './ChatPanel';

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

// Preset section-header colors — lighter for dark mode, darker for light mode
// Indices match for auto-invert when switching modes
const DARK_MODE_COLORS  = ['#f87171','#fb923c','#fbbf24','#4ade80','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6','#e2e8f0'];
const LIGHT_MODE_COLORS = ['#b91c1c','#c2410c','#b45309','#15803d','#047857','#0e7490','#1d4ed8','#7c3aed','#be185d','#1e293b'];

export default function ScheduleTable({
  serviceData, isTemplate, availableSongs = [], teamMembers = [],
  onBack, onSave, isDarkMode, orgId, onCreateService,
  userRole, session, onServiceClick,
}) {
  const canEdit = userRole === 'admin' || userRole === 'editor';

  // ── State ────────────────────────────────────────────────────────────────────
  const [items,            setItems]            = useState([]);
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

  // Close color popover when clicking outside
  useEffect(() => {
    if (!colorPopoverItemId) return;
    const close = () => setColorPopoverItemId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [colorPopoverItemId]);

  // ── Auto-save (debounced 1.5 s after last change) ────────────────────────────
  useEffect(() => {
    if (!userHasEdited.current || !canEdit || !onSave) return;
    setSaveStatus('pending');
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave(planDate, items);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [items]);

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
    try { await onSave(planDate, items); setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 2000); }
    catch { setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 3000); }
  };

  // ── Items ─────────────────────────────────────────────────────────────────────
  const createItem = (type, song = null) => ({
    id: Date.now() + Math.random().toString(36).slice(2, 11),
    type,
    title: song ? song.title : (type === 'header' ? 'New Section' : 'New Item'),
    length: 0, bpm: song?.bpm || '', key: song?.key || '', notes: '', color: null,
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

  const startTimes = (() => {
    const base = serviceData?.start_time || '09:00:00';
    let t = new Date(`2000-01-01T${base}`);
    return items.map(item => {
      const s = t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      t.setSeconds(t.getSeconds() + parseLengthToSeconds(item.length));
      return s;
    });
  })();

  const totalMinutes = Math.round(
    items.filter(it => it.type !== 'header').reduce((a, it) => a + parseLengthToSeconds(it.length), 0) / 60
  );
  const isToday = planDate === new Date().toISOString().split('T')[0];

  // Section color each item inherits from nearest preceding header
  const sectionColors = items.map((_, i) => {
    for (let j = i - 1; j >= 0; j--) {
      if (items[j].type === 'header') return items[j].color || colors.accent;
    }
    return colors.accent;
  });

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: colors.text, userSelect: isDraggingAny ? 'none' : 'auto' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
        <button onClick={onBack} style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: colors.text, fontSize: '13px' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => alert('Stage Mode')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Monitor size={15} /> Stage
          </button>
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
      <div style={{ display: 'flex', gap: '28px', flex: 1, overflow: 'hidden' }}>

        {/* LEFT: PLAN EDITOR — scrollable column */}
        <div className="wop-scroll" style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>

          {/* ── STICKY: service header + stats — freeze at top on scroll ── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: colors.bg, paddingBottom: '16px', marginBottom: '8px' }}>

            {/* SERVICE HEADER */}
            <div style={{ marginBottom: '18px', paddingTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {canEdit
                    ? <EditableTitle initialTitle={planName} onSave={setPlanName} isDarkMode={isDarkMode} />
                    : <div style={{ fontSize: '26px', fontWeight: '900', color: colors.heading, letterSpacing: '-0.5px' }}>{planName}</div>
                  }
                  <div style={{ fontSize: '13px', color: colors.subText, marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarIcon date={planDate} />
                    {!isTemplate && serviceData?.start_time && (
                      <><span style={{ opacity: 0.35 }}>•</span><span>{formatTime(serviceData.start_time)} Service</span></>
                    )}
                  </div>
                </div>
                {isToday && !isTemplate && (
                  <span style={{ background: '#10b981', color: 'white', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', letterSpacing: '1.5px', flexShrink: 0, marginTop: '4px' }}>LIVE</span>
                )}
                {isTemplate && (
                  <span style={{ background: colors.accent, color: 'white', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', letterSpacing: '1px', flexShrink: 0, marginTop: '4px' }}>TEMPLATE</span>
                )}
              </div>
            </div>

            {/* STATS ROW */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, background: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, padding: '14px 18px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: colors.subText, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Total Time</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: colors.heading, letterSpacing: '-0.5px' }}>
                  {totalMinutes > 0 ? `${totalMinutes} Min` : '—'}
                </div>
              </div>
              {!isTemplate && (
                <div style={{ flex: 1, background: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}`, padding: '14px 18px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: colors.subText, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Team Status</div>

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
            <span style={{ fontSize: '12px', fontWeight: '800', color: colors.subText, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Service Plan
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
          </div>

          {/* ITEMS LIST */}
          <div
            style={{ paddingRight: '2px', paddingBottom: '32px' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, items.length)}
          >
            {items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.subText, fontSize: '14px' }}>
                <Plus size={32} color={colors.border} style={{ margin: '0 auto 12px', display: 'block' }} />
                No items yet — click <strong>+ Add Item</strong> to begin
              </div>
            )}

            {items.map((item, i) => {
              const sectionColor = sectionColors[i];

              // ── SECTION HEADER (divider) ──────────────────────────────────
              if (item.type === 'header') {
                return (
                  <div
                    key={item.id}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragLeave={() => setDropTargetIndex(null)}
                    onDrop={(e) => handleDrop(e, i)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: `${i > 0 ? '20px' : '0'} 0 12px`, opacity: draggedItemIndex === i ? 0.3 : 1 }}
                  >
                    {/* Left rule — grows to fill space */}
                    <div style={{ flex: 1, height: '1px', background: item.color || colors.border }} />

                    {/* Drag handle */}
                    {canEdit && (
                      <div draggable onDragStart={(e) => handleDragStart(e, i)} style={{ cursor: 'grab', color: item.color || colors.subText, opacity: 0.5, display: 'flex', flexShrink: 0 }}>
                        <GripVertical size={12} />
                      </div>
                    )}

                    {/* Self-sizing title — width matches content so rules adjust naturally */}
                    <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                      <span style={{ visibility: 'hidden', whiteSpace: 'pre', fontSize: '15px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', display: 'inline-block', minWidth: '60px', padding: '0 4px' }}>
                        {item.title || 'New Section'}
                      </span>
                      <input
                        readOnly={!canEdit}
                        value={item.title || ''}
                        onChange={e => updateItem(i, 'title', e.target.value)}
                        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '15px', fontWeight: '800', color: item.color || colors.subText, textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', pointerEvents: isDraggingAny ? 'none' : 'auto', fontFamily: 'inherit', boxSizing: 'border-box', padding: '0 4px' }}
                      />
                    </div>

                    {/* Right rule — grows to fill space */}
                    <div style={{ flex: 1, height: '1px', background: item.color || colors.border }} />

                    {/* Controls: color popover + delete — outside the rules */}
                    {canEdit && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                        {/* Color swatch + popover */}
                        <div style={{ position: 'relative' }}>
                          <div
                            onClick={(e) => { e.stopPropagation(); setColorPopoverItemId(colorPopoverItemId === item.id ? null : item.id); }}
                            title="Section color"
                            style={{ width: '14px', height: '14px', borderRadius: '50%', background: item.color || '#3b82f6', border: `2px solid ${colors.border}`, cursor: 'pointer', flexShrink: 0 }}
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
                        <button onClick={() => handleDeleteItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.subText, opacity: 0.45, padding: 0, display: 'flex' }}>
                          <X size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              // ── ITEM CARD ─────────────────────────────────────────────────
              return (
                <div
                  key={item.id}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragLeave={() => setDropTargetIndex(null)}
                  onDrop={(e) => handleDrop(e, i)}
                  style={{
                    background: colors.card,
                    borderRadius: '12px',
                    border: `1px solid ${sectionColor}28`,
                    borderLeft: `4px solid ${sectionColor}`,
                    marginBottom: '8px',
                    padding: '12px 14px 12px 12px',
                    opacity: draggedItemIndex === i ? 0.4 : 1,
                    boxShadow: dropTargetIndex === i && isDraggingAny ? `0 0 0 2px ${colors.accent}` : 'none',
                    transition: 'box-shadow 0.1s',
                  }}
                >
                  {/* Meta row: drag | time • duration | key badge | spacer | bpm | icon | delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    {canEdit && (
                      <div draggable onDragStart={(e) => handleDragStart(e, i)} style={{ cursor: 'grab', color: colors.subText, opacity: 0.35, display: 'flex', flexShrink: 0 }}>
                        <GripVertical size={14} />
                      </div>
                    )}
                    <span style={{ fontSize: '12px', color: colors.subText, flexShrink: 0 }}>{startTimes[i]}</span>
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
                        style={{ fontSize: '10px', fontWeight: '700', background: item.key ? `${sectionColor}20` : 'transparent', color: item.key ? sectionColor : colors.subText, border: item.key ? `1px solid ${sectionColor}55` : `1px dashed ${colors.border}`, padding: '2px 6px', borderRadius: '5px', cursor: canEdit ? 'pointer' : 'default', outline: 'none', appearance: 'none', WebkitAppearance: 'none', fontFamily: 'inherit', letterSpacing: '0.3px' }}
                      >
                        <option value="">KEY</option>
                        {MUSIC_KEYS.map(k => <option key={k} value={k}>KEY: {k}</option>)}
                      </select>
                    )}

                    <div style={{ flex: 1 }} />

                    {/* BPM */}
                    {item.type === 'song' && (
                      <input readOnly={!canEdit} value={item.bpm || ''} onChange={(e) => updateItem(i, 'bpm', e.target.value)} placeholder="BPM" style={{ background: 'transparent', border: 'none', color: colors.subText, fontSize: '11px', width: '38px', outline: 'none', textAlign: 'right', pointerEvents: isDraggingAny ? 'none' : 'auto', fontFamily: 'inherit' }} />
                    )}

                    {item.type === 'song' && <Music size={13} color={colors.subText} style={{ opacity: 0.4, flexShrink: 0 }} />}

                    {canEdit && (
                      <button onClick={() => handleDeleteItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.subText, opacity: 0.4, padding: '2px', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <input
                    readOnly={!canEdit}
                    value={item.title || ''}
                    onChange={e => updateItem(i, 'title', e.target.value)}
                    style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', fontWeight: '700', fontSize: '16px', color: colors.heading, outline: 'none', letterSpacing: '-0.3px', boxSizing: 'border-box', paddingBottom: '4px', pointerEvents: isDraggingAny ? 'none' : 'auto', fontFamily: 'inherit' }}
                  />

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

          {/* Same-day services */}
          {!isTemplate && sameDayServices.length > 0 && (
            <div style={{ marginTop: '20px', padding: '16px', background: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '10px', color: colors.subText, textTransform: 'uppercase', letterSpacing: '1px' }}>Other Services Today</div>
              {sameDayServices.map(svc => (
                <div key={svc.id} onClick={() => onServiceClick && onServiceClick(svc.id)} style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`, marginBottom: '6px', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = colors.hover; e.currentTarget.style.borderColor = colors.accent; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = colors.border; }}>
                  <div style={{ fontWeight: '600', marginBottom: '2px', color: colors.text, fontSize: '13px' }}>{svc.name}</div>
                  <div style={{ fontSize: '12px', color: colors.subText }}>{formatTime(svc.start_time)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="wop-scroll" style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>

          {/* People Picker */}
          {sidebarView === 'picker' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: colors.bg, borderLeft: `1px solid ${colors.border}` }}>
              <div style={{ padding: '15px', borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: '10px', alignItems: 'center', background: colors.hover }}>
                <button onClick={() => setSidebarView('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text }}><ArrowLeft size={18}/></button>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: colors.subText, fontWeight: 'bold' }}>Assigning To</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: colors.accent }}>{assigningRole?.role_name}</div>
                </div>
              </div>
              <div style={{ padding: '10px', borderBottom: `1px solid ${colors.border}` }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px' }}>
                {filteredPeople.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: colors.subText, fontSize: '13px' }}>
                    No matches found.<br/><span style={{ fontSize: '11px', opacity: 0.7 }}>(Try turning off "Match Role")</span>
                  </div>
                )}
                {filteredPeople.map(person => (
                  <div key={person.id} onClick={() => assignPerson(person.id)} style={{ padding: '10px', borderRadius: '6px', cursor: 'pointer', background: colors.inputBg, display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${colors.border}` }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.accent, color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{person.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>{person.name}</div>
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
          )}

          {sidebarView === 'main' && (
            <>
              {/* Calendar */}
              <div style={{ background: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                <div onClick={() => setExpandedSections({...expandedSections, calendar: !expandedSections.calendar})} style={{ padding: '15px', borderBottom: expandedSections.calendar ? `1px solid ${colors.border}` : 'none', background: colors.hover, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Calendar size={16} color={colors.subText}/><h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: colors.subText }}>Calendar</h3></div>
                  {expandedSections.calendar ? <ChevronDown size={16} color={colors.subText}/> : <ChevronRight size={16} color={colors.subText}/>}
                </div>
                {expandedSections.calendar && <CalendarWidget isDarkMode={isDarkMode} onDateSelect={onCreateService} />}
              </div>

              {/* Library */}
              <div style={{ background: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px', borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} color={colors.subText} style={{ position: 'absolute', left: '10px', top: '9px' }}/>
                    <input placeholder="Search songs..." value={songSearch} onChange={e => setSongSearch(e.target.value)} style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, boxSizing: 'border-box', fontSize: '13px' }} />
                  </div>
                </div>
                <div style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <div onClick={() => setExpandedSections({...expandedSections, playlists: !expandedSections.playlists})} style={{ padding: '10px 15px', background: colors.hover, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><LayoutTemplate size={16} color={colors.subText}/><h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: colors.subText }}>Playlists</h3></div>
                    {expandedSections.playlists ? <ChevronDown size={14} color={colors.subText}/> : <ChevronRight size={14} color={colors.subText}/>}
                  </div>
                  {expandedSections.playlists && (
                    <div style={{ padding: '10px' }}>
                      <div onClick={() => setCurrentPlaylist(null)} style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer', background: !currentPlaylist ? colors.accent : 'transparent', color: !currentPlaylist ? 'white' : colors.text, marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>All Songs</div>
                      {playlists.map(pl => (
                        <div key={pl.id} onClick={() => setCurrentPlaylist(pl)} style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer', background: currentPlaylist?.id === pl.id ? colors.accent : 'transparent', color: currentPlaylist?.id === pl.id ? 'white' : colors.text, marginBottom: '4px', fontSize: '13px', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{pl.name}</span><span style={{ fontSize: '11px', opacity: 0.7 }}>({pl.songs.length})</span>
                        </div>
                      ))}
                      {canEdit && (
                        <button onClick={() => { const name = prompt('Playlist name:'); if (name) setPlaylists([...playlists, { id: Date.now(), name, songs: [] }]); }} style={{ marginTop: '8px', padding: '6px 12px', background: 'transparent', border: `1px dashed ${colors.border}`, borderRadius: '6px', color: colors.accent, fontSize: '12px', cursor: 'pointer', width: '100%', fontWeight: '600' }}>
                          + New Playlist
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div onClick={() => setExpandedSections({...expandedSections, library: !expandedSections.library})} style={{ padding: '10px 15px', background: colors.hover, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Music size={16} color={colors.subText}/><h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: colors.subText }}>All Songs</h3></div>
                  {expandedSections.library ? <ChevronDown size={14} color={colors.subText}/> : <ChevronRight size={14} color={colors.subText}/>}
                </div>
                {expandedSections.library && (
                  <div className="wop-scroll" style={{ maxHeight: '250px', overflowY: 'auto', padding: '5px' }}>
                    {filteredSongs.length === 0
                      ? <div style={{ padding: '20px', textAlign: 'center', color: colors.subText, fontSize: '13px' }}>No songs found</div>
                      : filteredSongs.map(song => (
                          <div key={song.id} draggable={canEdit} onDragStart={(e) => handleNewDragStart(e, 'song', song)} onClick={() => handleAddItemClick('song', song)} style={{ padding: '8px', borderRadius: '6px', cursor: canEdit ? 'grab' : 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', background: colors.hover }}>
                            <div style={{ fontSize: '13px', color: colors.text, fontWeight: '500' }}>{song.title}</div>
                            {canEdit && <Plus size={14} color={colors.accent}/>}
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>

              {/* Teams */}
              <div style={{ background: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}`, overflow: 'visible' }}>
                <div onClick={() => setExpandedSections({...expandedSections, teams: !expandedSections.teams})} style={{ padding: '15px', borderBottom: expandedSections.teams ? `1px solid ${colors.border}` : 'none', background: colors.hover, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={16} color={colors.accent}/><h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: colors.subText }}>Teams</h3></div>
                  {expandedSections.teams ? <ChevronDown size={16} color={colors.subText}/> : <ChevronRight size={16} color={colors.subText}/>}
                </div>
                {expandedSections.teams && (
                  <div style={{ padding: '10px' }}>
                    {ministries.map(m => {
                      const isExp = expandedMinistries[m.id];
                      const mPos  = positions.filter(p => p.ministry_id === m.id);
                      const conf  = mPos.filter(p => p.status === 'confirmed').length;
                      const need  = mPos.length - conf;
                      return (
                        <div key={m.id} style={{ marginBottom: '10px', border: `1px solid ${colors.border}`, borderRadius: '6px', background: colors.card }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: colors.hover, borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
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
                            {!isTemplate && (
                            <button onClick={(e) => { e.stopPropagation(); setChatThread(m.name); setShowChat(true); }} title={`${m.name} chat`} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.subText, padding: '2px 4px', display: 'flex', opacity: 0.6, flexShrink: 0 }}><MessageSquare size={13}/></button>
                          )}
                          {canEdit && <button onClick={(e) => { e.stopPropagation(); startAddRole(m.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.subText }} title="Add Role"><Plus size={16}/></button>}
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>

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
