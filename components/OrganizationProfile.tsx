'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, Building, Mail, Loader2, Shield } from 'lucide-react';

export default function OrganizationProfile({ session, orgId, isDarkMode }: any) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user) return;

      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles') // Ensure you have this table, or use 'team_members'
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      setProfile(profileData);

      // 2. Fetch Org Details if orgId exists
      if (orgId) {
        const { data: orgData } = await supabase
            .from('organizations') 
            .select('*')
            .eq('id', orgId)
            .maybeSingle();
        setOrgDetails(orgData);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [session, orgId, supabase]);

  const colors = {
    bg: isDarkMode ? '#25262b' : '#ffffff',
    text: isDarkMode ? '#c1c2c5' : '#1f2937',
    heading: isDarkMode ? '#ffffff' : '#111827',
    border: isDarkMode ? '#2c2e33' : '#e5e7eb',
    subtle: isDarkMode ? '#909296' : '#6b7280',
    cardBg: isDarkMode ? '#1a1b1e' : '#f8f9fa'
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: colors.heading, marginBottom: '30px' }}>Account Settings</h1>

      {/* USER CARD */}
      <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '25px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.subtle, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px', display:'flex', alignItems:'center', gap:'10px' }}>
            <User size={16} /> Personal Profile
        </h2>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#228be6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                {session.user.email?.[0].toUpperCase()}
            </div>
            <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.heading }}>
                    {profile?.full_name || session.user.email?.split('@')[0]}
                </div>
                <div style={{ color: colors.subtle, fontSize: '14px', display:'flex', alignItems:'center', gap:'6px', marginTop:'4px' }}>
                    <Mail size={14} /> {session.user.email}
                </div>
            </div>
        </div>
      </div>

      {/* ORGANIZATION CARD */}
      <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '25px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.subtle, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '20px', display:'flex', alignItems:'center', gap:'10px' }}>
            <Building size={16} /> Organization
        </h2>

        {orgDetails ? (
            <div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.heading, marginBottom:'5px' }}>{orgDetails.name}</div>
                <div style={{ display:'inline-block', padding:'4px 10px', borderRadius:'4px', backgroundColor: 'rgba(64, 192, 87, 0.1)', color:'#40c057', fontSize:'12px', fontWeight:'bold' }}>Active Subscription</div>
            </div>
        ) : (
            <div style={{ textAlign:'center', padding:'20px', color: colors.subtle, border: `1px dashed ${colors.border}`, borderRadius:'8px' }}>
                <Shield size={24} style={{marginBottom:'10px', opacity:0.5}}/>
                <div>No Organization Found</div>
                <div style={{fontSize:'12px'}}>You are currently in generic mode.</div>
            </div>
        )}
      </div>
    </div>
  );
}