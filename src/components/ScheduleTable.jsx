import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  GripVertical, Plus, Trash2, X, Save, Music,
  ChevronDown, ChevronRight, CheckCircle,
  Users, Monitor, LayoutTemplate, Calendar, Search,
  Palette, Loader2, Eye, Video, FileText, ArrowLeft, Filter,
  MessageSquare
} from 'lucide-react';
import EditableTitle from './EditableTitle';
import CalendarWidget from './CalendarWidget';
import ChatPanel from './ChatPanel';

// Music Keys & Chords for Key Dropdown
const MUSIC_KEYS = [
  // Major keys
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  // Minor keys
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
  // 7th chords
  'C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7',
  'Cmaj7', 'Dmaj7', 'Emaj7', 'Fmaj7', 'Gmaj7', 'Amaj7', 'Bmaj7',
  'Cm7', 'Dm7', 'Em7', 'Fm7', 'Gm7', 'Am7', 'Bm7',
  // Suspended
  'Csus2', 'Csus4', 'Dsus2', 'Dsus4', 'Esus4', 'Fsus2', 'Fsus4', 'Gsus2', 'Gsus4', 'Asus2', 'Asus4', 'Bsus4',
  // Diminished & Augmented
  'Cdim', 'Ddim', 'Edim', 'Fdim', 'Gdim', 'Adim', 'Bdim',
  'Caug', 'Daug', 'Eaug', 'Faug', 'Gaug', 'Aaug', 'Baug',
  // Add9, Add11
  'Cadd9', 'Dadd9', 'Eadd9', 'Fadd9', 'Gadd9', 'Aadd9',
  // 9th, 11th, 13th
  'C9', 'D9', 'E9', 'F9', 'G9', 'A9', 'B9',
  'C11', 'D11', 'E11', 'F11', 'G11', 'A11', 'B11',
  'C13', 'D13', 'E13', 'F13', 'G13', 'A13', 'B13'
];

export default function ScheduleTable({
    serviceData, isTemplate, availableSongs = [], teamMembers = [],
    onBack, onSave, isDarkMode, orgId, onCreateService,
    userRole, session,
    onServiceClick
}) {
  // --- PERMISSIONS CHECK ---
  const canEdit = userRole === 'admin' || userRole === 'editor';

  // --- STATE ---
  const [items, setItems] = useState([]);
  const [planName, setPlanName] = useState(serviceData?.name || 'Untitled Service');
  const [planDate, setPlanDate] = useState(
      typeof serviceData?.date === 'string' ? serviceData.date.split('T')[0] : new Date().toISOString().split('T')[0]
  );

  // UI States
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState('');

  // Layout State (Persistent)
  const [colWidths, setColWidths] = useState(() => {
      const saved = localStorage.getItem('worship_ops_col_widths');
      return saved ? JSON.parse(saved) : { time: 60, len: 60, detail: 100, notes: 150 };
  });
  const [visibleCols, setVisibleCols] = useState(() => {
      const saved = localStorage.getItem('worship_ops_visible_cols');
      return saved ? JSON.parse(saved) : { detail: true, notes: true };
  });
  const [isResizing, setIsResizing] = useState(null); 

  useEffect(() => { localStorage.setItem('worship_ops_col_widths', JSON.stringify(colWidths)); }, [colWidths]);
  useEffect(() => { localStorage.setItem('worship_ops_visible_cols', JSON.stringify(visibleCols)); }, [visibleCols]);

  // Sidebar Data State
  const [ministries, setMinistries] = useState([]);
  const [positions, setPositions] = useState([]);
  
  // Sidebar View State
  const [sidebarView, setSidebarView] = useState('main');
  const [activeMinistryId, setActiveMinistryId] = useState(null);
  const [assigningRole, setAssigningRole] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ library: true, teams: true, calendar: true, playlists: false });
  const [expandedMinistries, setExpandedMinistries] = useState({});
  const [songSearch, setSongSearch] = useState('');

  // Playlists State
  const [playlists, setPlaylists] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);

  // Same Day Services State
  const [sameDayServices, setSameDayServices] = useState([]);
  
  // People Picker State
  const [peopleSearch, setPeopleSearch] = useState('');
  const [filterBySkill, setFilterBySkill] = useState(true);
  const [newRoleName, setNewRoleName] = useState('');

  // Chat State
  const [showChat,   setShowChat]   = useState(false);
  const [chatThread, setChatThread] = useState('global');

  // Drag State
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [draggedNewItem, setDraggedNewItem] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);   

  // --- COLORS - SOLID BACKGROUNDS FOR READABILITY ---
  const colors = {
    bg: isDarkMode ? '#111111' : '#ffffff',
    bgSolid: isDarkMode ? '#111111' : '#ffffff',
    text: isDarkMode ? '#e5e7eb' : '#27272a',
    subText: isDarkMode ? '#9ca3af' : '#6b7280',
    border: isDarkMode ? '#27272a' : '#e5e7eb',
    hover: isDarkMode ? '#1f1f22' : '#f9fafb',
    inputBg: isDarkMode ? '#1f1f22' : '#ffffff',
    accent: '#3b82f6',
    danger: '#ef4444',
    success: '#10b981',
    dragBg: isDarkMode ? '#27272a' : '#e5e7eb',
    popover: isDarkMode ? '#1f1f22' : '#ffffff',
    dropHighlight: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    card: isDarkMode ? '#111111' : '#ffffff',
    heading: isDarkMode ? '#f9fafb' : '#111111'
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

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (serviceData) {
      setItems(serviceData.items || []);
      setPlanName(serviceData.name);
      if (serviceData.date) setPlanDate(serviceData.date.split('T')[0]);
      if (!isTemplate && serviceData.id) fetchSidebarData();
    }
  }, [serviceData, isTemplate]);

  // --- GET CURRENT USER FOR AUTO-SIGNATURE ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        const name = session.user.email.split('@')[0];
        setCurrentUser(name.charAt(0).toUpperCase() + name.slice(1));
      }
    });
  }, []);

  // --- FETCH OTHER SERVICES ON SAME DAY ---
  useEffect(() => {
    if (!isTemplate && serviceData?.date && serviceData?.id && orgId) {
      const dateOnly = serviceData.date.split('T')[0];
      supabase
        .from('services')
        .select('*')
        .eq('organization_id', orgId)
        .like('date', `${dateOnly}%`)
        .neq('id', serviceData.id)
        .order('start_time', { ascending: true })
        .then(({ data }) => {
          if (data) setSameDayServices(data);
        });
    }
  }, [serviceData?.date, serviceData?.id, orgId, isTemplate]);

  // --- RESIZE LOGIC ---
  useEffect(() => {
      const handleMouseMove = (e) => {
          if (!isResizing) return;
          setColWidths(prev => ({ ...prev, [isResizing]: Math.max(30, prev[isResizing] + e.movementX) }));
      };
      const handleMouseUp = () => setIsResizing(null);
      if (isResizing) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isResizing]);

  // --- DATA FETCHING ---
  const fetchSidebarData = async () => {
      const { data: minData } = await supabase.from('ministries').select('*').eq('organization_id', orgId).order('sort_order', { ascending: true });
      const { data: posData } = await supabase.from('service_positions').select('*').eq('service_id', serviceData.id);
      setMinistries(minData || []);
      setPositions(posData || []);
      const initialExpand = {};
      if(minData) minData.forEach(m => initialExpand[m.id] = true);
      setExpandedMinistries(initialExpand);
  };

  // --- TEAM ACTIONS ---
  const startAddRole = (ministryId) => { 
      if(!canEdit) return; 
      setActiveMinistryId(ministryId); 
      setNewRoleName(''); 
  };

  const saveNewRole = async () => {
      if (!newRoleName.trim()) { setActiveMinistryId(null); return; }
      const { data } = await supabase.from('service_positions').insert([{ service_id: serviceData.id, ministry_id: activeMinistryId, role_name: newRoleName, status: 'pending' }]).select().single();
      if (data) { setPositions([...positions, data]); setActiveMinistryId(null); setNewRoleName(''); }
  };

  const openPeoplePicker = (position) => {
      if(!canEdit) return; // Prevent viewers from assigning
      setAssigningRole(position);
      setSidebarView('picker');
      setPeopleSearch('');
      setFilterBySkill(true);
  };

  const assignPerson = async (memberId) => {
      const positionId = assigningRole.id;
      const updatedPositions = positions.map(p => p.id === positionId ? { ...p, member_id: memberId, status: memberId ? 'confirmed' : 'pending' } : p);
      setPositions(updatedPositions);
      await supabase.from('service_positions').update({ member_id: memberId, status: memberId ? 'confirmed' : 'pending' }).eq('id', positionId);
      setSidebarView('main');
      setAssigningRole(null);
  };

  const handleDeleteRole = async (id) => {
      if(!canEdit) return;
      if(!confirm("Remove this role?")) return;
      await supabase.from('service_positions').delete().eq('id', id);
      setPositions(positions.filter(p => p.id !== id));
  };

  // --- ACTIONS ---
  const handleMainSave = async () => {
      if (!canEdit) return;
      setSaveStatus('saving');
      try { await onSave(planDate, items); setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 2000); } 
      catch (err) { alert("Save failed."); setSaveStatus('idle'); }
  };
  
  // --- ITEM HELPER ---
  const createItemObject = (type, songData = null) => ({ 
      id: Date.now() + Math.random().toString(36).substr(2, 9), 
      type, 
      title: songData ? songData.title : (type === 'header' ? 'New Header' : 'New Item'), 
      length: 0, bpm: songData ? songData.bpm : '', key: songData ? songData.key : '', notes: '', color: null 
  });

  const handleAddItemClick = (type, songData = null) => { 
      if(!canEdit) return;
      setItems([...items, createItemObject(type, songData)]); 
      setShowAddMenu(false); 
  };

  const handleDeleteItem = (idx) => {
      if(!canEdit) return;
      setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, val) => { 
      if(!canEdit) return;
      const newItems = [...items]; 
      newItems[idx] = { ...newItems[idx], [field]: val }; 
      setItems(newItems); 
  };

  const parseLengthToSeconds = (lenStr) => { if (!lenStr) return 0; const str = String(lenStr).trim(); if (str.includes(':')) { const [m, s] = str.split(':').map(num => parseInt(num) || 0); return (m * 60) + s; } else { return (parseInt(str) || 0) * 60; } };
  const startTimes = (() => { let t = new Date(`2000-01-01T10:00:00`); return items.map(item => { const s = t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); t.setSeconds(t.getSeconds() + (parseLengthToSeconds(item.length))); return s; }); })();

  // --- DRAG & DROP ---
  const handleDragStart = (e, index) => { 
      if(!canEdit) return;
      setDraggedItemIndex(index); setDraggedNewItem(null); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData('text/plain', index); 
  };
  const handleNewItemDragStart = (e, type, songData = null) => { 
      if(!canEdit) return;
      setDraggedItemIndex(null); setDraggedNewItem(createItemObject(type, songData)); e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData('text/plain', 'new-item'); 
  };
  const handleDragOver = (e, index) => { e.preventDefault(); e.dataTransfer.dropEffect = draggedNewItem ? "copy" : "move"; if (dropTargetIndex !== index) setDropTargetIndex(index); };
  const handleDrop = (e, dropIndex) => { 
      e.preventDefault(); e.stopPropagation(); setDropTargetIndex(null); 
      if(!canEdit) return;
      const newItems = [...items]; 
      if (draggedNewItem) { newItems.splice(dropIndex, 0, draggedNewItem); setItems(newItems); setDraggedNewItem(null); setShowAddMenu(false); } 
      else if (draggedItemIndex !== null && draggedItemIndex !== dropIndex) { const [movedItem] = newItems.splice(draggedItemIndex, 1); newItems.splice(dropIndex, 0, movedItem); setItems(newItems); setDraggedItemIndex(null); } 
  };

  // --- TEMPLATES ---
  const getGridTemplate = () => { let tmpl = `40px ${colWidths.time}px ${colWidths.len}px 1fr`; if (visibleCols.detail) tmpl += ` ${colWidths.detail}px`; if (visibleCols.notes) tmpl += ` ${colWidths.notes}px`; tmpl += ' 40px'; return tmpl; };
  const Resizer = ({ target }) => { const [hover, setHover] = useState(false); const active = isResizing === target || hover; return (<div onMouseDown={(e) => { e.preventDefault(); setIsResizing(target); }} onClick={(e) => e.stopPropagation()} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '6px', cursor: 'col-resize', zIndex: 10, display: 'flex', justifyContent: 'center' }}><div style={{ width: '2px', height: '100%', background: active ? colors.accent : colors.border, transition: 'background 0.2s' }}/></div>); };

  // --- FILTERED LISTS ---
  const isDraggingAny = draggedItemIndex !== null || draggedNewItem !== null;

  // Filter songs by search only (playlists are separate)
  const filteredSongs = availableSongs.filter(s =>
    s.title.toLowerCase().includes(songSearch.toLowerCase())
  );
  
  // SMART PEOPLE FILTER LOGIC
  const filteredPeople = teamMembers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(peopleSearch.toLowerCase());
      if (filterBySkill && assigningRole) {
          const roleName = assigningRole.role_name.toLowerCase();
          const hasSkill = p.skills && p.skills.some(skill => roleName.includes(skill.toLowerCase()));
          return matchesSearch && hasSkill;
      }
      return matchesSearch;
  });

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: colors.text, userSelect: isResizing ? 'none' : 'auto', cursor: isResizing ? 'col-resize' : 'default' }}>
      
      {/* TOP BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: colors.text }}>â† Back</button>
          <div>
            {canEdit ? (
                <EditableTitle initialTitle={planName} onSave={setPlanName} isDarkMode={isDarkMode} />
            ) : (
                <div style={{fontSize:'20px', fontWeight:'800', color: colors.text}}>{planName}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px', fontSize: '14px', color: colors.subText }}>
               <CalendarIcon date={planDate} />
               {!isTemplate && <span>{serviceData?.start_time ? formatTime(serviceData.start_time) : '9:00 AM'} Service</span>}
               {isTemplate && <span style={{background: colors.accent, color:'white', padding:'2px 6px', borderRadius:'4px', fontSize:'11px', fontWeight:'bold'}}>TEMPLATE</span>}
            </div>
          </div>
        </div>
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
             <div style={{position:'relative'}}><button onClick={() => setShowViewMenu(!showViewMenu)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '10px', borderRadius: '6px', cursor: 'pointer', display:'flex', alignItems:'center' }}><Eye size={18} /></button>
                 {showViewMenu && (<div style={{position:'absolute', top:'100%', right:0, marginTop:'10px', width:'200px', background: colors.popover, border: `1px solid ${colors.border}`, borderRadius:'8px', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)', padding:'15px', zIndex:50}}><label style={{display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'14px', cursor:'pointer'}}><span style={{display:'flex', gap:'5px', alignItems:'center'}}><Monitor size={14}/> Detail</span> <input type="checkbox" checked={visibleCols.detail} onChange={e=>setVisibleCols({...visibleCols, detail: e.target.checked})} /></label><label style={{display:'flex', justifyContent:'space-between', marginBottom:'0', fontSize:'14px', cursor:'pointer'}}><span style={{display:'flex', gap:'5px', alignItems:'center'}}><FileText size={14}/> Notes</span> <input type="checkbox" checked={visibleCols.notes} onChange={e=>setVisibleCols({...visibleCols, notes: e.target.checked})} /></label></div>)}</div>
             <button onClick={() => alert("Stage Mode")} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display:'flex', alignItems:'center', gap:'6px' }}><Monitor size={16} /> Stage Mode</button>

             {/* Chat button — only for real services, not templates */}
             {!isTemplate && (
               <button
                 onClick={() => setShowChat(true)}
                 title="Service Chat"
                 style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text, padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display:'flex', alignItems:'center', gap:'6px' }}
               >
                 <MessageSquare size={16} /> Chat
               </button>
             )}

             {/* Only Show Save if Editable */}
             <button onClick={handleMainSave} disabled={saveStatus === 'saving' || !canEdit} style={{ background: saveStatus === 'success' ? colors.success : (!canEdit ? colors.subText : colors.accent), color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: canEdit ? 'pointer' : 'not-allowed', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.3s ease', opacity: canEdit ? 1 : 0.5 }}>{saveStatus === 'saving' ? <><Loader2 size={18} className="animate-spin"/> Saving...</> : saveStatus === 'success' ? <><CheckCircle size={18} /> Saved!</> : <><Save size={18} /> Save</>}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT: PLAN EDITOR */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* SMALL ADD BUTTON WITH DROPDOWN */}
              {canEdit && (
                  <div style={{ marginBottom: '10px', position: 'relative', zIndex: 20 }}>
                    <button
                      onClick={() => setShowAddMenu(!showAddMenu)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        background: colors.accent,
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                      <Plus size={16} /> Add
                    </button>

                    {showAddMenu && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '8px',
                        background: colors.popover,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        zIndex: 50,
                        minWidth: '200px'
                      }}>
                        {[
                          { type: 'song', label: 'Song', icon: Music },
                          { type: 'header', label: 'Header', icon: LayoutTemplate },
                          { type: 'item', label: 'Item', icon: FileText },
                          { type: 'media', label: 'Media', icon: Video }
                        ].map(({ type, label, icon: Icon }) => (
                          <div
                            key={type}
                            draggable
                            onDragStart={(e) => handleNewItemDragStart(e, type)}
                            onClick={() => handleAddItemClick(type)}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              transition: 'background 0.15s',
                              color: colors.text,
                              fontWeight: '500',
                              fontSize: '14px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = colors.hover}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Icon size={18} color={colors.accent} />
                            {label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              )}

              <div style={{ flex: 1, background: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: getGridTemplate(), background: colors.hover, fontSize: '12px', fontWeight: '700', color: colors.subText, textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{padding:'10px 15px'}}></div><div style={{padding:'10px 5px', position:'relative', display:'flex', alignItems:'center'}}>Time <Resizer target="time"/></div><div style={{padding:'10px 5px', position:'relative', display:'flex', alignItems:'center'}}>Length <Resizer target="len"/></div><div style={{padding:'10px 15px'}}>Item</div>{visibleCols.detail && <div style={{padding:'10px 5px', position:'relative', display:'flex', alignItems:'center'}}>Detail <Resizer target="detail"/></div>}{visibleCols.notes && <div style={{padding:'10px 5px', position:'relative', display:'flex', alignItems:'center'}}>Notes <Resizer target="notes"/></div>}<div style={{padding:'10px 15px'}}></div> 
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', minHeight:'200px' }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, items.length)}>
                      {items.map((item, i) => {
                          let rowBg = item.type === 'header' ? (item.color ? item.color : (isDarkMode ? '#27272a' : '#f3f4f6')) : 'transparent';
                          let rowColor = item.type === 'header' && item.color ? 'white' : colors.text;
                          if (draggedItemIndex === i) { rowBg = colors.dragBg; rowColor = colors.text; }
                          else if (dropTargetIndex === i && isDraggingAny) { rowBg = colors.dropHighlight; } 
                          
                          return (
                              <div key={item.id} onDragOver={(e) => handleDragOver(e, i)} onDragLeave={() => setDropTargetIndex(null)} onDrop={(e) => handleDrop(e, i)} style={{ display: 'grid', gridTemplateColumns: getGridTemplate(), borderBottom: `1px solid ${colors.border}`, borderTop: dropTargetIndex === i && isDraggingAny ? `2px solid ${colors.accent}` : 'none', alignItems: 'center', background: rowBg, color: rowColor, opacity: draggedItemIndex === i ? 0.5 : 1 }}>
                                  <div draggable={canEdit} onDragStart={(e) => handleDragStart(e, i)} style={{padding:'12px 0 12px 15px', color: item.type === 'header' && item.color ? 'white' : colors.subText, opacity: canEdit ? 0.6 : 0.2, cursor: canEdit ? 'grab' : 'default'}}><GripVertical size={16} /></div>
                                  {/* TIME */}
                                  <div style={{padding:'0 5px', fontSize: '13px', color: item.type === 'header' && item.color ? 'white' : colors.subText, overflow:'hidden', whiteSpace:'nowrap'}}>
                                    {item.type !== 'header' && startTimes[i]}
                                  </div>

                                  {/* LENGTH */}
                                  <div style={{padding:'0 5px'}}>
                                    {item.type !== 'header' ? (
                                      <input
                                        readOnly={!canEdit}
                                        placeholder="0:00"
                                        value={item.length || ''}
                                        onChange={e => updateItem(i, 'length', e.target.value)}
                                        style={{ width: '100%', background: 'transparent', border: 'none', color: rowColor, fontSize: '13px', pointerEvents: isDraggingAny ? 'none' : 'auto' }}
                                      />
                                    ) : <div/>}
                                  </div>

                                  {/* TITLE */}
                                  <div style={{padding:'0 15px', fontWeight: '600', color: rowColor, display: 'flex', alignItems: 'center', gap: '10px', overflow:'hidden'}}>
                                    {item.type === 'header' ? (
                                      <>
                                      <input
                                        readOnly={!canEdit}
                                        value={item.title || ''}
                                        onChange={e => updateItem(i, 'title', e.target.value)}
                                        style={{
                                          width: '100%',
                                          background: 'transparent',
                                          border: 'none',
                                          fontWeight: '700',
                                          fontSize: '16px',
                                          color: rowColor,
                                          outline: 'none',
                                          textTransform: 'uppercase',
                                          paddingLeft: '10px',
                                          pointerEvents: isDraggingAny ? 'none' : 'auto'
                                        }}
                                      />
                                      {item.title && !isTemplate && (
                                        <button
                                          onClick={() => { setChatThread(item.title.trim()); setShowChat(true); }}
                                          title={`Open ${item.title} chat`}
                                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: item.color ? 'rgba(255,255,255,0.75)' : colors.subText, padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center', opacity: 0.7 }}
                                        >
                                          <MessageSquare size={13} />
                                        </button>
                                      )}
                                      </>
                                    ) : (
                                      <input
                                        readOnly={!canEdit}
                                        value={item.title || ''}
                                        onChange={e => updateItem(i, 'title', e.target.value)}
                                        style={{
                                          width: '100%',
                                          background: 'transparent',
                                          border: 'none',
                                          fontWeight: '600',
                                          fontSize: '14px',
                                          color: rowColor,
                                          outline: 'none',
                                          pointerEvents: isDraggingAny ? 'none' : 'auto'
                                        }}
                                      />
                                    )}
                                  </div>

                                  {/* DETAIL (BPM/KEY) - Plain Editable */}
                                  {visibleCols.detail && (
                                    <div style={{padding:'0 5px'}}>
                                      {item.type === 'song' ? (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                          {/* BPM - Plain Input */}
                                          <input
                                            readOnly={!canEdit}
                                            value={item.bpm || ''}
                                            onChange={(e) => updateItem(i, 'bpm', e.target.value)}
                                            placeholder="BPM"
                                            disabled={!canEdit}
                                            style={{
                                              width: '45%',
                                              background: 'transparent',
                                              border: 'none',
                                              color: colors.text,
                                              fontSize: '13px',
                                              outline: 'none',
                                              padding: '2px 4px',
                                              borderBottom: canEdit ? `1px solid transparent` : 'none',
                                              pointerEvents: isDraggingAny ? 'none' : 'auto'
                                            }}
                                            onFocus={(e) => e.target.style.borderBottom = `1px solid ${colors.accent}`}
                                            onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
                                          />

                                          {/* Key - Dropdown with all chords */}
                                          <select
                                            value={item.key || ''}
                                            onChange={(e) => updateItem(i, 'key', e.target.value)}
                                            disabled={!canEdit}
                                            style={{
                                              width: '55%',
                                              background: 'transparent',
                                              border: 'none',
                                              color: colors.text,
                                              fontSize: '13px',
                                              outline: 'none',
                                              padding: '2px 4px',
                                              cursor: canEdit ? 'pointer' : 'default',
                                              borderBottom: canEdit ? `1px solid transparent` : 'none',
                                              pointerEvents: isDraggingAny ? 'none' : 'auto'
                                            }}
                                            onFocus={(e) => e.target.style.borderBottom = `1px solid ${colors.accent}`}
                                            onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
                                          >
                                            <option value="">Key</option>
                                            {MUSIC_KEYS.map(key => (
                                              <option key={key} value={key}>{key}</option>
                                            ))}
                                          </select>
                                        </div>
                                      ) : <div/>}
                                    </div>
                                  )}

                                  {/* NOTES */}
                                  {visibleCols.notes && (
                                    <div style={{padding:'0 5px'}}>
                                      <input
                                        readOnly={!canEdit}
                                        placeholder="..."
                                        value={item.notes || ''}
                                        onChange={e => updateItem(i, 'notes', e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey && canEdit && e.target.value.trim()) {
                                            e.preventDefault();
                                            const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                            const signature = `${currentUser}: "${e.target.value.trim()}" - ${timestamp}`;
                                            const existingNotes = item.notes || '';
                                            const newNotes = existingNotes ? `${existingNotes}\n${signature}` : signature;
                                            updateItem(i, 'notes', newNotes);
                                          }
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: item.type === 'header' && item.color ? 'rgba(255,255,255,0.7)' : colors.subText,
                                          fontSize: '13px',
                                          width: '100%',
                                          outline: 'none',
                                          pointerEvents: isDraggingAny ? 'none' : 'auto'
                                        }}
                                      />
                                    </div>
                                  )}

                                  {/* DELETE & RECOLOR */}
                                  <div style={{padding:'0 15px', display: 'flex', gap: '8px', alignItems: 'center'}}>
                                    {canEdit && item.type === 'header' && (
                                      <label style={{ cursor: 'pointer', opacity: 0.6 }} title="Change color">
                                        <Palette size={14} color={item.color ? 'white' : colors.text} />
                                        <input
                                          type="color"
                                          value={item.color || '#3b82f6'}
                                          onChange={(e) => updateItem(i, 'color', e.target.value)}
                                          style={{ opacity: 0, width: '1px', height: '1px', position: 'absolute' }}
                                        />
                                      </label>
                                    )}
                                    {canEdit && (
                                      <button
                                        onClick={() => handleDeleteItem(i)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          color: item.type === 'header' && item.color ? 'white' : colors.danger,
                                          opacity: 0.5
                                        }}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* MULTIPLE SERVICES ON SAME DAY - Collapsible Table */}
              {!isTemplate && sameDayServices.length > 0 && (
                <div style={{
                  marginTop: '20px',
                  padding: '20px',
                  background: colors.card,
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    marginBottom: '12px',
                    color: colors.subText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Other Services Today
                  </div>
                  {sameDayServices.map(service => (
                    <div
                      key={service.id}
                      onClick={() => onServiceClick && onServiceClick(service.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        marginBottom: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.hover;
                        e.currentTarget.style.borderColor = colors.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = colors.border;
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '4px', color: colors.text }}>
                        {service.name}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.subText }}>
                        {formatTime(service.start_time)} - {formatTime(service.end_time)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* RIGHT SIDEBAR (DYNAMIC CONTENT) */}
          <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '15px', height: '100%', overflowY:'auto' }}>
              
              {/* --- MODE: PEOPLE PICKER (THE SUB-FOLDER) --- */}
              {sidebarView === 'picker' && (
                  <div style={{flex:1, display:'flex', flexDirection:'column', background: colors.bg, borderLeft: `1px solid ${colors.border}`}}>
                      <div style={{padding:'15px', borderBottom:`1px solid ${colors.border}`, display:'flex', gap:'10px', alignItems:'center', background: colors.hover}}>
                          <button onClick={() => setSidebarView('main')} style={{background:'none', border:'none', cursor:'pointer', color:colors.text}}><ArrowLeft size={18}/></button>
                          <div>
                              <div style={{fontSize:'11px', textTransform:'uppercase', color:colors.subText, fontWeight:'bold'}}>Assigning To</div>
                              <div style={{fontSize:'14px', fontWeight:'700', color:colors.accent}}>{assigningRole?.role_name}</div>
                          </div>
                      </div>
                      
                      {/* FILTER TOGGLE & SEARCH */}
                      <div style={{padding:'10px', borderBottom:`1px solid ${colors.border}`}}>
                          <div style={{position:'relative', marginBottom:'10px'}}>
                              <Search size={14} color={colors.subText} style={{position:'absolute', left:'10px', top:'9px'}}/>
                              <input placeholder="Search people..." value={peopleSearch} autoFocus onChange={e => setPeopleSearch(e.target.value)} style={{width:'100%', padding:'8px 8px 8px 30px', borderRadius:'6px', border:`1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, boxSizing:'border-box', fontSize:'13px'}} />
                          </div>
                          
                          <div style={{display:'flex', gap:'5px'}}>
                              <button onClick={() => setFilterBySkill(!filterBySkill)} style={{flex:1, padding:'6px', borderRadius:'4px', border:`1px solid ${filterBySkill ? colors.accent : colors.border}`, background: filterBySkill ? colors.hover : 'transparent', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', color: filterBySkill ? colors.accent : colors.subText, cursor:'pointer'}}>
                                  <Filter size={12}/> Match Role
                              </button>
                              <button onClick={() => assignPerson(null)} style={{padding:'6px 10px', borderRadius:'4px', border:`1px solid ${colors.danger}`, background:'transparent', color:colors.danger, fontSize:'11px', cursor:'pointer'}}>Clear</button>
                          </div>
                      </div>

                      <div style={{display:'flex', flexDirection:'column', gap:'2px', padding:'10px'}}>
                          {filteredPeople.length === 0 && (
                              <div style={{padding:'20px', textAlign:'center', color:colors.subText, fontSize:'13px'}}>
                                  No matches found.<br/>
                                  <span style={{fontSize:'11px', opacity:0.7}}>(Try turning off "Match Role")</span>
                              </div>
                          )}
                          
                          {filteredPeople.map(person => (
                              <div key={person.id} onClick={() => assignPerson(person.id)} style={{padding:'10px', borderRadius:'6px', cursor:'pointer', background: colors.inputBg, display:'flex', alignItems:'center', gap:'10px', border: `1px solid ${colors.border}`}}>
                                  <div style={{width:'24px', height:'24px', borderRadius:'50%', background: colors.accent, color:'white', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center'}}>{person.name.charAt(0)}</div>
                                  <div style={{flex:1}}>
                                      <div style={{fontSize:'13px', fontWeight:'500'}}>{person.name}</div>
                                      {person.skills && (
                                          <div style={{display:'flex', gap:'4px', marginTop:'2px', flexWrap:'wrap'}}>
                                              {person.skills.map(s => <span key={s} style={{fontSize:'9px', padding:'1px 4px', borderRadius:'3px', background: colors.hover, color:colors.subText}}>{s}</span>)}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* --- MODE: MAIN (Calendar/Library/Teams) --- */}
              {sidebarView === 'main' && (
                  <>
                      {/* UNIVERSAL CALENDAR */}
                      <div style={{ background: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
                         <div onClick={() => setExpandedSections({...expandedSections, calendar: !expandedSections.calendar})} style={{ padding: '15px', borderBottom: expandedSections.calendar ? `1px solid ${colors.border}` : 'none', background: colors.hover, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{display:'flex', alignItems:'center', gap:'10px'}}><Calendar size={16} color={colors.subText}/><h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: colors.subText }}>Calendar</h3></div>
                              {expandedSections.calendar ? <ChevronDown size={16} color={colors.subText}/> : <ChevronRight size={16} color={colors.subText}/>}
                          </div>
                          {expandedSections.calendar && <CalendarWidget isDarkMode={isDarkMode} onDateSelect={onCreateService} />}
                      </div>

                      {/* LIBRARY */}
                      <div style={{ background: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}`, overflow: 'hidden', display:'flex', flexDirection:'column' }}>
                         {/* Search Bar - Always Visible */}
                         <div style={{padding:'10px', borderBottom:`1px solid ${colors.border}`}}>
                           <div style={{position:'relative'}}>
                             <Search size={14} color={colors.subText} style={{position:'absolute', left:'10px', top:'9px'}}/>
                             <input
                               placeholder="Search songs..."
                               value={songSearch}
                               onChange={e => setSongSearch(e.target.value)}
                               style={{
                                 width:'100%',
                                 padding:'8px 8px 8px 30px',
                                 borderRadius:'6px',
                                 border:`1px solid ${colors.border}`,
                                 background: colors.inputBg,
                                 color: colors.text,
                                 boxSizing:'border-box',
                                 fontSize:'13px'
                               }}
                             />
                           </div>
                         </div>

                         {/* Playlists Section */}
                         <div style={{ borderBottom: `1px solid ${colors.border}` }}>
                           <div
                             onClick={() => setExpandedSections({...expandedSections, playlists: !expandedSections.playlists})}
                             style={{
                               padding: '10px 15px',
                               background: colors.hover,
                               cursor: 'pointer',
                               display: 'flex',
                               justifyContent: 'space-between',
                               alignItems: 'center'
                             }}
                           >
                             <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                               <LayoutTemplate size={16} color={colors.subText}/>
                               <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: colors.subText }}>
                                 Playlists
                               </h3>
                             </div>
                             {expandedSections.playlists ? <ChevronDown size={14} color={colors.subText}/> : <ChevronRight size={14} color={colors.subText}/>}
                           </div>

                           {expandedSections.playlists && (
                             <div style={{ padding: '10px' }}>
                               {/* All Songs Option */}
                               <div
                                 onClick={() => setCurrentPlaylist(null)}
                                 style={{
                                   padding: '8px',
                                   borderRadius: '6px',
                                   cursor: 'pointer',
                                   background: !currentPlaylist ? colors.accent : 'transparent',
                                   color: !currentPlaylist ? 'white' : colors.text,
                                   marginBottom: '4px',
                                   fontSize: '13px',
                                   fontWeight: '500'
                                 }}
                               >
                                 All Songs
                               </div>

                               {/* Playlists List */}
                               {playlists.map(playlist => (
                                 <div
                                   key={playlist.id}
                                   onClick={() => setCurrentPlaylist(playlist)}
                                   style={{
                                     padding: '8px',
                                     borderRadius: '6px',
                                     cursor: 'pointer',
                                     background: currentPlaylist?.id === playlist.id ? colors.accent : 'transparent',
                                     color: currentPlaylist?.id === playlist.id ? 'white' : colors.text,
                                     marginBottom: '4px',
                                     fontSize: '13px',
                                     fontWeight: '500',
                                     display: 'flex',
                                     justifyContent: 'space-between',
                                     alignItems: 'center'
                                   }}
                                 >
                                   <span>{playlist.name}</span>
                                   <span style={{ fontSize: '11px', opacity: 0.7 }}>({playlist.songs.length})</span>
                                 </div>
                               ))}

                               {/* Create New Playlist */}
                               {canEdit && (
                                 <button
                                   onClick={() => {
                                     const name = prompt('Playlist name:');
                                     if (name) {
                                       setPlaylists([...playlists, { id: Date.now(), name, songs: [] }]);
                                     }
                                   }}
                                   style={{
                                     marginTop: '8px',
                                     padding: '6px 12px',
                                     background: 'transparent',
                                     border: `1px dashed ${colors.border}`,
                                     borderRadius: '6px',
                                     color: colors.accent,
                                     fontSize: '12px',
                                     cursor: 'pointer',
                                     width: '100%',
                                     fontWeight: '600'
                                   }}
                                 >
                                   + New Playlist
                                 </button>
                               )}
                             </div>
                           )}
                         </div>

                         {/* Song List - Master Library */}
                         <div
                           onClick={() => setExpandedSections({...expandedSections, library: !expandedSections.library})}
                           style={{
                             padding: '10px 15px',
                             background: colors.hover,
                             cursor: 'pointer',
                             display: 'flex',
                             justifyContent: 'space-between',
                             alignItems: 'center'
                           }}
                         >
                           <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                             <Music size={16} color={colors.subText}/>
                             <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: colors.subText }}>
                               All Songs
                             </h3>
                           </div>
                           {expandedSections.library ? <ChevronDown size={14} color={colors.subText}/> : <ChevronRight size={14} color={colors.subText}/>}
                         </div>

                         {expandedSections.library && (
                           <div style={{ maxHeight:'250px', overflowY:'auto', padding:'5px' }}>
                             {filteredSongs.length === 0 ? (
                               <div style={{ padding: '20px', textAlign: 'center', color: colors.subText, fontSize: '13px' }}>
                                 No songs found
                               </div>
                             ) : (
                               filteredSongs.map(song => (
                                 <div
                                   key={song.id}
                                   draggable={canEdit}
                                   onDragStart={(e) => handleNewItemDragStart(e, 'song', song)}
                                   onClick={() => handleAddItemClick('song', song)}
                                   style={{
                                     padding:'8px',
                                     borderRadius:'6px',
                                     cursor: canEdit ? 'grab' : 'default',
                                     display:'flex',
                                     justifyContent:'space-between',
                                     alignItems:'center',
                                     marginBottom:'2px',
                                     background: colors.hover
                                   }}
                                 >
                                   <div style={{fontSize:'13px', color: colors.text, fontWeight:'500'}}>{song.title}</div>
                                   {canEdit && <Plus size={14} color={colors.accent}/>}
                                 </div>
                               ))
                             )}
                           </div>
                         )}
                      </div>

                      {/* TEAMS */}
                      <div style={{ background: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}`, overflow: 'visible' }}>
                          <div onClick={() => setExpandedSections({...expandedSections, teams: !expandedSections.teams})} style={{ padding: '15px', borderBottom: expandedSections.teams ? `1px solid ${colors.border}` : 'none', background: colors.hover, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{display:'flex', alignItems:'center', gap:'10px'}}><Users size={16} color={colors.accent}/><h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: colors.subText }}>Teams</h3></div>
                              {expandedSections.teams ? <ChevronDown size={16} color={colors.subText}/> : <ChevronRight size={16} color={colors.subText}/>}
                          </div>
                          {expandedSections.teams && (
                              <div style={{ padding: '10px' }}>
                                   {ministries.map(m => {
                                       const isExpanded = expandedMinistries[m.id];
                                       const ministryPositions = positions.filter(p => p.ministry_id === m.id);
                                       const confirmedCount = ministryPositions.filter(p => p.status === 'confirmed').length;
                                       const neededCount = ministryPositions.length - confirmedCount;

                                       return (
                                           <div key={m.id} style={{marginBottom:'10px', border:`1px solid ${colors.border}`, borderRadius:'6px', background: colors.card}}>
                                               <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background: colors.hover, borderTopLeftRadius:'6px', borderTopRightRadius:'6px'}}>
                                                   <div onClick={() => setExpandedMinistries({...expandedMinistries, [m.id]: !isExpanded})} style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', flex:1}}>
                                                       {isExpanded ? <ChevronDown size={14} color={colors.subText}/> : <ChevronRight size={14} color={colors.subText}/>}
                                                       <div>
                                                           <div style={{fontWeight:'700', fontSize:'13px', color: colors.text}}>{m.name}</div>
                                                           <div style={{fontSize:'11px', color: colors.subText, display:'flex', gap:'8px', marginTop:'2px'}}>
                                                               <span style={{color: colors.success}}>âœ” {confirmedCount}</span>
                                                               <span style={{color: colors.danger}}>âœ– {neededCount}</span>
                                                           </div>
                                                       </div>
                                                   </div>
                                                   
                                                   {canEdit && <button onClick={(e)=>{ e.stopPropagation(); startAddRole(m.id); }} style={{background:'transparent', border:'none', cursor:'pointer', color:colors.subText}} title="Add Role"><Plus size={16}/></button>}
                                               </div>

                                               {/* POSITIONS LIST */}
                                               {isExpanded && (
                                                   <div style={{padding:'5px'}}>
                                                       {ministryPositions.length === 0 && <div style={{fontSize:'12px', color:colors.subText, fontStyle:'italic', padding:'5px'}}>No positions yet.</div>}
                                                       
                                                       {ministryPositions.map(pos => {
                                                           const assigned = teamMembers.find(t => t.id === pos.member_id);
                                                           return (
                                                               <div key={pos.id} onClick={() => openPeoplePicker(pos)} style={{display:'flex', alignItems:'center', padding:'8px 6px', marginBottom:'2px', borderRadius:'4px', background: assigned ? 'transparent' : 'rgba(239, 68, 68, 0.05)', cursor: canEdit ? 'pointer' : 'default', border: `1px solid ${assigned ? 'transparent' : 'rgba(239, 68, 68, 0.2)'}`}}>
                                                                   <div style={{flex:1}}>
                                                                       <div style={{fontSize:'12px', fontWeight:'600', color: colors.text}}>{pos.role_name}</div>
                                                                       <div style={{fontSize:'12px', color: assigned ? colors.text : colors.danger, display:'flex', alignItems:'center', gap:'5px'}}>
                                                                           {assigned ? <><div style={{width:'16px', height:'16px', background:colors.accent, borderRadius:'50%', fontSize:'9px', color:'white', display:'flex', alignItems:'center', justifyContent:'center'}}>{assigned.name.charAt(0)}</div> {assigned.name}</> : "Needed"}
                                                                       </div>
                                                                   </div>
                                                                   {canEdit && <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(pos.id); }} style={{color:colors.subText, background:'none', border:'none', cursor:'pointer', opacity:0.5}}><X size={14}/></button>}
                                                               </div>
                                                           );
                                                       })}

                                                       {/* INLINE ADD ROLE INPUT */}
                                                       {canEdit && activeMinistryId === m.id && (
                                                           <div style={{padding:'5px', display:'flex', gap:'5px'}}>
                                                               <input 
                                                                   autoFocus 
                                                                   placeholder="Role Name..." 
                                                                   value={newRoleName}
                                                                   onChange={e => setNewRoleName(e.target.value)}
                                                                   onKeyDown={e => e.key === 'Enter' && saveNewRole()}
                                                                   style={{width:'100%', fontSize:'12px', padding:'6px', borderRadius:'4px', border:`1px solid ${colors.border}`, background: colors.inputBg, color:colors.text}}
                                                               />
                                                               <button onClick={saveNewRole} style={{background:colors.accent, color:'white', border:'none', borderRadius:'4px', padding:'0 8px', cursor:'pointer'}}><CheckCircle size={14}/></button>
                                                               <button onClick={() => setActiveMinistryId(null)} style={{background:'transparent', color:colors.subText, border:'none', cursor:'pointer'}}><X size={14}/></button>
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

    {/* CHAT PANEL */}
    <ChatPanel
      isOpen={showChat}
      onClose={() => { setShowChat(false); setChatThread('global'); }}
      service={serviceData}
      orgId={orgId}
      session={session}
      userRole={userRole}
      isDarkMode={isDarkMode}
      initialThread={chatThread}
      colors={{
        bg:      isDarkMode ? '#111111' : '#ffffff',
        card:    isDarkMode ? '#111111' : '#ffffff',
        text:    isDarkMode ? '#a1a1aa' : '#52525b',
        heading: isDarkMode ? '#ededed' : '#09090b',
        border:  isDarkMode ? '#27272a' : '#e4e4e7',
        primary: '#0070F3',
        accent:  '#10B981',
        danger:  '#EF4444',
      }}
    />
    </>
  );
}

const CalendarIcon = ({ date }) => {
    if (!date) return null;
    const [y, m, d] = date.split('T')[0].split('-');
    const localDate = new Date(y, m - 1, d);
    return <span>{localDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>;
};