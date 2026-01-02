'use client'

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function LandingPage() {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const supabase = createClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    // Basic validation
    if (phone.length < 10) {
      setStatus('error');
      return;
    }

    const { error } = await supabase
      .from('leads')
      .insert([{ phone }]);

    if (error) {
      console.error(error);
      setStatus('error');
    } else {
      setStatus('success');
      setPhone('');
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#050505] text-white selection:bg-blue-500 selection:text-white">
      
      {/* Navbar / Header */}
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-600 animate-pulse"></div>
          <span className="text-lg font-bold tracking-tight">
            Worship<span className="text-blue-500">Ops</span>
          </span>
        </div>
        <div className="text-xs font-mono text-gray-500 uppercase tracking-widest border border-gray-800 px-3 py-1 rounded-full">
          System v0.1.0 // Alpha
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center sm:px-6 lg:px-8">
        
        {/* Status Badge */}
        <div className="mb-8 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-400">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500"></span>
          Under Construction
        </div>

        {/* Hero Headline */}
        <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl mb-6">
          Orchestrate your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
            Sunday Service.
          </span>
        </h1>

        {/* Value Prop */}
        <p className="max-w-2xl text-lg text-gray-400 mb-12 leading-relaxed">
          The all-in-one command center for worship production. 
          Manage rosters, sync setlists, and control your hardware from a single secure node.
          <br className="hidden md:block" />
          <span className="text-gray-500 italic mt-2 block">Coming 2026.</span>
        </p>

        {/* SMS Opt-In Form */}
        <div className="w-full max-w-md">
          {status === 'success' ? (
            <div className="rounded-lg bg-green-900/20 border border-green-800 p-4 text-green-400">
              <p className="font-semibold">Transmission Received.</p>
              <p className="text-sm opacity-80">You've been added to the priority access list.</p>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="relative">
              <div className="flex flex-col gap-4 sm:flex-row">
                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  className="flex-1 rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                >
                  {status === 'loading' ? 'Processing...' : 'Get Early Access'}
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-600">
                By joining, you agree to receive update texts. Standard rates apply.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-900 bg-black/50 py-8 text-center md:py-12">
        <div className="flex justify-center gap-6 mb-4 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/login" className="hover:text-white transition-colors">Staff Login</Link>
        </div>
        <p className="text-xs text-gray-700">
          &copy; 2026 WorshipOps. Secure Node: WSH-OPS-01
        </p>
      </footer>
    </main>
  );
}