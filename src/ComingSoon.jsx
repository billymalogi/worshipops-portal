import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ArrowRight, CheckCircle2, Loader, X } from 'lucide-react';

// ─── Logo mark ───────────────────────────────────────────────────────────────
function LogoMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <img src="/favicon.ico" alt="WorshipOps" style={{ width: '60px', height: '60px', objectFit: 'contain', flexShrink: 0 }} />
      <span style={{ fontWeight: '800', fontSize: '17px', color: '#f1f5f9', letterSpacing: '-0.4px', marginLeft: '-5px' }}>
        WorshipOps
      </span>
    </div>
  );
}

// ─── Input field helper ───────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, required = true }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '11px 14px', borderRadius: '9px', border: '1px solid #1e293b', background: '#080e1a', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
        onFocus={e => e.target.style.borderColor = '#3b82f6'}
        onBlur={e => e.target.style.borderColor = '#1e293b'}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ComingSoon() {
  const navigate = useNavigate();

  // ── 7-click easter egg ──────────────────────────────────────────────────────
  const clickCountRef  = useRef(0);
  const lastClickRef   = useRef(0);
  const [logoFlash,    setLogoFlash]    = useState(false); // micro-feedback only

  const handleLogoClick = () => {
    const now = Date.now();
    // Reset count if gap > 2 seconds between clicks
    if (now - lastClickRef.current > 2000) {
      clickCountRef.current = 1;
    } else {
      clickCountRef.current += 1;
    }
    lastClickRef.current = now;

    // Subtle flash on each click (no counter shown)
    setLogoFlash(true);
    setTimeout(() => setLogoFlash(false), 100);

    if (clickCountRef.current >= 7) {
      clickCountRef.current = 0;
      navigate('/login');
    }
  };

  // ── Early access form ───────────────────────────────────────────────────────
  const [showSignup,   setShowSignup]   = useState(false);
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [email,        setEmail]        = useState('');
  const [church,       setChurch]       = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [signupError,  setSignupError]  = useState(null);

  const openSignup = () => {
    setSubmitted(false);
    setSignupError(null);
    setShowSignup(true);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSignupError(null);

    const { error } = await supabase.from('early_access').insert([{
      first_name:  firstName.trim(),
      last_name:   lastName.trim(),
      email:       email.trim().toLowerCase(),
      church_name: church.trim(),
    }]);

    if (error) {
      setSignupError('Something went wrong. Please try again or email us directly at billy@worshipops.com');
    } else {
      setSubmitted(true);
      setFirstName(''); setLastName(''); setEmail(''); setChurch('');
    }
    setSubmitting(false);
  };

  // ── Admin "coming soon" toast ────────────────────────────────────────────────
  const [showAdminToast, setShowAdminToast] = useState(false);
  const handleAdminClick = () => {
    setShowAdminToast(true);
    setTimeout(() => setShowAdminToast(false), 3000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050810', color: '#fff', fontFamily: '"Inter", system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* ── Background gradients ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      {/* ── Top-left logo (7-click easter egg) ── */}
      <div style={{ position: 'absolute', top: '28px', left: '32px', zIndex: 10 }}>
        <button
          onClick={handleLogoClick}
          style={{
            background: 'transparent', border: 'none', cursor: 'default',
            padding: '6px', borderRadius: '10px', userSelect: 'none',
            opacity: logoFlash ? 0.7 : 1,
            transition: 'opacity 0.08s',
            outline: 'none',
          }}
          tabIndex={-1}
          aria-label="WorshipOps"
        >
          <LogoMark />
        </button>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 80px', textAlign: 'center', position: 'relative', zIndex: 1 }}>

        {/* "COMING SOON" pill badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 20px', borderRadius: '99px', border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.07)', marginBottom: '32px', backdropFilter: 'blur(8px)' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6', display: 'block', animation: 'wo-pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2.5px' }}>
            Coming Soon
          </span>
        </div>

        {/* First tagline */}
        <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '500', margin: '0 0 28px', fontStyle: 'italic', maxWidth: '420px', lineHeight: '1.6' }}>
          Removing the chaos so you can focus on your call.
        </p>

        {/* Brand name */}
        <h1 style={{
          fontSize: 'clamp(56px, 11vw, 104px)',
          fontWeight: '900',
          margin: '0 0 14px',
          lineHeight: '1',
          letterSpacing: '-4px',
          background: 'linear-gradient(160deg, #ffffff 20%, #94a3b8 80%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          WorshipOps
        </h1>

        {/* Second tagline */}
        <p style={{ fontSize: 'clamp(15px, 2.2vw, 21px)', color: '#475569', fontWeight: '500', margin: '0 0 56px', letterSpacing: '0.2px', maxWidth: '480px' }}>
          One heartbeat. One team. Seamless Sundays.
        </p>

        {/* CTA button */}
        <button
          onClick={openSignup}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '16px 38px', borderRadius: '13px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            color: '#fff', fontWeight: '700', fontSize: '15px',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.3), 0 8px 32px rgba(59,130,246,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            letterSpacing: '-0.2px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.4), 0 12px 48px rgba(59,130,246,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.3), 0 8px 32px rgba(59,130,246,0.35)';
          }}
        >
          Request Early Access <ArrowRight size={17} />
        </button>

        {/* Subtext under CTA */}
        <p style={{ margin: '16px 0 0', fontSize: '12px', color: '#1e293b' }}>
          Free during beta. No credit card required.
        </p>
      </div>

      {/* ── Footer ── */}
      <footer style={{ padding: '18px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        {[
          { label: 'Privacy Policy',      action: () => window.open('/privacy', '_blank') },
          { label: 'Terms & Conditions',  action: () => window.open('/terms', '_blank') },
          { label: 'Admin Login',         action: handleAdminClick },
        ].map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <span style={{ color: '#1e293b', fontSize: '13px', userSelect: 'none' }}>·</span>}
            <button
              onClick={item.action}
              style={{ background: 'transparent', border: 'none', color: '#334155', fontSize: '13px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', transition: 'color 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.color = '#64748b'}
              onMouseLeave={e => e.currentTarget.style.color = '#334155'}
            >
              {item.label}
            </button>
          </React.Fragment>
        ))}
        <span style={{ color: '#1e293b', fontSize: '13px', userSelect: 'none' }}>·</span>
        <span style={{ color: '#1e293b', fontSize: '12px' }}>© 2025 WorshipOps</span>
      </footer>

      {/* ── Admin "coming soon" toast ── */}
      {showAdminToast && (
        <div style={{ position: 'fixed', bottom: '72px', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '11px 20px', fontSize: '13px', color: '#64748b', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 200, whiteSpace: 'nowrap' }}>
          Admin login coming soon.
        </div>
      )}

      {/* ── Early Access Modal ── */}
      {showSignup && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowSignup(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', zIndex: 100 }}
          />

          {/* Modal */}
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 101, width: 'min(500px, 95vw)',
            background: '#080e1a',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 0 0 1px rgba(59,130,246,0.1), 0 32px 80px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            fontFamily: '"Inter", system-ui, sans-serif',
          }}>
            {/* Header */}
            <div style={{ padding: '28px 28px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.5px' }}>
                  Get Early Access
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                  Be first to experience seamless church operations.
                </p>
              </div>
              <button
                onClick={() => setShowSignup(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '9px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', flexShrink: 0, marginLeft: '16px', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: '24px 28px 28px' }}>
              {submitted ? (
                /* Success state */
                <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                  <CheckCircle2 size={52} color="#10b981" style={{ margin: '0 auto 18px', display: 'block' }} />
                  <h3 style={{ margin: '0 0 10px', fontSize: '21px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.4px' }}>
                    You're on the list!
                  </h3>
                  <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#475569', lineHeight: '1.7', maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto' }}>
                    We'll be in touch soon. Get ready to transform how your church operates together.
                  </p>
                  <button
                    onClick={() => setShowSignup(false)}
                    style={{ padding: '11px 28px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '9px', color: '#64748b', fontWeight: '600', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {/* Name row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="John" />
                    <Field label="Last Name"  value={lastName}  onChange={setLastName}  placeholder="Smith" />
                  </div>

                  <Field label="Email Address" type="email" value={email} onChange={setEmail} placeholder="john@gracechurch.com" />

                  <Field label="Church / Organization" value={church} onChange={setChurch} placeholder="Grace Community Church" />

                  {signupError && (
                    <div style={{ fontSize: '13px', color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '10px 14px', lineHeight: '1.5' }}>
                      {signupError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '14px', borderRadius: '11px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                      color: '#fff', fontWeight: '700', fontSize: '15px',
                      border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      marginTop: '4px', fontFamily: 'inherit', letterSpacing: '-0.2px',
                      boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
                    }}
                  >
                    {submitting && <Loader size={16} style={{ animation: 'wo-spin 1s linear infinite' }} />}
                    {submitting ? 'Submitting...' : 'Request Early Access'}
                  </button>

                  <p style={{ margin: 0, fontSize: '11px', color: '#1e293b', textAlign: 'center', lineHeight: '1.6' }}>
                    By signing up you agree to our{' '}
                    <button type="button" onClick={() => window.open('/privacy', '_blank')} style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}>
                      Privacy Policy
                    </button>
                    {' '}and{' '}
                    <button type="button" onClick={() => window.open('/terms', '_blank')} style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}>
                      Terms of Service
                    </button>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes wo-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes wo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
