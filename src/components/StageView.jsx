import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Monitor, Tv, Music, ChevronLeft, ChevronRight, ChevronDown,
  ExternalLink, Wifi, WifiOff, X, Check, Image, Video, ImageOff, MonitorOff,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Plus, Minus, Eye, EyeOff, Edit2, Type, Search, SlidersHorizontal,
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
    bg:       'var(--page)',
    card:     'var(--card)',
    panel:    'var(--deep)',
    deep:     'var(--deep)',
    text:     'var(--text-2)',
    heading:  'var(--text-1)',
    border:   'var(--line)',
    border2:  'var(--line-2)',
    muted:    'var(--text-3)',
    hover:    'var(--raised)',
    primary:  'var(--accent)',
    ink:      'var(--accent-ink)',
    soft:     'var(--accent-soft)',
    onAccent: 'var(--on-accent)',
    success:  'var(--positive)',
    danger:   'var(--negative)',
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

  // ── Output windows: open + track whether they're still open ───────────────
  const displayWinRef = useRef(null);
  const stageWinRef   = useRef(null);
  const [outputs, setOutputs] = useState({ display: false, stage: false });
  const syncOutputs = useCallback(() => {
    const d = !!displayWinRef.current && !displayWinRef.current.closed;
    const s = !!stageWinRef.current && !stageWinRef.current.closed;
    setOutputs(o => (o.display === d && o.stage === s) ? o : { display: d, stage: s });
  }, []);
  useEffect(() => {
    const id = setInterval(syncOutputs, 1000);
    return () => clearInterval(id);
  }, [syncOutputs]);

  const openDisplay = () => {
    displayWinRef.current = window.open('/display', 'worshipops_display', 'width=1920,height=1080,menubar=no,toolbar=no,status=no');
    syncOutputs();
  };
  const openStage = () => {
    stageWinRef.current = window.open('/stage', 'worshipops_stage', 'width=1280,height=720,menubar=no,toolbar=no,status=no');
    syncOutputs();
  };

  // ── Operator panels ───────────────────────────────────────────────────────
  const [libSearch, setLibSearch] = useState('');
  const [showLook,  setShowLook]  = useState(false);

  // ── Keyboard: ← → move, B blacks out ──────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (ppMode || showReflow || editingSong) return;
      const n   = slidesRef.current.length;
      const cur = currentSlideRef.current;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
        if (!n) return;
        e.preventDefault();
        goSlide(Math.min(n - 1, cur + 1));
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        goSlide(Math.max(-1, cur - 1));
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleBlack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── Shared styles ─────────────────────────────────────────────────────────
  const btnBase = {
    height: '32px', padding: '0 12px', borderRadius: 'var(--r-control)', fontWeight: 500, fontSize: '13px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit', whiteSpace: 'nowrap',
    transition: 'background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease)',
  };
  const btnSecondary = { ...btnBase, border: `1px solid ${c.border2}`, background: c.card, color: c.heading };
  const btnGhost     = { ...btnBase, border: '1px solid transparent', background: 'transparent', color: c.text };
  const btnPrimary   = { ...btnBase, border: 'none', background: c.primary, color: c.onAccent, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' };
  const inputStyle = {
    height: '32px', padding: '0 10px', borderRadius: 'var(--r-control)', border: `1px solid ${c.border2}`,
    background: c.bg, color: c.heading, fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const sectionLabel = { fontSize: '13px', fontWeight: 500, color: c.heading };
  const kbd = { fontFamily: 'var(--font-mono)', fontSize: '11px', color: c.text, background: c.hover, border: `1px solid ${c.border2}`, borderBottomWidth: '2px', borderRadius: '4px', padding: '0 5px', lineHeight: '16px' };
  const ppURL = ppConnected && ppIP
    ? `http://${ppIP}:${ppPort}${ppView === 'stage' ? '/stage' : '/'}`
    : '';

  // ── Active slide formatting (for the Look panel) ──────────────────────────
  const activeFmt = useMemo(() => (
    currentSlide >= 0 && slides[currentSlide]
      ? slides[currentSlide].formatting
      : DEFAULT_FMT
  ), [currentSlide, slides]);

  // ─────────────────────────────────────────────────────────────────────────
  // PROPRESENTER MODE (remote panel)
  if (ppMode) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: c.bg, fontFamily: 'var(--font-sans)' }}>
      <div style={{ height: '56px', padding: '0 16px', background: c.card, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
        <button onClick={() => setPpMode(false)} style={btnSecondary}>
          <ChevronLeft size={16} strokeWidth={1.5} /> Back to Slate
        </button>
        <span style={{ fontSize: '13px', color: c.muted, marginLeft: '8px' }}>ProPresenter address</span>
        <input style={{ ...inputStyle, width: '140px', fontFamily: 'var(--font-mono)' }} value={ppIP}
          onChange={e => { setPpIP(e.target.value); setPpConnected(false); }} placeholder="192.168.1.20" />
        <span style={{ fontSize: '13px', color: c.muted }}>Port</span>
        <input style={{ ...inputStyle, width: '64px', fontFamily: 'var(--font-mono)' }} value={ppPort}
          onChange={e => { setPpPort(e.target.value); setPpConnected(false); }} />
        <button onClick={() => setPpConnected(p => !p)} style={ppConnected ? btnSecondary : btnPrimary}>
          {ppConnected ? <><WifiOff size={16} strokeWidth={1.5} /> Disconnect</> : <><Wifi size={16} strokeWidth={1.5} /> Connect</>}
        </button>
        <div style={{ display: 'flex', gap: '2px', padding: '2px', background: c.hover, border: `1px solid ${c.border}`, borderRadius: 'var(--r-control)' }}>
          {[{ id: 'remote', label: 'Remote' }, { id: 'stage', label: 'Stage' }].map(v => (
            <button key={v.id} onClick={() => setPpView(v.id)}
              style={{ ...btnBase, height: '26px', padding: '0 10px', border: 'none', borderRadius: '6px', background: ppView === v.id ? c.card : 'transparent', boxShadow: ppView === v.id ? 'var(--shadow-sm)' : 'none', color: ppView === v.id ? c.heading : c.text }}>
              {v.label}
            </button>
          ))}
        </div>
        {ppConnected && ppURL && (
          <a href={ppURL} target="_blank" rel="noreferrer"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: c.ink, fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>
            <ExternalLink size={14} strokeWidth={1.5} /> Open in a tab
          </a>
        )}
      </div>
      {ppConnected && ppIP
        ? <iframe src={ppURL} style={{ flex: 1, border: 'none', width: '100%' }} title="ProPresenter remote" />
        : <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Monitor size={24} strokeWidth={1.5} color={c.muted} />
            <div style={{ fontSize: '16px', fontWeight: 500, color: c.heading, marginTop: '4px' }}>Connect to ProPresenter 7</div>
            <div style={{ fontSize: '13px', color: c.text, textAlign: 'center', maxWidth: '400px', lineHeight: '20px' }}>
              Enter the address of the computer running ProPresenter 7. Turn on Network in its preferences; the default port is 1025.
            </div>
          </div>
      }
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SLATE MODE
  const liveSlide = currentSlide >= 0 ? slides[currentSlide] : null;
  const nextIndex = currentSlide + 1 < slides.length ? currentSlide + 1 : -2;
  const nextSlide = nextIndex >= 0 ? slides[nextIndex] : null;
  const q = libSearch.trim().toLowerCase();
  const libSongs = q
    ? songs.filter(s => (s.title || '').toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q))
    : songs;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: c.bg, overflow: 'hidden', fontFamily: 'var(--font-sans)', position: 'relative' }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div style={{
        minHeight: '56px', padding: '8px 16px', background: c.card, borderBottom: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Song in play */}
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ fontSize: '15px', fontWeight: 500, color: selectedSong ? c.heading : c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedSong ? selectedSong.title : 'No song loaded'}
          </div>
          <div style={{ fontSize: '12px', color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedSong ? (selectedSong.artist || 'Slate') : 'Pick a song from the library'}
          </div>
        </div>

        {/* Clear controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => goSlide(-1)} title="Take the lyrics off screen" style={btnGhost}>
            <Type size={16} strokeWidth={1.5} /> Clear text
          </button>
          <button onClick={clearBg} disabled={!bgUrl} title="Remove the background" style={{ ...btnGhost, opacity: bgUrl ? 1 : 0.45, cursor: bgUrl ? 'pointer' : 'default' }}>
            <ImageOff size={16} strokeWidth={1.5} /> Clear background
          </button>
          <button onClick={toggleBlack} title="Black out the audience screen (B)"
            style={{ ...btnBase, border: `1px solid ${isBlack ? c.heading : c.border2}`, background: isBlack ? c.heading : c.card, color: isBlack ? c.card : c.heading }}>
            <MonitorOff size={16} strokeWidth={1.5} /> {isBlack ? 'Blacked out' : 'Black'}
          </button>
        </div>

        <div style={{ width: '1px', height: '24px', background: c.border, margin: '0 4px' }} />

        {/* Outputs + tools */}
        <OutputBtn label="Audience" open={outputs.display} onClick={openDisplay} icon={Tv} style={btnSecondary} />
        <OutputBtn label="Stage" open={outputs.stage} onClick={openStage} icon={Monitor} style={btnSecondary} />
        <button onClick={() => setShowBgBar(b => !b)} style={{ ...btnGhost, background: showBgBar ? c.hover : 'transparent' }}>
          <Image size={16} strokeWidth={1.5} /> Background
        </button>
        <button onClick={() => setShowReflow(true)} style={btnGhost}>
          <Layers size={16} strokeWidth={1.5} /> Reflow
        </button>
        <button onClick={() => setPpMode(true)} title="Control ProPresenter 7 instead" style={{ ...btnGhost, color: c.muted }}>
          <ExternalLink size={16} strokeWidth={1.5} /> ProPresenter
        </button>
      </div>

      {/* ── BACKGROUND BAR (collapsible) ─────────────────────────────────── */}
      {showBgBar && (
        <div style={{ padding: '8px 16px', background: c.deep, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '2px', padding: '2px', background: c.hover, border: `1px solid ${c.border}`, borderRadius: 'var(--r-control)' }}>
            {[{ id: 'video', icon: Video, label: 'Video' }, { id: 'image', icon: Image, label: 'Image' }].map(t => (
              <button key={t.id} onClick={() => setBgType(t.id)}
                style={{ ...btnBase, height: '26px', padding: '0 10px', border: 'none', borderRadius: '6px', background: bgType === t.id ? c.card : 'transparent', boxShadow: bgType === t.id ? 'var(--shadow-sm)' : 'none', color: bgType === t.id ? c.heading : c.text }}>
                <t.icon size={14} strokeWidth={1.5} /> {t.label}
              </button>
            ))}
          </div>
          <input style={{ ...inputStyle, flex: 1, minWidth: '220px' }} value={bgUrlInput}
            onChange={e => setBgUrlInput(e.target.value)}
            placeholder="Link to a video loop or image"
            onKeyDown={e => { if (e.key === 'Enter') applyBg(); }} />
          <button onClick={applyBg} disabled={!bgUrlInput.trim()} style={{ ...btnPrimary, opacity: bgUrlInput.trim() ? 1 : 0.5 }}>
            <Check size={16} strokeWidth={1.5} /> Set background
          </button>
          {bgUrl && (
            <span style={{ fontSize: '13px', color: c.text, display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--positive)' }} /> Background on
            </span>
          )}
        </div>
      )}

      {/* ── MAIN BODY ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Library ───────────────────────────────────────────────── */}
        <div style={{ width: '240px', minWidth: '240px', borderRight: `1px solid ${c.border}`, background: c.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} strokeWidth={1.5} color={c.muted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder="Search songs"
                style={{ ...inputStyle, width: '100%', paddingLeft: '34px' }} />
            </div>
          </div>
          <div style={{ padding: '12px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', color: c.muted }}>Songs</span>
            <span style={{ fontSize: '12px', color: c.muted, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{libSongs.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
            {libSongs.length === 0
              ? <div style={{ padding: '8px', fontSize: '13px', color: c.muted }}>{songs.length === 0 ? 'No songs yet' : 'No matches'}</div>
              : libSongs.map(song => {
                const sel = selectedSong?.id === song.id;
                return (
                  <div key={song.id} onClick={() => selectSong(song)}
                    style={{
                      padding: '8px 4px 8px 10px', cursor: 'pointer', borderRadius: 'var(--r-control)', marginBottom: '2px',
                      background: sel ? c.hover : 'transparent',
                      boxShadow: sel ? `inset 2px 0 0 ${c.primary}` : 'none',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      transition: 'background-color var(--t-fast) var(--ease)',
                    }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = c.hover; }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: song.lyrics ? c.heading : c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {song.title}
                      </div>
                      <div style={{ fontSize: '12px', color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {song.lyrics ? (song.artist || ' ') : 'No lyrics yet'}
                      </div>
                    </div>
                    <button onClick={(e) => openEdit(e, song)} title="Edit lyrics" className="wo-icon-btn"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, width: '28px', height: '28px', borderRadius: 'var(--r-control)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Edit2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* ── CENTER: Slide grid + transport ───────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', alignContent: 'start' }}>

            <SlateTile
              label="Clear"
              number="0"
              content=""
              isLive={currentSlide === -1}
              onClick={() => goSlide(-1)}
              formatting={DEFAULT_FMT}
              c={c}
              isBlankSlate
            />

            {!selectedSong
              ? <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '48px 24px', border: `1px dashed ${c.border2}`, borderRadius: 'var(--r-card)', background: c.card }}>
                  <Music size={24} strokeWidth={1.5} color={c.muted} />
                  <div style={{ fontSize: '15px', fontWeight: 500, color: c.heading }}>Pick a song to build its slides</div>
                  <div style={{ fontSize: '13px', color: c.text }}>Each verse and chorus becomes its own slide</div>
                </div>
              : slides.length === 0
                ? <div style={{ gridColumn: '1/-1', padding: '24px', textAlign: 'center', color: c.text, fontSize: '14px', border: `1px dashed ${c.border2}`, borderRadius: 'var(--r-card)', background: c.card }}>
                    This song has no lyrics yet. Use the pencil next to it in the library to add them.
                  </div>
                : slides.map((slide, i) => (
                  <SlateTile
                    key={slide.id}
                    label={slide.label}
                    number={String(i + 1)}
                    content={slide.content}
                    isLive={currentSlide === i}
                    isNext={nextIndex === i}
                    onClick={() => goSlide(i)}
                    formatting={slide.formatting}
                    c={c}
                  />
                ))
            }

            <div
              onClick={addBlankSlate}
              role="button"
              style={{
                borderRadius: 'var(--r-card)', cursor: 'pointer', minHeight: '120px',
                border: `1px dashed ${c.border2}`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '8px',
                color: c.text, fontSize: '13px', fontWeight: 500,
                transition: 'border-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = c.muted; e.currentTarget.style.color = c.heading; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.border2; e.currentTarget.style.color = c.text; }}
            >
              <Plus size={16} strokeWidth={1.5} /> Add blank slide
            </div>
          </div>

          {/* Transport */}
          <div style={{ height: '56px', padding: '0 16px', background: c.card, borderTop: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <button onClick={() => goSlide(Math.max(-1, currentSlide - 1))} disabled={currentSlide <= -1}
              style={{ ...btnSecondary, height: '36px', opacity: currentSlide <= -1 ? 0.45 : 1, cursor: currentSlide <= -1 ? 'default' : 'pointer' }}>
              <ChevronLeft size={16} strokeWidth={1.5} /> Previous
            </button>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', color: c.text, minWidth: 0 }}>
              {liveSlide && <span style={{ width: 8, height: 8, borderRadius: '2px', background: groupColor(liveSlide.label), flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {liveSlide ? liveSlide.label : 'Clear'}
              </span>
              {slides.length > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: c.muted, fontVariantNumeric: 'tabular-nums' }}>
                  {currentSlide + 1} / {slides.length}
                </span>
              )}
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: c.muted, whiteSpace: 'nowrap' }}>
              <span style={kbd}>←</span><span style={kbd}>→</span> move <span style={{ ...kbd, marginLeft: '8px' }}>B</span> black
            </span>
            <button onClick={() => goSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide >= slides.length - 1}
              style={{ ...btnPrimary, height: '36px', opacity: currentSlide >= slides.length - 1 ? 0.45 : 1, cursor: currentSlide >= slides.length - 1 ? 'default' : 'pointer' }}>
              Next <ChevronRight size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── RIGHT: Outputs + slide inspector ────────────────────────────── */}
        <div style={{ width: '320px', minWidth: '320px', borderLeft: `1px solid ${c.border}`, background: c.card, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Live */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isBlack ? c.muted : c.primary, boxShadow: isBlack ? 'none' : '0 0 0 3px var(--accent-soft)' }} />
              <span style={sectionLabel}>Live</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: c.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                {isBlack ? 'Blacked out' : liveSlide ? liveSlide.label : 'Clear'}
              </span>
            </div>
            <SlatePreview
              content={!isBlack && liveSlide ? liveSlide.content : ''}
              formatting={!isBlack && liveSlide ? liveSlide.formatting : null}
              bgOn={!!bgUrl && !isBlack}
              live
              c={c}
            />
          </div>

          {/* Next */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ ...sectionLabel, color: c.text }}>Next</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: c.muted }}>{nextSlide ? nextSlide.label : 'End of song'}</span>
            </div>
            <SlatePreview
              content={nextSlide ? nextSlide.content : ''}
              formatting={nextSlide ? nextSlide.formatting : null}
              emptyText={selectedSong ? 'End of song' : ''}
              dim
              c={c}
            />
          </div>

          <div style={{ height: '1px', background: c.border, margin: '16px 0 0', flexShrink: 0 }} />

          {/* Slide inspector */}
          {liveSlide ? (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '2px', background: groupColor(liveSlide.label) }} />
                  <span style={sectionLabel}>{liveSlide.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: c.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={kbd}>Ctrl</span><span style={kbd}>Enter</span>
                  </span>
                </div>
                <textarea
                  value={editingSlideText}
                  onChange={e => setEditingSlideText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) applySlideText(editingSlideText); }}
                  placeholder="Slide text"
                  style={{
                    resize: 'vertical', padding: '8px 12px', minHeight: '112px',
                    background: c.bg, color: c.heading, fontSize: '14px', lineHeight: '22px',
                    border: `1px solid ${c.border2}`, borderRadius: 'var(--r-control)', outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box', width: '100%',
                  }}
                />
                <button
                  onClick={() => applySlideText(editingSlideText)}
                  disabled={editingSlideText === liveSlide.content}
                  style={{ ...btnSecondary, justifyContent: 'center', opacity: editingSlideText === liveSlide.content ? 0.5 : 1 }}
                >
                  <Check size={16} strokeWidth={1.5} /> Update live text
                </button>
              </div>

              {/* Look */}
              <button
                onClick={() => setShowLook(v => !v)}
                style={{ ...btnBase, height: '44px', borderRadius: 0, border: 'none', borderTop: `1px solid ${c.border}`, background: 'transparent', color: c.heading, padding: '0 16px', justifyContent: 'flex-start' }}
              >
                <SlidersHorizontal size={16} strokeWidth={1.5} color={c.muted} />
                Look
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: c.muted, fontWeight: 400 }}>
                  {FONT_FAMILIES.find(f => f.value === activeFmt.fontFamily)?.label || 'Custom'} · {activeFmt.fontSize}
                </span>
                <ChevronDown size={16} strokeWidth={1.5} color={c.muted} style={{ transform: showLook ? 'rotate(180deg)' : 'none', transition: 'transform var(--t-fast) var(--ease)' }} />
              </button>
              {showLook && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select value={activeFmt.fontFamily} onChange={e => updateFormatting('fontFamily', e.target.value)}
                      style={{ ...inputStyle, flex: 1, minWidth: 0 }}>
                      {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${c.border2}`, borderRadius: 'var(--r-control)', overflow: 'hidden', height: '32px', boxSizing: 'border-box' }}>
                      <button onClick={() => updateFormatting('fontSize', Math.max(12, activeFmt.fontSize - 2))} title="Smaller"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, width: '28px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={14} strokeWidth={1.5} />
                      </button>
                      <input type="number" min="12" max="200" value={activeFmt.fontSize}
                        onChange={e => updateFormatting('fontSize', parseInt(e.target.value) || 52)}
                        style={{ width: '40px', textAlign: 'center', border: 'none', background: 'transparent', color: c.heading, fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none' }} />
                      <button onClick={() => updateFormatting('fontSize', Math.min(200, activeFmt.fontSize + 2))} title="Larger"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, width: '28px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap' }}>
                    <FmtBtn icon={Bold} title="Bold" active={activeFmt.fontWeight === '700' || activeFmt.fontWeight === 'bold'}
                      onClick={() => updateFormatting('fontWeight', activeFmt.fontWeight === '700' ? '400' : '700')} />
                    <FmtBtn icon={Italic} title="Italic" active={activeFmt.fontStyle === 'italic'}
                      onClick={() => updateFormatting('fontStyle', activeFmt.fontStyle === 'italic' ? 'normal' : 'italic')} />
                    <FmtBtn icon={Underline} title="Underline" active={activeFmt.textDecoration === 'underline'}
                      onClick={() => updateFormatting('textDecoration', activeFmt.textDecoration === 'underline' ? 'none' : 'underline')} />
                    <FmtBtn title="All caps" active={activeFmt.uppercase} onClick={() => updateFormatting('uppercase', !activeFmt.uppercase)}>Aa</FmtBtn>
                    <FmtBtn icon={activeFmt.shadowEnabled ? Eye : EyeOff} title={activeFmt.shadowEnabled ? 'Text shadow on' : 'Text shadow off'}
                      active={activeFmt.shadowEnabled} onClick={() => updateFormatting('shadowEnabled', !activeFmt.shadowEnabled)} />
                    <div style={{ width: '1px', height: '20px', background: c.border, margin: '0 4px' }} />
                    {[
                      { icon: AlignLeft, val: 'left', title: 'Align left' },
                      { icon: AlignCenter, val: 'center', title: 'Align center' },
                      { icon: AlignRight, val: 'right', title: 'Align right' },
                      { icon: AlignJustify, val: 'justify', title: 'Justify' },
                    ].map(({ icon, val, title }) => (
                      <FmtBtn key={val} icon={icon} title={title} active={activeFmt.textAlign === val} onClick={() => updateFormatting('textAlign', val)} />
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                    {[
                      { label: 'Text', key: 'color', val: activeFmt.color },
                      { label: 'Slide fill', key: 'bgColor', val: activeFmt.bgColor || '#000000', clearable: !!activeFmt.bgColor },
                    ].map(({ label, key, val, clearable }) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: c.text }}>
                        <input type="color" value={val} onChange={e => updateFormatting(key, e.target.value)} title={label}
                          style={{ width: '32px', height: '32px', borderRadius: 'var(--r-control)', border: `1px solid ${c.border2}`, padding: '3px', cursor: 'pointer', background: c.card, boxSizing: 'border-box' }} />
                        {label}
                        {clearable && (
                          <button onClick={(e) => { e.preventDefault(); updateFormatting('bgColor', ''); }} title="Remove slide fill"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, display: 'flex', padding: 0, marginLeft: 'auto' }}>
                            <X size={14} strokeWidth={1.5} />
                          </button>
                        )}
                      </label>
                    ))}
                    {[
                      { label: 'Line height', key: 'lineHeight', min: 0.8, max: 3, step: 0.05, val: activeFmt.lineHeight, fallback: 1.35 },
                      { label: 'Letter spacing', key: 'letterSpacing', min: -5, max: 20, step: 0.5, val: activeFmt.letterSpacing, fallback: 0 },
                    ].map(f => (
                      <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: c.muted }}>
                        {f.label}
                        <input type="number" min={f.min} max={f.max} step={f.step} value={f.val}
                          onChange={e => updateFormatting(f.key, parseFloat(e.target.value) || f.fallback)}
                          style={{ ...inputStyle, width: '100%', fontFamily: 'var(--font-mono)' }} />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '16px', fontSize: '13px', color: c.muted, lineHeight: '20px' }}>
              Put a slide on screen to edit its text and look here.
            </div>
          )}

          {bgUrl && (
            <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: `1px solid ${c.border}`, fontSize: '13px', color: c.text, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--positive)' }} />
              {bgType === 'video' ? 'Video background on' : 'Image background on'}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '660px', background: c.card, borderRadius: 'var(--r-panel)', border: `1px solid ${c.border2}`, boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 16px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '16px', color: c.heading }}>Edit lyrics</div>
                <div style={{ fontSize: '13px', color: c.muted, marginTop: '2px' }}>{editingSong.title}</div>
              </div>
              <button onClick={() => setEditingSong(null)} title="Close" className="wo-icon-btn"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, width: '32px', height: '32px', borderRadius: 'var(--r-control)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div style={{ padding: '12px 24px', background: c.deep, borderBottom: `1px solid ${c.border}`, fontSize: '13px', color: c.text, flexShrink: 0, lineHeight: '20px' }}>
              Put a label like <code style={kbd}>[Verse 1]</code> or <code style={kbd}>[Chorus]</code> on its own line, and leave a blank line between sections.
            </div>
            <textarea
              value={editLyrics}
              onChange={e => setEditLyrics(e.target.value)}
              style={{ flex: 1, resize: 'none', padding: '16px 24px', background: c.card, color: c.heading, fontSize: '14px', lineHeight: '22px', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', minHeight: '300px' }}
              placeholder={'[Verse 1]\nAmazing grace how sweet the sound\n\n[Chorus]\nPraise the Lord'}
            />
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => setEditingSong(null)} style={{ ...btnSecondary, height: '36px' }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={editSaving} style={{ ...btnPrimary, height: '36px', opacity: editSaving ? 0.7 : 1 }}>
                <Check size={16} strokeWidth={1.5} /> {editSaving ? 'Saving…' : 'Save lyrics'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Look panel toggle button ────────────────────────────────────────────────────────
function FmtBtn({ icon: Icon, active, title, onClick, disabled, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: '32px', height: '32px', padding: children ? '0 8px' : 0, borderRadius: 'var(--r-control)',
        border: `1px solid ${active ? 'var(--accent-line)' : 'transparent'}`,
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent-ink)' : disabled ? 'var(--text-3)' : 'var(--text-2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontFamily: 'inherit', fontSize: '12px', fontWeight: 500,
      }}
    >
      {Icon ? <Icon size={16} strokeWidth={1.5} /> : children}
    </button>
  );
}

// ── Output window button with an open/closed dot ──────────────────────────────────────────
function OutputBtn({ label, open, onClick, icon: Icon, style }) {
  return (
    <button onClick={onClick} title={open ? `${label} window is open. Click to bring it back` : `Open the ${label.toLowerCase()} window`} style={style}>
      <Icon size={16} strokeWidth={1.5} />
      {label}
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: open ? 'var(--positive)' : 'transparent', boxShadow: open ? 'none' : 'inset 0 0 0 1px var(--text-3)' }} />
    </button>
  );
}

// ── Group colors: each section type gets one color, used on its label bar ────
const GROUP_COLORS = [
  [/^pre[- ]?chorus/i,              '#a67bd8'],
  [/^(chorus|refrain)/i,            '#d8615b'],
  [/^bridge/i,                      '#d99a33'],
  [/^(tag|vamp|coda)/i,             '#35a587'],
  [/^(intro|outro|ending|interlude|instrumental)/i, '#8a919c'],
  [/^(verse|slide)/i,               '#5b8fd8'],
];
const groupColor = (label = '') => (GROUP_COLORS.find(([re]) => re.test(label.trim()))?.[1]) || '#8a919c';

// ── Slate tile: a miniature screen with its group bar ────────────────────────
function SlateTile({ label, number, content, isLive, isNext, onClick, formatting, c, isBlankSlate }) {
  const fmt = formatting || DEFAULT_FMT;
  const displayText = fmt.uppercase ? content.toUpperCase() : content;
  const shadow = fmt.shadowEnabled
    ? `${fmt.shadowX * 0.4}px ${fmt.shadowY * 0.4}px ${fmt.shadowBlur * 0.4}px ${fmt.shadowColor}`
    : 'none';
  const col = isBlankSlate ? '#8a919c' : groupColor(label);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick(); }}
      style={{
        borderRadius: 'var(--r-card)', cursor: 'pointer', overflow: 'hidden',
        background: c.card,
        border: `1px solid ${isLive ? c.primary : c.border}`,
        boxShadow: isLive ? `0 0 0 1px ${c.primary}, var(--shadow-lg)` : 'var(--shadow-sm)',
        display: 'flex', flexDirection: 'column', outline: 'none',
        transition: 'border-color var(--t-fast) var(--ease), box-shadow var(--t-fast) var(--ease)',
      }}
      onMouseEnter={e => { if (!isLive) e.currentTarget.style.borderColor = c.muted; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isLive ? c.primary : c.border; }}
    >
      {/* The screen */}
      <div style={{
        aspectRatio: '16/9', background: isBlankSlate ? '#000' : (fmt.bgColor || '#000'),
        display: 'flex', alignItems: 'center',
        justifyContent: fmt.textAlign === 'left' ? 'flex-start' : fmt.textAlign === 'right' ? 'flex-end' : 'center',
        padding: '8px 12px', overflow: 'hidden', position: 'relative',
      }}>
        {!isBlankSlate && displayText && (
          <div style={{
            fontSize: `${Math.max(9, fmt.fontSize * 0.2)}px`,
            fontFamily: fmt.fontFamily, fontWeight: fmt.fontWeight, fontStyle: fmt.fontStyle,
            textDecoration: fmt.textDecoration, color: fmt.color, textAlign: fmt.textAlign,
            lineHeight: fmt.lineHeight, letterSpacing: `${fmt.letterSpacing * 0.2}px`,
            textShadow: shadow, width: '100%', whiteSpace: 'pre-line', overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical',
          }}>
            {displayText}
          </div>
        )}
        {isLive && (
          <span style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '4px', padding: '0 6px', borderRadius: '4px', background: c.primary, color: c.onAccent, fontSize: '11px', fontWeight: 500, lineHeight: '18px' }}>
            Live
          </span>
        )}
        {isNext && !isLive && (
          <span style={{ position: 'absolute', top: '8px', right: '8px', padding: '0 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.85)', fontSize: '11px', fontWeight: 500, lineHeight: '18px' }}>
            Next
          </span>
        )}
      </div>
      {/* Group bar */}
      <div style={{ height: '32px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', borderTop: `3px solid ${col}`, background: `${col}14` }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: c.muted, fontVariantNumeric: 'tabular-nums', minWidth: '12px' }}>{number}</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: c.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
    </div>
  );
}

// ── Output preview (right column): always the projector's black ─────────────
function SlatePreview({ content, formatting, dim, live, bgOn, emptyText = '', c }) {
  const fmt = formatting || DEFAULT_FMT;
  const displayText = fmt.uppercase ? (content || '').toUpperCase() : (content || '');
  const shadow = fmt.shadowEnabled
    ? `${fmt.shadowX * 0.3}px ${fmt.shadowY * 0.3}px ${fmt.shadowBlur * 0.3}px ${fmt.shadowColor}`
    : 'none';

  return (
    <div style={{
      aspectRatio: '16/9', borderRadius: 'var(--r-control)',
      background: fmt.bgColor || '#000',
      border: `1px solid ${live ? 'var(--accent-line)' : c.border}`,
      display: 'flex', alignItems: 'center', padding: '12px',
      overflow: 'hidden', position: 'relative', boxSizing: 'border-box',
      justifyContent: fmt.textAlign === 'left' ? 'flex-start' : fmt.textAlign === 'right' ? 'flex-end' : 'center',
    }}>
      {displayText
        ? <div style={{
            fontSize: `${Math.max(9, fmt.fontSize * (live ? 0.26 : 0.22))}px`,
            fontFamily: fmt.fontFamily, fontWeight: fmt.fontWeight, fontStyle: fmt.fontStyle,
            textDecoration: fmt.textDecoration, color: fmt.color, textAlign: fmt.textAlign,
            lineHeight: fmt.lineHeight, letterSpacing: `${fmt.letterSpacing * 0.25}px`,
            textShadow: shadow, width: '100%', whiteSpace: 'pre-line',
            opacity: dim ? 0.6 : 1,
          }}>
            {displayText}
          </div>
        : emptyText
          ? <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', width: '100%', textAlign: 'center' }}>{emptyText}</div>
          : null
      }
      {bgOn && (
        <span style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>bg</span>
      )}
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
