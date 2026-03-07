import { useState } from 'react';
import { supabase } from './supabaseClient';
import { LayoutGrid, Loader, Lock, Mail, User, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';

// --- Self-contained confetti (no external package) ----------------------------
function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#a3e635'];

  // Initial burst from bottom-center + random top positions
  const particles = Array.from({ length: 160 }, (_, i) => {
    const fromBottom = i < 80;
    return {
      x:      fromBottom ? window.innerWidth / 2 + (Math.random() - 0.5) * 60 : Math.random() * window.innerWidth,
      y:      fromBottom ? window.innerHeight + 5 : -10,
      vx:     (Math.random() - 0.5) * (fromBottom ? 10 : 4),
      vy:     fromBottom ? -(Math.random() * 18 + 8) : (Math.random() * 3 + 1),
      gravity: fromBottom ? 0.45 : 0.12,
      r:      Math.random() * 5 + 3,
      color:  COLORS[Math.floor(Math.random() * COLORS.length)],
      spin:   (Math.random() - 0.5) * 0.25,
      angle:  Math.random() * Math.PI * 2,
      shape:  Math.random() > 0.5 ? 'rect' : 'circle',
      wobble: Math.random() * 0.08,
      wobbleT: Math.random() * Math.PI * 2,
    };
  });

  const start = Date.now();

  const tick = () => {
    const elapsed = Date.now() - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const opacity = elapsed > 2800 ? Math.max(0, 1 - (elapsed - 2800) / 600) : 1;

    for (const p of particles) {
      p.vy     += p.gravity;
      p.wobbleT += p.wobble;
      p.x      += p.vx + Math.sin(p.wobbleT) * 0.5;
      p.y      += p.vy;
      p.angle  += p.spin;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (elapsed < 3400) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(tick);
}

// --- First-login beta welcome popup -------------------------------------------
function showBetaWelcome(firstName, onDismiss) {
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:10000',
    'display:flex;align-items:center;justify-content:center',
    'background:rgba(0,0,0,0.75)',
    'backdrop-filter:blur(6px)',
    'font-family:Inter,sans-serif',
    'animation:fadeIn 0.4s ease',
  ].join(';');

  const style = document.createElement('style');
  style.textContent = '@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(style);

  const card = document.createElement('div');
  card.style.cssText = [
    'background:#1f1f22;border:1px solid #27272a',
    'border-radius:20px;padding:48px 40px;max-width:480px;width:90%',
    'text-align:center;box-shadow:0 32px 64px rgba(0,0,0,0.6)',
    'animation:slideUp 0.45s ease',
  ].join(';');

  const heart = document.createElement('div');
  heart.style.cssText = 'font-size:48px;margin-bottom:20px;line-height:1';
  heart.textContent = '\u2764\ufe0f';

  const title = document.createElement('h2');
  title.style.cssText = 'margin:0 0 16px;color:#f3f4f6;font-size:26px;font-weight:800;letter-spacing:-0.5px';
  title.textContent = `Welcome${firstName ? ', ' + firstName : ''}!`;

  const msg = document.createElement('p');
  msg.style.cssText = 'margin:0 0 32px;color:#9ca3af;font-size:16px;line-height:1.7';
  msg.textContent = 'Billy & Amulya love you. Thank you for accepting this request to join us on our journey to remove the chaos so churches can focus on their calling.';

  const tag = document.createElement('div');
  tag.style.cssText = 'display:inline-block;background:rgba(59,130,246,0.15);color:#3b82f6;font-size:12px;font-weight:700;letter-spacing:1px;padding:4px 12px;border-radius:20px;margin-bottom:28px;text-transform:uppercase';
  tag.textContent = 'Beta Tester';

  const btn = document.createElement('button');
  btn.style.cssText = [
    'background:linear-gradient(135deg,#3b82f6,#10b981)',
    'color:white;border:none;padding:14px 40px',
    'border-radius:10px;font-weight:700;font-size:15px',
    'cursor:pointer;width:100%',
  ].join(';');
  btn.textContent = "Let's go";
  btn.onclick = () => {
    overlay.remove();
    style.remove();
    onDismiss();
  };

  card.appendChild(heart);
  card.appendChild(title);
  card.appendChild(tag);
  card.appendChild(msg);
  card.appendChild(btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// -----------------------------------------------------------------------------

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form state
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [churchName,  setChurchName]  = useState('');
  const [fullName,    setFullName]    = useState('');

  // Theme colors matching App.css
  const colors = {
    bgDark:    '#111111',
    bgPanel:   '#1f1f22',
    textMain:  '#f3f4f6',
    textMuted: '#9ca3af',
    accent:    '#3b82f6',
    border:    '#27272a',
    success:   '#10b981',
    danger:    '#ef4444',
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        // Admin Sign-Up Flow
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });

        if (authError) throw authError;

        if (authData.user) {
          setTimeout(async () => {
            const { error: rpcError } = await supabase.rpc('create_church_workspace', {
              church_name: churchName
            });

            if (rpcError) {
              console.error('Workspace creation failed:', rpcError);
              setError("Account created, but workspace setup failed. Please contact support.");
              setLoading(false);
              return;
            }

            setSuccessMessage("Workspace created successfully! Redirecting...");
            setTimeout(() => { window.location.href = '/'; }, 1500);
          }, 500);
        }

      } else {
        // Login Flow
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials') ||
              signInError.message.includes('Email not confirmed')) {
            setError(
              <div>
                <div style={{ marginBottom: '8px' }}>
                  {signInError.message.includes('Email not confirmed')
                    ? 'Please check your email to confirm your account.'
                    : 'Email or password is incorrect.'}
                </div>
                <div style={{ fontSize: '13px', color: colors.textMuted }}>
                  Don't have an account?{' '}
                  <button
                    onClick={() => { setIsSignUp(true); setError(null); }}
                    style={{ background: 'none', border: 'none', color: colors.accent, textDecoration: 'underline', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    Create one here
                  </button>
                </div>
              </div>
            );
            setLoading(false);
            return;
          }
          throw signInError;
        }

        // Check if this is a Beta Tester Admin user
        let isBeta = false;
        if (signInData?.user) {
          const { data: membership } = await supabase
            .from('organization_members')
            .select('organizations(name)')
            .eq('user_id', signInData.user.id)
            .maybeSingle();
          isBeta = membership?.organizations?.name === 'Beta Tester Admin';
        }

        if (isBeta) {
          const firstName = signInData.user.user_metadata?.first_name || '';
          const isFirstLogin = !signInData.user.user_metadata?.beta_welcomed;

          if (isFirstLogin) {
            fireConfetti();
            setSuccessMessage("Welcome to the beta! Get ready to explore...");
            setTimeout(() => {
              showBetaWelcome(firstName, async () => {
                await supabase.auth.updateUser({ data: { beta_welcomed: true } });
                window.location.href = '/';
              });
            }, 1000);
          } else {
            setSuccessMessage("Welcome back! Redirecting...");
            setTimeout(() => { window.location.href = '/'; }, 1000);
          }
        } else {
          setSuccessMessage("Login successful! Redirecting...");
          setTimeout(() => { window.location.href = '/'; }, 1000);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      if (!isSignUp) setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      background: colors.bgDark,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: colors.bgPanel,
        padding: '48px',
        borderRadius: '16px',
        border: `1px solid ${colors.border}`,
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>

        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', padding: '14px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '14px', marginBottom: '16px' }}>
            <LayoutGrid size={36} color={colors.accent} />
          </div>
          <h1 style={{ margin: 0, color: colors.textMain, fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Worship Ops
          </h1>
          <p style={{ color: colors.textMuted, marginTop: '8px', fontSize: '15px', fontWeight: '500' }}>
            {isSignUp ? 'Create Your Church Workspace' : 'Sign in to your account'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: `1px solid rgba(239, 68, 68, 0.3)`, color: colors.danger, padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start', lineHeight: '1.5' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>{error}</div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: `1px solid rgba(16, 185, 129, 0.3)`, color: colors.success, padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <CheckCircle2 size={18} />
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Sign-Up Only Fields */}
          {isSignUp && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: colors.textMain, fontSize: '14px', fontWeight: '600' }}>Church Name</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: colors.textMuted }} />
                  <input
                    required placeholder="Grace Community Church" value={churchName}
                    onChange={e => setChurchName(e.target.value)}
                    style={{ width: '100%', padding: '13px 14px 13px 44px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: colors.bgDark, color: colors.textMain, fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = colors.accent}
                    onBlur={e => e.target.style.borderColor = colors.border}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: colors.textMain, fontSize: '14px', fontWeight: '600' }}>Your Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: colors.textMuted }} />
                  <input
                    required placeholder="John Smith" value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    style={{ width: '100%', padding: '13px 14px 13px 44px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: colors.bgDark, color: colors.textMain, fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = colors.accent}
                    onBlur={e => e.target.style.borderColor = colors.border}
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Field */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: colors.textMain, fontSize: '14px', fontWeight: '600' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: colors.textMuted }} />
              <input
                required type="email" placeholder="you@church.com" value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '13px 14px 13px 44px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: colors.bgDark, color: colors.textMain, fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = colors.accent}
                onBlur={e => e.target.style.borderColor = colors.border}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: colors.textMain, fontSize: '14px', fontWeight: '600' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '14px', left: '14px', color: colors.textMuted }} />
              <input
                required type="password"
                placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '13px 14px 13px 44px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: colors.bgDark, color: colors.textMain, fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = colors.accent}
                onBlur={e => e.target.style.borderColor = colors.border}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit" disabled={loading}
            style={{ background: colors.accent, color: 'white', border: 'none', padding: '15px', borderRadius: '10px', fontWeight: '700', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!loading) e.target.style.opacity = '0.9'; }}
            onMouseLeave={e => { if (!loading) e.target.style.opacity = '1'; }}
          >
            {loading && <Loader size={18} className="animate-spin" />}
            {isSignUp ? 'Create Workspace' : 'Sign In'}
          </button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
          <span style={{ color: colors.textMuted }}>
            {isSignUp ? 'Already have an account?' : "Need to create a workspace?"}
          </span>
          {' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMessage(null); }}
            style={{ background: 'none', border: 'none', color: colors.accent, cursor: 'pointer', fontWeight: '700', fontSize: '14px', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Sign In' : 'Create Workspace'}
          </button>
        </div>

        {/* Admin Note for Sign-Up */}
        {isSignUp && (
          <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', border: `1px solid rgba(59, 130, 246, 0.2)`, borderRadius: '8px', fontSize: '13px', color: colors.textMuted, lineHeight: '1.6' }}>
            <strong style={{ color: colors.accent, display: 'block', marginBottom: '4px' }}>Admin Account</strong>
            Creating a workspace will give you admin access. You can invite team members and volunteers from your dashboard.
          </div>
        )}

      </div>
    </div>
  );
}
