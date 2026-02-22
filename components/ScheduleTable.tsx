'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import { 
  Clock, GripVertical, Calendar, ArrowLeft, ChevronLeft, ChevronRight, User
} from 'lucide-react';

// --- CONSTANTS ---
const GRID_LAYOUT = '60px 60px 4fr 1.5fr 2.5fr 3fr'; 

const ScheduleTable = ({ 
  isDarkMode = true, 
  onBack, 
  activePlanId, 
  serviceData, 
  services = [], 
  onServiceSelect, 
}: any) => {
  
  const supabase = createClient();

  // --- STATE ---
  const [planName, setPlanName] = useState("Sunday Service");
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Plan Data
  const ensureTime = (dateStr: any) => dateStr ? (dateStr.includes('T') ? dateStr : `${dateStr}T10:00`) : '';
  const cleanDate = (dateStr: any) => dateStr ? dateStr.split('T')[0] : '';

  const [serviceStart, setServiceStart] = useState(ensureTime(serviceData?.date));
  const [planItems, setPlanItems] = useState(serviceData?.items || []);
  
  // Sidebar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Sidebar Data
  const [timings, setTimings] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [ministries, setMinistries] = useState<any[]>([]);

  // --- DATA FETCHING ---
  useEffect(() => {
    const targetId = activePlanId || serviceData?.id;
    if (targetId) {
        fetchSidebarData(targetId);
    } 
    
    if (serviceData) {
        setPlanName(serviceData.name || "Sunday Service");
        setServiceStart(ensureTime(serviceData.date));
        setPlanItems(serviceData.items || []);
        if(serviceData.date) setCalendarDate(new Date(serviceData.date));
    }
  }, [activePlanId, serviceData]);

  const fetchSidebarData = async (serviceId: any) => {
      // 1. Fetch Timings
      const { data: timeData } = await supabase.from('service_times').select('*').eq('service_id', serviceId).order('time');
      setTimings(timeData || []);

      // 2. Fetch Ministries
      const { data: minData } = await supabase.from('ministries').select('*').order('sort_order', { ascending: true });
      setMinistries(minData || []);

      // 3. Fetch Positions
      const { data: posData } = await supabase.from('service_positions')
        .select(`*, profiles:member_id ( full_name )`) 
        .eq('service_id', serviceId)
        .order('id');
      setPositions(posData || []);
  };

  // Time Calc
  const calculatedEndTime = useMemo(() => {
    if (!serviceStart) return "";
    const totalMinutes = planItems.reduce((acc:any, item:any) => acc + (parseInt(item.length) || 0), 0);
    const startDate = new Date(serviceStart.includes('T') ? serviceStart : `${serviceStart}T10:00`);
    const endDate = new Date(startDate.getTime() + totalMinutes * 60000);
    return endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [serviceStart, planItems]);

  const calculateRowTime = (baseIsoString: any, minutesToAdd: any) => {
    if (!baseIsoString) return "00:00";
    const safeDate = baseIsoString.includes('T') ? baseIsoString : `${baseIsoString}T10:00`;
    const date = new Date(safeDate);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  let currentAccumulatedMinutes = 0;

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- STYLES ---
  const themeColors = {
    bg: isDarkMode ? '#111827' : '#ffffff',
    controlBarBg: isDarkMode ? '#1f2937' : '#ffffff',
    controlBarBorder: isDarkMode ? '#374151' : '#e5e7eb',
    headerText: isDarkMode ? '#9ca3af' : '#6b7280',
    textSubtle: isDarkMode ? '#6b7280' : '#9ca3af',
    rowText: isDarkMode ? '#d1d5db' : '#374151',
    rowBg: isDarkMode ? 'transparent' : '#ffffff',
    rowBorder: isDarkMode ? '#374151' : '#f3f4f6',
    sectionBg: isDarkMode ? '#1f2937' : '#f9fafb',
    sectionText: isDarkMode ? '#f3f4f6' : '#374151',
    primary: '#3b82f6',
    accent: '#10b981',
  };

  // FIX: Explicitly typed as CSSProperties map to satisfy TypeScript
  const styles: { [key: string]: React.CSSProperties } = {
    pageWrapper: { display: 'flex', gap: '30px', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box' },
    mainColumn: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }, 
    sidebarColumn: { width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '15px' },
    
    headerContainer: { backgroundColor: themeColors.controlBarBg, border: `1px solid ${themeColors.controlBarBorder}`, borderRadius: '12px', marginBottom: '20px', display: 'flex', flexDirection: 'column' },
    topRow: { padding: '12px 20px', display: 'flex', alignItems: 'center' },
    bottomRow: { padding: '10px 20px', borderTop: `1px solid ${themeColors.controlBarBorder}`, display: 'flex', alignItems: 'center', gap: '30px', fontSize: '13px', color: themeColors.textSubtle },
    titleWrapper: { marginLeft: '20px', fontSize: '24px', fontWeight: 'bold', color: themeColors.rowText },
    
    btnBack: { background: 'transparent', border: `1px solid ${themeColors.controlBarBorder}`, color: themeColors.rowText, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' },
    
    gridHeader: { display: 'grid', gridTemplateColumns: GRID_LAYOUT, gap: '10px', color: themeColors.headerText, fontWeight: '700', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '0 10px 10px 10px', borderBottom: `2px solid ${themeColors.controlBarBorder}` },
    gridRow: { display: 'grid', gridTemplateColumns: GRID_LAYOUT, gap: '10px', alignItems: 'center', padding: '12px 10px', borderBottom: `1px solid ${themeColors.rowBorder}`, background: themeColors.rowBg, fontSize: '14px', color: themeColors.rowText },
    sectionRow: { marginTop: '20px', marginBottom: '5px', padding: '8px 15px', background: themeColors.sectionBg, borderBottom: `1px solid ${themeColors.rowBorder}`, borderTop: `1px solid ${themeColors.rowBorder}`, borderRadius: '4px', color: themeColors.sectionText, fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', position: 'relative' },
    timeText: { fontFamily: 'monospace', color: themeColors.headerText, fontSize: '13px' },

    sidebarCard: { background: themeColors.controlBarBg, padding: '15px', borderRadius: '12px', border: `1px solid ${themeColors.controlBarBorder}` },
    sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '12px', fontWeight: '700', color: themeColors.headerText, textTransform: 'uppercase', letterSpacing: '1px' },
    
    timeRow: { display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '13px', color: themeColors.rowText, paddingBottom: '4px', borderBottom: `1px dashed ${themeColors.rowBorder}` },
    
    calHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' },
    calTitle: { margin: 0, fontSize: '14px', fontWeight: '600', color: themeColors.rowText },
    calBtn: { background: 'none', border: 'none', cursor: 'pointer', color: themeColors.rowText, padding: '4px' },
    calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' },
    calDayHeader: { textAlign: 'center', fontSize: '10px', color: themeColors.textSubtle, padding: '4px' },
    calDay: { aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', color: themeColors.rowText, cursor: 'pointer' },
    calDayActive: { border: `1px solid ${themeColors.primary}`, color: themeColors.primary, fontWeight: 'bold' },
    
    ministryHeader: { fontSize: '12px', fontWeight: 'bold', color: themeColors.primary, textTransform: 'uppercase', marginTop: '10px', marginBottom: '5px' },
    posRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: `1px dashed ${themeColors.rowBorder}`, color: themeColors.rowText },
  };

  // --- SUB-COMPONENT: SIDEBAR CALENDAR ---
  const renderSidebarCalendar = () => {
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return { days: new Date(year, month + 1, 0).getDate(), firstDay: new Date(year, month, 1).getDay(), year, month };
    };
    const { days, firstDay, year, month } = getDaysInMonth(calendarDate);
    const blanks = Array(firstDay).fill(null);
    const daySlots = Array.from({ length: days }, (_, i) => i + 1);
    const allSlots = [...blanks, ...daySlots];
    const currentServiceId = serviceData?.id;

    return (
        <div style={styles.sidebarCard}>
            <div style={styles.calHeader}>
                <h4 style={styles.calTitle}>{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                <div style={{display:'flex'}}>
                    <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth()-1)))} style={styles.calBtn}><ChevronLeft size={14}/></button>
                    <button onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth()+1)))} style={styles.calBtn}><ChevronRight size={14}/></button>
                </div>
            </div>
            <div style={styles.calGrid}>
                {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={styles.calDayHeader}>{d}</div>)}
                {allSlots.map((day, index) => {
                    if (!day) return <div key={index}></div>;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const serviceOnDay = services.find((s:any) => cleanDate(s.date) === dateStr);
                    const isCurrent = serviceOnDay && serviceOnDay.id === currentServiceId;
                    return (
                        <div key={index} 
                             onClick={() => { if(serviceOnDay) onServiceSelect(serviceOnDay.id); }} 
                             style={{...styles.calDay, ...(isCurrent ? styles.calDayActive : {}), opacity: serviceOnDay ? 1 : 0.3, cursor: serviceOnDay ? 'pointer' : 'default'}} 
                        >
                            <span>{day}</span>
                            {serviceOnDay && <div style={{width:'4px', height:'4px', borderRadius:'50%', background: themeColors.accent, marginTop:'2px'}}></div>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.mainColumn}>
        
        {/* HEADER */}
        <div style={styles.headerContainer}>
            <div style={styles.topRow}>
                <button onClick={onBack} style={styles.btnBack}><ArrowLeft size={16} /> Back</button>
                <div style={styles.titleWrapper}>{planName}</div>
            </div>
            <div style={styles.bottomRow}>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    <Calendar size={14} /> <span>{new Date(serviceStart).toLocaleDateString()} {new Date(serviceStart).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    <Clock size={14} /> <span>Ends at <strong>{calculatedEndTime}</strong></span>
                </div>
            </div>
        </div>

        {/* GRID */}
        <div style={styles.gridHeader}>
            <div>Time</div><div>Length</div><div>Item</div><div>Details</div><div>Position / Who</div><div>Notes</div>
        </div>
        <div>
            {planItems.map((item: any, index: number) => {
                const startAt = calculateRowTime(serviceStart, currentAccumulatedMinutes);
                if (item.type !== 'header') currentAccumulatedMinutes += item.length;
                return (
                    <div key={item.id || index} style={item.type === 'header' ? styles.sectionRow : styles.gridRow}>
                         {item.type === 'header' ? (
                            <div style={{fontWeight:'bold'}}>{item.title}</div>
                         ) : (
                            <>
                                <div style={styles.timeText}>{startAt}</div>
                                <div style={{textAlign:'center'}}>{item.length}m</div>
                                <div style={{fontWeight:'600'}}>{item.title}</div>
                                <div style={{color: themeColors.headerText}}>-</div>
                                <div style={{color: themeColors.headerText}}>{item.role || '-'}</div>
                                <div style={{fontStyle:'italic', color: themeColors.textSubtle}}>{item.notes}</div>
                            </>
                         )}
                    </div>
                );
            })}
        </div>
      </div>

      {/* --- SIDEBAR --- */}
      <div style={styles.sidebarColumn}>
        
        {/* CALENDAR */}
        {renderSidebarCalendar()}

        {/* TIMES */}
        <div style={styles.sidebarCard}>
            <div style={styles.sidebarHeader}>Schedule</div>
            {timings.length === 0 && <div style={{color: themeColors.textSubtle, fontSize:'12px'}}>No times added.</div>}
            {timings.map((t, i) => (
                <div key={i} style={styles.timeRow}>
                    <div style={{fontFamily:'monospace', fontWeight:'bold'}}>{(t.time || "").slice(0,5)}</div>
                    <div>{t.description}</div>
                </div>
            ))}
        </div>

        {/* TEAMS */}
        <div style={styles.sidebarCard}>
            <div style={styles.sidebarHeader}>Teams</div>
            {ministries.map((ministry) => {
                const myPositions = positions.filter(p => p.ministry_id === ministry.id);
                if (myPositions.length === 0) return null;
                return (
                    <div key={ministry.id} style={{marginBottom: '15px'}}>
                        <div style={styles.ministryHeader}>{ministry.name}</div>
                        {myPositions.map(pos => (
                            <div key={pos.id} style={styles.posRow}>
                                <div style={{fontWeight:'500'}}>{pos.role_name}</div>
                                <div style={{color: pos.member_id ? themeColors.primary : themeColors.textSubtle}}>
                                    {/* Show name if confirmed/assigned */}
                                    {pos.member_id ? 'Assigned' : 'Unassigned'}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>

      </div>
    </div>
  );
};

export default ScheduleTable;