import React, { useState, useRef } from 'react';
import {
  Wifi, WifiOff, Monitor, ExternalLink, Package,
  ChevronRight, ChevronDown, RefreshCw, AlertCircle
} from 'lucide-react';

// ─── Software registry ────────────────────────────────────────────────────────
const SOFTWARE = [
  {
    id: 'lightkey',
    name: 'Lightkey',
    platform: 'macOS',
    defaultPort: 9090,
    agentRequired: true,
    logo: '💡',
    desc: 'Timeline-based lighting design for macOS.',
    hint: 'Requires the WorshipOps Lighting Agent running on the Mac.',
  },
  {
    id: 'chamsys',
    name: 'Chamsys MagicQ',
    platform: 'Windows / macOS / Linux',
    defaultPort: 8080,
    agentRequired: false,
    logo: '🎛️',
    desc: 'Professional console software with a built-in web server.',
    hint: 'No agent needed — MagicQ serves a web UI directly on port 8080.',
  },
  {
    id: 'vista',
    name: 'Vista (Jands)',
    platform: 'Windows / macOS',
    defaultPort: 9090,
    agentRequired: true,
    logo: '🌟',
    desc: 'Timeline-based lighting control from Jands.',
    hint: 'Requires the WorshipOps Lighting Agent running on the Vista machine.',
  },
  {
    id: 'other',
    name: 'Other / Custom',
    platform: 'Any',
    defaultPort: 9090,
    agentRequired: true,
    logo: '🔌',
    desc: 'Connect any software via the WorshipOps Lighting Agent.',
    hint: 'Install and run the agent on the lighting computer.',
  },
];

// ─── Setup guide steps ────────────────────────────────────────────────────────
const AGENT_STEPS = [
  { icon: '⬇️', text: 'Download WorshipOps-Lighting-Agent.exe (Windows) or WorshipOps-Lighting-Agent-macOS from your admin portal.' },
  { icon: '▶️', text: 'Double-click the file on your lighting computer — no install needed, it runs immediately.' },
  { icon: '📋', text: 'A small window will open showing your Network IP (e.g. 192.168.1.45). Copy that address.' },
  { icon: '🔗', text: 'Paste the IP here, confirm the port (default 9090), then click Connect.' },
];

export default function LightingController({ isDarkMode }) {
  const [selectedSW, setSelectedSW]           = useState(null);
  const [ipAddress, setIpAddress]             = useState('');
  const [port, setPort]                       = useState('');
  const [status, setStatus]                   = useState('idle'); // idle | connecting | connected | error
  const [iframeUrl, setIframeUrl]             = useState('');
  const [showGuide, setShowGuide]             = useState(false);
  const iframeRef = useRef(null);

  const c = {
    bg:       isDarkMode ? '#111827' : '#f9fafb',
    card:     isDarkMode ? '#1f2937' : '#ffffff',
    text:     isDarkMode ? '#d1d5db' : '#374151',
    heading:  isDarkMode ? '#f9fafb' : '#111827',
    border:   isDarkMode ? '#374151' : '#e5e7eb',
    muted:    isDarkMode ? '#6b7280' : '#9ca3af',
    hover:    isDarkMode ? '#374151' : '#f3f4f6',
    code:     isDarkMode ? '#374151' : '#f3f4f6',
    primary:  '#3b82f6',
    success:  '#10b981',
    warning:  '#f59e0b',
    danger:   '#ef4444',
  };

  const statusDot = { idle: c.muted, connecting: c.warning, connected: c.success, error: c.danger }[status];
  const statusText = { idle: 'Not connected', connecting: 'Connecting…', connected: `Connected — ${ipAddress}:${port}`, error: 'Connection failed' }[status];

  const selectSW = (sw) => {
    setSelectedSW(sw);
    setPort(String(sw.defaultPort));
    setStatus('idle');
    setIframeUrl('');
  };

  const connect = () => {
    if (!ipAddress || !port) return;
    setStatus('connecting');
    setIframeUrl(`http://${ipAddress}:${port}`);
    setTimeout(() => setStatus('connected'), 1800);
  };

  const disconnect = () => {
    setStatus('idle');
    setIframeUrl('');
  };

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: '6px',
    border: `1px solid ${c.border}`, background: isDarkMode ? '#111827' : '#f9fafb',
    color: c.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ height: 'calc(100vh - 108px)', display: 'flex', background: c.bg, overflow: 'hidden' }}>

      {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
      <div style={{ width: '320px', borderRight: `1px solid ${c.border}`, background: c.card, display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${c.border}` }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: c.heading }}>Lighting Design Hub</h2>
          <p style={{ margin: 0, fontSize: '12px', color: c.muted }}>Connect to your design software on the local network</p>
        </div>

        {/* Software list */}
        <div style={{ padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Select Software</div>
          {SOFTWARE.map(sw => (
            <div
              key={sw.id}
              onClick={() => selectSW(sw)}
              style={{
                padding: '12px', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer',
                border: `1px solid ${selectedSW?.id === sw.id ? c.primary : c.border}`,
                background: selectedSW?.id === sw.id ? (isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : 'transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (selectedSW?.id !== sw.id) e.currentTarget.style.background = c.hover; }}
              onMouseLeave={e => { if (selectedSW?.id !== sw.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '22px' }}>{sw.logo}</span>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: c.heading }}>{sw.name}</div>
                    <div style={{ fontSize: '11px', color: c.muted }}>{sw.platform}</div>
                  </div>
                </div>
                {sw.agentRequired
                  ? <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: c.code, color: c.muted, whiteSpace: 'nowrap' }}>agent req.</span>
                  : <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.12)', color: c.success, whiteSpace: 'nowrap' }}>direct</span>
                }
              </div>
            </div>
          ))}
        </div>

        {/* Connection config */}
        {selectedSW && (
          <div style={{ padding: '14px', borderTop: `1px solid ${c.border}` }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Connection</div>

            <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '4px' }}>Lighting Computer IP</label>
            <input style={{ ...inputStyle, marginBottom: '10px' }} value={ipAddress} onChange={e => setIpAddress(e.target.value)} placeholder="e.g. 192.168.1.45" />

            <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '4px' }}>Port</label>
            <input style={{ ...inputStyle, marginBottom: '4px' }} value={port} onChange={e => setPort(e.target.value)} placeholder={String(selectedSW.defaultPort)} />
            {!selectedSW.agentRequired && (
              <div style={{ fontSize: '11px', color: c.success, marginBottom: '10px' }}>✓ {selectedSW.name} serves a web UI — no agent needed</div>
            )}
            <div style={{ height: '10px' }} />

            {status === 'connected'
              ? <button onClick={disconnect} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${c.border}`, background: 'transparent', color: c.danger, fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <WifiOff size={14} /> Disconnect
                </button>
              : status === 'connecting'
              ? <button disabled style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: c.warning, color: 'white', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <RefreshCw size={13} /> Connecting…
                </button>
              : <button onClick={connect} disabled={!ipAddress || !port} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: (!ipAddress || !port) ? c.hover : c.primary, color: (!ipAddress || !port) ? c.muted : 'white', fontWeight: '600', fontSize: '13px', cursor: (!ipAddress || !port) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Wifi size={14} /> Connect
                </button>
            }

            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
              <span style={{ color: statusDot }}>{statusText}</span>
            </div>
          </div>
        )}

        {/* Agent setup guide */}
        {selectedSW?.agentRequired && (
          <div style={{ padding: '14px', borderTop: `1px solid ${c.border}` }}>
            <button
              onClick={() => setShowGuide(g => !g)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: c.primary, fontSize: '13px', fontWeight: '600', padding: 0 }}
            >
              <Package size={13} /> Agent Setup Guide {showGuide ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {showGuide && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: c.text }}>
                {AGENT_STEPS.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: '1.4' }}>{step.icon}</span>
                    <span style={{ lineHeight: '1.6' }}>{step.text}</span>
                  </div>
                ))}
                <div style={{ marginTop: '6px', padding: '10px 12px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px', border: `1px solid rgba(59,130,246,0.2)`, fontSize: '12px', color: c.primary, fontWeight: '600' }}>
                  No Node.js, no terminal, no install steps — just double-click and go.
                </div>
                <div style={{ marginTop: '8px', padding: '8px 10px', background: isDarkMode ? 'rgba(245,158,11,0.1)' : '#fef3c7', borderRadius: '6px', color: isDarkMode ? c.warning : '#92400e', fontSize: '11px', border: `1px solid ${isDarkMode ? 'rgba(245,158,11,0.2)' : '#fde68a'}` }}>
                  ⚠ Both devices must be on the <strong>same Wi-Fi / LAN</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL — Viewer ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: isDarkMode ? '#0d1117' : '#f1f5f9', overflow: 'hidden' }}>

        {/* Viewer toolbar */}
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${c.border}`, background: c.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Monitor size={15} color={c.muted} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: c.heading }}>
              {selectedSW ? `${selectedSW.name} — Design Viewer` : 'Select software to connect'}
            </span>
            {selectedSW && (
              <span style={{ fontSize: '11px', color: c.muted }}>
                {selectedSW.agentRequired ? 'via WorshipOps Agent' : 'via built-in web server'}
              </span>
            )}
          </div>
          {status === 'connected' && (
            <a href={iframeUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: c.primary, fontSize: '12px', textDecoration: 'none', fontWeight: '500' }}>
              <ExternalLink size={12} /> Open in new tab
            </a>
          )}
        </div>

        {/* Viewer content */}
        {status === 'connected' && iframeUrl
          ? <iframe ref={iframeRef} src={iframeUrl} style={{ flex: 1, border: 'none', width: '100%' }} allow="camera; microphone; display-capture" title="Lighting Design Software" />
          : <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px', textAlign: 'center' }}>
              {status === 'connecting'
                ? <>
                    <RefreshCw size={48} color={c.warning} />
                    <div style={{ fontSize: '18px', fontWeight: '600', color: c.heading }}>Connecting to {selectedSW?.name}…</div>
                    <div style={{ fontSize: '13px', color: c.muted }}>Reaching {ipAddress}:{port}</div>
                  </>
                : <>
                    <div style={{ fontSize: '72px', opacity: 0.25 }}>🎛️</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: c.heading }}>No Software Connected</div>
                    <div style={{ fontSize: '13px', color: c.muted, maxWidth: '400px', lineHeight: '1.7' }}>
                      Select your lighting software on the left, enter the IP of your lighting computer, and click Connect.<br />
                      The designer will load here — you can design, save, and export your show files without leaving WorshipOps.
                    </div>
                    {selectedSW?.agentRequired && (
                      <div style={{ marginTop: '8px', padding: '12px 20px', borderRadius: '10px', background: c.card, border: `1px solid ${c.border}`, fontSize: '13px', color: c.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={14} color={c.primary} />
                        <span>Download <strong>WorshipOps-Lighting-Agent.exe</strong> from your admin portal, double-click it on the lighting computer, then enter the IP it shows here.</span>
                      </div>
                    )}
                    {selectedSW && !selectedSW.agentRequired && (
                      <div style={{ marginTop: '8px', padding: '12px 20px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', border: `1px solid rgba(16,185,129,0.2)`, fontSize: '13px', color: c.success, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✓ {selectedSW.name} has a built-in web server. Just enter the IP and connect.
                      </div>
                    )}
                  </>
              }
            </div>
        }
      </div>
    </div>
  );
}
