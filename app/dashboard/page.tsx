'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Calendar, Clock, CheckCircle, XCircle, LogOut, User, LayoutGrid } from 'lucide-react'
import { useRouter } from 'next/navigation'

type MyAssignment = {
  position_id: string; role: string; status: string;
  service: { id: string; name: string; date: string; }
}

export default function VolunteerDashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<MyAssignment[]>([])
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const fetchMySchedule = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: memberData } = await supabase.from('team_members').select('id, name').eq('email', user.email).single()
        if (!memberData) { setLoading(false); return }

        setUserName(memberData.name)

        const { data: positionData } = await supabase.from('service_positions')
          .select(`id, role_name, status, service:services (id, name, date)`)
          .eq('member_id', memberData.id)

        const formatted = (positionData || []).map((p: any) => ({
          position_id: p.id, role: p.role_name, status: p.status, service: p.service
        }))
        formatted.sort((a, b) => new Date(a.service.date).getTime() - new Date(b.service.date).getTime())
        setAssignments(formatted)
      } catch (error) { console.error(error) } finally { setLoading(false) }
    }
    fetchMySchedule()
  }, [router, supabase])

  const handleResponse = async (id: string, status: 'confirmed' | 'declined') => {
    setAssignments(prev => prev.map(a => a.position_id === id ? { ...a, status } : a))
    await supabase.from('service_positions').update({ status }).eq('id', id)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
             <div className="flex items-center gap-3">
                {/* Branding Update Here */}
                <div className="bg-blue-600 text-white p-1.5 rounded-md hidden md:block"><LayoutGrid size={18}/></div>
                <h1 className="text-xl font-bold text-gray-900">Worship Ops</h1>
             </div>
             <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-gray-900">{userName}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Volunteer</div>
                </div>
                <button onClick={handleLogout} className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition-colors">
                    <LogOut size={18} />
                </button>
             </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">My Upcoming Roster</h2>
            <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                {assignments.length} assignments
            </div>
        </div>
        
        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {assignments.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-gray-200 border-dashed">
                    <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-4"><Calendar size={32}/></div>
                    <h3 className="text-lg font-medium text-gray-900">No scheduled services</h3>
                    <p className="text-gray-500">You are currently not rostered for any upcoming dates.</p>
                </div>
            )}

            {assignments.map((item) => {
                const dateObj = new Date(item.service.date)
                const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

                return (
                    <div key={item.position_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                        {/* Status Strip */}
                        {item.status === 'pending' && <div className="bg-amber-400 h-1.5 w-full"></div>}
                        {item.status === 'confirmed' && <div className="bg-emerald-500 h-1.5 w-full"></div>}
                        {item.status === 'declined' && <div className="bg-rose-500 h-1.5 w-full"></div>}

                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-gray-900 leading-snug">{item.service.name}</h3>
                                {item.status === 'pending' && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full uppercase">Action Needed</span>}
                            </div>
                            
                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium"><Calendar size={16} className="text-blue-500"/> {dateStr}</div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium"><Clock size={16} className="text-blue-500"/> {timeStr}</div>
                            </div>

                            <div className="mt-auto">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 mb-4">
                                    <div className="bg-white p-1.5 rounded-md shadow-sm text-gray-400"><User size={14}/></div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Position</div>
                                        <div className="text-sm font-semibold text-gray-900">{item.role}</div>
                                    </div>
                                </div>

                                {item.status === 'pending' ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => handleResponse(item.position_id, 'declined')} className="py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50">Decline</button>
                                        <button onClick={() => handleResponse(item.position_id, 'confirmed')} className="py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-600/10">Accept</button>
                                    </div>
                                ) : (
                                    <div className={`text-center py-2.5 rounded-lg text-sm font-bold border ${item.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                        {item.status === 'confirmed' ? '✓ Confirmed' : '✕ Declined'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  )
}