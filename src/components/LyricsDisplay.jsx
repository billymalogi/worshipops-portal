import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { PRESENTER_CHANNEL } from './StageView';

/**
 * LyricsDisplay — Full-screen audience display (projector window).
 *
 * Two-layer system:
 *   Layer 0 — Background: video loop or image (objectFit: cover)
 *   Layer 1 — Dark scrim overlay so text stays readable
 *   Layer 2 — Lyrics text (centered, large, serif)
 *
 * Background can be set two ways:
 *   • Drag & drop a video/image file onto this window (local blob)
 *   • Receive a bgUrl + bgType via broadcast from StageView (remote URL)
 *
 * Escape key toggles black screen.
 */
export default function LyricsDisplay() {
  const [content,   setContent]   = useState('');
  const [isBlack,   setIsBlack]   = useState(false);
  const [song,      setSong]      = useState('');
  const [connected, setConnected] = useState(false);

  // Background state
  const [bgUrl,     setBgUrl]     = useState('');
  const [bgType,    setBgType]    = useState(''); // 'video' | 'image' | ''
  const [isDragging, setIsDragging] = useState(false);

  // Keep a ref to the current local blob so we can revoke it when replaced
  const localBlobRef = useRef('');

  // â”€â”€ Supabase realtime subscription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const ch = supabase.channel(PRESENTER_CHANNEL);

    ch.on('broadcast', { event: 'slide' }, ({ payload }) => {
      setContent(payload.content ?? '');
      setIsBlack(payload.isBlack ?? false);
      setSong(payload.song       ?? '');

      // Only apply remote BG when there is no local drag-and-dropped file
      if (payload.bgUrl !== undefined && !localBlobRef.current) {
        setBgUrl(payload.bgUrl   ?? '');
        setBgType(payload.bgType ?? '');
      }
    })
    .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    return () => supabase.removeChannel(ch);
  }, []);

  // â”€â”€ Keyboard shortcut: Escape toggles blank â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setIsBlack(b => !b); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // â”€â”€ Drag & drop handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Revoke previous local blob to free memory
    if (localBlobRef.current) URL.revokeObjectURL(localBlobRef.current);

    const url  = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    localBlobRef.current = url;
    setBgUrl(url);
    setBgType(type);
  };

  const clearBg = () => {
    if (localBlobRef.current) {
      URL.revokeObjectURL(localBlobRef.current);
      localBlobRef.current = '';
    }
    setBgUrl('');
    setBgType('');
  };

  const hasBg = Boolean(bgUrl && bgType);

  return (
    <div
      style={{
        width: '100vw', height: '100vh',
        overflow: 'hidden', position: 'relative',
        background: '#000',
        fontFamily: 'Georgia, "Times New Roman", serif',
        userSelect: 'none',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {/* â”€â”€ Layer 0: Background video â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {hasBg && bgType === 'video' && (
        <video
          key={bgUrl}
          src={bgUrl}
          autoPlay loop muted playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', zIndex: 0,
          }}
        />
      )}

      {/* â”€â”€ Layer 0: Background image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {hasBg && bgType === 'image' && (
        <img
          key={bgUrl}
          src={bgUrl}
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', zIndex: 0,
          }}
        />
      )}

      {/* â”€â”€ Layer 1: Dark scrim (only when BG is active) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {hasBg && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 1,
        }} />
      )}

      {/* â”€â”€ Drag-over overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isDragging && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(59,130,246,0.18)',
          border: '5px dashed rgba(59,130,246,0.7)',
          pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>Drop video or image</div>
            <div style={{ fontSize: '15px', opacity: 0.7, marginTop: '8px' }}>
              It becomes the background layer — lyrics stay on top
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Connection indicator (top-left, very subtle) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{
        position: 'absolute', top: '14px', left: '18px', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: '6px',
        opacity: 0.35, fontSize: '11px', color: 'white',
      }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: connected ? '#10b981' : '#ef4444',
        }} />
        {connected ? 'Live' : 'Waiting…'}
      </div>

      {/* â”€â”€ Clear BG button (top-right, subtle) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {hasBg && (
        <button
          onClick={clearBg}
          style={{
            position: 'absolute', top: '14px', right: '18px', zIndex: 10,
            background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.7)', padding: '4px 12px',
            borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
          }}
        >
          Clear BG
        </button>
      )}

      {/* â”€â”€ Layer 2: Lyrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        {!isBlack && content && (
          <div style={{
            color: 'white',
            fontSize: 'clamp(30px, 5.5vw, 80px)',
            fontWeight: '400',
            textAlign: 'center',
            lineHeight: '1.45',
            padding: '60px 80px',
            // Heavier shadow when BG is active so text is always readable
            textShadow: hasBg
              ? '0 2px 24px rgba(0,0,0,1), 0 1px 8px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)'
              : '0 2px 12px rgba(0,0,0,0.9)',
            maxWidth: '88%',
            whiteSpace: 'pre-line',
            letterSpacing: '0.01em',
          }}>
            {content}
          </div>
        )}
      </div>

      {/* â”€â”€ Song title (bottom center, very subtle) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!isBlack && content && song && (
        <div style={{
          position: 'absolute', bottom: '28px', left: 0, right: 0,
          zIndex: 3, textAlign: 'center',
          fontSize: 'clamp(11px, 1.2vw, 16px)',
          color: 'rgba(255,255,255,0.22)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          {song}
        </div>
      )}

      {/* â”€â”€ Empty-state hint (when no BG and no lyrics) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!hasBg && !content && !isDragging && (
        <div style={{
          position: 'absolute', bottom: '40px', left: 0, right: 0,
          zIndex: 3, textAlign: 'center',
          color: 'rgba(255,255,255,0.1)', fontSize: '12px',
          pointerEvents: 'none',
        }}>
          Drag &amp; drop a video loop or image to set background
        </div>
      )}
    </div>
  );
}