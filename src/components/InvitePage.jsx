import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CheckCircle2, Loader, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://whlmswwvbyysolaxihez.supabase.co'}/functions/v1/process-beta-invite`;

export default function InvitePage() {
  const { token }    = useParams();
  const navigate     = useNavigate();

  const [status,     setStatus]     = useState('loading'); // loading | valid | invalid | submitting | success | error
  const [invite,     setInvite]     = useState(null);
  const [errorMsg,   setErrorMsg]   = useState('');

  // Form fields
  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);

  // ── Verify token on mount ─────────────────────────────────
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    supabase
      .from('beta_invitations')
      .select('id, invited_email, note, used_at, is_active')
      .eq('token', token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('invalid'); return; }
        if (data.used_at)   { setStatus('invalid'); setErrorMsg('This invite link has already been used.'); return; }
        if (!data.is_active){ setStatus('invalid'); setErrorMsg('This invite link has been revoked.'); return; }
        setInvite(data);
        if (data.invited_email) setEmail(data.invited_email);
        setStatus('valid');
      });
  }, [token]);

  // ── Submit signup ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return; }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res  = await fetch(EDGE_FN_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, email, password, firstName, lastName }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setErrorMsg(json.error || 'Something went wrong. Please try again.');
        setStatus('valid');
      } else {
        setStatus('success');
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('valid');
    }
  };

  // ── Shared styles ────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '9px',
    border: '1px solid #1e293b', background: '#080e1a',
    color: '#f1f5f9', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', marginBottom: '6px',
    fontSize: '11px', fontWeight: '600', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: '#050810', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: '"Inter", system-ui, sans-serif', color: '#f1f5f9',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background gradients */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      </div>

      <div style={{ width: 'min(480px, 100%)', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
            <img src="/favicon.ico" alt="WorshipOps" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            <span style={{ fontWeight: '800', fontSize: '22px', color: '#f1f5f9', letterSpacing: '-0.5px' }}>WorshipOps</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Beta Tester Invitation</p>
        </div>

        {/* ── Loading ── */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
            <Loader size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
            Verifying your invite...
          </div>
        )}

        {/* ── Invalid token ── */}
        {status === 'invalid' && (
          <div style={{ textAlign: 'center', background: '#080e1a', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '16px', padding: '36px 28px' }}>
            <AlertTriangle size={40} color="#ef4444" style={{ margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: '800', color: '#f1f5f9' }}>
              Invite Not Found
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
              {errorMsg || 'This invite link is invalid or no longer available. Please contact the person who sent you the invite.'}
            </p>
          </div>
        )}

        {/* ── Success ── */}
        {status === 'success' && (
          <div style={{ textAlign: 'center', background: '#080e1a', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px', padding: '36px 28px' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 18px', display: 'block' }} />
            <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: '800', color: '#f1f5f9' }}>
              You're in!
            </h2>
            <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#475569', lineHeight: '1.7' }}>
              Your account has been created. Log in to start exploring WorshipOps.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{ padding: '13px 32px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', color: '#fff', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}
            >
              Go to Login
            </button>
          </div>
        )}

        {/* ── Signup form ── */}
        {(status === 'valid' || status === 'submitting') && (
          <div style={{ background: '#080e1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(59,130,246,0.1), 0 24px 60px rgba(0,0,0,0.6)' }}>

            {/* Header band */}
            <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.1) 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 28px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
                Beta Access
              </div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.4px' }}>
                Create your account
              </h2>
              {invite?.note && (
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>
                  {invite.note}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#1e293b'} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = '#1e293b'} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  required type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  readOnly={!!invite?.invited_email}
                  style={{ ...inputStyle, opacity: invite?.invited_email ? 0.7 : 1 }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#1e293b'}
                />
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    required type={showPw ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#1e293b'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div style={{ fontSize: '13px', color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px' }}>
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'submitting'}
                style={{ padding: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', color: '#fff', fontWeight: '700', fontSize: '14px', border: 'none', cursor: status === 'submitting' ? 'not-allowed' : 'pointer', opacity: status === 'submitting' ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(59,130,246,0.3)', marginTop: '4px' }}
              >
                {status === 'submitting' && <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                {status === 'submitting' ? 'Creating account...' : 'Create Account & Join Beta'}
              </button>

              <p style={{ margin: 0, fontSize: '11px', color: '#334155', textAlign: 'center', lineHeight: '1.6' }}>
                This is a private beta. Your access is covered by the WorshipOps Terms of Service.
              </p>
            </form>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
