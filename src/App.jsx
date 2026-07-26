import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import Login from './Login';
import LyricsDisplay from './components/LyricsDisplay';
import StageMonitor from './components/StageMonitor';
import ComingSoon from './ComingSoon';
import PrivacyPolicy from './PrivacyPolicy';
import TermsConditions from './TermsConditions';
import InvitePage from './components/InvitePage';
import { supabase } from './supabaseClient';

function RootPage() {
  const [session, setSession] = useState(undefined);

  const checkSession = () => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
    });
  };

  useEffect(() => {
    checkSession();

    // The browser can restore this page from the back/forward cache (e.g. after
    // pressing Back) with whatever auth state was frozen at the time it was
    // cached — re-verify instead of showing a stale logged-out/logged-in view.
    const handlePageShow = (e) => { if (e.persisted) checkSession(); };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Still checking auth — render nothing to avoid flash
  if (session === undefined) return null;

  // Authenticated → go straight to Dashboard
  if (session) return <Dashboard />;

  // Not authenticated → show Coming Soon
  return <ComingSoon />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<RootPage />} />
      <Route path="/login"   element={<Login />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms"   element={<TermsConditions />} />
      <Route path="/display"        element={<LyricsDisplay />} />
      <Route path="/stage"          element={<StageMonitor />} />
      <Route path="/invite/:token"  element={<InvitePage />} />
      <Route path="/*"              element={<Dashboard />} />
    </Routes>
  );
}
