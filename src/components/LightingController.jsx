import React from 'react';
import { Sparkles, MonitorPlay, Radio, ShieldCheck, Layers, Clock } from 'lucide-react';

// --- Planned features (shown while the live connection is being rebuilt with
// proper per-organization authentication) ------------------------------------
const FEATURES = [
  {
    icon: MonitorPlay,
    title: 'Live Design Viewer',
    desc: 'See your lighting software’s screen live from the booth or anywhere on your network.',
  },
  {
    icon: Radio,
    title: 'One-Click Cue Triggering',
    desc: 'Fire cues straight from your service order, perfectly timed with your setlist.',
  },
  {
    icon: Layers,
    title: 'Universal Console Support',
    desc: 'Works with Lightkey, Chamsys MagicQ, Vista (Jands), and other OSC-capable consoles.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure, Authenticated Connections',
    desc: 'Every connection will be locked to your organization, so only your own team can view or control your lights.',
  },
];

export default function LightingController({ isDarkMode }) {
  const c = {
    bg:      isDarkMode ? '#111111' : '#f9fafb',
    card:    isDarkMode ? '#1f1f22' : '#ffffff',
    text:    isDarkMode ? '#d1d5db' : '#27272a',
    heading: isDarkMode ? '#f9fafb' : '#111111',
    border:  isDarkMode ? '#27272a' : '#e5e7eb',
    muted:   isDarkMode ? '#6b7280' : '#9ca3af',
    primary: '#3b82f6',
  };

  return (
    <div style={{ height: 'calc(100vh - 108px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: c.bg, overflowY: 'auto', padding: '40px 24px' }}>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 18px', borderRadius: '99px', border: `1px solid ${c.primary}55`, background: isDarkMode ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)', marginBottom: '24px' }}>
        <Clock size={13} color={c.primary} />
        <span style={{ fontSize: '11px', fontWeight: '700', color: c.primary, textTransform: 'uppercase', letterSpacing: '2px' }}>Feature Coming Soon</span>
      </div>

      <Sparkles size={44} color={c.primary} style={{ marginBottom: '16px', opacity: 0.85 }} />

      <h2 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: '800', color: c.heading, textAlign: 'center', letterSpacing: '-0.4px' }}>
        Lighting Control Hub
      </h2>
      <p style={{ margin: '0 0 36px', fontSize: '14px', color: c.muted, textAlign: 'center', maxWidth: '480px', lineHeight: '1.7' }}>
        We're rebuilding live lighting connections with proper per-organization
        authentication before turning this back on. Here's what's coming.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', width: '100%', maxWidth: '720px' }}>
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: isDarkMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} color={c.primary} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: c.heading }}>{title}</div>
            <div style={{ fontSize: '12px', color: c.muted, lineHeight: '1.6' }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
