import React from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-gray-400 p-4">
      {/* Container for the 'Locked' Aesthetic */}
      <div className="max-w-md w-full border border-gray-800 bg-gray-900/50 p-8 rounded-lg shadow-2xl backdrop-blur-sm">
        
        {/* Status Indicator */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-xs uppercase tracking-[0.2em] text-gray-500">System Status</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-xs font-mono text-amber-500">VERIFICATION PENDING</span>
          </div>
        </div>

        {/* Brand / Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight text-center">
          WORSHIP<span className="text-indigo-500">OPS</span>
        </h1>
        <p className="text-sm text-center text-gray-500 font-mono mb-8">
          Command Center // v0.1.0
        </p>

        {/* The 'Locked' Message */}
        <div className="bg-black/50 border border-red-900/30 rounded p-4 mb-6">
          <h2 className="text-red-500 text-sm font-bold uppercase tracking-wide mb-1">
            ⚠️ Access Restricted
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            This domain is currently undergoing administrative verification. 
            Unauthorized access is prohibited.
          </p>
        </div>

        {/* Footer info */}
        <div className="text-center border-t border-gray-800 pt-6">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">
            ID: WSH-OPS-SECURE-NODE
          </p>
        </div>
      </div>
    </main>
  );
}