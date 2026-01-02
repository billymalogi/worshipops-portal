// src/app/page.tsx
import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-white p-4 rounded-2xl shadow-md mb-6 animate-bounce">
        <LayoutGrid className="text-blue-600" size={48} />
      </div>
      
      {/* UPDATED TITLE */}
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
        Command Center
      </h1>
      
      <p className="text-lg text-gray-500 max-w-sm mb-10 leading-relaxed">
        Access your roster, view service orders, and manage your schedule from anywhere.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link 
          href="/login" 
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
        >
          Volunteer Login <ArrowRight size={20} />
        </Link>
      </div>

      <div className="mt-12 text-gray-300 text-sm">
        © 2026 Worship Ops
      </div>
    </div>
  );
}