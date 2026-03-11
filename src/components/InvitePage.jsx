import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CheckCircle2, Loader, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const SUPABASE_URL     = 'https://whlmswwvbyysolaxihez.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobG1zd3d2Ynl5c29sYXhpaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NTMwNzcsImV4cCI6MjA4MTUyOTA3N30.cOl0v_qwTcDytpg5fjXX__njOz8hOZkaX0ICqnBXfcw';
const ACCEPT_FN_URL     = `${SUPABASE_URL}/functions/v1/accept-org-invite`;
const BETA_ACCEPT_FN_URL = `${SUPABASE_URL}/functions/v1/process-beta-invite`;

export default function InvitePage() {
  const { token }  = useParams();
  const navigate   = useNavigate();

  const [status,   setStatus]   = useState('loading'); // loading | valid | invalid | submitting | success | error
  const [invite,   setInvite]   = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);

  const [inviteType, setInviteType] = useState('org'); // 'org' | 'beta'

  // ── Verify token on mount ──────────────────────────────────
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    (async () => {
      // ── 1. Try beta_invitations first (no joins, simpler RLS) ──
      const { data: beta } = await supabase
        .from('beta_invitations')
        .select('id, invited_email, used_at, is_active')
        .eq('token', token)
        .maybeSingle();

      if (beta) {
        if (!beta.is_active) {
          setErrorMsg('This beta invite link has been revoked.');
          setStatus('invalid');
          return;
        }
        if (beta.used_at) {
          setErrorMsg('This invite link has already been used.');
          setStatus('invalid');
          return;
        }
        setInviteType('beta');
        setInvite(beta);
        if (beta.invited_email) setEmail(beta.invited_email);
        setStatus('valid');
        return;
      }

      // ── 2. Try org_invitations ─────────────────────────────
      const { data: org } = await supabase
        .from('org_invitations')
        .select('id, email, name, role, expires_at, accepted_at, organizations(name)')
        .eq('token', token)
        .maybeSingle();

      if (org) {
        if (org.accepted_at) {
          setErrorMsg('This invite link has already been used.');
          setStatus('invalid');
          return;
        }
        if (new Date(org.expires_at) < new Date()) {
          setErrorMsg('This invite link has expired. Please ask your admin for a new one.');
          setStatus('invalid');
          return;
        }
        setInviteType('org');
        setInvite(org);
        if (org.email) setEmail(org.email);
        if (org.name) {
          const parts = org.name.trim().split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
        setStatus('valid');
        return;
      }

      // Not found in either table
      setStatus('invalid');
    })();
  }, [token]);

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return; }

    setStatus('submitting');
    setErrorMsg('');

    try {
      // Both flows use their respective edge functions (service role — handles org assignment)
      const url  = inviteType === 'beta' ? BETA_ACCEPT_FN_URL : ACCEPT_FN_URL;
      const res  = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
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

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '9px',
    border: '1px solid #1e293b', background: '#080e1a',
    color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', marginBottom: '6px',
    fontSize: '11px', fontWeight: '600', color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  const isBeta = inviteType === 'beta';
  const orgName = isBeta ? 'WorshipOps Beta' : (invite?.organizations?.name ?? 'your church');
  const invitedRole = isBeta ? 'Beta Tester' : (invite?.role ?? 'volunteer');

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
          <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>{isBeta ? 'Beta Access' : 'Team Invitation'}</p>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
            <Loader size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
            Verifying your invite...
          </div>
        )}

        {/* Invalid */}
        {status === 'invalid' && (
          <div style={{ textAlign: 'center', background: '#080e1a', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '16px', padding: '36px 28px' }}>
            <AlertTriangle size={40} color="#ef4444" style={{ margin: '0 auto 16px', display: 'block' }} />
            <h2 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: '800', color: '#f1f5f9' }}>Invite Not Found</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
              {errorMsg || 'This invite link is invalid or no longer available. Please contact the person who invited you.'}
            </p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div style={{ textAlign: 'center', background: '#080e1a', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px', padding: '36px 28px' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 18px', display: 'block' }} />
            <h2 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: '800', color: '#f1f5f9' }}>Welcome to {orgName}!</h2>
            <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#475569', lineHeight: '1.7' }}>
              {isBeta
                ? 'Your beta account has been created. Log in to get started and share your feedback!'
                : 'Your account has been created. Log in to view your schedule and connect with your team.'}
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{ padding: '13px 32px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', color: '#fff', fontWeight: '700', fontSize: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Signup form */}
        {(status === 'valid' || status === 'submitting') && (
          <div style={{ background: '#080e1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(59,130,246,0.1), 0 24px 60px rgba(0,0,0,0.6)' }}>

            <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.1) 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 28px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
                {orgName}
              </div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.4px' }}>
                You've been invited{invite?.name ? `, ${invite.name.split(' ')[0]}` : ''}
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Joining as <strong style={{ color: '#f1f5f9' }}>{invitedRole}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

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

              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  required type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  readOnly={!!invite?.email}
                  style={{ ...inputStyle, opacity: invite?.email ? 0.7 : 1 }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#1e293b'}
                />
              </div>

              <div>
                <label style={labelStyle}>Create Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    required type={showPw ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#1e293b'}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div style={{ fontSize: '13px', color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px' }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" disabled={status === 'submitting'}
                style={{ padding: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', color: '#fff', fontWeight: '700', fontSize: '14px', border: 'none', cursor: status === 'submitting' ? 'not-allowed' : 'pointer', opacity: status === 'submitting' ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(59,130,246,0.3)', marginTop: '4px' }}>
                {status === 'submitting' && <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                {status === 'submitting' ? 'Creating account...' : 'Accept Invitation'}
              </button>

              <p style={{ margin: 0, fontSize: '11px', color: '#334155', textAlign: 'center', lineHeight: '1.6' }}>
                By accepting, you agree to the WorshipOps Terms of Service.
              </p>
            </form>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
