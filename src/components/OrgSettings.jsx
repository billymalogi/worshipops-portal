import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import ColorPicker from './ColorPicker';
import { Save, Upload, Plus, X, Building, MapPin, Clock, Layers, BookOpen, Heart, ChevronDown, ChevronUp, Phone, Eye, EyeOff } from 'lucide-react';

const DEFAULT_VERSE_SAMPLES = [
  'Zephaniah 3:17', 'Philippians 4:13', 'Psalm 46:10', 'Psalm 23:1',
  'Proverbs 3:5', 'Jeremiah 29:11', 'Matthew 11:28', 'Romans 8:28',
  'Philippians 4:6', 'Numbers 6:24-25', 'Isaiah 40:29', 'Psalm 118:24',
  '1 John 4:4', 'Philippians 4:4', 'Isaiah 40:31', 'Proverbs 18:10',
  'Psalm 100:4', 'Psalm 150:6', 'Psalm 34:8', 'Psalm 96:1',
  'Hebrews 12:28', 'Psalm 95:6', 'Psalm 138:1', 'Psalm 84:1', 'Psalm 100:2',
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COUNTRIES = ['US', 'CA', 'GB', 'AU', 'NZ', 'ZA', 'Other'];

// Helper: masked text field for Twilio credentials
function TwilioField({ label, value, onChange, placeholder, isSecret, disabled, c, lbl, inp }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div>
      {lbl(label)}
      <div style={{ position: 'relative' }}>
        <input
          type={isSecret && !visible ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{ ...inp(disabled), paddingRight: isSecret ? '36px' : '12px' }}
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: c.muted, padding: 0 }}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BRAND_PRESETS = [
  '#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

export default function OrgSettings({ orgId, isDarkMode, userRole, session, onBrandColorsChange }) {
  const isAdmin  = userRole === 'admin';
  const userId   = session?.user?.id || null;

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [dbErr,     setDbErr]     = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [showDefaultVerses,   setShowDefaultVerses]   = useState(false);

  // ── Brand color ──────────────────────────────────────────────────────────────
  // Auto text color helper (luminance-based)
  const getAutoTextColor = (hex) => {
    if (!hex) return '#ffffff';
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return '#ffffff';
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#09090B' : '#ffffff';
  };

  const [brandColor,        setBrandColor]        = useState('#6366f1');
  const [brandHeaderColor,  setBrandHeaderColor]  = useState('#111111');
  const [brandSidebarColor, setBrandSidebarColor] = useState('#0a0a0a');
  const [pickedColor,       setPickedColor]       = useState('#6366f1');
  const [pickedHeaderColor, setPickedHeaderColor] = useState('#111111');
  const [pickedSidebarColor,setPickedSidebarColor]= useState('#0a0a0a');
  // Text color overrides (null = auto-detect from background)
  const [pickedNavTextColor,     setPickedNavTextColor]     = useState(null);
  const [pickedHeaderTextColor,  setPickedHeaderTextColor]  = useState(null);
  const [pickedSidebarTextColor, setPickedSidebarTextColor] = useState(null);
  const [adminCount,        setAdminCount]        = useState(1);
  const [proposal,          setProposal]          = useState(null);
  const [brandSaving,       setBrandSaving]       = useState(false);
  const [brandSaved,        setBrandSaved]        = useState(false);
  const [migrationNeeded,   setMigrationNeeded]   = useState(false); // true if add_brand_color.sql not yet run
  const [form, setForm] = useState({
    name:                       '',
    logo_url:                   '',
    phone:                      '',
    email:                      '',
    website:                    '',
    address_street:             '',
    address_city:               '',
    address_state:              '',
    address_zip:                '',
    address_country:            'US',
    capacity:                   '',
    service_times:              [],
    ministries:                 [],
    custom_verses:              [],
    burnout_prevention_enabled: true,
    burnout_warning_threshold:  3,
    burnout_auto_threshold:     6,
    twilio_account_sid:         '',
    twilio_auth_token:          '',
    twilio_from_phone:          '',
    twilio_whatsapp_from:       '',
  });

  // â”€â”€ Load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);

      // Load org settings + brand colors + admin count + proposals in parallel
      const [orgResult, bcResult, countResult, propRow] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', orgId).maybeSingle(),
        supabase.from('organization_brand_colors').select('*').eq('org_id', orgId).maybeSingle(),
        supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('role', 'admin'),
        supabase.from('brand_color_proposals').select('*').eq('org_id', orgId).eq('status', 'pending').maybeSingle(),
      ]);

      // Org settings
      if (orgResult.error?.code === '42P01') {
        setDbErr('Run the migration SQL first: supabase/add_profile_org_tables.sql');
      } else if (orgResult.data) {
        const data = orgResult.data;
        setForm({
          name:                       data.name            || '',
          logo_url:                   data.logo_url        || '',
          phone:                      data.phone           || '',
          email:                      data.email           || '',
          website:                    data.website         || '',
          address_street:             data.address_street  || '',
          address_city:               data.address_city    || '',
          address_state:              data.address_state   || '',
          address_zip:                data.address_zip     || '',
          address_country:            data.address_country || 'US',
          capacity:                   data.capacity        ?? '',
          service_times:              Array.isArray(data.service_times)  ? data.service_times  : [],
          ministries:                 Array.isArray(data.ministries)     ? data.ministries     : [],
          custom_verses:              Array.isArray(data.custom_verses)  ? data.custom_verses  : [],
          burnout_prevention_enabled: data.burnout_prevention_enabled    ?? true,
          burnout_warning_threshold:  data.burnout_warning_threshold     ?? 3,
          burnout_auto_threshold:     data.burnout_auto_threshold        ?? 6,
          twilio_account_sid:         data.twilio_account_sid            || '',
          twilio_auth_token:          data.twilio_auth_token             || '',
          twilio_from_phone:          data.twilio_from_phone             || '',
          twilio_whatsapp_from:       data.twilio_whatsapp_from          || '',
        });
      }

      // Brand colors (from dedicated table)
      if (bcResult.error?.code === '42P01') {
        setMigrationNeeded(true); // table doesn't exist yet
      } else if (bcResult.data) {
        const bc = bcResult.data;
        const brandC  = bc.brand_color         || '#6366f1';
        const brandH  = bc.brand_header_color  || '#111111';
        const brandS  = bc.brand_sidebar_color || '#0a0a0a';
        setBrandColor(brandC);        setPickedColor(brandC);
        setBrandHeaderColor(brandH);  setPickedHeaderColor(brandH);
        setBrandSidebarColor(brandS); setPickedSidebarColor(brandS);
        setPickedNavTextColor(bc.brand_nav_text_color       || null);
        setPickedHeaderTextColor(bc.brand_header_text_color  || null);
        setPickedSidebarTextColor(bc.brand_sidebar_text_color || null);
      }

      // Admin count
      setAdminCount(countResult.count || 1);

      // Proposals
      if (propRow.error?.code === '42P01') {
        setMigrationNeeded(true);
        setProposal(null);
      } else {
        setProposal(propRow.data || null);
      }

      setLoading(false);
    })();
  }, [orgId]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // â”€â”€ Logo upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleLogoUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const ext  = file.name.split('.').pop();
    const path = `${orgId}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('org-logos').upload(path, file, { upsert: true });
    if (upErr) {
      alert(`Upload failed: ${upErr.message}\n\nMake sure you created the "org-logos" bucket in Supabase Storage.`);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('org-logos').getPublicUrl(path);
    set('logo_url', urlData.publicUrl);
    setUploading(false);
  };

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    const { error } = await supabase.from('organizations').upsert({
      id: orgId,
      ...form,
      capacity: form.capacity === '' ? null : Number(form.capacity),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      setDbErr(error.code === '42P01'
        ? 'Run the migration SQL first: supabase/add_profile_org_tables.sql'
        : error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  // â”€â”€ Service times helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addServiceTime = () => set('service_times', [...form.service_times, { day: 'Sunday', time: '09:00', name: '' }]);
  const updateST = (i, field, val) => {
    const next = [...form.service_times];
    next[i] = { ...next[i], [field]: val };
    set('service_times', next);
  };
  const removeST = (i) => set('service_times', form.service_times.filter((_, idx) => idx !== i));

  // â”€â”€ Ministry helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addMinistry    = () => set('ministries', [...form.ministries, { name: '', positions: [] }]);
  const updateMinName  = (i, val) => { const n = [...form.ministries]; n[i] = { ...n[i], name: val }; set('ministries', n); };
  const removeMin      = (i) => set('ministries', form.ministries.filter((_, idx) => idx !== i));
  const addPosition    = (mi) => { const n = [...form.ministries]; n[mi] = { ...n[mi], positions: [...(n[mi].positions||[]), ''] }; set('ministries', n); };
  const updatePosition = (mi, pi, val) => { const n = [...form.ministries]; const p = [...(n[mi].positions||[])]; p[pi] = val; n[mi] = { ...n[mi], positions: p }; set('ministries', n); };
  const removePosition = (mi, pi) => { const n = [...form.ministries]; n[mi] = { ...n[mi], positions: (n[mi].positions||[]).filter((_,idx) => idx !== pi) }; set('ministries', n); };

  // â”€â”€ Verse helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addVerse = () => {
    if (form.custom_verses.length >= 30) return;
    set('custom_verses', [...form.custom_verses, { text: '', reference: '' }]);
  };
  const updateVerse = (i, field, val) => {
    const next = [...form.custom_verses];
    next[i] = { ...next[i], [field]: val };
    set('custom_verses', next);
  };
  const removeVerse = (i) => set('custom_verses', form.custom_verses.filter((_, idx) => idx !== i));

  // ── Brand color handlers ─────────────────────────────────────────────────────
  const applyAllBrandColors = async (primary, header, sidebar, navText, headerText, sidebarText) => {
    setBrandSaving(true);
    const { error: updateErr } = await supabase
      .from('organization_brand_colors')
      .upsert({
        org_id:                  orgId,
        brand_color:             primary,
        brand_header_color:      header,
        brand_sidebar_color:     sidebar,
        brand_nav_text_color:    navText      || null,
        brand_header_text_color: headerText   || null,
        brand_sidebar_text_color: sidebarText || null,
        updated_at:              new Date().toISOString(),
      }, { onConflict: 'org_id' });

    // If columns don't exist (migration not yet run), flag it but still apply visually
    if (updateErr?.code === '42703' || updateErr?.code === '42P01') {
      setMigrationNeeded(true);
    }

    // Always update local + parent state so colors preview immediately
    setBrandColor(primary);        setPickedColor(primary);
    setBrandHeaderColor(header);   setPickedHeaderColor(header);
    setBrandSidebarColor(sidebar); setPickedSidebarColor(sidebar);
    setPickedNavTextColor(navText       || null);
    setPickedHeaderTextColor(headerText  || null);
    setPickedSidebarTextColor(sidebarText || null);
    onBrandColorsChange?.(primary, header, sidebar, navText || null, headerText || null, sidebarText || null);
    setBrandSaving(false);
    if (!updateErr) {
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 2500);
    }
  };

  const proposeBrandColor = async () => {
    if (!userId) return;
    setBrandSaving(true);
    await supabase.from('brand_color_proposals').update({ status: 'rejected' }).eq('org_id', orgId).eq('status', 'pending');
    const { data } = await supabase.from('brand_color_proposals').insert({
      org_id: orgId,
      proposed_color:             pickedColor,
      proposed_header_color:      pickedHeaderColor,
      proposed_sidebar_color:     pickedSidebarColor,
      proposed_nav_text_color:     pickedNavTextColor     || null,
      proposed_header_text_color:  pickedHeaderTextColor  || null,
      proposed_sidebar_text_color: pickedSidebarTextColor || null,
      proposed_by: userId, approved_by: [userId], status: 'pending',
    }).select().maybeSingle();
    setProposal(data);
    setBrandSaving(false);
  };

  const approveBrandColor = async () => {
    if (!proposal || !userId) return;
    setBrandSaving(true);
    const newApprovals = [...new Set([...(proposal.approved_by || []), userId])];
    const quorum = Math.min(adminCount, 2);
    if (newApprovals.length >= quorum) {
      await supabase.from('brand_color_proposals').update({ approved_by: newApprovals, status: 'approved' }).eq('id', proposal.id);
      await supabase
        .from('organization_brand_colors')
        .upsert({
          org_id:                  orgId,
          brand_color:             proposal.proposed_color,
          brand_header_color:      proposal.proposed_header_color,
          brand_sidebar_color:     proposal.proposed_sidebar_color,
          brand_nav_text_color:     proposal.proposed_nav_text_color     || null,
          brand_header_text_color:  proposal.proposed_header_text_color  || null,
          brand_sidebar_text_color: proposal.proposed_sidebar_text_color || null,
          updated_at:               new Date().toISOString(),
        }, { onConflict: 'org_id' });
      setBrandColor(proposal.proposed_color);
      setBrandHeaderColor(proposal.proposed_header_color);
      setBrandSidebarColor(proposal.proposed_sidebar_color);
      setPickedColor(proposal.proposed_color);
      setPickedHeaderColor(proposal.proposed_header_color);
      setPickedSidebarColor(proposal.proposed_sidebar_color);
      setPickedNavTextColor(proposal.proposed_nav_text_color      || null);
      setPickedHeaderTextColor(proposal.proposed_header_text_color  || null);
      setPickedSidebarTextColor(proposal.proposed_sidebar_text_color || null);
      onBrandColorsChange?.(
        proposal.proposed_color, proposal.proposed_header_color, proposal.proposed_sidebar_color,
        proposal.proposed_nav_text_color || null, proposal.proposed_header_text_color || null, proposal.proposed_sidebar_text_color || null
      );
      setProposal(null);
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 2500);
    } else {
      const { data } = await supabase.from('brand_color_proposals').update({ approved_by: newApprovals }).eq('id', proposal.id).select().maybeSingle();
      setProposal(data);
    }
    setBrandSaving(false);
  };

  const rejectBrandColor = async () => {
    if (!proposal) return;
    await supabase.from('brand_color_proposals').update({ status: 'rejected' }).eq('id', proposal.id);
    setProposal(null);
  };

  // â”€â”€ Colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const c = {
    bg:      isDarkMode ? '#111111' : '#f9fafb',
    card:    isDarkMode ? '#1f1f22' : '#ffffff',
    text:    isDarkMode ? '#d1d5db' : '#27272a',
    heading: isDarkMode ? '#f9fafb' : '#111111',
    border:  isDarkMode ? '#27272a' : '#e5e7eb',
    muted:   isDarkMode ? '#6b7280' : '#9ca3af',
    input:   isDarkMode ? '#111111' : '#f9fafb',
    primary: '#3b82f6',
    success: '#10b981',
    danger:  '#ef4444',
    section: isDarkMode ? '#0a0a0a' : '#f0f9ff',
  };

  const inp = (disabled = false) => ({
    padding: '9px 12px', borderRadius: '7px',
    border: `1px solid ${c.border}`, background: disabled ? (isDarkMode ? '#0a0a0a' : '#f3f4f6') : c.input,
    color: disabled ? c.muted : c.heading, fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box', cursor: disabled ? 'not-allowed' : 'text',
  });
  const lbl = (text) => (
    <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '5px' }}>
      {text}
    </label>
  );
  const sectionCard = (title, icon, children) => (
    <div style={{ background: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden', marginBottom: '20px' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: c.section }}>
        {icon}
        <span style={{ fontWeight: '700', fontSize: '14px', color: c.heading }}>{title}</span>
        {!isAdmin && <span style={{ marginLeft: 'auto', fontSize: '11px', color: c.muted, fontStyle: 'italic' }}>View only</span>}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: c.muted, fontSize: '14px' }}>
      Loading organization…
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 108px)', overflowY: 'auto', background: c.bg }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: c.heading }}>Organization</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.muted }}>
              {isAdmin ? 'Manage your church or organization details' : 'Organization info — contact an admin to make changes'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ border: 'none', borderRadius: '8px', padding: '9px 20px', background: saved ? c.success : c.primary, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0, opacity: saving ? 0.75 : 1 }}
            >
              <Save size={15} /> {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* Migration warning */}
        {dbErr && (
          <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: isDarkMode ? '#fcd34d' : '#92400e' }}>
            âš  {dbErr}
          </div>
        )}

        {/* â”€â”€ SECTION 1: Identity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sectionCard('Church / Organization Info', <Building size={15} color={c.primary} />, (
          <div>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '20px' }}>
              <div style={{ flexShrink: 0 }}>
                {form.logo_url
                  ? <img src={form.logo_url} alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: `2px solid ${c.border}` }} />
                  : <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${c.border}` }}>
                      <Building size={28} color={c.primary} />
                    </div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: c.heading, marginBottom: '6px' }}>Organization Logo</div>
                <div style={{ fontSize: '12px', color: c.muted, marginBottom: '10px' }}>PNG or SVG recommended — min 200×200px</div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      style={{ border: `1px solid ${c.border}`, borderRadius: '6px', padding: '6px 12px', background: 'transparent', color: c.text, fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Upload size={12} /> {uploading ? 'Uploading…' : 'Upload Logo'}
                    </button>
                    {form.logo_url && (
                      <button onClick={() => set('logo_url', '')} style={{ border: 'none', background: 'none', color: c.danger, fontSize: '12px', cursor: 'pointer', padding: '6px 8px' }}>
                        Remove
                      </button>
                    )}
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleLogoUpload(e.target.files[0])} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                {lbl('Organization Name')}
                <input style={inp(!isAdmin)} value={form.name} onChange={e => set('name', e.target.value)} disabled={!isAdmin} placeholder="First Church of Worship" />
              </div>
              <div>
                {lbl('Phone')}
                <input style={inp(!isAdmin)} value={form.phone} onChange={e => set('phone', e.target.value)} disabled={!isAdmin} placeholder="(555) 000-0000" type="tel" />
              </div>
              <div>
                {lbl('Email')}
                <input style={inp(!isAdmin)} value={form.email} onChange={e => set('email', e.target.value)} disabled={!isAdmin} placeholder="info@yourchurch.com" type="email" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                {lbl('Website')}
                <input style={inp(!isAdmin)} value={form.website} onChange={e => set('website', e.target.value)} disabled={!isAdmin} placeholder="https://yourchurch.com" type="url" />
              </div>
            </div>
          </div>
        ))}

        {/* â”€â”€ SECTION 2: Location â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sectionCard('Location & Capacity', <MapPin size={15} color={c.primary} />, (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              {lbl('Street Address')}
              <input style={inp(!isAdmin)} value={form.address_street} onChange={e => set('address_street', e.target.value)} disabled={!isAdmin} placeholder="123 Church Street" />
            </div>
            <div>
              {lbl('City')}
              <input style={inp(!isAdmin)} value={form.address_city} onChange={e => set('address_city', e.target.value)} disabled={!isAdmin} placeholder="City" />
            </div>
            <div>
              {lbl('State / Province')}
              <input style={inp(!isAdmin)} value={form.address_state} onChange={e => set('address_state', e.target.value)} disabled={!isAdmin} placeholder="State" />
            </div>
            <div>
              {lbl('ZIP / Postal Code')}
              <input style={inp(!isAdmin)} value={form.address_zip} onChange={e => set('address_zip', e.target.value)} disabled={!isAdmin} placeholder="00000" />
            </div>
            <div>
              {lbl('Country')}
              <select style={{ ...inp(!isAdmin), appearance: 'none' }} value={form.address_country} onChange={e => set('address_country', e.target.value)} disabled={!isAdmin}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              {lbl('Seating Capacity')}
              <input style={inp(!isAdmin)} value={form.capacity} onChange={e => set('capacity', e.target.value)} disabled={!isAdmin} placeholder="500" type="number" min="0" />
            </div>
          </div>
        ))}

        {/* â”€â”€ SECTION 3: Service Times â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sectionCard('Service Times', <Clock size={15} color={c.primary} />, (
          <div>
            <div style={{ fontSize: '12px', color: c.muted, marginBottom: '14px' }}>
              Add all your regular service times so the team knows the schedule.
            </div>
            {form.service_times.map((st, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 110px 1fr 32px', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <select
                  style={{ ...inp(!isAdmin), appearance: 'none' }}
                  value={st.day}
                  onChange={e => updateST(i, 'day', e.target.value)}
                  disabled={!isAdmin}
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  style={inp(!isAdmin)}
                  type="time"
                  value={st.time}
                  onChange={e => updateST(i, 'time', e.target.value)}
                  disabled={!isAdmin}
                />
                <input
                  style={inp(!isAdmin)}
                  value={st.name}
                  onChange={e => updateST(i, 'name', e.target.value)}
                  placeholder="e.g. Morning Service"
                  disabled={!isAdmin}
                />
                {isAdmin && (
                  <button onClick={() => removeST(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.danger, display: 'flex', alignItems: 'center', padding: '4px' }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {isAdmin && (
              <button
                onClick={addServiceTime}
                style={{ border: `1px dashed ${c.border}`, borderRadius: '7px', padding: '7px 14px', background: 'transparent', color: c.muted, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}
              >
                <Plus size={13} /> Add Service Time
              </button>
            )}
            {form.service_times.length === 0 && (
              <div style={{ fontSize: '13px', color: c.muted, fontStyle: 'italic' }}>No service times added yet.</div>
            )}
          </div>
        ))}

        {/* â”€â”€ SECTION 4: Ministries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sectionCard('Ministries & Positions', <Layers size={15} color={c.primary} />, (
          <div>
            <div style={{ fontSize: '12px', color: c.muted, marginBottom: '16px' }}>
              Define each ministry area and the positions within it. Positions appear as role options in the Teams tab.
            </div>

            {form.ministries.length === 0 && (
              <div style={{ fontSize: '13px', color: c.muted, fontStyle: 'italic', marginBottom: '12px' }}>No ministries defined yet.</div>
            )}

            {form.ministries.map((m, mi) => (
              <div key={mi} style={{ border: `1px solid ${c.border}`, borderRadius: '10px', marginBottom: '12px', overflow: 'hidden' }}>
                {/* Ministry header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: c.section, borderBottom: `1px solid ${c.border}` }}>
                  <Layers size={13} style={{ color: c.primary, flexShrink: 0 }} />
                  <input
                    style={{ ...inp(!isAdmin), fontWeight: '700', fontSize: '13px', flex: 1 }}
                    value={m.name}
                    onChange={e => updateMinName(mi, e.target.value)}
                    placeholder="Ministry name (e.g. Worship, Production, Kids)"
                    disabled={!isAdmin}
                  />
                  <span style={{ fontSize: '11px', color: c.muted, whiteSpace: 'nowrap' }}>
                    {(m.positions || []).length} position{(m.positions || []).length !== 1 ? 's' : ''}
                  </span>
                  {isAdmin && (
                    <button onClick={() => removeMin(mi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.danger, display: 'flex', padding: '2px' }}>
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Positions list */}
                <div style={{ padding: '12px 14px' }}>
                  {(m.positions || []).length === 0 && (
                    <div style={{ fontSize: '12px', color: c.muted, fontStyle: 'italic', marginBottom: '8px' }}>No positions yet — add one below.</div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: (m.positions||[]).length > 0 ? '10px' : '0' }}>
                    {(m.positions || []).map((pos, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', background: c.card, border: `1px solid ${c.border}`, borderRadius: '20px', padding: '3px 4px 3px 12px', gap: '4px' }}>
                        <input
                          value={pos}
                          onChange={e => updatePosition(mi, pi, e.target.value)}
                          disabled={!isAdmin}
                          placeholder="Position"
                          style={{ border: 'none', background: 'transparent', color: c.heading, fontSize: '12px', outline: 'none', width: `${Math.max(pos.length, 8) + 2}ch`, minWidth: '60px', maxWidth: '200px' }}
                        />
                        {isAdmin && (
                          <button onClick={() => removePosition(mi, pi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, display: 'flex', padding: '2px', lineHeight: 1 }}>
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => addPosition(mi)}
                      style={{ border: `1px dashed ${c.border}`, borderRadius: '20px', padding: '3px 12px', background: 'transparent', color: c.muted, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={11} /> Add position
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isAdmin && (
              <button
                onClick={addMinistry}
                style={{ border: `1px dashed ${c.border}`, borderRadius: '8px', padding: '8px 16px', background: 'transparent', color: c.muted, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}
              >
                <Plus size={13} /> Add Ministry
              </button>
            )}
          </div>
        ))}

        {/* â”€â”€ SECTION 5: Uplifting Verses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {sectionCard('Uplifting Verses', <BookOpen size={15} color={c.primary} />, (
          <div>
            <div style={{ fontSize: '12px', color: c.muted, marginBottom: '14px' }}>
              Custom verses appear in the status bar instead of the defaults. Add up to 30.
              {' '}
              <button
                onClick={() => setShowDefaultVerses(v => !v)}
                style={{ background: 'none', border: 'none', color: c.primary, cursor: 'pointer', fontSize: '12px', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                {showDefaultVerses ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showDefaultVerses ? 'Hide' : 'View'} 25 defaults
              </button>
            </div>

            {/* Default verse reference list */}
            {showDefaultVerses && (
              <div style={{ background: isDarkMode ? '#111111' : '#f8fafc', borderRadius: '8px', border: `1px solid ${c.border}`, padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Default verse pool (read-only)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {DEFAULT_VERSE_SAMPLES.map(r => (
                    <span key={r} style={{ fontSize: '11px', background: isDarkMode ? '#27272a' : '#e5e7eb', color: c.text, padding: '2px 8px', borderRadius: '10px' }}>{r}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Custom verse rows */}
            {form.custom_verses.map((v, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 32px', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
                <input
                  style={inp(!isAdmin)}
                  value={v.text}
                  onChange={e => updateVerse(i, 'text', e.target.value)}
                  placeholder="Verse text…"
                  disabled={!isAdmin}
                />
                <input
                  style={inp(!isAdmin)}
                  value={v.reference}
                  onChange={e => updateVerse(i, 'reference', e.target.value)}
                  placeholder="Reference (e.g. John 3:16)"
                  disabled={!isAdmin}
                />
                {isAdmin && (
                  <button onClick={() => removeVerse(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.danger, display: 'flex', alignItems: 'center', padding: '4px', marginTop: '6px' }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              {isAdmin && form.custom_verses.length < 30 && (
                <button
                  onClick={addVerse}
                  style={{ border: `1px dashed ${c.border}`, borderRadius: '7px', padding: '7px 14px', background: 'transparent', color: c.muted, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={13} /> Add Verse
                </button>
              )}
              {form.custom_verses.length > 0 && (
                <span style={{ fontSize: '12px', color: c.muted }}>{form.custom_verses.length} / 30</span>
              )}
              {form.custom_verses.length === 0 && (
                <span style={{ fontSize: '13px', color: c.muted, fontStyle: 'italic' }}>No custom verses — using the 25 defaults.</span>
              )}
            </div>
          </div>
        ))}

        {/* â”€â”€ SECTION 6: Volunteer Wellbeing (Burnout) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* Messaging (Twilio / WhatsApp) */}
        {sectionCard('Messaging', <Phone size={15} color='#0070F3' />, (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '12px', color: c.muted, lineHeight: '1.6', padding: '10px 14px', background: isDarkMode ? 'rgba(0,112,243,0.06)' : 'rgba(0,112,243,0.04)', borderRadius: '8px', borderLeft: '3px solid #0070F380' }}>
              Connect your <strong>Twilio</strong> account to send SMS or WhatsApp reminders to volunteers directly from the service planner.{' '}
              <a href="https://console.twilio.com" target="_blank" rel="noreferrer" style={{ color: '#0070F3' }}>Get credentials at console.twilio.com</a>
            </div>
            {[
              { key: 'twilio_account_sid',   label: 'Account SID',         placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', isSecret: false },
              { key: 'twilio_auth_token',    label: 'Auth Token',           placeholder: 'Your Twilio auth token',              isSecret: true  },
              { key: 'twilio_from_phone',    label: 'SMS From Number',      placeholder: '+12025551234  (E.164 format)',         isSecret: false },
              { key: 'twilio_whatsapp_from', label: 'WhatsApp From Number', placeholder: 'whatsapp:+14155238886',                isSecret: false },
            ].map(({ key, label, placeholder, isSecret }) => (
              <TwilioField
                key={key}
                label={label}
                value={form[key]}
                onChange={v => set(key, v)}
                placeholder={placeholder}
                isSecret={isSecret}
                disabled={!isAdmin}
                c={c}
                lbl={lbl}
                inp={inp}
              />
            ))}
            <div style={{ fontSize: '11px', color: c.muted, opacity: 0.7 }}>
              Credentials are stored encrypted in your Supabase org record. Deploy the <code style={{ fontFamily: 'monospace', background: isDarkMode ? '#27272a' : '#f4f4f5', padding: '1px 4px', borderRadius: '3px' }}>send-message</code> Edge Function to activate sending.
            </div>
          </div>
        ))}

        {/* The Sabbath Feature */}
        {sectionCard('The Sabbath Feature', <Heart size={15} color='#ef4444' />, (
          <div>
            <div style={{ fontSize: '12px', fontStyle: 'italic', color: c.muted, marginBottom: '16px', padding: '10px 14px', background: isDarkMode ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)', borderRadius: '8px', borderLeft: '3px solid #ef444480', lineHeight: '1.6' }}>
              "God ordained us humans to rest a day from work. Churches are no different when it comes to volunteers."
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: c.heading }}>Sabbath Rest Monitoring</div>
                <div style={{ fontSize: '12px', color: c.muted, marginTop: '3px' }}>
                  Automatically flag volunteers who may be over-serving and need rest.
                </div>
              </div>
              {/* Toggle */}
              <button
                onClick={() => isAdmin && set('burnout_prevention_enabled', !form.burnout_prevention_enabled)}
                style={{
                  width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: isAdmin ? 'pointer' : 'default',
                  background: form.burnout_prevention_enabled ? '#10b981' : (isDarkMode ? '#27272a' : '#d1d5db'),
                  position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: '3px',
                  left: form.burnout_prevention_enabled ? '25px' : '3px',
                  width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {form.burnout_prevention_enabled && (
              <div style={{ background: isDarkMode ? '#111111' : '#f8fafc', borderRadius: '10px', border: `1px solid ${c.border}`, padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    {lbl('Warning after (consecutive Sundays)')}
                    <input
                      style={inp(!isAdmin)}
                      type="number" min="1" max="10"
                      value={form.burnout_warning_threshold}
                      onChange={e => set('burnout_warning_threshold', Number(e.target.value))}
                      disabled={!isAdmin}
                    />
                    <div style={{ fontSize: '11px', color: c.muted, marginTop: '4px' }}>Show orange warning badge</div>
                  </div>
                  <div>
                    {lbl('Auto-break after (serves in 60 days)')}
                    <input
                      style={inp(!isAdmin)}
                      type="number" min="1" max="20"
                      value={form.burnout_auto_threshold}
                      onChange={e => set('burnout_auto_threshold', Number(e.target.value))}
                      disabled={!isAdmin}
                    />
                    <div style={{ fontSize: '11px', color: c.muted, marginTop: '4px' }}>Show red badge + 14-day break</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: c.muted, lineHeight: '1.7' }}>
                  <strong style={{ color: c.text }}>Sabbath guidelines (research-backed):</strong><br />
                  · No more than 3 consecutive Sundays without a Sabbath break<br />
                  · No more than 6 serves in any 60-day period<br />
                  · Every volunteer deserves at least 1 Sunday per month as a congregant<br />
                  <span style={{ opacity: 0.7, fontSize: '11px' }}>Sources: Lifeway Research, Planning Center, Church Juice</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ── BRAND COLOR ── */}
        {sectionCard('Brand Color', <span style={{ width: 16, height: 16, borderRadius: '50%', background: brandColor, display: 'inline-block', boxShadow: `0 0 0 2px ${brandColor}44` }} />, (
          <div>
            {/* Pending proposal banner */}
            {proposal && (
              <div style={{ marginBottom: '20px', padding: '14px 16px', borderRadius: '10px', background: isDarkMode ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)', border: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[proposal.proposed_color, proposal.proposed_header_color, proposal.proposed_sidebar_color].map((col, i) => (
                      <span key={i} title={['Primary','Top Bar','Sidebar'][i]} style={{ width: 20, height: 20, borderRadius: '50%', background: col || '#888', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }} />
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: c.heading }}>Brand color change pending approval</div>
                    <div style={{ fontSize: '11px', color: c.muted, marginTop: '2px' }}>
                      {(proposal.approved_by || []).length} of {Math.min(adminCount, 2)} admin approval{Math.min(adminCount, 2) > 1 ? 's' : ''} received
                    </div>
                  </div>
                </div>
                {isAdmin && !(proposal.approved_by || []).includes(userId) && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={approveBrandColor} disabled={brandSaving} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', background: c.success, color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Approve</button>
                    <button onClick={rejectBrandColor} style={{ flex: 1, padding: '7px', borderRadius: '7px', border: `1px solid ${c.border}`, background: 'transparent', color: c.danger, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Reject</button>
                  </div>
                )}
                {isAdmin && (proposal.approved_by || []).includes(userId) && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: c.muted }}>Your approval is recorded. Waiting for other admins.</span>
                    <button onClick={rejectBrandColor} style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${c.border}`, background: 'transparent', color: c.danger, fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                )}
              </div>
            )}

            {isAdmin && (
              <div>
                {/* Current swatches */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Nav Bar',       color: brandColor },
                    { label: 'Scripture Bar', color: brandHeaderColor },
                    { label: 'Sidebar',       color: brandSidebarColor },
                  ].map(({ label, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '8px', background: color, boxShadow: `0 0 0 2px ${color}55`, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
                        <div style={{ fontSize: '11px', color: c.text, fontFamily: 'monospace' }}>{color}</div>
                      </div>
                    </div>
                  ))}
                  {brandSaved && <span style={{ fontSize: '12px', color: c.success, fontWeight: '700', alignSelf: 'center' }}>✓ Applied</span>}
                </div>

                {/* 3 pickers */}
                {[
                  { label: 'Nav Bar',       desc: 'Logo + category tabs (My Schedule / Planner / Production / Admin)', picked: pickedColor,        set: setPickedColor,        pickedText: pickedNavTextColor,    setText: setPickedNavTextColor },
                  { label: 'Scripture Bar', desc: 'Thin top strip showing the daily verse',                            picked: pickedHeaderColor, set: setPickedHeaderColor,  pickedText: pickedHeaderTextColor, setText: setPickedHeaderTextColor },
                  { label: 'Sidebar',       desc: 'Left sidebar — calendar, folders, teams',                           picked: pickedSidebarColor,set: setPickedSidebarColor, pickedText: pickedSidebarTextColor, setText: setPickedSidebarTextColor },
                ].map(({ label, desc, picked, set, pickedText, setText }) => {
                  const autoText   = getAutoTextColor(picked);
                  const effectText = pickedText || autoText;
                  return (
                  <div key={label} style={{ marginBottom: '14px', padding: '14px', borderRadius: '12px', border: `1px solid ${c.border}` }}>
                    {/* Zone header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Live preview chip */}
                      <div style={{ width: 44, height: 44, borderRadius: '10px', background: picked, flexShrink: 0, boxShadow: `0 2px 10px ${picked}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${c.border}` }}>
                        {setText && <span style={{ fontSize: '11px', fontWeight: '800', color: effectText, letterSpacing: '-0.5px' }}>Aa</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: c.heading }}>{label}</div>
                        <div style={{ fontSize: '11px', color: c.muted, marginTop: '1px' }}>{desc}</div>
                      </div>
                      {/* Color picker swatch */}
                      <ColorPicker
                        value={picked}
                        onChange={set}
                        isDarkMode={isDarkMode}
                        presets={BRAND_PRESETS}
                        label={`${label} Background`}
                        align="right"
                      />
                    </div>

                    {/* Text color row (nav + scripture bar only) */}
                    {setText && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${c.border}` }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: c.muted, whiteSpace: 'nowrap' }}>Text color:</span>
                        <button
                          onClick={() => setText(null)}
                          style={{ fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', border: `1.5px solid ${!pickedText ? c.primary : c.border}`, background: !pickedText ? (isDarkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff') : 'transparent', color: !pickedText ? c.primary : c.muted, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                        >Auto</button>
                        <button onClick={() => setText('#ffffff')} title="White" style={{ width: 22, height: 22, borderRadius: '50%', background: '#ffffff', border: `2px solid ${pickedText === '#ffffff' ? c.primary : c.border}`, cursor: 'pointer', flexShrink: 0 }} />
                        <button onClick={() => setText('#09090B')} title="Black" style={{ width: 22, height: 22, borderRadius: '50%', background: '#09090B', border: `2px solid ${pickedText === '#09090B' ? c.primary : c.border}`, cursor: 'pointer', flexShrink: 0 }} />
                        <ColorPicker
                          value={effectText}
                          onChange={setText}
                          isDarkMode={isDarkMode}
                          label="Custom Text Color"
                          align="right"
                        />
                        {/* Live preview chip */}
                        <div style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: '8px', background: picked, color: effectText, fontSize: '12px', fontWeight: '700', letterSpacing: '0.1px', whiteSpace: 'nowrap' }}>
                          Aa Preview
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}

                {/* Migration warning */}
                {migrationNeeded && (
                  <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: isDarkMode ? 'rgba(239,68,68,0.12)' : '#fef2f2', border: '1px solid rgba(239,68,68,0.3)', fontSize: '12px', color: isDarkMode ? '#fca5a5' : '#b91c1c', lineHeight: '1.6' }}>
                    <strong>Migration required:</strong> Run <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.08)', padding: '1px 5px', borderRadius: '3px' }}>add_brand_color.sql</code> in Supabase SQL Editor to persist brand colors. Colors will preview below but won't save until the migration is run.
                  </div>
                )}

                {/* Action */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {(adminCount <= 1 || migrationNeeded) ? (
                    <button
                      onClick={() => applyAllBrandColors(pickedColor, pickedHeaderColor, pickedSidebarColor, pickedNavTextColor, pickedHeaderTextColor, pickedSidebarTextColor)}
                      disabled={brandSaving}
                      style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: pickedColor, color: pickedNavTextColor || getAutoTextColor(pickedColor), fontSize: '13px', fontWeight: '700', cursor: brandSaving ? 'not-allowed' : 'pointer' }}
                    >
                      {brandSaving ? 'Applying…' : migrationNeeded ? 'Preview Colors' : 'Apply Brand Colors'}
                    </button>
                  ) : (
                    <button
                      onClick={proposeBrandColor}
                      disabled={brandSaving || !!proposal}
                      style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: pickedColor, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: brandSaving || !!proposal ? 'not-allowed' : 'pointer', opacity: !!proposal ? 0.5 : 1 }}
                    >
                      {brandSaving ? 'Submitting…' : 'Propose Color Change'}
                    </button>
                  )}
                  {adminCount > 1 && !migrationNeeded && <span style={{ fontSize: '12px', color: c.muted }}>Requires {Math.min(adminCount, 2)} admin approvals</span>}
                </div>
              </div>
            )}

            {!isAdmin && (
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Nav Bar',           color: brandColor },
                  { label: 'Scripture Bar',     color: brandHeaderColor },
                  { label: 'Sidebar',           color: brandSidebarColor },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '8px', background: color, boxShadow: `0 0 0 2px ${color}55` }} />
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: c.muted, textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontSize: '11px', color: c.text, fontFamily: 'monospace' }}>{color}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

      </div>
    </div>
  );
}