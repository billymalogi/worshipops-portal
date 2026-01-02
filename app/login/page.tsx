'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, ArrowRight, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) } 
    else { router.push('/dashboard') }
  }

  return (
    <div className="min-h-screen flex bg-white font-sans">
      
      {/* LEFT SIDE: Visual (Darker Blue Background) */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-950 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-white blur-3xl"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-blue-500 blur-3xl"></div>
        </div>

        <div className="relative z-10">
            <div className="flex items-center gap-3 font-bold text-xl mb-8">
                <LayoutGrid className="text-blue-400" /> Command Center
            </div>
            <h1 className="text-5xl font-extrabold leading-tight mb-4">
                Orchestrate your <br/>sunday service.
            </h1>
            <p className="text-blue-200 text-lg max-w-md">
                View your schedules, access setlists, and confirm your roster spots all in one place.
            </p>
        </div>
        <div className="relative z-10 text-sm text-blue-400">
            © 2026 Worship Ops
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 lg:bg-white">
        <div className="max-w-md w-full">
            <div className="text-center lg:text-left mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                <p className="text-gray-500">Please enter your details to sign in.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        {/* UPDATED: Added text-gray-900 and placeholder:text-gray-400 */}
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white lg:bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                            placeholder="you@church.com" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        {/* UPDATED: Added text-gray-900 and placeholder:text-gray-400 */}
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white lg:bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 placeholder:text-gray-400"
                            placeholder="••••••••" />
                    </div>
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

                <button type="submit" disabled={loading}
                    className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-gray-900/20">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <>Sign In <ArrowRight size={18} /></>}
                </button>
            </form>
            
            <div className="mt-8 text-center lg:text-left">
                <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Back to Home</Link>
            </div>
        </div>
      </div>
    </div>
  )
}