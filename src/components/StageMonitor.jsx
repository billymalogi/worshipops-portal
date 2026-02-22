import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PRESENTER_CHANNEL } from './StageView';

/**
 * StageMonitor — Confidence monitor for the stage / platform.
 * Shows the CURRENT slide large + NEXT slide below it.
 * Open in a browser window pointed at a stage monitor (floor monitor, tablet, etc.)
 */
export default function StageMonitor() {
  const [current, setCurrent]   = useState({ content: '', label: '', song: '' });
  const [next, setNext]         = useState('');
  const [isBlack, setIsBlack]   = useState(false);
  const [connected, setConnected] = useState(false);
  const [clock, setClock]       = useState(new Date());

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel(PRESENTER_CHANNEL);

    ch.on('broadcast', { event: 'slide' }, ({ payload }) => {
      setCurrent({
        content: payload.content  ?? '',
        label:   payload.label    ?? '',
        song:    payload.song     ?? '',
      });
      setNext(payload.nextContent ?? '');
      setIsBlack(payload.isBlack  ?? false);
    })
    .subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
    });

    return () => supabase.removeChannel(ch);
  }, []);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#0d1117',
      display: 'flex', flexDirection: 'column',
      color: 'white', overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      userSelect: 'none',
    }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 20px', background: '#161b22',
        borderBottom: '1px solid #21262d',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#10b981' : '#ef4444' }} />
          <span style={{ fontSize: '13px', color: '#8b949e', fontWeight: '500' }}>
            {current.song ? `♪ ${current.song}` : 'WorshipOps Stage Monitor'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {isBlack && (
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', letterSpacing: '1px', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
              ■ BLANK
            </div>
          )}
          <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: '700', color: '#f0f6fc', letterSpacing: '1px' }}>
            {timeStr}
          </div>
        </div>
      </div>

      {/* ── Current slide ──────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '30px 50px', background: '#0d1117',
      }}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          {current.label && (
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>
              {current.label}
            </div>
          )}
          <div style={{
            color: isBlack ? '#2d333b' : '#f0f6fc',
            fontSize: 'clamp(26px, 4.5vw, 64px)',
            fontWeight: '500',
            lineHeight: '1.4',
            whiteSpace: 'pre-line',
            transition: 'color 0.3s',
          }}>
            {current.content || (isBlack ? '(blank)' : '—')}
          </div>
        </div>
      </div>

      {/* ── Next slide ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 50px 20px',
        background: '#0f3460',
        borderTop: '2px solid #1f4e8c',
        minHeight: '130px', maxHeight: '35vh',
        flexShrink: 0, overflow: 'hidden',
      }}>
        <div style={{ fontSize: '10px', fontWeight: '800', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>
          NEXT →
        </div>
        <div style={{
          color: next ? '#c9d1d9' : '#4b5563',
          fontSize: 'clamp(14px, 2.2vw, 28px)',
          fontWeight: '400',
          lineHeight: '1.5',
          whiteSpace: 'pre-line',
        }}>
          {next || '— end of song —'}
        </div>
      </div>
    </div>
  );
}
