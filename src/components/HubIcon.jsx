import React from 'react';

// WorshipOps brand mark — the hub/network glyph from Logo/Signature.png,
// regularized to an even pentagon spoke so it stays crisp at small sizes.
export default function HubIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.6" fill={color} />
      <circle cx="12" cy="2.9" r="2.7" fill={color} />
      <circle cx="20.9" cy="7.9" r="2.7" fill={color} />
      <circle cx="17.4" cy="19.8" r="2.7" fill={color} />
      <circle cx="6.6" cy="19.8" r="2.7" fill={color} />
      <circle cx="3.1" cy="7.9" r="2.7" fill={color} />
    </svg>
  );
}
