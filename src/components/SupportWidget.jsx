import React, { useState } from 'react';

/**
 * SupportWidget — Fixed bottom-right floating contact buttons.
 * Shown on all settings pages (Profile, Organization, Billing).
 *
 * Ticket   → support@worshipops.com
 * Feedback → billy@worshipops.com
 */
export default function SupportWidget() {
  const [expanded, setExpanded] = useState(false);

  const btnBase = {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 16px', borderRadius: '10px',
    border: 'none', fontWeight: '700', fontSize: '13px',
    cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>

      {/* Expanded action buttons */}
      {expanded && (
        <>
          {/* Ticket */}
          <a
            href={
              'mailto:support@worshipops.com'
              + '?subject=WorshipOps Support Ticket'
              + '&body=Hi Support Team,%0A%0ADescribe your issue here:%0A%0A'
              + '--- Ticket Details ---%0A'
              + `Page / Feature: %0A`
              + `Steps to reproduce: %0A%0A`
            }
            style={{ ...btnBase, background: '#3b82f6', color: 'white' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'; }}
          >
            🎫 Submit a Ticket
          </a>

          {/* Feedback */}
          <a
            href={
              'mailto:billy@worshipops.com'
              + '?subject=WorshipOps Feedback'
              + '&body=Hi Billy,%0A%0A'
              + 'I wanted to share some feedback / report an issue:%0A%0A'
              + '--- Details ---%0A'
              + `What I was trying to do: %0A`
              + `What happened: %0A`
              + `Suggestion / Idea: %0A%0A`
            }
            style={{ ...btnBase, background: '#10b981', color: 'white' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'; }}
          >
            💡 Send Feedback
          </a>
        </>
      )}

      {/* Toggle FAB */}
      <button
        onClick={() => setExpanded(e => !e)}
        title={expanded ? 'Close' : 'Contact Support'}
        style={{
          width: '48px', height: '48px',
          borderRadius: '50%',
          border: 'none',
          background: expanded ? '#374151' : 'linear-gradient(135deg, #3b82f6, #10b981)',
          color: 'white',
          fontSize: expanded ? '20px' : '22px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
          transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = expanded ? 'rotate(45deg) scale(1.08)' : 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = expanded ? 'rotate(45deg)' : 'rotate(0deg)'; }}
      >
        {expanded ? '✕' : '💬'}
      </button>
    </div>
  );
}