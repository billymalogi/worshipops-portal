import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Monitor, Tv, Music, ChevronLeft, ChevronRight,
  ExternalLink, Wifi, WifiOff, X, Check, Image, Video,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Plus, Minus, Eye, EyeOff, Edit2, Type,
  Layers, ArrowUp, ArrowDown, Copy, Trash2,
} from 'lucide-react';

// ── Realtime channel (shared with LyricsDisplay + StageMonitor) ──────────────
export const PRESENTER_CHANNEL = 'worshipops_presenter';

// ── Default per-slide formatting ─────────────────────────────────────────────
const DEFAULT_FMT = {
  fontFamily:    'sans-serif',
  fontSize:      52,
  fontWeight:    '700',
  fontStyle:     'normal',
  textDecoration:'none',
  color:         '#ffffff',
  textAlign:     'center',
  shadowEnabled: true,
  shadowColor:   'rgba(0,0,0,0.85)',
  shadowBlur:    10,
  shadowX:       2,
  shadowY:       2,
  bgColor:       '',
  lineHeight:    1.35,
  letterSpacing: 0,
  uppercase:     false,
};

const FONT_FAMILIES = [
  { label: 'Default Sans',    value: 'sans-serif' },
  { label: 'Serif',           value: 'serif' },
  { label: 'Arial',           value: 'Arial, sans-serif' },
  { label: 'Georgia',         value: 'Georgia, serif' },
  { label: 'Impact',          value: 'Impact, sans-serif' },
  { label: 'Trebuchet MS',    value: "'Trebuchet MS', sans-serif" },
  { label: 'Verdana',         value: 'Verdana, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Courier New',     value: "'Courier New', monospace" },
];

// ── Lyrics → slides parser ────────────────────────────────────────────────────
const parseLyrics = (text = '') => {
  const sections = text.split(/\n\s*\n/).filter(s => s.trim());
  return sections.map((section, i) => {
    const lines   = section.trim().split('\n');
    const isLabel = /^\[.+\]$/.test(lines[0]);
    return {
      id:         `parsed-${i}`,
      label:      isLabel ? lines[0].replace(/[\[\]]/g, '') : `Slide ${i + 1}`,
      content:    (isLabel ? lines.slice(1) : lines).join('\n').trim(),
      formatting: { ...DEFAULT_FMT },
    };
  });
};

let _blankCounter = 0;
const newBlankSlate = () => ({
  id:         `blank-${++_blankCounter}`,
  label:      'Blank Slate',
  content:    '',
  formatting: { ...DEFAULT_FMT },
});

// ─────────────────────────────────────────────────────────────────────────────
export default function StageView({ isDarkMode, songs = [], onRefresh }) {

  // ── ProPresenter (secondary) ──────────────────────────────────────────────
  const [ppMode,      setPpMode]      = useState(false);
  const [ppIP,        setPpIP]        = useState('');
  const [ppPort,      setPpPort]      = useState('1025');
  const [ppView,      setPpView]      = useState('remote');
  const [ppConnected, setPpConnected] = useState(false);

  // ── Slate state ───────────────────────────────────────────────────────────
  const [selectedSong,  setSelectedSong]  = useState(null);
  const [slides,        setSlides]        = useState([]);
  const [currentSlide,  setCurrentSlide]  = useState(-1); // -1 = Blank Slate
  const [isBlack,       setIsBlack]       = useState(false);

  // ── Reflow ────────────────────────────────────────────────────────────────
  const [showReflow, setShowReflow] = useState(false);

  // ── Background ────────────────────────────────────────────────────────────
  const [bgUrl,       setBgUrl]       = useState('');
  const [bgType,      setBgType]      = useState('video');
  const [bgUrlInput,  setBgUrlInput]  = useState('');
  const [showBgBar,   setShowBgBar]   = useState(false);

  // ── Edit lyrics modal ─────────────────────────────────────────────────────
  const [editingSong, setEditingSong] = useState(null);
  const [editLyrics,  setEditLyrics]  = useState('');
  const [editSaving,  setEditSaving]  = useState(false);

  // ── Inline slide text edit ─────────────────────────────────────────────────
  const [editingSlideText, setEditingSlideText] = useState('');

  // ── Refs ──────────────────────────────────────────────────────────────────
  const slidesRef       = useRef(slides);
  const selectedRef     = useRef(selectedSong);
  const isBlackRef      = useRef(isBlack);
  const bgUrlRef        = useRef(bgUrl);
  const bgTypeRef       = useRef(bgType);
  const currentSlideRef = useRef(currentSlide);
  const channelRef      = useRef(null);

  useEffect(() => { slidesRef.current       = slides;       }, [slides]);
  useEffect(() => { selectedRef.current     = selectedSong; }, [selectedSong]);
  useEffect(() => { isBlackRef.current      = isBlack;      }, [isBlack]);
  useEffect(() => { bgUrlRef.current        = bgUrl;        }, [bgUrl]);
  useEffect(() => { bgTypeRef.current       = bgType;       }, [bgType]);
  useEffect(() => { currentSlideRef.current = currentSlide; }, [currentSlide]);

  // ── Subscribe once ────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel(PRESENTER_CHANNEL);
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') channelRef.current = ch;
    });
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  }, []);

  // ── Update inline editor when slide changes ───────────────────────────────
  useEffect(() => {
    if (currentSlide >= 0 && slides[currentSlide]) {
      setEditingSlideText(slides[currentSlide].content);
    } else {
      setEditingSlideText('');
    }
  }, [currentSlide, slides]);

  // ── Colors ────────────────────────────────────────────────────────────────
  const c = {
    bg:      isDarkMode ? '#0d0d0f' : '#f9fafb',
    card:    isDarkMode ? '#18181b' : '#ffffff',
    panel:   isDarkMode ? '#111113' : '#f3f4f6',
    text:    isDarkMode ? '#d1d5db' : '#27272a',
    heading: isDarkMode ? '#f9fafb' : '#111111',
    border:  isDarkMode ? '#27272a' : '#e5e7eb',
    muted:   isDarkMode ? '#52525b' : '#9ca3af',
    hover:   isDarkMode ? '#27272a' : '#f3f4f6',
    primary: '#3b82f6',
    success: '#10b981',
    danger:  '#ef4444',
  };

  // ── Broadcast ─────────────────────────────────────────────────────────────
  const broadcast = useCallback((slideIndex, overrides = {}) => {
    const ch = channelRef.current;
    if (!ch) return;
    const sl    = slidesRef.current;
    const song  = selectedRef.current;
    const black = overrides.black   ?? isBlackRef.current;
    const bUrl  = overrides.bgUrl   ?? bgUrlRef.current;
    const bType = overrides.bgType  ?? bgTypeRef.current;
    const slide = slideIndex >= 0 ? sl[slideIndex] : null;

    ch.send({
      type: 'broadcast', event: 'slide',
      payload: {
        slideIndex,
        content:     slide?.content     || '',
        label:       slide?.label       || '',
        song:        song?.title        || '',
        isBlack:     black,
        nextContent: slideIndex >= 0 && slideIndex < sl.length - 1
          ? sl[slideIndex + 1]?.content : '',
        bgUrl:       bUrl,
        bgType:      bType,
        formatting:  slide?.formatting  || null,
      },
    });
  }, []);

  // ── Song selection ────────────────────────────────────────────────────────
  const selectSong = (song) => {
    const parsed = parseLyrics(song.lyrics || '');
    setSelectedSong(song);
    setSlides(parsed);
    setCurrentSlide(-1);
  };

  const goSlide = (index) => {
    setCurrentSlide(index);
    broadcast(index);
  };

  const toggleBlack = () => {
    const next = !isBlack;
    setIsBlack(next);
    broadcast(currentSlideRef.current, { black: next });
  };

  // ── Reflow apply ─────────────────────────────────────────────────────────
  const handleReflowApply = (newSlides, mode) => {
    if (mode === 'replace') {
      setSlides(newSlides);
      setCurrentSlide(-1);
    } else {
      setSlides(prev => [...prev, ...newSlides]);
    }
    setShowReflow(false);
  };

  // ── Add blank slate ───────────────────────────────────────────────────────
  const addBlankSlate = () => {
    const blank = newBlankSlate();
    setSlides(prev => {
      const next = [...prev, blank];
      slidesRef.current = next;
      return next;
    });
  };

  // ── Update slide formatting ───────────────────────────────────────────────
  const updateFormatting = (key, value) => {
    if (currentSlide < 0) return;
    setSlides(prev => {
      const next = prev.map((s, i) => i === currentSlide
        ? { ...s, formatting: { ...s.formatting, [key]: value } }
        : s
      );
      slidesRef.current = next;
      broadcast(currentSlide);
      return next;
    });
  };

  // ── Update slide text inline ───────────────────────────────────────────────
  const applySlideText = (text) => {
    if (currentSlide < 0) return;
    setSlides(prev => {
      const next = prev.map((s, i) => i === currentSlide
        ? { ...s, content: text }
        : s
      );
      slidesRef.current = next;
      broadcast(currentSlide);
      return next;
    });
  };

  // ── BG ────────────────────────────────────────────────────────────────────
  const applyBg = () => {
    const url = bgUrlInput.trim();
    setBgUrl(url);
    broadcast(currentSlideRef.current, { bgUrl: url, bgType: bgType });
  };

  const clearBg = () => {
    setBgUrl(''); setBgUrlInput('');
    broadcast(currentSlideRef.current, { bgUrl: '', bgType: bgType });
  };

  // ── Edit lyrics modal ─────────────────────────────────────────────────────
  const openEdit = (e, song) => {
    e.stopPropagation();
    setEditingSong(song);
    setEditLyrics(song.lyrics || '');
  };

  const saveEdit = async () => {
    if (!editingSong) return;
    setEditSaving(true);
    await supabase.from('songs').update({ lyrics: editLyrics }).eq('id', editingSong.id);
    setEditSaving(false);
    if (selectedSong?.id === editingSong.id) {
      const parsed = parseLyrics(editLyrics);
      setSlides(parsed);
      setCurrentSlide(Math.min(currentSlideRef.current, parsed.length - 1));
    }
    onRefresh?.();
    setEditingSong(null);
  };

  // ── Open windows ──────────────────────────────────────────────────────────
  const openDisplay = () =>
    window.open('/display', 'worshipops_display', 'width=1920,height=1080,menubar=no,toolbar=no,status=no');
  const openStage = () =>
    window.open('/stage',   'worshipops_stage',   'width=1280,height=720,menubar=no,toolbar=no,status=no');

  // ── Shared styles ─────────────────────────────────────────────────────────
  const btnBase = {
    border: 'none', borderRadius: '7px', fontWeight: '600', fontSize: '12px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 11px',
  };
  const inputStyle = {
    padding: '5px 9px', borderRadius: '6px', border: `1px solid ${c.border}`,
    background: isDarkMode ? '#0d0d0f' : '#f9fafb', color: c.text,
    fontSize: '12px', outline: 'none',
  };
  const ppURL = ppConnected && ppIP
    ? `http://${ppIP}:${ppPort}${ppView === 'stage' ? '/stage' : '/'}`
    : '';

  // ── Active slide formatting (for toolbar) ─────────────────────────────────
  const activeFmt = useMemo(() => (
    currentSlide >= 0 && slides[currentSlide]
      ? slides[currentSlide].formatting
      : DEFAULT_FMT
  ), [currentSlide, slides]);

  // ── Formatting toolbar button ─────────────────────────────────────────────
  const FmtBtn = ({ icon: Icon, active, title, onClick, disabled }) => (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '28px', height: '28px', borderRadius: '6px', border: 'none',
        background: active ? c.primary : 'transparent',
        color: active ? '#fff' : disabled ? c.muted : c.text,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={14} />
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // PROPRESENTER MODE (overlay panel)
  if (ppMode) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: c.bg }}>
      {/* PP bar */}
      <div style={{ padding: '10px 16px', background: c.card, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => setPpMode(false)} style={{ ...btnBase, background: 'transparent', border: `1px solid ${c.border}`, color: c.text }}>
          <ChevronLeft size={14} /> Back to Slate
        </button>
        <span style={{ fontSize: '12px', fontWeight: '600', color: c.muted }}>ProPresenter IP:</span>
        <input style={{ ...inputStyle, width: '130px' }} value={ppIP}
          onChange={e => { setPpIP(e.target.value); setPpConnected(false); }} placeholder="192.168.1.x" />
        <span style={{ fontSize: '12px', color: c.muted }}>Port:</span>
        <input style={{ ...inputStyle, width: '55px' }} value={ppPort}
          onChange={e => { setPpPort(e.target.value); setPpConnected(false); }} />
        <button onClick={() => setPpConnected(p => !p)}
          style={{ ...btnBase, background: ppConnected ? c.danger : c.primary, color: 'white' }}>
          {ppConnected ? <><WifiOff size={13} /> Disconnect</> : <><Wifi size={13} /> Connect</>}
        </button>
        {[{ id: 'remote', label: 'Remote' }, { id: 'stage', label: 'Stage' }].map(v => (
          <button key={v.id} onClick={() => setPpView(v.id)}
            style={{ ...btnBase, border: `1px solid ${ppView === v.id ? c.primary : c.border}`, background: ppView === v.id ? (isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)') : 'transparent', color: ppView === v.id ? c.primary : c.text }}>
            {v.label}
          </button>
        ))}
        {ppConnected && ppURL && (
          <a href={ppURL} target="_blank" rel="noreferrer"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: c.primary, fontSize: '12px', textDecoration: 'none', fontWeight: '500' }}>
            <ExternalLink size={12} /> Open full tab
          </a>
        )}
      </div>
      {ppConnected && ppIP
        ? <iframe src={ppURL} style={{ flex: 1, border: 'none', width: '100%' }} title="ProPresenter Remote" />
        : <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', opacity: 0.6 }}>
            <Monitor size={64} style={{ opacity: 0.3, color: c.muted }} />
            <div style={{ fontSize: '18px', fontWeight: '700', color: c.heading, opacity: 1 }}>Connect to ProPresenter 7</div>
            <div style={{ fontSize: '13px', color: c.muted, textAlign: 'center', maxWidth: '400px', lineHeight: '1.7' }}>
              Enter the IP of the Mac running ProPresenter 7 and click Connect.<br />
              Enable Network in ProPresenter Preferences (default port 1025).
            </div>
          </div>
      }
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SLATE MODE
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: c.bg, overflow: 'hidden', fontFamily: 'sans-serif', position: 'relative' }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: '8px 14px', background: c.card, borderBottom: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap'
      }}>
        {/* Slate brand + song title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '140px' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: c.primary, letterSpacing: '-0.3px' }}>SLATE</span>
          {selectedSong && (
            <>
              <span style={{ color: c.border }}>|</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: c.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                {selectedSong.title}
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={toggleBlack}
          style={{ ...btnBase, background: isBlack ? c.danger : (isDarkMode ? '#27272a' : '#e5e7eb'), color: isBlack ? 'white' : c.text, fontWeight: '700', padding: '6px 14px', fontSize: '12px' }}
        >
          {isBlack ? '■ Blanked' : '□ Blank Screen'}
        </button>

        <button onClick={() => setShowBgBar(b => !b)}
          style={{ ...btnBase, border: `1px solid ${showBgBar ? c.primary : c.border}`, background: showBgBar ? (isDarkMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.07)') : 'transparent', color: showBgBar ? c.primary : c.text }}>
          <Image size={13} /> Background
        </button>

        <button onClick={openDisplay}
          style={{ ...btnBase, border: `1px solid ${c.border}`, background: 'transparent', color: c.primary }}>
          <Tv size={13} /> Audience Display
        </button>

        <button onClick={openStage}
          style={{ ...btnBase, border: `1px solid ${c.border}`, background: 'transparent', color: c.primary }}>
          <Monitor size={13} /> Stage Monitor
        </button>

        <button onClick={() => setShowReflow(true)}
          style={{ ...btnBase, border: `1px solid ${c.primary}`, background: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.07)', color: c.primary }}>
          <Layers size={13} /> Reflow
        </button>

        <button onClick={() => setPpMode(true)}
          style={{ ...btnBase, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, fontSize: '11px' }}>
          <ExternalLink size={11} /> ProPresenter
        </button>
      </div>

      {/* ── BG BAR (collapsible) ─────────────────────────────────────────── */}
      {showBgBar && (
        <div style={{ padding: '8px 14px', background: isDarkMode ? '#0a0a0a' : '#f0f9ff', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
          {[{ id: 'video', icon: <Video size={12} />, label: 'Video' }, { id: 'image', icon: <Image size={12} />, label: 'Image' }].map(t => (
            <button key={t.id} onClick={() => setBgType(t.id)}
              style={{ ...btnBase, padding: '4px 10px', background: bgType === t.id ? c.primary : 'transparent', color: bgType === t.id ? 'white' : c.text, border: `1px solid ${bgType === t.id ? c.primary : c.border}` }}>
              {t.icon} {t.label}
            </button>
          ))}
          <input style={{ ...inputStyle, flex: 1, minWidth: '200px' }} value={bgUrlInput}
            onChange={e => setBgUrlInput(e.target.value)}
            placeholder="Paste a URL to a video loop or image…"
            onKeyDown={e => { if (e.key === 'Enter') applyBg(); }} />
          <button onClick={applyBg} disabled={!bgUrlInput.trim()}
            style={{ ...btnBase, background: bgUrlInput.trim() ? c.primary : c.hover, color: bgUrlInput.trim() ? 'white' : c.muted }}>
            <Check size={13} /> Set BG
          </button>
          {bgUrl && (
            <button onClick={clearBg}
              style={{ ...btnBase, background: 'transparent', border: `1px solid ${c.border}`, color: c.danger }}>
              <X size={13} /> Clear
            </button>
          )}
          {bgUrl && <span style={{ fontSize: '11px', color: c.success }}>✓ BG active</span>}
        </div>
      )}

      {/* ── MAIN BODY ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Song library ──────────────────────────────────────────── */}
        <div style={{ width: '200px', minWidth: '200px', borderRight: `1px solid ${c.border}`, background: c.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', fontSize: '9px', fontWeight: '800', color: c.muted, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
            Song Library
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {songs.length === 0
              ? <div style={{ padding: '14px', fontSize: '12px', color: c.muted }}>No songs yet.</div>
              : songs.map(song => (
                <div key={song.id} onClick={() => selectSong(song)}
                  style={{
                    padding: '9px 12px', cursor: 'pointer', borderBottom: `1px solid ${c.border}`,
                    borderLeft: `3px solid ${selectedSong?.id === song.id ? c.primary : 'transparent'}`,
                    background: selectedSong?.id === song.id ? (isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)') : 'transparent',
                    display: 'flex', alignItems: 'flex-start', gap: '6px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: selectedSong?.id === song.id ? c.primary : c.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {song.title}
                    </div>
                    {song.artist && <div style={{ fontSize: '10px', color: c.muted }}>{song.artist}</div>}
                    {!song.lyrics && <div style={{ fontSize: '10px', color: c.danger, marginTop: '2px' }}>no lyrics</div>}
                  </div>
                  <button onClick={(e) => openEdit(e, song)} title="Edit lyrics"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, padding: '2px', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.color = c.primary}
                    onMouseLeave={e => e.currentTarget.style.color = c.muted}>
                    <Edit2 size={11} />
                  </button>
                </div>
              ))
            }
          </div>
        </div>

        {/* ── CENTER: Formatting toolbar + slide grid ──────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Formatting toolbar */}
          <div style={{
            padding: '6px 12px', background: c.card, borderBottom: `1px solid ${c.border}`,
            display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, flexWrap: 'wrap',
            minHeight: '44px'
          }}>
            {currentSlide < 0
              ? <span style={{ fontSize: '11px', color: c.muted, fontStyle: 'italic' }}>Select a slide to edit its formatting</span>
              : <>
                  {/* Font family */}
                  <select
                    value={activeFmt.fontFamily}
                    onChange={e => updateFormatting('fontFamily', e.target.value)}
                    style={{ ...inputStyle, padding: '4px 6px', fontSize: '12px', maxWidth: '130px' }}
                  >
                    {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>

                  {/* Font size */}
                  <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${c.border}`, borderRadius: '6px', overflow: 'hidden' }}>
                    <button onClick={() => updateFormatting('fontSize', Math.max(12, activeFmt.fontSize - 2))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: '4px 7px', display: 'flex' }}>
                      <Minus size={12} />
                    </button>
                    <input
                      type="number" min="12" max="200"
                      value={activeFmt.fontSize}
                      onChange={e => updateFormatting('fontSize', parseInt(e.target.value) || 52)}
                      style={{ width: '42px', textAlign: 'center', border: 'none', background: isDarkMode ? '#0d0d0f' : '#f9fafb', color: c.text, fontSize: '12px', outline: 'none', padding: '4px 0' }}
                    />
                    <button onClick={() => updateFormatting('fontSize', Math.min(200, activeFmt.fontSize + 2))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: '4px 7px', display: 'flex' }}>
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Separator */}
                  <div style={{ width: '1px', height: '22px', background: c.border, margin: '0 2px' }} />

                  {/* Bold */}
                  <FmtBtn icon={Bold} title="Bold"
                    active={activeFmt.fontWeight === '700' || activeFmt.fontWeight === 'bold'}
                    onClick={() => updateFormatting('fontWeight', activeFmt.fontWeight === '700' ? '400' : '700')} />

                  {/* Italic */}
                  <FmtBtn icon={Italic} title="Italic"
                    active={activeFmt.fontStyle === 'italic'}
                    onClick={() => updateFormatting('fontStyle', activeFmt.fontStyle === 'italic' ? 'normal' : 'italic')} />

                  {/* Underline */}
                  <FmtBtn icon={Underline} title="Underline"
                    active={activeFmt.textDecoration === 'underline'}
                    onClick={() => updateFormatting('textDecoration', activeFmt.textDecoration === 'underline' ? 'none' : 'underline')} />

                  {/* Separator */}
                  <div style={{ width: '1px', height: '22px', background: c.border, margin: '0 2px' }} />

                  {/* Alignment */}
                  {[
                    { icon: AlignLeft,    val: 'left',    title: 'Align Left' },
                    { icon: AlignCenter,  val: 'center',  title: 'Align Center' },
                    { icon: AlignRight,   val: 'right',   title: 'Align Right' },
                    { icon: AlignJustify, val: 'justify', title: 'Justify' },
                  ].map(({ icon, val, title }) => (
                    <FmtBtn key={val} icon={icon} title={title}
                      active={activeFmt.textAlign === val}
                      onClick={() => updateFormatting('textAlign', val)} />
                  ))}

                  {/* Separator */}
                  <div style={{ width: '1px', height: '22px', background: c.border, margin: '0 2px' }} />

                  {/* Text color */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: c.muted, fontWeight: '600' }}>Text</span>
                    <input type="color" value={activeFmt.color}
                      onChange={e => updateFormatting('color', e.target.value)}
                      title="Text color"
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${c.border}`, padding: '2px', cursor: 'pointer', background: 'transparent' }} />
                  </div>

                  {/* BG color */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: c.muted, fontWeight: '600' }}>BG</span>
                    <input type="color" value={activeFmt.bgColor || '#000000'}
                      onChange={e => updateFormatting('bgColor', e.target.value)}
                      title="Slide background color"
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${c.border}`, padding: '2px', cursor: 'pointer', background: 'transparent' }} />
                    {activeFmt.bgColor && (
                      <button onClick={() => updateFormatting('bgColor', '')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, display: 'flex', padding: '2px' }}>
                        <X size={10} />
                      </button>
                    )}
                  </div>

                  {/* Separator */}
                  <div style={{ width: '1px', height: '22px', background: c.border, margin: '0 2px' }} />

                  {/* Shadow toggle */}
                  <FmtBtn
                    icon={activeFmt.shadowEnabled ? Eye : EyeOff}
                    title={activeFmt.shadowEnabled ? 'Shadow On' : 'Shadow Off'}
                    active={activeFmt.shadowEnabled}
                    onClick={() => updateFormatting('shadowEnabled', !activeFmt.shadowEnabled)}
                  />

                  {/* Uppercase */}
                  <button
                    onClick={() => updateFormatting('uppercase', !activeFmt.uppercase)}
                    title="ALL CAPS"
                    style={{
                      height: '28px', padding: '0 8px', borderRadius: '6px', border: 'none',
                      background: activeFmt.uppercase ? c.primary : 'transparent',
                      color: activeFmt.uppercase ? '#fff' : c.text,
                      cursor: 'pointer', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center'
                    }}
                  >
                    AA
                  </button>

                  {/* Separator */}
                  <div style={{ width: '1px', height: '22px', background: c.border, margin: '0 2px' }} />

                  {/* Line height */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: c.muted, fontWeight: '600', whiteSpace: 'nowrap' }}>Line</span>
                    <input type="number" min="0.8" max="3" step="0.05"
                      value={activeFmt.lineHeight}
                      onChange={e => updateFormatting('lineHeight', parseFloat(e.target.value) || 1.35)}
                      style={{ ...inputStyle, width: '52px', textAlign: 'center', padding: '4px 6px' }} />
                  </div>

                  {/* Letter spacing */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: c.muted, fontWeight: '600', whiteSpace: 'nowrap' }}>Spacing</span>
                    <input type="number" min="-5" max="20" step="0.5"
                      value={activeFmt.letterSpacing}
                      onChange={e => updateFormatting('letterSpacing', parseFloat(e.target.value) || 0)}
                      style={{ ...inputStyle, width: '52px', textAlign: 'center', padding: '4px 6px' }} />
                  </div>
                </>
            }
          </div>

          {/* Slide grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', alignContent: 'start' }}>

            {/* Blank Slate tile */}
            <SlateTile
              label="Blank Slate"
              content=""
              isActive={currentSlide === -1}
              onClick={() => goSlide(-1)}
              formatting={DEFAULT_FMT}
              isDarkMode={isDarkMode}
              c={c}
              isBlankSlate
            />

            {!selectedSong
              ? <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px', opacity: 0.4 }}>
                  <Music size={40} />
                  <div style={{ fontSize: '14px', fontWeight: '600', color: c.heading }}>Select a song from the library</div>
                </div>
              : slides.length === 0
                ? <div style={{ gridColumn: '1/-1', padding: '20px', textAlign: 'center', color: c.muted, fontSize: '13px' }}>
                    No lyrics. Click <Edit2 size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> to add lyrics.
                  </div>
                : slides.map((slide, i) => (
                  <SlateTile
                    key={slide.id}
                    label={slide.label}
                    content={slide.content}
                    isActive={currentSlide === i}
                    onClick={() => goSlide(i)}
                    formatting={slide.formatting}
                    isDarkMode={isDarkMode}
                    c={c}
                  />
                ))
            }

            {/* Add Blank Slate button */}
            <div
              onClick={addBlankSlate}
              style={{
                aspectRatio: '16/9', borderRadius: '8px', cursor: 'pointer',
                border: `2px dashed ${c.border}`, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '6px',
                color: c.muted, transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = c.primary; e.currentTarget.style.color = c.primary; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.border;  e.currentTarget.style.color = c.muted;  }}
            >
              <Plus size={18} />
              <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Blank Slate</span>
            </div>
          </div>

          {/* Prev / Next footer */}
          {selectedSong && slides.length > 0 && (
            <div style={{ padding: '8px 12px', background: c.card, borderTop: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <button onClick={() => goSlide(Math.max(-1, currentSlide - 1))} disabled={currentSlide <= -1}
                style={{ ...btnBase, border: `1px solid ${c.border}`, background: 'transparent', color: c.text, opacity: currentSlide <= -1 ? 0.35 : 1, cursor: currentSlide <= -1 ? 'not-allowed' : 'pointer' }}>
                <ChevronLeft size={15} /> Prev
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: c.muted }}>
                {currentSlide === -1 ? 'Blank Slate' : `Slide ${currentSlide + 1} of ${slides.length}`}
              </div>
              <button onClick={() => goSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide >= slides.length - 1}
                style={{ ...btnBase, background: c.primary, color: 'white', opacity: currentSlide >= slides.length - 1 ? 0.35 : 1, cursor: currentSlide >= slides.length - 1 ? 'not-allowed' : 'pointer' }}>
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Preview + slide text editor ─────────────────────────── */}
        <div style={{ width: '270px', minWidth: '270px', borderLeft: `1px solid ${c.border}`, background: c.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* LIVE label */}
          <div style={{ padding: '8px 12px 4px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.danger }} />
            <span style={{ fontSize: '9px', fontWeight: '800', color: c.danger, letterSpacing: '1px', textTransform: 'uppercase' }}>Live</span>
          </div>
          <div style={{ padding: '0 10px 8px', flexShrink: 0 }}>
            <SlatePreview
              content={!isBlack && currentSlide >= 0 ? slides[currentSlide]?.content : ''}
              formatting={!isBlack && currentSlide >= 0 ? slides[currentSlide]?.formatting : null}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* NEXT label */}
          <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontSize: '9px', fontWeight: '800', color: c.muted, letterSpacing: '1px', textTransform: 'uppercase' }}>Next</span>
          </div>
          <div style={{ padding: '0 10px 10px', flexShrink: 0 }}>
            <SlatePreview
              content={currentSlide >= 0 && currentSlide < slides.length - 1 ? slides[currentSlide + 1]?.content : ''}
              formatting={currentSlide >= 0 && currentSlide < slides.length - 1 ? slides[currentSlide + 1]?.formatting : null}
              isDarkMode={isDarkMode}
              dim
            />
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: c.border, flexShrink: 0 }} />

          {/* Slide text editor */}
          {currentSlide >= 0 && slides[currentSlide] ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px', gap: '6px', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: c.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Slide Text — {slides[currentSlide].label}
                </span>
                <button
                  onClick={() => applySlideText(editingSlideText)}
                  title="Apply text changes"
                  style={{ ...btnBase, background: c.primary, color: 'white', padding: '3px 10px', fontSize: '11px' }}
                >
                  <Check size={11} /> Apply
                </button>
              </div>
              <textarea
                value={editingSlideText}
                onChange={e => setEditingSlideText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) applySlideText(editingSlideText); }}
                placeholder="Type slide text here… (Ctrl+Enter to apply)"
                style={{
                  flex: 1, resize: 'none', padding: '10px',
                  background: isDarkMode ? '#0d0d0f' : '#f9fafb',
                  color: c.text, fontSize: '13px', lineHeight: '1.65',
                  border: `1px solid ${c.border}`, borderRadius: '8px', outline: 'none',
                  fontFamily: 'inherit', minHeight: '80px'
                }}
              />
              <div style={{ fontSize: '10px', color: c.muted }}>Ctrl+Enter to apply · changes broadcast live</div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ textAlign: 'center', color: c.muted, fontSize: '12px', opacity: 0.6 }}>
                <Type size={24} style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                Select a slide to edit text and formatting
              </div>
            </div>
          )}

          {bgUrl && (
            <div style={{ padding: '8px 12px', borderTop: `1px solid ${c.border}`, fontSize: '11px', color: c.success, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {bgType === 'video' ? <Video size={11} /> : <Image size={11} />}
              BG {bgType} active
            </div>
          )}
        </div>
      </div>

      {/* ── REFLOW OVERLAY ───────────────────────────────────────────────── */}
      {showReflow && (
        <ReflowPanel
          colors={c}
          isDarkMode={isDarkMode}
          onApply={handleReflowApply}
          onClose={() => setShowReflow(false)}
        />
      )}

      {/* ── EDIT LYRICS MODAL ────────────────────────────────────────────── */}
      {editingSong && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '660px', background: c.card, borderRadius: '14px', border: `1px solid ${c.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 60px)' }}>
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: c.heading }}>Edit Lyrics</div>
                <div style={{ fontSize: '12px', color: c.muted, marginTop: '2px' }}>{editingSong.title}</div>
              </div>
              <button onClick={() => setEditingSong(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '10px 20px', background: isDarkMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)', borderBottom: `1px solid ${c.border}`, fontSize: '12px', color: c.muted, flexShrink: 0 }}>
              Use <strong>[Verse 1]</strong>, <strong>[Chorus]</strong>, <strong>[Bridge]</strong> labels on their own line. Separate sections with a blank line.
            </div>
            <textarea
              value={editLyrics}
              onChange={e => setEditLyrics(e.target.value)}
              style={{ flex: 1, resize: 'none', padding: '16px 20px', background: isDarkMode ? '#0d0d0f' : '#f9fafb', color: c.text, fontSize: '13px', lineHeight: '1.7', border: 'none', outline: 'none', fontFamily: 'monospace', minHeight: '300px' }}
              placeholder={'[Verse 1]\nAmazing grace how sweet the sound\n\n[Chorus]\nPraise the Lord'}
            />
            <div style={{ padding: '14px 20px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
              <button onClick={() => setEditingSong(null)}
                style={{ ...btnBase, background: 'transparent', border: `1px solid ${c.border}`, color: c.text, padding: '8px 18px', fontSize: '13px' }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={editSaving}
                style={{ ...btnBase, background: c.primary, color: 'white', padding: '8px 18px', fontSize: '13px', opacity: editSaving ? 0.7 : 1 }}>
                <Check size={14} /> {editSaving ? 'Saving…' : 'Save Lyrics'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Slate tile (thumbnail in grid) ────────────────────────────────────────────
function SlateTile({ label, content, isActive, onClick, formatting, isDarkMode, c, isBlankSlate }) {
  const fmt = formatting || DEFAULT_FMT;
  const displayText = fmt.uppercase ? content.toUpperCase() : content;
  const shadow = fmt.shadowEnabled
    ? `${fmt.shadowX}px ${fmt.shadowY}px ${fmt.shadowBlur}px ${fmt.shadowColor}`
    : 'none';

  return (
    <div
      onClick={onClick}
      style={{
        aspectRatio: '16/9', borderRadius: '8px', cursor: 'pointer',
        overflow: 'hidden', position: 'relative', transition: 'border-color 0.12s',
        border: `2px solid ${isActive ? c.primary : c.border}`,
        background: isBlankSlate ? '#000' : (fmt.bgColor || '#000'),
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = c.muted; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isActive ? c.primary : c.border; }}
    >
      {/* Label strip */}
      <div style={{
        padding: '4px 6px', fontSize: '9px', fontWeight: '700',
        color: isActive ? c.primary : c.muted,
        textTransform: 'uppercase', letterSpacing: '0.5px',
        background: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)',
        flexShrink: 0,
      }}>
        {label}
      </div>

      {/* Content preview */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent:
          fmt.textAlign === 'left' ? 'flex-start' :
          fmt.textAlign === 'right' ? 'flex-end' : 'center',
        padding: '4px 8px', overflow: 'hidden',
      }}>
        {isBlankSlate
          ? <div style={{ color: '#333', fontSize: '9px', textAlign: 'center', width: '100%' }}>BLANK</div>
          : displayText
            ? <div style={{
                fontSize: `${Math.max(8, fmt.fontSize * 0.13)}px`,
                fontFamily: fmt.fontFamily,
                fontWeight: fmt.fontWeight,
                fontStyle: fmt.fontStyle,
                textDecoration: fmt.textDecoration,
                color: fmt.color,
                textAlign: fmt.textAlign,
                lineHeight: fmt.lineHeight,
                letterSpacing: `${fmt.letterSpacing * 0.13}px`,
                textShadow: shadow,
                width: '100%', overflow: 'hidden',
                display: '-webkit-box', WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
              }}>
                {displayText}
              </div>
            : null
        }
      </div>

      {/* Active dot */}
      {isActive && (
        <div style={{ position: 'absolute', top: '5px', right: '5px', width: '7px', height: '7px', borderRadius: '50%', background: c.primary }} />
      )}
    </div>
  );
}

// ── Slate preview box (right panel) ──────────────────────────────────────────
function SlatePreview({ content, formatting, isDarkMode, dim }) {
  const fmt = formatting || DEFAULT_FMT;
  const displayText = fmt.uppercase ? (content || '').toUpperCase() : (content || '');
  const shadow = !dim && fmt.shadowEnabled
    ? `${fmt.shadowX}px ${fmt.shadowY}px ${fmt.shadowBlur}px ${fmt.shadowColor}`
    : 'none';

  return (
    <div style={{
      aspectRatio: '16/9', borderRadius: '6px',
      background: dim ? (isDarkMode ? '#111111' : '#f1f5f9') : (fmt.bgColor || '#000'),
      border: dim ? `1px solid ${isDarkMode ? '#27272a' : '#e5e7eb'}` : 'none',
      display: 'flex', alignItems: 'center', padding: '8px',
      overflow: 'hidden',
      justifyContent:
        fmt.textAlign === 'left' ? 'flex-start' :
        fmt.textAlign === 'right' ? 'flex-end' : 'center',
    }}>
      {displayText
        ? <div style={{
            fontSize: `${Math.max(8, fmt.fontSize * 0.18)}px`,
            fontFamily: dim ? 'sans-serif' : fmt.fontFamily,
            fontWeight: dim ? '400' : fmt.fontWeight,
            fontStyle: dim ? 'normal' : fmt.fontStyle,
            textDecoration: dim ? 'none' : fmt.textDecoration,
            color: dim ? (isDarkMode ? '#6b7280' : '#9ca3af') : fmt.color,
            textAlign: fmt.textAlign,
            lineHeight: fmt.lineHeight,
            letterSpacing: dim ? 0 : `${fmt.letterSpacing * 0.18}px`,
            textShadow: shadow,
            width: '100%',
            whiteSpace: 'pre-line',
            opacity: dim ? 0.65 : 1,
          }}>
            {displayText}
          </div>
        : <div style={{ color: dim ? '#555' : '#333', fontSize: '10px', width: '100%', textAlign: 'center' }}>
            {dim ? '(end)' : '—'}
          </div>
      }
    </div>
  );
}

// ── Group label options ───────────────────────────────────────────────────────
const GROUP_OPTIONS = [
  'Intro',
  'Verse 1', 'Verse 2', 'Verse 3', 'Verse 4',
  'Pre-Chorus',
  'Chorus', 'Chorus 2', 'Chorus 3',
  'Bridge', 'Bridge 2',
  'Tag', 'Tag 2',
  'Interlude',
  'Outro',
];

// ── Reflow Panel ──────────────────────────────────────────────────────────────
function ReflowPanel({ colors, isDarkMode, onApply, onClose }) {
  const c = colors;
  const [text, setText]     = useState('');
  const [blocks, setBlocks] = useState([]);
  const taRef               = useRef(null);

  // Auto-parse text → blocks
  useEffect(() => {
    if (!text.trim()) { setBlocks([]); return; }
    const sections = text.split(/\n{2,}/).filter(s => s.trim());
    setBlocks(prev =>
      sections.map((section, i) => {
        const lines      = section.trim().split('\n');
        const isLabel    = /^\[.+\]$/.test(lines[0]);
        const detected   = isLabel ? lines[0].replace(/[\[\]]/g, '') : null;
        const content    = (isLabel ? lines.slice(1) : lines).join('\n').trim();
        const existing   = prev[i];
        // Keep manual label edits if content unchanged
        const label = detected
          || (existing?.content === content && existing?.label)
          || autoGroupLabel(i, sections.length);
        return {
          id:      existing?.id || `rf-${i}-${Date.now()}`,
          label,
          content,
          custom:  GROUP_OPTIONS.includes(label) ? false : true,
        };
      })
    );
  }, [text]);

  const autoGroupLabel = (i, total) => {
    if (total <= 1) return 'Verse 1';
    if (i === 0 && total > 3) return 'Intro';
    if (i === total - 1 && total > 4) return 'Outro';
    const body = total > 3 ? i - 1 : i;
    const verseCount = Math.ceil((total - (total > 3 ? 2 : 0)) / 2);
    if (body < verseCount) return `Verse ${body + 1}`;
    const chorusIdx = body - verseCount;
    return chorusIdx === 0 ? 'Chorus' : `Chorus ${chorusIdx + 1}`;
  };

  // Ctrl/Cmd+Enter inserts a slide break
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const ta    = e.target;
      const pos   = ta.selectionStart;
      const before = text.slice(0, pos);
      const after  = text.slice(pos);
      const trailing = (before.match(/\n*$/) || [''])[0].length;
      const pad    = '\n'.repeat(Math.max(0, 2 - trailing));
      const next   = before + pad + after;
      setText(next);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = pos + pad.length;
      }, 0);
    }
  };

  const updateLabel = (i, label) =>
    setBlocks(prev => prev.map((b, idx) => idx === i ? { ...b, label, custom: false } : b));

  const setCustomLabel = (i, label) =>
    setBlocks(prev => prev.map((b, idx) => idx === i ? { ...b, label, custom: true } : b));

  const duplicate = (i) =>
    setBlocks(prev => {
      const next = [...prev];
      next.splice(i + 1, 0, { ...prev[i], id: `rf-dup-${Date.now()}` });
      return next;
    });

  const remove = (i) =>
    setBlocks(prev => prev.filter((_, idx) => idx !== i));

  const move = (i, dir) =>
    setBlocks(prev => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const handleApply = (mode) => {
    const slides = blocks
      .filter(b => b.content.trim())
      .map(b => ({
        id:         b.id,
        label:      b.label,
        content:    b.content,
        formatting: { ...DEFAULT_FMT },
      }));
    onApply(slides, mode);
  };

  const btnBase = {
    border: 'none', borderRadius: '7px', fontWeight: '600', fontSize: '12px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px',
  };
  const inputStyle = {
    padding: '5px 9px', borderRadius: '6px', border: `1px solid ${c.border}`,
    background: isDarkMode ? '#0d0d0f' : '#f9fafb', color: c.text,
    fontSize: '12px', outline: 'none',
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: c.bg, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', fontFamily: 'sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', background: c.card,
        borderBottom: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
      }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: c.primary }}>SLATE</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: c.heading }}>— Reflow</span>
        <span style={{ fontSize: '12px', color: c.muted }}>
          Press <kbd style={{ background: isDarkMode ? '#27272a' : '#e5e7eb', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px' }}>Ctrl+Enter</kbd> or <kbd style={{ background: isDarkMode ? '#27272a' : '#e5e7eb', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px' }}>⌘+Enter</kbd> to create a slide break
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '12px', color: c.muted, marginRight: '4px' }}>
          {blocks.filter(b => b.content.trim()).length} slide{blocks.filter(b => b.content.trim()).length !== 1 ? 's' : ''}
        </span>
        <button onClick={onClose}
          style={{ ...btnBase, background: 'transparent', border: `1px solid ${c.border}`, color: c.text }}>
          Cancel
        </button>
        <button
          onClick={() => handleApply('append')}
          disabled={blocks.length === 0}
          style={{ ...btnBase, background: 'transparent', border: `1px solid ${c.primary}`, color: c.primary, opacity: blocks.length === 0 ? 0.4 : 1 }}>
          Append to Slides
        </button>
        <button
          onClick={() => handleApply('replace')}
          disabled={blocks.length === 0}
          style={{ ...btnBase, background: c.primary, color: '#fff', opacity: blocks.length === 0 ? 0.4 : 1 }}>
          <Check size={14} /> Replace Slides
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: text input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '10px', minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: c.muted, lineHeight: '1.6' }}>
            Type or paste your full song below. Use <strong style={{ color: c.text }}>[Verse 1]</strong>, <strong style={{ color: c.text }}>[Chorus]</strong> labels on their own line to auto-label groups. Blank lines separate slides automatically.
          </div>
          <textarea
            ref={taRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`[Verse 1]\nAmazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see\n\n[Chorus]\nPraise the Lord\nPraise His name forever\n\n[Verse 2]\nTwas grace that taught my heart to fear\nAnd grace my fears relieved`}
            style={{
              flex: 1, resize: 'none', padding: '14px 16px',
              background: isDarkMode ? '#0d0d0f' : '#fafafa',
              color: c.text, fontSize: '14px', lineHeight: '1.75',
              border: `1px solid ${c.border}`, borderRadius: '10px',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: c.border, flexShrink: 0 }} />

        {/* Right: block list */}
        <div style={{ width: '360px', minWidth: '360px', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: c.card }}>
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${c.border}`,
            fontSize: '9px', fontWeight: '800', color: c.muted,
            textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0,
          }}>
            Slide Blocks
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {blocks.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: c.muted, fontSize: '13px', opacity: 0.6 }}>
                <Layers size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                Start typing to see slide blocks appear here
              </div>
            ) : (
              blocks.map((block, i) => (
                <ReflowBlock
                  key={block.id}
                  block={block}
                  index={i}
                  total={blocks.length}
                  onLabelChange={label => updateLabel(i, label)}
                  onCustomLabel={label => setCustomLabel(i, label)}
                  onDuplicate={() => duplicate(i)}
                  onDelete={() => remove(i)}
                  onMoveUp={() => move(i, -1)}
                  onMoveDown={() => move(i, 1)}
                  c={c}
                  isDarkMode={isDarkMode}
                  inputStyle={inputStyle}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reflow Block card ─────────────────────────────────────────────────────────
function ReflowBlock({ block, index, total, onLabelChange, onCustomLabel, onDuplicate, onDelete, onMoveUp, onMoveDown, c, isDarkMode, inputStyle }) {
  const [editingCustom, setEditingCustom] = useState(false);
  const [customVal, setCustomVal]         = useState('');
  const isCustom = !GROUP_OPTIONS.includes(block.label);

  const handleSelect = (val) => {
    if (val === '__custom__') {
      setCustomVal(block.label);
      setEditingCustom(true);
    } else {
      onLabelChange(val);
      setEditingCustom(false);
    }
  };

  const commitCustom = () => {
    if (customVal.trim()) onCustomLabel(customVal.trim());
    setEditingCustom(false);
  };

  const iconBtn = {
    background: 'none', border: 'none', cursor: 'pointer', color: c.muted,
    display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '5px',
  };

  return (
    <div style={{
      borderBottom: `1px solid ${c.border}`,
      padding: '10px 14px',
      background: 'transparent',
    }}>
      {/* Top row: label + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>

        {/* Group label selector */}
        {editingCustom ? (
          <input
            autoFocus
            value={customVal}
            onChange={e => setCustomVal(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={e => { if (e.key === 'Enter') commitCustom(); if (e.key === 'Escape') setEditingCustom(false); }}
            style={{ ...inputStyle, flex: 1, fontSize: '12px', fontWeight: '700' }}
            placeholder="Custom label..."
          />
        ) : (
          <select
            value={isCustom ? '__custom__' : block.label}
            onChange={e => handleSelect(e.target.value)}
            style={{
              ...inputStyle, flex: 1, fontWeight: '700', fontSize: '12px',
              appearance: 'auto', cursor: 'pointer',
            }}
          >
            {GROUP_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
            {isCustom && <option value="__custom__">{block.label} (custom)</option>}
            <option value="__custom__">Custom label...</option>
          </select>
        )}

        {/* Up / Down */}
        <button onClick={onMoveUp} disabled={index === 0} title="Move up"
          style={{ ...iconBtn, opacity: index === 0 ? 0.25 : 0.7 }}
          onMouseEnter={e => e.currentTarget.style.color = c.primary}
          onMouseLeave={e => e.currentTarget.style.color = c.muted}>
          <ArrowUp size={13} />
        </button>
        <button onClick={onMoveDown} disabled={index === total - 1} title="Move down"
          style={{ ...iconBtn, opacity: index === total - 1 ? 0.25 : 0.7 }}
          onMouseEnter={e => e.currentTarget.style.color = c.primary}
          onMouseLeave={e => e.currentTarget.style.color = c.muted}>
          <ArrowDown size={13} />
        </button>

        {/* Duplicate */}
        <button onClick={onDuplicate} title="Duplicate slide"
          style={{ ...iconBtn, opacity: 0.7 }}
          onMouseEnter={e => e.currentTarget.style.color = c.primary}
          onMouseLeave={e => e.currentTarget.style.color = c.muted}>
          <Copy size={13} />
        </button>

        {/* Delete */}
        <button onClick={onDelete} title="Remove slide"
          style={{ ...iconBtn, opacity: 0.7 }}
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = c.muted}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* Content preview */}
      <div style={{
        fontSize: '12px', color: c.text, lineHeight: '1.6',
        background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        borderRadius: '6px', padding: '8px 10px',
        border: `1px solid ${c.border}`,
        whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'hidden',
        position: 'relative',
      }}>
        {block.content || <span style={{ opacity: 0.35, fontStyle: 'italic' }}>Empty slide</span>}
        {block.content.split('\n').length > 4 && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '24px',
            background: `linear-gradient(transparent, ${isDarkMode ? '#18181b' : '#ffffff'})`,
          }} />
        )}
      </div>
    </div>
  );
}
