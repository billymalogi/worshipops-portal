import React, { useState } from 'react';
import { CreditCard, Users, Calendar, CheckCircle, Zap, FileText, ArrowRight, Lock } from 'lucide-react';

const PLAN_FEATURES = {
  starter: [
    'Up to 15 team members',
    'Unlimited service plans',
    'Song library (up to 500 songs)',
    'Built-in lyrics presenter',
    'Stage monitor & audience display',
    'Rehearsal mixer',
    'Email support',
  ],
  pro: [
    'Unlimited team members',
    'Unlimited service plans',
    'Unlimited song library',
    'Everything in Starter',
    'Advanced scheduling & availability',
    'CCLI SongSelect integration',
    'Multi-campus support',
    'Priority support + onboarding call',
    'Custom branding',
  ],
};

const MOCK_INVOICES = [
  { date: 'Jan 1, 2026',  amount: '$0.00', status: 'Free tier', id: 'INV-0001' },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function BillingSettings({ isDarkMode, teamMembers = [], services = [] }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const servicesThisMonth = services.filter(s => s.date?.startsWith(thisMonth)).length;
  const teamCount = teamMembers.length;
  const teamLimit = 15;

  const c = {
    bg:      isDarkMode ? '#111111' : '#f9fafb',
    card:    isDarkMode ? '#1f1f22' : '#ffffff',
    text:    isDarkMode ? '#d1d5db' : '#27272a',
    heading: isDarkMode ? '#f9fafb' : '#111111',
    border:  isDarkMode ? '#27272a' : '#e5e7eb',
    muted:   isDarkMode ? '#6b7280' : '#9ca3af',
    input:   isDarkMode ? '#111111' : '#f9fafb',
    primary: '#3b82f6',
    success: '#10b981',
    danger:  '#ef4444',
    accent:  '#8b5cf6',
    section: isDarkMode ? '#0a0a0a' : '#f0f9ff',
  };

  const sectionCard = (children, extra = {}) => (
    <div style={{ background: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden', marginBottom: '20px', ...extra }}>
      {children}
    </div>
  );

  const cardHead = (title, badge) => (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '10px', background: c.section }}>
      <span style={{ fontWeight: '700', fontSize: '14px', color: c.heading }}>{title}</span>
      {badge}
    </div>
  );

  const usageBar = (label, value, max, color = c.primary) => {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
          <span style={{ fontWeight: '600', color: c.heading }}>{label}</span>
          <span style={{ color: pct >= 90 ? c.danger : c.muted }}>{value} / {max}</span>
        </div>
        <div style={{ height: '8px', borderRadius: '4px', background: isDarkMode ? '#27272a' : '#e5e7eb', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: '4px', background: pct >= 90 ? c.danger : color, transition: 'width 0.4s' }} />
        </div>
        {pct >= 90 && <div style={{ fontSize: '11px', color: c.danger, marginTop: '4px' }}>Approaching limit — consider upgrading</div>}
      </div>
    );
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div style={{ height: 'calc(100vh - 108px)', overflowY: 'auto', background: c.bg }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: c.heading }}>Billing & Plan</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.muted }}>Manage your subscription, usage, and payment details</p>
        </div>

        {/* â”€â”€ Current plan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sectionCard(
          <>
            {cardHead('Current Plan',
              <span style={{ background: 'rgba(59,130,246,0.12)', color: c.primary, fontSize: '11px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px', border: `1px solid rgba(59,130,246,0.2)` }}>
                STARTER · FREE
              </span>
            )}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: c.heading, marginBottom: '10px' }}>Included features</div>
                  {PLAN_FEATURES.starter.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '7px', fontSize: '13px', color: c.text }}>
                      <CheckCircle size={13} color={c.success} style={{ flexShrink: 0, marginTop: '2px' }} />
                      {f}
                    </div>
                  ))}
                </div>
                <div style={{ background: isDarkMode ? '#111111' : '#f8fafc', borderRadius: '10px', padding: '16px', border: `1px solid ${c.border}` }}>
                  <div style={{ fontSize: '12px', color: c.muted, marginBottom: '4px' }}>Current billing</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: c.heading }}>$0<span style={{ fontSize: '14px', fontWeight: '400', color: c.muted }}>/mo</span></div>
                  <div style={{ fontSize: '12px', color: c.muted, marginTop: '4px', marginBottom: '16px' }}>Free tier — no credit card required</div>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    style={{ width: '100%', border: 'none', borderRadius: '8px', padding: '9px', background: `linear-gradient(135deg, #3b82f6, #8b5cf6)`, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Zap size={14} /> Upgrade to Pro <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* â”€â”€ Usage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sectionCard(
          <>
            {cardHead('Usage This Month')}
            <div style={{ padding: '20px' }}>
              {usageBar('Team Members', teamCount, teamLimit)}
              <div style={{ marginBottom: '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', color: c.heading }}>Services this month</span>
                  <span style={{ color: c.muted }}>{servicesThisMonth} <span style={{ fontSize: '11px' }}>(unlimited)</span></span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: isDarkMode ? '#27272a' : '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, servicesThisMonth * 10)}%`, borderRadius: '4px', background: c.success }} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* â”€â”€ Payment method â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sectionCard(
          <>
            {cardHead('Payment Method')}
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '52px', height: '36px', borderRadius: '6px', background: isDarkMode ? '#27272a' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={20} color={c.muted} />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: c.muted }}>No payment method on file</div>
                <div style={{ fontSize: '12px', color: c.muted, marginTop: '2px', opacity: 0.7 }}>Required only when upgrading to a paid plan</div>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                style={{ marginLeft: 'auto', border: `1px solid ${c.border}`, borderRadius: '7px', padding: '7px 14px', background: 'transparent', color: c.muted, fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Lock size={12} /> Add via Stripe (coming soon)
              </button>
            </div>
          </>
        )}

        {/* â”€â”€ Invoice history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sectionCard(
          <>
            {cardHead('Invoice History')}
            <div>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 80px', gap: '12px', padding: '10px 20px', background: isDarkMode ? '#0a0a0a' : '#f8fafc', borderBottom: `1px solid ${c.border}` }}>
                {['Invoice', 'Date', 'Amount', 'Status'].map(h => (
                  <div key={h} style={{ fontSize: '11px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
                ))}
              </div>
              {MOCK_INVOICES.map(inv => (
                <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 80px', gap: '12px', padding: '12px 20px', borderBottom: `1px solid ${c.border}`, fontSize: '13px', color: c.text }}>
                  <div style={{ color: c.primary, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={13} /> {inv.id}
                  </div>
                  <div style={{ color: c.text }}>{inv.date}</div>
                  <div style={{ color: c.heading, fontWeight: '600' }}>{inv.amount}</div>
                  <div>
                    <span style={{ background: 'rgba(16,185,129,0.1)', color: c.success, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px' }}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ padding: '14px 20px', fontSize: '12px', color: c.muted, textAlign: 'center' }}>
                Full billing history will appear here once you upgrade to a paid plan
              </div>
            </div>
          </>
        )}

      </div>

      {/* â”€â”€ Upgrade modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showUpgradeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: c.card, borderRadius: '16px', border: `1px solid ${c.border}`, width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>

            {/* Modal header */}
            <div style={{ padding: '24px', background: `linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))`, borderBottom: `1px solid ${c.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>âš¡</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: c.heading }}>Upgrade to Pro</div>
              <div style={{ fontSize: '13px', color: c.muted, marginTop: '4px' }}>Unlock the full WorshipOps experience</div>
            </div>

            {/* Features */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {PLAN_FEATURES.pro.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '13px', color: c.text }}>
                    <CheckCircle size={13} color={c.primary} style={{ flexShrink: 0, marginTop: '2px' }} />
                    {f}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px', padding: '14px', borderRadius: '10px', background: isDarkMode ? '#111111' : '#f8fafc', border: `1px solid ${c.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: c.muted }}>Coming soon — Stripe integration in progress</div>
                <div style={{ fontSize: '13px', color: c.muted, marginTop: '4px' }}>
                  Questions? Email <a href="mailto:billing@worshipops.com" style={{ color: c.primary }}>billing@worshipops.com</a>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => setShowUpgradeModal(false)} style={{ border: `1px solid ${c.border}`, borderRadius: '8px', padding: '9px 24px', background: 'transparent', color: c.text, fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}