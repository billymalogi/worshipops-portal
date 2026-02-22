import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  Monitor, Tv, Music, ChevronLeft, ChevronRight,
  ExternalLink, Wifi, WifiOff, Edit2, X, Check, Image, Video,
} from 'lucide-react';

// Supabase realtime channel used by LyricsDisplay + StageMonitor
export const PRESENTER_CHANNEL = 'worshipops_presenter';

// ─── Lyrics parser ────────────────────────────────────────────────────────────
// Splits lyrics text into slides on blank lines.
// Lines like [Verse 1] become slide labels.
const parseLyrics = (text = '') => {
  const sections = text.split(/\n\s*\n/).filter(s => s.trim());
  return sections.map((section, i) => {
    const lines = section.trim().split('\n');
    const isLabel = /^\[.+\]$/.test(lines[0]);
    return {
      id: i,
      label:   isLabel ? lines[0].replace(/[\[\]]/g, '') : `Slide ${i + 1}`,
      content: (isLabel ? lines.slice(1) : lines).join('\n').trim(),
    };
  });
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function StageView({ isDarkMode, songs = [], onRefresh }) {

  // ── Mode ───────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState('propresenter'); // 'propresenter' | 'builtin'

  // ── ProPresenter config ────────────────────────────────────────────────────
  const [ppIP,        setPpIP]        = useState('');
  const [ppPort,      setPpPort]      = useState('1025');
  const [ppView,      setPpView]      = useState('remote');
  const [ppConnected, setPpConnected] = useState(false);

  // ── Built-in presenter state ───────────────────────────────────────────────
  const [selectedSong,  setSelectedSong]  = useState(null);
  const [slides,        setSlides]        = useState([]);
  const [currentSlide,  setCurrentSlide]  = useState(-1);
  const [isBlack,       setIsBlack]       = useState(false);

  // ── Background control ─────────────────────────────────────────────────────
  const [bgUrl,      setBgUrl]      = useState(''); // URL sent in broadcast
  const [bgType,     setBgType]     = useState('video'); // 'video' | 'image'
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [showBgBar,  setShowBgBar]  = useState(false);

  // ── Edit lyrics modal ──────────────────────────────────────────────────────
  const [editingSong, setEditingSong] = useState(null); // song object
  const [editLyrics,  setEditLyrics]  = useState('');
  const [editSaving,  setEditSaving]  = useState(false);

  // ── Refs so broadcast() always has current values without being re-created ─
  const slidesRef      = useRef(slides);
  const selectedRef    = useRef(selectedSong);
  const isBlackRef     = useRef(isBlack);
  const bgUrlRef       = useRef(bgUrl);
  const bgTypeRef      = useRef(bgType);
  const currentSlideRef = useRef(currentSlide);
  const channelRef     = useRef(null);

  useEffect(() => { slidesRef.current       = slides;       }, [slides]);
  useEffect(() => { selectedRef.current     = selectedSong; }, [selectedSong]);
  useEffect(() => { isBlackRef.current      = isBlack;      }, [isBlack]);
  useEffect(() => { bgUrlRef.current        = bgUrl;        }, [bgUrl]);
  useEffect(() => { bgTypeRef.current       = bgType;       }, [bgType]);
  useEffect(() => { currentSlideRef.current = currentSlide; }, [currentSlide]);

  // ── Subscribe to channel once (broadcaster must be subscribed to send) ─────
  useEffect(() => {
    const ch = supabase.channel(PRESENTER_CHANNEL);
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') channelRef.current = ch;
    });
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, []);

  // ── Colors ─────────────────────────────────────────────────────────────────
  const c = {
    bg:      isDarkMode ? '#111827' : '#f9fafb',
    card:    isDarkMode ? '#1f2937' : '#ffffff',
    text:    isDarkMode ? '#d1d5db' : '#374151',
    heading: isDarkMode ? '#f9fafb' : '#111827',
    border:  isDarkMode ? '#374151' : '#e5e7eb',
    muted:   isDarkMode ? '#6b7280' : '#9ca3af',
    hover:   isDarkMode ? '#374151' : '#f3f4f6',
    primary: '#3b82f6',
    success: '#10b981',
    danger:  '#ef4444',
  };

  // ── Broadcast a slide to display + stage monitor ───────────────────────────
  // All values pulled from refs so the function is stable (doesn't need re-render)
  const broadcast = useCallback((slideIndex, overrides = {}) => {
    const ch = channelRef.current;
    if (!ch) return;
    const sl      = slidesRef.current;
    const song    = selectedRef.current;
    const black   = overrides.black   ?? isBlackRef.current;
    const bUrl    = overrides.bgUrl   ?? bgUrlRef.current;
    const bType   = overrides.bgType  ?? bgTypeRef.current;
    const slide   = slideIndex >= 0 ? sl[slideIndex] : null;

    ch.send({
      type: 'broadcast',
      event: 'slide',
      payload: {
        slideIndex,
        content:     slide?.content     || '',
        label:       slide?.label       || '',
        song:        song?.title        || '',
        isBlack:     black,
        nextContent: slideIndex >= 0 && slideIndex < sl.length - 1
          ? sl[slideIndex + 1]?.content
          : '',
        bgUrl:  bUrl,
        bgType: bType,
      },
    });
  }, []); // stable — all state read from refs

  // ── Song selection ─────────────────────────────────────────────────────────
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

  // ── BG control ─────────────────────────────────────────────────────────────
  const applyBg = () => {
    const url  = bgUrlInput.trim();
    const type = bgType;
    setBgUrl(url);
    broadcast(currentSlideRef.current, { bgUrl: url, bgType: type });
  };

  const clearBg = () => {
    setBgUrl('');
    setBgUrlInput('');
    broadcast(currentSlideRef.current, { bgUrl: '', bgType: bgType });
  };

  // ── Edit lyrics ────────────────────────────────────────────────────────────
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

    // If this song is currently loaded, re-parse its slides
    if (selectedSong?.id === editingSong.id) {
      const parsed = parseLyrics(editLyrics);
      setSlides(parsed);
      // Re-parse may change slide count; keep current index clamped
      const clamped = Math.min(currentSlideRef.current, parsed.length - 1);
      setCurrentSlide(clamped);
    }

    // Let Dashboard refresh so Songs tab is also up-to-date
    onRefresh?.();
    setEditingSong(null);
  };

  // ── Open display windows ───────────────────────────────────────────────────
  const openDisplay = () =>
    window.open('/display', 'worshipops_display', 'width=1920,height=1080,menubar=no,toolbar=no,status=no');
  const openStage = () =>
    window.open('/stage',   'worshipops_stage',   'width=1280,height=720,menubar=no,toolbar=no,status=no');

  // ── Shared button / input style ────────────────────────────────────────────
  const ppURL = ppConnected && ppIP
    ? `http://${ppIP}:${ppPort}${ppView === 'stage' ? '/stage' : '/'}`
    : '';

  const btnBase = {
    border: 'none', borderRadius: '7px', fontWeight: '600', fontSize: '13px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
  };
  const inputStyle = {
    padding: '6px 10px', borderRadius: '6px', border: `1px solid ${c.border}`,
    background: isDarkMode ? '#111827' : '#f9fafb', color: c.text, fontSize: '13px', outline: 'none',
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: 'calc(100vh - 108px)', display: 'flex', flexDirection: 'column', background: c.bg, overflow: 'hidden' }}>

      {/* ── Top mode toggle ─────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 20px', background: c.card, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', background: isDarkMode ? '#111827' : '#f3f4f6', borderRadius: '8px', padding: '3px', gap: '2px' }}>
          {[
            { id: 'propresenter', label: '🎬 ProPresenter' },
            { id: 'builtin',      label: '📺 Built-in Presenter' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              style={{ ...btnBase, background: mode === opt.id ? c.primary : 'transparent', color: mode === opt.id ? 'white' : c.text, padding: '6px 16px' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '12px', color: c.muted }}>
          {mode === 'propresenter'
            ? 'Embed ProPresenter 7 remote control directly in WorshipOps'
            : 'Use the built-in lyrics presenter — no ProPresenter required'}
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          PROPRESENTER MODE
      ══════════════════════════════════════════════════════════════════════ */}
      {mode === 'propresenter' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Connection bar */}
          <div style={{ padding: '10px 20px', background: isDarkMode ? '#1f2937' : '#f8fafc', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: c.text, whiteSpace: 'nowrap' }}>ProPresenter IP:</span>
            <input
              style={{ ...inputStyle, width: '140px' }}
              value={ppIP} onChange={e => { setPpIP(e.target.value); setPpConnected(false); }}
              placeholder="192.168.1.x"
            />
            <span style={{ fontSize: '12px', color: c.muted }}>Port:</span>
            <input
              style={{ ...inputStyle, width: '60px' }}
              value={ppPort} onChange={e => { setPpPort(e.target.value); setPpConnected(false); }}
            />
            <button
              onClick={() => setPpConnected(p => !p)}
              style={{ ...btnBase, background: ppConnected ? c.danger : c.primary, color: 'white', padding: '6px 14px' }}
            >
              {ppConnected ? <><WifiOff size={13} /> Disconnect</> : <><Wifi size={13} /> Connect</>}
            </button>

            <div style={{ width: '1px', height: '24px', background: c.border }} />

            {[
              { id: 'remote', label: '🖥 Remote View',    desc: 'Control slides' },
              { id: 'stage',  label: '🎤 Stage Display',  desc: 'Confidence monitor' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setPpView(v.id)}
                style={{ ...btnBase, border: `1px solid ${ppView === v.id ? c.primary : c.border}`, background: ppView === v.id ? (isDarkMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)') : 'transparent', color: ppView === v.id ? c.primary : c.text }}
              >
                {v.label}
              </button>
            ))}

            {ppConnected && ppURL && (
              <a href={ppURL} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: c.primary, fontSize: '12px', textDecoration: 'none', fontWeight: '500' }}>
                <ExternalLink size={12} /> Open full tab
              </a>
            )}
          </div>

          {/* iframe / splash */}
          {ppConnected && ppIP
            ? <iframe src={ppURL} style={{ flex: 1, border: 'none', width: '100%' }} title="ProPresenter Remote" />
            : <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px', opacity: 0.6 }}>
                <div style={{ fontSize: '72px', opacity: 0.3 }}>🎬</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: c.heading, opacity: 1 }}>Connect to ProPresenter 7</div>
                <div style={{ fontSize: '13px', color: c.muted, textAlign: 'center', maxWidth: '420px', lineHeight: '1.7' }}>
                  Enter the IP address of the Mac running ProPresenter 7 and click Connect.<br />
                  Make sure <strong>Network</strong> is enabled in ProPresenter Preferences (default port 1025).
                </div>
                <div style={{ padding: '12px 20px', borderRadius: '10px', background: c.card, border: `1px solid ${c.border}`, fontSize: '12px', color: c.text, lineHeight: '1.8', textAlign: 'left' }}>
                  <strong>ProPresenter 7 → Preferences → Network</strong><br />
                  ✓ Enable Network &nbsp;|&nbsp; Port: 1025<br />
                  ✓ Enable Stage Display (for confidence monitor)
                </div>
              </div>
          }
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          BUILT-IN PRESENTER MODE
      ══════════════════════════════════════════════════════════════════════ */}
      {mode === 'builtin' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── Main presenter layout ─────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* LEFT: Song library ───────────────────────────────────────── */}
            <div style={{ width: '220px', borderRight: `1px solid ${c.border}`, background: c.card, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
                Song Library
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {songs.length === 0
                  ? <div style={{ padding: '16px', fontSize: '12px', color: c.muted }}>No songs in library yet.</div>
                  : songs.map(song => (
                    <div
                      key={song.id}
                      onClick={() => selectSong(song)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        borderBottom: `1px solid ${c.border}`,
                        borderLeft: `3px solid ${selectedSong?.id === song.id ? c.primary : 'transparent'}`,
                        background: selectedSong?.id === song.id ? (isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)') : 'transparent',
                        display: 'flex', alignItems: 'flex-start', gap: '6px',
                      }}
                    >
                      {/* Song text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: selectedSong?.id === song.id ? c.primary : c.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {song.title}
                        </div>
                        {song.artist && <div style={{ fontSize: '11px', color: c.muted }}>{song.artist}</div>}
                        {!song.lyrics && <div style={{ fontSize: '10px', color: c.danger, marginTop: '2px' }}>no lyrics</div>}
                      </div>

                      {/* Edit button */}
                      <button
                        onClick={(e) => openEdit(e, song)}
                        title="Edit lyrics"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: c.muted, padding: '2px', borderRadius: '4px', flexShrink: 0,
                          display: 'flex', alignItems: 'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = c.primary}
                        onMouseLeave={e => e.currentTarget.style.color = c.muted}
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* CENTER: Slide control ────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Control bar */}
              <div style={{ padding: '8px 14px', background: c.card, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: c.heading, flex: 1, minWidth: '120px' }}>
                  {selectedSong ? selectedSong.title : 'No song selected'}
                </span>
                <button
                  onClick={toggleBlack}
                  style={{ ...btnBase, background: isBlack ? c.danger : (isDarkMode ? '#374151' : '#e5e7eb'), color: isBlack ? 'white' : c.text, padding: '5px 12px', fontWeight: '700' }}
                >
                  {isBlack ? '■ Blank' : '□ Blank Screen'}
                </button>
                {/* BG toggle */}
                <button
                  onClick={() => setShowBgBar(b => !b)}
                  style={{ ...btnBase, border: `1px solid ${showBgBar ? c.primary : c.border}`, background: showBgBar ? (isDarkMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)') : 'transparent', color: showBgBar ? c.primary : c.text, padding: '5px 12px' }}
                >
                  <Image size={13} /> Background
                </button>
                <button onClick={openDisplay} style={{ ...btnBase, background: 'transparent', border: `1px solid ${c.border}`, color: c.primary, padding: '5px 12px' }}>
                  <Tv size={13} /> Audience Display
                </button>
                <button onClick={openStage} style={{ ...btnBase, background: 'transparent', border: `1px solid ${c.border}`, color: c.primary, padding: '5px 12px' }}>
                  <Monitor size={13} /> Stage Monitor
                </button>
              </div>

              {/* BG URL bar (collapsible) */}
              {showBgBar && (
                <div style={{ padding: '10px 14px', background: isDarkMode ? '#161b22' : '#f0f9ff', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                  {/* Type toggle */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { id: 'video', icon: <Video size={12} />, label: 'Video' },
                      { id: 'image', icon: <Image size={12} />, label: 'Image' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setBgType(t.id)}
                        style={{ ...btnBase, padding: '4px 10px', fontSize: '12px', background: bgType === t.id ? c.primary : 'transparent', color: bgType === t.id ? 'white' : c.text, border: `1px solid ${bgType === t.id ? c.primary : c.border}` }}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>

                  <input
                    style={{ ...inputStyle, flex: 1, minWidth: '200px', fontSize: '12px' }}
                    value={bgUrlInput}
                    onChange={e => setBgUrlInput(e.target.value)}
                    placeholder="Paste a URL to a video loop or image…"
                    onKeyDown={e => { if (e.key === 'Enter') applyBg(); }}
                  />
                  <button
                    onClick={applyBg}
                    disabled={!bgUrlInput.trim()}
                    style={{ ...btnBase, padding: '5px 12px', background: bgUrlInput.trim() ? c.primary : c.hover, color: bgUrlInput.trim() ? 'white' : c.muted, fontSize: '12px' }}
                  >
                    <Check size={13} /> Set BG
                  </button>
                  {bgUrl && (
                    <button
                      onClick={clearBg}
                      style={{ ...btnBase, padding: '5px 12px', background: 'transparent', border: `1px solid ${c.border}`, color: c.danger, fontSize: '12px' }}
                    >
                      <X size={13} /> Clear
                    </button>
                  )}
                  {bgUrl && (
                    <span style={{ fontSize: '11px', color: c.success }}>
                      ✓ BG active — audience display will show it
                    </span>
                  )}
                </div>
              )}

              {/* Slides grid */}
              {selectedSong
                ? <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '10px', alignContent: 'start' }}>
                    <SlideTile label="LOGO / BLANK" content="" isActive={currentSlide === -1} onClick={() => goSlide(-1)} isDarkMode={isDarkMode} c={c} empty />
                    {slides.length === 0
                      ? <div style={{ gridColumn: '1/-1', padding: '24px', textAlign: 'center', color: c.muted, fontSize: '13px' }}>
                          This song has no lyrics yet. Click the <Edit2 size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> icon next to it in the library to add lyrics.
                        </div>
                      : slides.map((slide, i) => (
                        <SlideTile
                          key={slide.id}
                          label={slide.label}
                          content={slide.content}
                          isActive={currentSlide === i}
                          onClick={() => goSlide(i)}
                          isDarkMode={isDarkMode}
                          c={c}
                        />
                      ))
                    }
                  </div>
                : <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0.5 }}>
                    <Music size={48} />
                    <div style={{ fontSize: '15px', fontWeight: '600', color: c.heading, opacity: 1 }}>Select a song to present</div>
                  </div>
              }

              {/* Prev / Next bar */}
              {selectedSong && slides.length > 0 && (
                <div style={{ padding: '10px 14px', background: c.card, borderTop: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <button
                    onClick={() => goSlide(Math.max(-1, currentSlide - 1))}
                    disabled={currentSlide <= -1}
                    style={{ ...btnBase, border: `1px solid ${c.border}`, background: 'transparent', color: c.text, opacity: currentSlide <= -1 ? 0.35 : 1, cursor: currentSlide <= -1 ? 'not-allowed' : 'pointer' }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: c.muted }}>
                    {currentSlide === -1 ? 'Logo / blank' : `Slide ${currentSlide + 1} of ${slides.length}`}
                  </div>
                  <button
                    onClick={() => goSlide(Math.min(slides.length - 1, currentSlide + 1))}
                    disabled={currentSlide >= slides.length - 1}
                    style={{ ...btnBase, background: c.primary, color: 'white', opacity: currentSlide >= slides.length - 1 ? 0.35 : 1, cursor: currentSlide >= slides.length - 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT: Live preview pane ──────────────────────────────── */}
            <div style={{ width: '260px', borderLeft: `1px solid ${c.border}`, background: c.card, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `1px solid ${c.border}` }}>
                Live Preview
              </div>
              <div style={{ padding: '12px', borderBottom: `1px solid ${c.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: c.danger, marginBottom: '6px', letterSpacing: '1px' }}>● LIVE</div>
                <PreviewBox content={!isBlack && currentSlide >= 0 ? slides[currentSlide]?.content : ''} isDarkMode={isDarkMode} />
              </div>
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: c.muted, marginBottom: '6px', letterSpacing: '1px' }}>NEXT</div>
                <PreviewBox content={currentSlide >= 0 && currentSlide < slides.length - 1 ? slides[currentSlide + 1]?.content : ''} isDarkMode={isDarkMode} dim />
              </div>
              {bgUrl && (
                <div style={{ padding: '10px 12px', borderTop: `1px solid ${c.border}`, fontSize: '11px', color: c.success, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {bgType === 'video' ? <Video size={11} /> : <Image size={11} />}
                  BG {bgType} active
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          EDIT LYRICS MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {editingSong && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            width: '100%', maxWidth: '680px',
            background: c.card, borderRadius: '14px',
            border: `1px solid ${c.border}`,
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 60px)',
          }}>
            {/* Modal header */}
            <div style={{ padding: '18px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: c.heading }}>Edit Lyrics</div>
                <div style={{ fontSize: '12px', color: c.muted, marginTop: '2px' }}>{editingSong.title}</div>
              </div>
              <button onClick={() => setEditingSong(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Hint */}
            <div style={{ padding: '10px 20px', background: isDarkMode ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)', borderBottom: `1px solid ${c.border}`, fontSize: '12px', color: c.muted, flexShrink: 0 }}>
              Use <strong>[Verse 1]</strong>, <strong>[Chorus]</strong>, <strong>[Bridge]</strong> labels on their own line, then the lyrics below. Separate sections with a blank line.
            </div>

            {/* Textarea */}
            <textarea
              value={editLyrics}
              onChange={e => setEditLyrics(e.target.value)}
              style={{
                flex: 1, resize: 'none', padding: '16px 20px',
                background: isDarkMode ? '#111827' : '#f9fafb',
                color: c.text, fontSize: '13px', lineHeight: '1.7',
                border: 'none', outline: 'none',
                fontFamily: 'monospace', minHeight: '320px',
              }}
              placeholder={'[Verse 1]\nAmazing grace how sweet the sound\nThat saved a wretch like me\n\n[Chorus]\nPraise the Lord\nPraise His name'}
            />

            {/* Footer buttons */}
            <div style={{ padding: '14px 20px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
              <button
                onClick={() => setEditingSong(null)}
                style={{ ...btnBase, background: 'transparent', border: `1px solid ${c.border}`, color: c.text, padding: '8px 18px' }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                style={{ ...btnBase, background: c.primary, color: 'white', padding: '8px 18px', opacity: editSaving ? 0.7 : 1 }}
              >
                <Check size={14} /> {editSaving ? 'Saving…' : 'Save Lyrics'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Slide tile ───────────────────────────────────────────────────────────────
function SlideTile({ label, content, isActive, onClick, isDarkMode, c, empty }) {
  return (
    <div
      onClick={onClick}
      style={{
        aspectRatio: '16/9', borderRadius: '8px', cursor: 'pointer', padding: '10px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        overflow: 'hidden', position: 'relative', transition: 'all 0.1s',
        border: `2px solid ${isActive ? c.primary : c.border}`,
        background: empty ? '#000' : (isActive ? (isDarkMode ? '#1e3a5f' : '#eff6ff') : (isDarkMode ? '#111827' : '#f8fafc')),
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = c.muted; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isActive ? c.primary : c.border; }}
    >
      <div style={{ fontSize: '9px', fontWeight: '700', color: isActive ? c.primary : c.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      {!empty && content && (
        <div style={{ fontSize: '10px', color: isActive ? c.heading : c.text, lineHeight: '1.5', overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center', paddingTop: '4px' }}>
          {content.split('\n').slice(0, 4).join('\n')}
          {content.split('\n').length > 4 && '…'}
        </div>
      )}
      {empty && <div style={{ color: '#444', fontSize: '11px', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>LOGO / BLANK</div>}
      {isActive && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: c.primary }} />}
    </div>
  );
}

// ─── Preview box ──────────────────────────────────────────────────────────────
function PreviewBox({ content, isDarkMode, dim }) {
  return (
    <div style={{
      aspectRatio: '16/9', borderRadius: '6px', background: dim ? (isDarkMode ? '#111827' : '#f1f5f9') : '#000',
      border: dim ? `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', overflow: 'hidden',
    }}>
      {content
        ? <div style={{ color: dim ? (isDarkMode ? '#d1d5db' : '#374151') : 'white', fontSize: '10px', textAlign: 'center', lineHeight: '1.5', whiteSpace: 'pre-line', opacity: dim ? 0.7 : 1 }}>{content}</div>
        : <div style={{ color: '#555', fontSize: '10px' }}>{dim ? '(end of song)' : '—'}</div>
      }
    </div>
  );
}