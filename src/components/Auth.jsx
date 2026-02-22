import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LayoutGrid, Loader, Lock, Mail, User, Building2 } from 'lucide-react';

const Auth = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [churchName, setChurchName] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        if (isSignUp) {
            // 1. Sign Up the User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } }
            });
            if (authError) throw authError;

            // 2. CALL THE SECURE DATABASE FUNCTION
            // We wait 500ms to ensure the session is fully established on the server
            if (authData.user) {
                setTimeout(async () => {
                    const { error: rpcError } = await supabase.rpc('create_church_workspace', { 
                        church_name: churchName 
                    });
                    
                    if (rpcError) {
                        console.error('Workspace creation failed:', rpcError);
                        setError("User created, but workspace failed. Please contact support.");
                        return;
                    }
                    
                    // Success!
                    alert("Account and Workspace created successfully!");
                    window.location.reload(); // Reload to load the new dashboard
                }, 500); 
            }

        } else {
            // Login Logic
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (onLoginSuccess) onLoginSuccess();
        }
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const colors = {
    bg: '#1a1b1e', card: '#25262b', text: '#c1c2c5', 
    primary: '#228be6', border: '#2c2e33'
  };

  return (
    <div style={{ height: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: colors.card, padding: '40px', borderRadius: '16px', border: `1px solid ${colors.border}`, width: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(34, 139, 230, 0.1)', borderRadius: '12px', marginBottom: '15px' }}>
                <LayoutGrid size={32} color={colors.primary} />
            </div>
            <h1 style={{ margin: 0, color: 'white', fontSize: '24px' }}>Worship Ops</h1>
            <p style={{ color: '#888', marginTop: '5px' }}>{isSignUp ? 'Start your church workspace' : 'Sign in to your account'}</p>
        </div>

        {error && <div style={{ background: 'rgba(250, 82, 82, 0.1)', color: '#fa5252', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {isSignUp && (
                <>
                    <div style={{ position: 'relative' }}>
                        <Building2 size={18} style={{ position: 'absolute', top: '13px', left: '12px', color: '#666' }} />
                        <input required placeholder="Church Name" value={churchName} onChange={e => setChurchName(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.bg, color: 'white', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', top: '13px', left: '12px', color: '#666' }} />
                        <input required placeholder="Your Full Name" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.bg, color: 'white', boxSizing: 'border-box' }} />
                    </div>
                </>
            )}

            <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', top: '13px', left: '12px', color: '#666' }} />
                <input required type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.bg, color: 'white', boxSizing: 'border-box' }} />
            </div>

            <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', top: '13px', left: '12px', color: '#666' }} />
                <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.bg, color: 'white', boxSizing: 'border-box' }} />
            </div>

            <button type="submit" disabled={loading} style={{ background: colors.primary, color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                {loading && <Loader size={18} className="animate-spin" />}
                {isSignUp ? 'Create Workspace' : 'Sign In'}
            </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
            <span style={{ color: '#888' }}>{isSignUp ? 'Already have an account?' : "Don't have a workspace?"} </span>
            <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontWeight: 'bold' }}>
                {isSignUp ? 'Sign In' : 'Create One'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default Auth;