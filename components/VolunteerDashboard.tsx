'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Calendar, Clock, Music, Mic2, Guitar, Loader2, CheckCircle, XCircle, ChevronRight, LayoutGrid, LogOut } from 'lucide-react';
import VolunteerSchedule from './VolunteerSchedule'; 

export default function VolunteerDashboard({ user }: { user: any }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [nextUp, setNextUp] = useState<any>(null);
  const [futurePlans, setFuturePlans] = useState<any[]>([]);
  const [setlist, setSetlist] = useState<any[]>([]);
  const [responding, setResponding] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'schedule'>('dashboard');
  const [activePlanItems, setActivePlanItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user?.email) return;

        // 1. Get Volunteer ID
        const { data: member } = await supabase.from('team_members').select('id, name').eq('email', user.email).single();
        if (!member) { setLoading(false); return; }

        // 2. Get Assignments
        const { data: positions } = await supabase.from('service_positions')
          .select(`id, role_name, status, service:services (id, name, date, items)`) 
          .eq('member_id', member.id)
          .gte('service.date', new Date().toISOString())
          .order('service(date)', { ascending: true });

        // 3. Process Data
        if (positions && positions.length > 0) {
          const validPositions = positions.filter((p: any) => p.service !== null);
          
          if (validPositions.length > 0) {
              const sorted = validPositions.sort((a: any, b: any) => new Date(a.service.date).getTime() - new Date(b.service.date).getTime());
              const nextService = sorted[0];
              setNextUp(nextService);
              setFuturePlans(sorted.slice(1));
              
              // --- FIX: ROBUST SCHEDULE FETCHING ---
              // Try A: Get items from JSON column
              if(nextService.service?.items && nextService.service.items.length > 0) {
                 setActivePlanItems(nextService.service.items);
              } 
              // Try B: If JSON is empty, fetch from service_items table
              else {
                 const { data: dbItems } = await supabase.from('service_items')
                    .select('*')
                    .eq('service_date', nextService.service.date.split('T')[0])
                    .order('sort_order');
                 
                 if(dbItems) {
                    // Map DB items to Plan Item format
                    const mappedItems = dbItems.map((item: any) => ({
                        id: item.id,
                        type: item.item_type || 'item',
                        title: item.title,
                        length: item.duration_seconds || 0,
                        bpm: item.bpm,
                        key: item.song_key,
                        notes: item.notes,
                        role: item.role_name
                    }));
                    setActivePlanItems(mappedItems);
                 }
              }
              // -------------------------------------

              // 4. Get Songs (Setlist)
              if (nextService?.service?.id) {
                const { data: songs } = await supabase.from('service_items')
                  .select('*')
                  .eq('service_date', nextService.service.date.split('T')[0]) 
                  .eq('item_type', 'song')
                  .order('sort_order');
                const validSongs = (songs || []).filter(s => s.title && s.title.trim() !== '');
                setSetlist(validSongs);
              }
          }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchDashboardData();
  }, [user, supabase]);

  const handleResponse = async (status: 'confirmed' | 'declined', e: any) => {
    e.stopPropagation(); 
    if (!nextUp) return;
    setResponding(true);
    try {
        await supabase.from('service_positions').update({ status: status }).eq('id', nextUp.id);
        setNextUp({ ...nextUp, status: status });
    } catch (err) { console.error(err); } finally { setResponding(false); }
  };

  const formatDate = (dateStr: string) => {
      if(!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }
  const formatTime = (dateStr: string) => {
      if(!dateStr) return '';
      return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2"/> Loading...</div>;

  // --- RENDER SCHEDULE VIEW ---
  if (viewMode === 'schedule' && nextUp) {
      return (
        <VolunteerSchedule 
            service={nextUp.service} 
            planItems={activePlanItems} 
            onBack={() => setViewMode('dashboard')} 
        />
      );
  }

  // --- RENDER DASHBOARD ---
  if (!nextUp) {
    return (
      <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4"><Calendar className="text-gray-400" size={32} /></div>
        <h3 className="text-lg font-bold text-gray-900">No Upcoming Assignments</h3>
        <p className="text-gray-500 max-w-xs mx-auto mt-2">You are not scheduled for any future services.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans">
      
      {/* 1. HERO CARD (CLICKABLE) */}
      <div>
        <div className="flex justify-between items-end mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Next Up</h2>
             <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${nextUp.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-200' : (nextUp.status === 'declined' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200')}`}>
                {nextUp.status === 'confirmed' ? 'Confirmed' : (nextUp.status === 'declined' ? 'Declined' : 'Pending')}
             </div>
        </div>

        <div 
            onClick={() => setViewMode('schedule')}
            className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 cursor-pointer transition-transform hover:scale-[1.01] hover:shadow-xl"
        >
          <div className={`h-2 w-full ${nextUp.status === 'confirmed' ? 'bg-green-500' : (nextUp.status === 'declined' ? 'bg-red-500' : 'bg-amber-400')}`}></div>
          <div className="p-6 sm:p-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{nextUp.service.name}</h1>
                    <div className="flex flex-wrap gap-4 text-gray-600">
                    <div className="flex items-center gap-2 font-medium"><Calendar size={18} className="text-blue-500" /> {formatDate(nextUp.service.date)}</div>
                    <div className="flex items-center gap-2 font-medium"><Clock size={18} className="text-blue-500" /> {formatTime(nextUp.service.date)}</div>
                    </div>
                </div>
                <div className="bg-gray-50 p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <ChevronRight size={24} />
                </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100 mb-6">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-blue-600">
                    {nextUp.role_name.toLowerCase().includes('vocal') ? <Mic2 size={20}/> : <Guitar size={20}/>}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Position</div>
                    <div className="text-lg font-bold text-gray-800">{nextUp.role_name}</div>
                  </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            {nextUp.status === 'pending' && (
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={(e) => handleResponse('declined', e)} disabled={responding} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                        <XCircle size={18}/> Decline
                    </button>
                    <button onClick={(e) => handleResponse('confirmed', e)} disabled={responding} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50">
                        {responding ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>} Accept
                    </button>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. SETLIST */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Music size={14}/> Setlist</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {setlist.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic">No songs visible for this service.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {setlist.map((song: any) => (
                <div key={song.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 border border-gray-200 shrink-0">{song.song_key || "-"}</div>
                    <div>
                      <div className="font-bold text-gray-900">{song.title}</div>
                      {song.bpm && <div className="text-xs text-gray-500 font-medium">{song.bpm} BPM</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}