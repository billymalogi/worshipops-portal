import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─── Track type colors ─────────────────────────────────────────────────────────
const TYPE_COLORS = {
  drums:  { accent: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: '#b45309' },
  bass:   { accent: '#10b981', bg: 'rgba(16,185,129,0.12)',  label: '#065f46' },
  guitar: { accent: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  label: '#1d4ed8' },
  keys:   { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: '#6d28d9' },
  vocals: { accent: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  label: '#0e7490' },
  click:  { accent: '#eab308', bg: 'rgba(234,179,8,0.12)',  label: '#92400e' },
  other:  { accent: '#6b7280', bg: 'rgba(107,114,128,0.12)',label: '#374151' },
};

const guessType = (name) => {
  const n = name.toLowerCase();
  if (/drum|perc|kick|snare|hihat|overhead/.test(n)) return 'drums';
  if (/bass/.test(n))                                 return 'bass';
  if (/guitar|gtr|acoustic|electric/.test(n))         return 'guitar';
  if (/key|piano|organ|synth|rhodes|pad/.test(n))     return 'keys';
  if (/voc|bgv|choir|lead|harmony|soprano|alto/.test(n)) return 'vocals';
  if (/click|metro|count/.test(n))                    return 'click';
  return 'other';
};

const fmtTime = (sec) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function RehearsalMixer({ isDarkMode }) {
  const [tracks,  setTracks]  = useState([]); // { id, name, type, buffer, volume, muted, solo, loading, error }
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  // Audio internals — never cause re-renders
  const ctxRef      = useRef(null);
  const gainRefs    = useRef({});   // id → GainNode
  const sourceRefs  = useRef({});   // id → AudioBufferSourceNode
  const startedRef  = useRef(0);    // ctx.currentTime when play() was called
  const offsetRef   = useRef(0);    // seconds into the track at last play()
  const playingRef  = useRef(false);
  const tracksRef   = useRef([]);
  const rafRef      = useRef(null);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  // ── Get / init AudioContext ─────────────────────────────────────────────────
  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  };

  // ── Derive current gain for a track ────────────────────────────────────────
  const effectiveGain = (track, allTracks) => {
    const hasSolo = allTracks.some(t => t.solo && t.buffer);
    if (hasSolo) return track.solo ? track.volume : 0;
    return track.muted ? 0 : track.volume;
  };

  // ── Apply gain to all running GainNodes (no restart needed) ────────────────
  const applyGains = useCallback((updatedTracks) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    updatedTracks.forEach(t => {
      if (gainRefs.current[t.id]) {
        gainRefs.current[t.id].gain.setValueAtTime(effectiveGain(t, updatedTracks), now);
      }
    });
  }, []);

  // ── Stop all sources ────────────────────────────────────────────────────────
  const stopSources = useCallback(() => {
    Object.values(sourceRefs.current).forEach(src => { try { src.stop(); } catch (_) {} });
    sourceRefs.current = {};
  }, []);

  // ── RAF loop — update elapsed time ─────────────────────────────────────────
  const tick = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const e = ctx.currentTime - startedRef.current + offsetRef.current;
    setElapsed(e);
    const dur = Math.max(0, ...tracksRef.current.map(t => t.buffer?.duration || 0));
    if (dur > 0 && e >= dur) {
      // End of track — auto-stop
      stopSources();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
      offsetRef.current = 0;
      setElapsed(dur);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [stopSources]);

  // ── Start all sources from `offset` seconds ─────────────────────────────────
  const startSources = useCallback((offset = 0) => {
    const ctx = getCtx();
    const startAt = ctx.currentTime + 0.05;
    const tks = tracksRef.current;

    tks.forEach(t => {
      if (!t.buffer) return;

      // Create / recreate GainNode if needed
      if (!gainRefs.current[t.id]) {
        const g = ctx.createGain();
        g.connect(ctx.destination);
        gainRefs.current[t.id] = g;
      }
      gainRefs.current[t.id].gain.setValueAtTime(effectiveGain(t, tks), ctx.currentTime);

      const src = ctx.createBufferSource();
      src.buffer = t.buffer;
      src.connect(gainRefs.current[t.id]);
      src.start(startAt, Math.min(offset, t.buffer.duration - 0.001));
      sourceRefs.current[t.id] = src;
    });

    startedRef.current = startAt - offset;
    offsetRef.current  = offset;
  }, []);

  // ── Transport controls ──────────────────────────────────────────────────────
  const play = useCallback(() => {
    startSources(offsetRef.current);
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [startSources, tick]);

  const pause = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx) offsetRef.current = ctx.currentTime - startedRef.current + offsetRef.current;
    stopSources();
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
  }, [stopSources]);

  const seekTo = useCallback((sec) => {
    const wasPlaying = playingRef.current;
    if (wasPlaying) {
      stopSources();
      cancelAnimationFrame(rafRef.current);
    }
    offsetRef.current = sec;
    setElapsed(sec);
    if (wasPlaying) {
      startSources(sec);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [stopSources, startSources, tick]);

  const restart = useCallback(() => {
    if (playing) {
      stopSources();
      cancelAnimationFrame(rafRef.current);
    }
    offsetRef.current = 0;
    setElapsed(0);
    if (playing) {
      startSources(0);
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [playing, stopSources, startSources, tick]);

  // ── Load a file into a track ────────────────────────────────────────────────
  const loadFile = useCallback(async (file, id) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, loading: true, error: '' } : t));
    try {
      const ctx = getCtx();
      const ab  = await file.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      setTracks(prev => {
        const updated = prev.map(t => t.id === id ? { ...t, buffer: buf, loading: false } : t);
        const maxDur  = Math.max(0, ...updated.map(t => t.buffer?.duration || 0));
        setDuration(maxDur);
        return updated;
      });
    } catch (err) {
      setTracks(prev => prev.map(t =>
        t.id === id ? { ...t, loading: false, error: 'Could not decode audio' } : t
      ));
    }
  }, []);

  // ── Add a track from a File ─────────────────────────────────────────────────
  const addTrack = useCallback((file) => {
    const id   = `${Date.now()}-${Math.random()}`;
    const type = guessType(file.name);
    const col  = TYPE_COLORS[type];
    setTracks(prev => [...prev, { id, name: file.name.replace(/\.[^.]+$/, ''), type, buffer: null, volume: 1, muted: false, solo: false, loading: false, error: '', col }]);
    loadFile(file, id);
  }, [loadFile]);

  // ── Remove a track ──────────────────────────────────────────────────────────
  const removeTrack = useCallback((id) => {
    if (sourceRefs.current[id]) { try { sourceRefs.current[id].stop(); } catch (_) {} delete sourceRefs.current[id]; }
    if (gainRefs.current[id])   { try { gainRefs.current[id].disconnect(); } catch (_) {} delete gainRefs.current[id]; }
    setTracks(prev => {
      const updated = prev.filter(t => t.id !== id);
      const maxDur  = Math.max(0, ...updated.map(t => t.buffer?.duration || 0));
      setDuration(maxDur);
      return updated;
    });
  }, []);

  // ── Volume slider ───────────────────────────────────────────────────────────
  const setVolume = useCallback((id, vol) => {
    setTracks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, volume: vol } : t);
      applyGains(updated);
      return updated;
    });
  }, [applyGains]);

  // ── Mute toggle ─────────────────────────────────────────────────────────────
  const toggleMute = useCallback((id) => {
    setTracks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, muted: !t.muted } : t);
      applyGains(updated);
      return updated;
    });
  }, [applyGains]);

  // ── Solo toggle ─────────────────────────────────────────────────────────────
  const toggleSolo = useCallback((id) => {
    setTracks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, solo: !t.solo } : t);
      applyGains(updated);
      return updated;
    });
  }, [applyGains]);

  // ── Drag-and-drop onto mixer ────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    [...e.dataTransfer.files].forEach(f => {
      if (f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name)) addTrack(f);
    });
  };

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      stopSources();
      if (ctxRef.current) { try { ctxRef.current.close(); } catch (_) {} }
    };
  }, [stopSources]);

  // ── Colors ─────────────────────────────────────────────────────────────────
  const c = {
    bg:      isDarkMode ? '#111827' : '#f9fafb',
    card:    isDarkMode ? '#1f2937' : '#ffffff',
    text:    isDarkMode ? '#d1d5db' : '#374151',
    heading: isDarkMode ? '#f9fafb' : '#111827',
    border:  isDarkMode ? '#374151' : '#e5e7eb',
    muted:   isDarkMode ? '#6b7280' : '#9ca3af',
    hover:   isDarkMode ? '#374151' : '#f3f4f6',
    stripe:  isDarkMode ? '#161b22' : '#f8fafc',
  };

  const hasTracks  = tracks.length > 0;
  const progress   = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;
  const hasSolo    = tracks.some(t => t.solo);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ height: 'calc(100vh - 108px)', display: 'flex', flexDirection: 'column', background: c.bg, overflow: 'hidden' }}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
    >

      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 20px', background: c.card, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: c.heading }}>Rehearsal Mixer</div>
          <div style={{ fontSize: '12px', color: c.muted, marginTop: '1px' }}>
            Load stems · mute, solo, or adjust volume per instrument · rehearse your part
          </div>
        </div>
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          cursor: 'pointer', background: '#3b82f6', color: 'white',
          padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', flexShrink: 0,
        }}>
          + Add Tracks
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
            multiple
            style={{ display: 'none' }}
            onChange={e => [...e.target.files].forEach(addTrack)}
          />
        </label>
      </div>

      {/* ── Transport bar (only when tracks exist) ───────────────────────────── */}
      {hasTracks && (
        <div style={{ padding: '10px 20px', background: c.stripe, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>

          {/* Restart */}
          <button
            onClick={restart}
            title="Back to start"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, fontSize: '18px', lineHeight: 1, padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            ⏮
          </button>

          {/* Play / Pause */}
          <button
            onClick={playing ? pause : play}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: 'none', background: '#3b82f6', color: 'white',
              cursor: 'pointer', fontSize: '18px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            {playing ? '⏸' : '▶'}
          </button>

          {/* Time */}
          <div style={{ fontFamily: 'monospace', fontSize: '13px', color: c.text, minWidth: '96px', flexShrink: 0 }}>
            {fmtTime(elapsed)} / {fmtTime(duration)}
          </div>

          {/* Scrubber */}
          <div
            style={{ flex: 1, height: '6px', background: isDarkMode ? '#374151' : '#e5e7eb', borderRadius: '3px', cursor: 'pointer', position: 'relative' }}
            onClick={e => {
              if (!duration) return;
              const r = e.currentTarget.getBoundingClientRect();
              seekTo(((e.clientX - r.left) / r.width) * duration);
            }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: '#3b82f6', borderRadius: '3px', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '50%', left: `${progress}%`, transform: 'translate(-50%, -50%)', width: '14px', height: '14px', borderRadius: '50%', background: '#3b82f6', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
          </div>

          {/* Solo indicator */}
          {hasSolo && (
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#f59e0b', letterSpacing: '1px', padding: '3px 8px', borderRadius: '5px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>
              SOLO
            </div>
          )}
        </div>
      )}

      {/* ── Channel strips / empty state ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {!hasTracks ? (

          /* ── Empty state ─────────────────────────────────────────────────── */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', opacity: 0.18 }}>🎛️</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: c.heading }}>Drop Your Stem Files Here</div>
            <div style={{ fontSize: '13px', color: c.muted, maxWidth: '500px', lineHeight: '1.85' }}>
              Download stems from <strong>Multitracks.com</strong>, <strong>Loop Community</strong>, or export them from your DAW.
              You can also use tracks from <strong>CCLI Rehearse</strong> or <strong>WorshipTraining.com</strong>.<br />
              Load each instrument separately — then mute, solo, or adjust volume to rehearse your part.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
              {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'other').map(([type, col]) => (
                <span key={type} style={{ padding: '4px 12px', borderRadius: '20px', background: col.bg, color: col.label, fontSize: '12px', fontWeight: '600', border: `1px solid ${col.accent}40`, textTransform: 'capitalize' }}>
                  {type}
                </span>
              ))}
            </div>
            <label style={{ cursor: 'pointer', padding: '10px 22px', borderRadius: '8px', border: `2px dashed ${c.border}`, color: c.muted, fontSize: '13px', marginTop: '4px' }}>
              or click to browse files
              <input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" multiple style={{ display: 'none' }} onChange={e => [...e.target.files].forEach(addTrack)} />
            </label>
          </div>

        ) : (

          /* ── Track rows ──────────────────────────────────────────────────── */
          <div style={{ height: '100%', overflowY: 'auto' }}>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '12px 180px 72px 60px 60px 1fr 52px 28px', alignItems: 'center', gap: '10px', padding: '8px 20px', borderBottom: `1px solid ${c.border}`, background: c.stripe }}>
              <div />
              <div style={{ fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Track</div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Mute</div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Solo</div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Level</div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Volume</div>
              <div />
              <div />
            </div>

            {tracks.map((track, idx) => {
              const col        = TYPE_COLORS[track.type] || TYPE_COLORS.other;
              const isActive   = hasSolo ? track.solo : !track.muted;
              const gainVal    = effectiveGain(track, tracks);

              return (
                <div
                  key={track.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '12px 180px 72px 60px 60px 1fr 52px 28px',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 20px',
                    borderBottom: `1px solid ${c.border}`,
                    background: idx % 2 === 0 ? c.card : c.stripe,
                    opacity: isActive ? 1 : 0.45,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Color bar */}
                  <div style={{ width: '4px', height: '36px', borderRadius: '2px', background: col.accent, alignSelf: 'center' }} />

                  {/* Name + type badge */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: c.heading, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.loading ? '⏳ Decoding…' : track.error ? `⚠ ${track.error}` : track.name}
                    </div>
                    <span style={{ display: 'inline-block', marginTop: '3px', padding: '1px 7px', borderRadius: '10px', background: col.bg, color: col.label, fontSize: '10px', fontWeight: '700', textTransform: 'capitalize', border: `1px solid ${col.accent}30` }}>
                      {track.type}
                    </span>
                  </div>

                  {/* Mute button */}
                  <button
                    onClick={() => toggleMute(track.id)}
                    disabled={!track.buffer}
                    style={{
                      padding: '5px 0', borderRadius: '6px', border: 'none',
                      background: track.muted ? '#ef4444' : (isDarkMode ? '#374151' : '#e5e7eb'),
                      color: track.muted ? 'white' : c.text,
                      fontSize: '11px', fontWeight: '800', cursor: track.buffer ? 'pointer' : 'default',
                      letterSpacing: '0.5px',
                    }}
                  >
                    M
                  </button>

                  {/* Solo button */}
                  <button
                    onClick={() => toggleSolo(track.id)}
                    disabled={!track.buffer}
                    style={{
                      padding: '5px 0', borderRadius: '6px', border: 'none',
                      background: track.solo ? '#f59e0b' : (isDarkMode ? '#374151' : '#e5e7eb'),
                      color: track.solo ? 'white' : c.text,
                      fontSize: '11px', fontWeight: '800', cursor: track.buffer ? 'pointer' : 'default',
                      letterSpacing: '0.5px',
                    }}
                  >
                    S
                  </button>

                  {/* Mini level meter */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{ width: '10px', height: '28px', background: isDarkMode ? '#374151' : '#e5e7eb', borderRadius: '3px', overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse' }}>
                      <div style={{ height: `${gainVal * 100}%`, background: col.accent, transition: 'height 0.08s' }} />
                    </div>
                    <div style={{ fontSize: '9px', color: c.muted }}>{Math.round(gainVal * 100)}%</div>
                  </div>

                  {/* Volume slider */}
                  <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={track.volume}
                    disabled={!track.buffer}
                    onChange={e => setVolume(track.id, parseFloat(e.target.value))}
                    style={{ width: '100%', cursor: track.buffer ? 'pointer' : 'default', accentColor: col.accent }}
                  />

                  {/* Volume label */}
                  <div style={{ fontSize: '12px', color: c.muted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(track.volume * 100)}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeTrack(track.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, fontSize: '16px', lineHeight: 1, padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = c.muted}
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* Add more tracks row */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', cursor: 'pointer', color: c.muted, fontSize: '13px', borderTop: `1px dashed ${c.border}` }}>
              <div style={{ width: '4px', height: '28px', borderRadius: '2px', background: c.border }} />
              <span style={{ fontSize: '18px' }}>+</span> Add another track
              <input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" multiple style={{ display: 'none' }} onChange={e => [...e.target.files].forEach(addTrack)} />
            </label>

          </div>
        )}
      </div>
    </div>
  );
}