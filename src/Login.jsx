import { useState } from 'react';
import { supabase } from './supabaseClient';
import { LayoutGrid, Loader, Lock, Mail, User, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [churchName, setChurchName] = useState('');
  const [fullName, setFullName] = useState('');

  // Theme colors matching App.css
  const colors = {
    bgDark: '#111827',      // --bg-dark
    bgPanel: '#1f2937',     // --bg-panel
    textMain: '#f3f4f6',    // --text-main (bright white)
    textMuted: '#9ca3af',   // --text-muted (light gray)
    accent: '#3b82f6',      // --accent (blue)
    border: '#374151',      // --border
    success: '#10b981',     // Green
    danger: '#ef4444',      // Red
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

        // Create workspace for the new admin
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

            // Success - reload to trigger auth state change
            setSuccessMessage("Workspace created successfully! Redirecting...");
            setTimeout(() => {
              window.location.href = '/';
            }, 1500);
          }, 500);
        }

      } else {
        // Login Flow
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          // Check if it's an invalid credentials error
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
                    onClick={() => {
                      setIsSignUp(true);
                      setError(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.accent,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
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

        // Successful login - redirect will happen via auth state change in Dashboard
        setSuccessMessage("Login successful! Redirecting...");
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      if (!isSignUp) {
        setLoading(false);
      }
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
          <div style={{
            display: 'inline-flex',
            padding: '14px',
            background: 'rgba(59, 130, 246, 0.15)',
            borderRadius: '14px',
            marginBottom: '16px'
          }}>
            <LayoutGrid size={36} color={colors.accent} />
          </div>
          <h1 style={{
            margin: 0,
            color: colors.textMain,
            fontSize: '28px',
            fontWeight: '800',
            letterSpacing: '-0.5px'
          }}>
            Worship Ops
          </h1>
          <p style={{
            color: colors.textMuted,
            marginTop: '8px',
            fontSize: '15px',
            fontWeight: '500'
          }}>
            {isSignUp ? 'Create Your Church Workspace' : 'Sign in to your account'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: `1px solid rgba(239, 68, 68, 0.3)`,
            color: colors.danger,
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '14px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            lineHeight: '1.5'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>{error}</div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: `1px solid rgba(16, 185, 129, 0.3)`,
            color: colors.success,
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '14px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
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
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: colors.textMain,
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Church Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={18} style={{
                    position: 'absolute',
                    top: '14px',
                    left: '14px',
                    color: colors.textMuted
                  }} />
                  <input
                    required
                    placeholder="Grace Community Church"
                    value={churchName}
                    onChange={e => setChurchName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '13px 14px 13px 44px',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      background: colors.bgDark,
                      color: colors.textMain,
                      fontSize: '15px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = colors.accent}
                    onBlur={(e) => e.target.style.borderColor = colors.border}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: colors.textMain,
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Your Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{
                    position: 'absolute',
                    top: '14px',
                    left: '14px',
                    color: colors.textMuted
                  }} />
                  <input
                    required
                    placeholder="John Smith"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '13px 14px 13px 44px',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      background: colors.bgDark,
                      color: colors.textMain,
                      fontSize: '15px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = colors.accent}
                    onBlur={(e) => e.target.style.borderColor = colors.border}
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Field */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: colors.textMain,
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                top: '14px',
                left: '14px',
                color: colors.textMuted
              }} />
              <input
                required
                type="email"
                placeholder="you@church.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '13px 14px 13px 44px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: colors.bgDark,
                  color: colors.textMain,
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = colors.accent}
                onBlur={(e) => e.target.style.borderColor = colors.border}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: colors.textMain,
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                top: '14px',
                left: '14px',
                color: colors.textMuted
              }} />
              <input
                required
                type="password"
                placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '13px 14px 13px 44px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: colors.bgDark,
                  color: colors.textMain,
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = colors.accent}
                onBlur={(e) => e.target.style.borderColor = colors.border}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: colors.accent,
              color: 'white',
              border: 'none',
              padding: '15px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.opacity = '1';
            }}
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
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccessMessage(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: colors.accent,
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Sign In' : 'Create Workspace'}
          </button>
        </div>

        {/* Admin Note for Sign-Up */}
        {isSignUp && (
          <div style={{
            marginTop: '24px',
            padding: '12px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: `1px solid rgba(59, 130, 246, 0.2)`,
            borderRadius: '8px',
            fontSize: '13px',
            color: colors.textMuted,
            lineHeight: '1.6'
          }}>
            <strong style={{ color: colors.accent, display: 'block', marginBottom: '4px' }}>
              Admin Account
            </strong>
            Creating a workspace will give you admin access. You can invite team members and volunteers from your dashboard.
          </div>
        )}

      </div>
    </div>
  );
}
