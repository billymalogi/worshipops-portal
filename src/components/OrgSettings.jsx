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
            title={visible ? 'Hide' : 'Show'}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: c.muted, padding: 0, display: 'flex' }}
          >
            {visible ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
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

  // ── Load ──────────────────────────────────────────────────────────────────
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

  // ── Logo upload ────────────────────────────────────────────────────────────
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

  // ── Save ──────────────────────────────────────────────────────────────────
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

  // ── Service times helpers ─────────────────────────────────────────────────
  const addServiceTime = () => set('service_times', [...form.service_times, { day: 'Sunday', time: '09:00', name: '' }]);
  const updateST = (i, field, val) => {
    const next = [...form.service_times];
    next[i] = { ...next[i], [field]: val };
    set('service_times', next);
  };
  const removeST = (i) => set('service_times', form.service_times.filter((_, idx) => idx !== i));

  // ── Ministry helpers ──────────────────────────────────────────────────────
  const addMinistry    = () => set('ministries', [...form.ministries, { name: '', positions: [] }]);
  const updateMinName  = (i, val) => { const n = [...form.ministries]; n[i] = { ...n[i], name: val }; set('ministries', n); };
  const removeMin      = (i) => set('ministries', form.ministries.filter((_, idx) => idx !== i));
  const addPosition    = (mi) => { const n = [...form.ministries]; n[mi] = { ...n[mi], positions: [...(n[mi].positions||[]), ''] }; set('ministries', n); };
  const updatePosition = (mi, pi, val) => { const n = [...form.ministries]; const p = [...(n[mi].positions||[])]; p[pi] = val; n[mi] = { ...n[mi], positions: p }; set('ministries', n); };
  const removePosition = (mi, pi) => { const n = [...form.ministries]; n[mi] = { ...n[mi], positions: (n[mi].positions||[]).filter((_,idx) => idx !== pi) }; set('ministries', n); };

  // ── Verse helpers ─────────────────────────────────────────────────────────
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

  // ── Colors ────────────────────────────────────────────────────────────────
  const c = {
    bg:       'var(--page)',
    card:     'var(--card)',
    text:     'var(--text-2)',
    heading:  'var(--text-1)',
    border:   'var(--line)',
    border2:  'var(--line-2)',
    muted:    'var(--text-3)',
    input:    'var(--page)',
    primary:  'var(--accent)',
    ink:      'var(--accent-ink)',
    soft:     'var(--accent-soft)',
    onAccent: 'var(--on-accent)',
    success:  'var(--positive)',
    danger:   'var(--negative)',
    section:  'var(--card)',
    deep:     'var(--deep)',
    raised:   'var(--raised)',
  };

  const inp = (disabled = false) => ({
    height: '36px', padding: '0 12px', borderRadius: 'var(--r-control)',
    border: `1px solid ${c.border2}`, background: disabled ? c.raised : c.input,
    color: disabled ? c.muted : c.heading, fontSize: '14px', outline: 'none', fontFamily: 'inherit',
    width: '100%', boxSizing: 'border-box', cursor: disabled ? 'not-allowed' : 'text',
  });
  // Quiet secondary buttons: add rows, upload
  const addBtn = {
    border: `1px dashed ${c.border2}`, borderRadius: 'var(--r-control)', height: '32px', padding: '0 12px',
    background: 'transparent', color: c.text, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit',
  };
  const iconBtn = {
    background: 'none', border: 'none', cursor: 'pointer', color: c.muted, width: '32px', height: '32px',
    borderRadius: 'var(--r-control)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
  const lbl = (text) => (
    <label style={{ fontSize: '13px', fontWeight: 500, color: c.text, display: 'block', marginBottom: '8px' }}>
      {text}
    </label>
  );
  const sectionCard = (title, icon, children) => (
    <div style={{ background: c.card, borderRadius: 'var(--r-card)', border: `1px solid ${c.border}`, overflow: 'hidden', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ height: '52px', padding: '0 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '10px', background: c.section }}>
        <span style={{ display: 'flex', color: c.muted }}>{icon}</span>
        <span style={{ fontWeight: 500, fontSize: '15px', color: c.heading }}>{title}</span>
        {!isAdmin && <span style={{ marginLeft: 'auto', fontSize: '12px', fontFamily: 'var(--font-mono)', color: c.muted }}>View only</span>}
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
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.15, fontWeight: 500, color: c.heading }}>Organization</h1>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: c.text }}>
              {isAdmin ? 'Your church details, services, teams and brand' : 'Only an admin can change these details'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ border: 'none', borderRadius: 'var(--r-control)', height: '36px', padding: '0 16px', background: c.primary, color: c.onAccent, fontWeight: 500, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, opacity: saving ? 0.75 : 1, fontFamily: 'inherit', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
            >
              <Save size={16} strokeWidth={1.5} /> {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
            </button>
          )}
        </div>

        {/* Migration warning */}
        {dbErr && (
          <div style={{ background: c.deep, border: `1px solid ${c.border}`, borderRadius: 'var(--r-control)', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: c.heading, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />{dbErr}
          </div>
        )}

        {/* ── SECTION 1: Identity ─────────────────────────────────────────── */}
        {sectionCard('Church info', <Building size={16} strokeWidth={1.5} />, (
          <div>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div style={{ flexShrink: 0 }}>
                {form.logo_url
                  ? <img src={form.logo_url} alt={`${form.name || 'Organization'} logo`} style={{ width: '80px', height: '80px', borderRadius: 'var(--r-card)', objectFit: 'cover', border: `1px solid ${c.border}`, display: 'block' }} />
                  : <div style={{ width: '80px', height: '80px', borderRadius: 'var(--r-card)', background: c.raised, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${c.border2}` }}>
                      <Building size={24} strokeWidth={1.5} color={c.muted} />
                    </div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: c.heading, marginBottom: '4px' }}>Logo</div>
                <div style={{ fontSize: '13px', color: c.muted, marginBottom: '12px' }}>PNG or SVG, at least 200 × 200 px</div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      style={{ ...addBtn, border: `1px solid ${c.border2}`, background: c.card, color: c.heading }}
                    >
                      <Upload size={14} strokeWidth={1.5} /> {uploading ? 'Uploading…' : 'Upload logo'}
                    </button>
                    {form.logo_url && (
                      <button onClick={() => set('logo_url', '')} style={{ border: 'none', background: 'none', color: c.text, fontSize: '13px', cursor: 'pointer', height: '32px', padding: '0 8px', fontFamily: 'inherit' }}>
                        Remove
                      </button>
                    )}
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleLogoUpload(e.target.files[0])} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                {lbl('Name')}
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

        {/* ── SECTION 2: Location ─────────────────────────────────────────── */}
        {sectionCard('Location and capacity', <MapPin size={16} strokeWidth={1.5} />, (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              {lbl('Street address')}
              <input style={inp(!isAdmin)} value={form.address_street} onChange={e => set('address_street', e.target.value)} disabled={!isAdmin} placeholder="123 Church Street" />
            </div>
            <div>
              {lbl('City')}
              <input style={inp(!isAdmin)} value={form.address_city} onChange={e => set('address_city', e.target.value)} disabled={!isAdmin} placeholder="City" />
            </div>
            <div>
              {lbl('State or province')}
              <input style={inp(!isAdmin)} value={form.address_state} onChange={e => set('address_state', e.target.value)} disabled={!isAdmin} placeholder="State" />
            </div>
            <div>
              {lbl('ZIP or postal code')}
              <input style={inp(!isAdmin)} value={form.address_zip} onChange={e => set('address_zip', e.target.value)} disabled={!isAdmin} placeholder="00000" />
            </div>
            <div>
              {lbl('Country')}
              <select style={{ ...inp(!isAdmin), appearance: 'none' }} value={form.address_country} onChange={e => set('address_country', e.target.value)} disabled={!isAdmin}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              {lbl('Seating capacity')}
              <input style={inp(!isAdmin)} value={form.capacity} onChange={e => set('capacity', e.target.value)} disabled={!isAdmin} placeholder="500" type="number" min="0" />
            </div>
          </div>
        ))}

        {/* ── SECTION 3: Service Times ─────────────────────────────────────── */}
        {sectionCard('Service times', <Clock size={16} strokeWidth={1.5} />, (
          <div>
            <div style={{ fontSize: '13px', color: c.text, marginBottom: '16px' }}>
              Your regular weekly services, so every team sees the same schedule.
            </div>
            {form.service_times.map((st, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 120px 1fr 32px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
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
                  <button onClick={() => removeST(i)} title="Remove service time" className="wo-icon-btn" style={iconBtn}>
                    <X size={16} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
            {isAdmin && (
              <button
                onClick={addServiceTime}
                style={{ ...addBtn, marginTop: '12px' }}
              >
                <Plus size={14} strokeWidth={1.5} /> Add service time
              </button>
            )}
            {form.service_times.length === 0 && (
              <div style={{ fontSize: '13px', color: c.muted, marginTop: '12px' }}>No service times yet</div>
            )}
          </div>
        ))}

        {/* ── SECTION 4: Ministries ────────────────────────────────────────── */}
        {sectionCard('Ministries and positions', <Layers size={16} strokeWidth={1.5} />, (
          <div>
            <div style={{ fontSize: '13px', color: c.text, marginBottom: '16px' }}>
              Each ministry and the positions in it. Positions show up as roles in Teams.
            </div>

            {form.ministries.length === 0 && (
              <div style={{ fontSize: '13px', color: c.muted, marginBottom: '12px' }}>No ministries yet</div>
            )}

            {form.ministries.map((m, mi) => (
              <div key={mi} style={{ border: `1px solid ${c.border}`, borderRadius: 'var(--r-control)', marginBottom: '12px', overflow: 'hidden' }}>
                {/* Ministry header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 8px 8px 12px', background: c.deep, borderBottom: `1px solid ${c.border}` }}>
                  <input
                    style={{ ...inp(!isAdmin), height: '32px', fontWeight: 500, fontSize: '14px', flex: 1, background: 'transparent', border: '1px solid transparent', padding: '0 4px' }}
                    value={m.name}
                    onChange={e => updateMinName(mi, e.target.value)}
                    placeholder="Ministry name, like Worship or Kids"
                    disabled={!isAdmin}
                  />
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: c.muted, whiteSpace: 'nowrap' }}>
                    {(m.positions || []).length} position{(m.positions || []).length !== 1 ? 's' : ''}
                  </span>
                  {isAdmin && (
                    <button onClick={() => removeMin(mi)} title="Remove ministry" className="wo-icon-btn" style={iconBtn}>
                      <X size={16} strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                {/* Positions list */}
                <div style={{ padding: '12px' }}>
                  {(m.positions || []).length === 0 && (
                    <div style={{ fontSize: '13px', color: c.muted, marginBottom: '8px' }}>No positions yet</div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: (m.positions||[]).length > 0 ? '12px' : '0' }}>
                    {(m.positions || []).map((pos, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', height: '28px', background: c.raised, border: `1px solid ${c.border}`, borderRadius: 'var(--r-tag)', padding: '0 2px 0 8px', gap: '2px' }}>
                        <input
                          value={pos}
                          onChange={e => updatePosition(mi, pi, e.target.value)}
                          disabled={!isAdmin}
                          placeholder="Position"
                          style={{ border: 'none', background: 'transparent', color: c.heading, fontSize: '13px', outline: 'none', fontFamily: 'inherit', width: `${Math.max(pos.length, 8) + 2}ch`, minWidth: '60px', maxWidth: '200px' }}
                        />
                        {isAdmin && (
                          <button onClick={() => removePosition(mi, pi)} title="Remove position" style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, width: '22px', height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={12} strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => addPosition(mi)}
                      style={{ ...addBtn, height: '28px', padding: '0 8px', gap: '4px', borderRadius: 'var(--r-tag)' }}
                    >
                      <Plus size={14} strokeWidth={1.5} /> Add position
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isAdmin && (
              <button
                onClick={addMinistry}
                style={{ ...addBtn, marginTop: '4px' }}
              >
                <Plus size={14} strokeWidth={1.5} /> Add ministry
              </button>
            )}
          </div>
        ))}

        {/* ── SECTION 5: Uplifting Verses ──────────────────────────────────── */}
        {sectionCard('Verses', <BookOpen size={16} strokeWidth={1.5} />, (
          <div>
            <div style={{ fontSize: '13px', color: c.text, marginBottom: '16px' }}>
              Your own verses replace the defaults in the strip above the header. Up to 30.
              {' '}
              <button
                onClick={() => setShowDefaultVerses(v => !v)}
                style={{ background: 'none', border: 'none', color: c.ink, cursor: 'pointer', fontSize: '13px', fontWeight: 500, padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit' }}
              >
                {showDefaultVerses ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
                {showDefaultVerses ? 'Hide' : 'View'} 25 defaults
              </button>
            </div>

            {/* Default verse reference list */}
            {showDefaultVerses && (
              <div style={{ background: c.deep, borderRadius: 'var(--r-control)', border: `1px solid ${c.border}`, padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: c.muted, marginBottom: '8px' }}>Default verses</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {DEFAULT_VERSE_SAMPLES.map(r => (
                    <span key={r} style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', background: c.card, border: `1px solid ${c.border}`, color: c.text, padding: '0 6px', lineHeight: '22px', borderRadius: 'var(--r-tag)' }}>{r}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Custom verse rows */}
            {form.custom_verses.map((v, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 32px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <input
                  style={inp(!isAdmin)}
                  value={v.text}
                  onChange={e => updateVerse(i, 'text', e.target.value)}
                  placeholder="Verse text"
                  disabled={!isAdmin}
                />
                <input
                  style={inp(!isAdmin)}
                  value={v.reference}
                  onChange={e => updateVerse(i, 'reference', e.target.value)}
                  placeholder="Reference, like John 3:16"
                  disabled={!isAdmin}
                />
                {isAdmin && (
                  <button onClick={() => removeVerse(i)} title="Remove verse" className="wo-icon-btn" style={iconBtn}>
                    <X size={16} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
              {isAdmin && form.custom_verses.length < 30 && (
                <button
                  onClick={addVerse}
                  style={addBtn}
                >
                  <Plus size={14} strokeWidth={1.5} /> Add verse
                </button>
              )}
              {form.custom_verses.length > 0 && (
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: c.muted }}>{form.custom_verses.length} of 30</span>
              )}
              {form.custom_verses.length === 0 && (
                <span style={{ fontSize: '13px', color: c.muted }}>Using the 25 default verses</span>
              )}
            </div>
          </div>
        ))}

        {/* ── SECTION 6: Volunteer Wellbeing (Burnout) ─────────────────────── */}
        {/* Messaging (Twilio / WhatsApp) */}
        {sectionCard('Messaging', <Phone size={16} strokeWidth={1.5} />, (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: c.text, lineHeight: '20px' }}>
              Connect a Twilio account to send SMS or WhatsApp reminders to volunteers from the service planner.{' '}
              <a href="https://console.twilio.com" target="_blank" rel="noreferrer" style={{ color: c.ink, fontWeight: 500 }}>Get credentials from Twilio</a>
            </div>
            {[
              { key: 'twilio_account_sid',   label: 'Account SID',         placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', isSecret: false },
              { key: 'twilio_auth_token',    label: 'Auth token',           placeholder: 'Your Twilio auth token',              isSecret: true  },
              { key: 'twilio_from_phone',    label: 'SMS from number',      placeholder: '+12025551234',         isSecret: false },
              { key: 'twilio_whatsapp_from', label: 'WhatsApp from number', placeholder: 'whatsapp:+14155238886',                isSecret: false },
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
            <div style={{ fontSize: '12px', color: c.muted, lineHeight: '18px' }}>
              Credentials are stored in your Supabase organization record. Deploy the <code style={{ fontFamily: 'var(--font-mono)', background: c.raised, padding: '1px 4px', borderRadius: '4px' }}>send-message</code> Edge Function to start sending.
            </div>
          </div>
        ))}

        {/* The Sabbath Feature */}
        {sectionCard('The Sabbath Feature', <Heart size={16} strokeWidth={1.5} />, (
          <div>
            <div style={{ fontSize: '16px', fontFamily: 'var(--font-verse)', color: c.text, marginBottom: '20px', paddingLeft: '16px', borderLeft: `2px solid ${c.border2}`, lineHeight: '24px' }}>
              &ldquo;God ordained us humans to rest a day from work. Churches are no different when it comes to volunteers.&rdquo;
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: c.heading }}>Sabbath rest monitoring</div>
                <div style={{ fontSize: '13px', color: c.muted, marginTop: '4px' }}>
                  Flag volunteers who are serving too often and need a week off
                </div>
              </div>
              {/* Toggle */}
              <button
                onClick={() => isAdmin && set('burnout_prevention_enabled', !form.burnout_prevention_enabled)}
                role="switch" aria-checked={form.burnout_prevention_enabled} title="Sabbath rest monitoring"
                style={{
                  width: '40px', height: '24px', borderRadius: '12px', border: 'none', cursor: isAdmin ? 'pointer' : 'default',
                  background: form.burnout_prevention_enabled ? c.primary : c.raised,
                  boxShadow: form.burnout_prevention_enabled ? 'none' : `inset 0 0 0 1px ${c.border2}`,
                  position: 'relative', flexShrink: 0, transition: 'background-color var(--t-fast) var(--ease)',
                }}
              >
                <div style={{
                  position: 'absolute', top: '3px', left: '3px',
                  transform: form.burnout_prevention_enabled ? 'translateX(16px)' : 'translateX(0)',
                  width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'transform var(--t-fast) var(--ease)',
                }} />
              </button>
            </div>

            {form.burnout_prevention_enabled && (
              <div style={{ background: c.deep, borderRadius: 'var(--r-control)', border: `1px solid ${c.border}`, padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    {lbl('Warn after, Sundays in a row')}
                    <input
                      style={inp(!isAdmin)}
                      type="number" min="1" max="10"
                      value={form.burnout_warning_threshold}
                      onChange={e => set('burnout_warning_threshold', Number(e.target.value))}
                      disabled={!isAdmin}
                    />
                    <div style={{ fontSize: '12px', color: c.muted, marginTop: '8px' }}>Shows a warning on the volunteer</div>
                  </div>
                  <div>
                    {lbl('Break after, serves in 60 days')}
                    <input
                      style={inp(!isAdmin)}
                      type="number" min="1" max="20"
                      value={form.burnout_auto_threshold}
                      onChange={e => set('burnout_auto_threshold', Number(e.target.value))}
                      disabled={!isAdmin}
                    />
                    <div style={{ fontSize: '12px', color: c.muted, marginTop: '8px' }}>Starts a 14-day break</div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: c.text, lineHeight: '22px', paddingTop: '16px', borderTop: `1px solid ${c.border}` }}>
                  <div style={{ color: c.heading, fontWeight: 500, marginBottom: '4px' }}>Guidelines</div>
                  No more than 3 Sundays in a row without a break<br />
                  No more than 6 serves in any 60 days<br />
                  At least 1 Sunday a month in the pews for every volunteer<br />
                  <span style={{ fontSize: '12px', color: c.muted }}>Sources: Lifeway Research, Planning Center, Church Juice</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ── BRAND COLOR ── */}
        {sectionCard('Brand color', <span style={{ width: 10, height: 10, margin: '0 3px', borderRadius: '50%', background: brandColor, display: 'inline-block' }} />, (
          <div>
            {/* Pending proposal banner */}
            {proposal && (
              <div style={{ marginBottom: '20px', padding: '16px', borderRadius: 'var(--r-control)', background: c.deep, border: `1px solid ${c.border2}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[proposal.proposed_color, proposal.proposed_header_color, proposal.proposed_sidebar_color].map((col, i) => (
                      <span key={i} title={['Primary','Top Bar','Sidebar'][i]} style={{ width: 20, height: 20, borderRadius: '50%', background: col || 'var(--text-3)', flexShrink: 0, boxShadow: `inset 0 0 0 1px ${c.border2}` }} />
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: c.heading }}>Brand color change waiting for approval</div>
                    <div style={{ fontSize: '12px', color: c.muted, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
                      {(proposal.approved_by || []).length} of {Math.min(adminCount, 2)} admin approval{Math.min(adminCount, 2) > 1 ? 's' : ''} received
                    </div>
                  </div>
                </div>
                {isAdmin && !(proposal.approved_by || []).includes(userId) && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={approveBrandColor} disabled={brandSaving} style={{ flex: 1, height: '36px', borderRadius: 'var(--r-control)', border: 'none', background: c.primary, color: c.onAccent, fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Approve</button>
                    <button onClick={rejectBrandColor} style={{ flex: 1, height: '36px', borderRadius: 'var(--r-control)', border: `1px solid ${c.border2}`, background: c.card, color: c.danger, fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Reject</button>
                  </div>
                )}
                {isAdmin && (proposal.approved_by || []).includes(userId) && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: c.text }}>You approved this. Waiting for another admin</span>
                    <button onClick={rejectBrandColor} style={{ marginLeft: 'auto', height: '32px', padding: '0 12px', borderRadius: 'var(--r-control)', border: `1px solid ${c.border2}`, background: c.card, color: c.danger, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  </div>
                )}
              </div>
            )}

            {isAdmin && (
              <div>
                {/* Current swatches */}
                <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Nav bar',       color: brandColor },
                    { label: 'Scripture bar', color: brandHeaderColor },
                    { label: 'Sidebar',       color: brandSidebarColor },
                  ].map(({ label, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 'var(--r-control)', background: color, boxShadow: `inset 0 0 0 1px ${c.border2}`, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12px', color: c.muted }}>{label}</div>
                        <div style={{ fontSize: '12px', color: c.heading, fontFamily: 'var(--font-mono)' }}>{color}</div>
                      </div>
                    </div>
                  ))}
                  {brandSaved && <span style={{ fontSize: '13px', color: c.text, alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: c.success }} />Applied</span>}
                </div>

                {/* 3 pickers */}
                {[
                  { label: 'Nav bar',       desc: 'The line under the header, the active tab and primary buttons', picked: pickedColor,        set: setPickedColor,        pickedText: pickedNavTextColor,    setText: setPickedNavTextColor },
                  { label: 'Scripture bar', desc: 'Not used yet. The verse strip stays neutral',                     picked: pickedHeaderColor, set: setPickedHeaderColor,  pickedText: pickedHeaderTextColor, setText: setPickedHeaderTextColor },
                  { label: 'Sidebar',       desc: 'Not used yet. The sidebar stays neutral',                          picked: pickedSidebarColor,set: setPickedSidebarColor, pickedText: pickedSidebarTextColor, setText: setPickedSidebarTextColor },
                ].map(({ label, desc, picked, set, pickedText, setText }) => {
                  const autoText   = getAutoTextColor(picked);
                  const effectText = pickedText || autoText;
                  return (
                  <div key={label} style={{ marginBottom: '12px', padding: '12px', borderRadius: 'var(--r-control)', border: `1px solid ${c.border}` }}>
                    {/* Zone header row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Live preview chip */}
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--r-tag)', background: picked, flexShrink: 0, boxShadow: `inset 0 0 0 1px ${c.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {setText && <span style={{ fontSize: '13px', fontWeight: 500, color: effectText }}>Aa</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: c.heading }}>{label}</div>
                        <div style={{ fontSize: '12px', color: c.muted, marginTop: '2px' }}>{desc}</div>
                      </div>
                      {/* Color picker swatch */}
                      <ColorPicker
                        value={picked}
                        onChange={set}
                        isDarkMode={isDarkMode}
                        presets={BRAND_PRESETS}
                        label={`${label} background`}
                        align="right"
                      />
                    </div>

                    {/* Text color row (nav + scripture bar only) */}
                    {setText && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${c.border}` }}>
                        <span style={{ fontSize: '12px', color: c.muted, whiteSpace: 'nowrap' }}>Text color</span>
                        <button
                          onClick={() => setText(null)}
                          style={{ fontSize: '12px', fontWeight: 500, height: '24px', padding: '0 8px', borderRadius: 'var(--r-tag)', border: `1px solid ${!pickedText ? 'var(--accent-line)' : c.border2}`, background: !pickedText ? c.soft : 'transparent', color: !pickedText ? c.ink : c.text, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)' }}
                        >Auto</button>
                        <button onClick={() => setText('#ffffff')} title="White" style={{ width: 22, height: 22, borderRadius: '50%', background: '#ffffff', border: `2px solid ${pickedText === '#ffffff' ? c.primary : c.border2}`, cursor: 'pointer', flexShrink: 0 }} />
                        <button onClick={() => setText('#09090B')} title="Black" style={{ width: 22, height: 22, borderRadius: '50%', background: '#09090B', border: `2px solid ${pickedText === '#09090B' ? c.primary : c.border2}`, cursor: 'pointer', flexShrink: 0 }} />
                        <ColorPicker
                          value={effectText}
                          onChange={setText}
                          isDarkMode={isDarkMode}
                          label="Custom text color"
                          align="right"
                        />
                        {/* Live preview chip */}
                        <div style={{ marginLeft: 'auto', height: '28px', display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 'var(--r-tag)', background: picked, color: effectText, fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          Preview
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}

                {/* Migration warning */}
                {migrationNeeded && (
                  <div style={{ marginBottom: '12px', padding: '12px 16px', borderRadius: 'var(--r-control)', background: c.deep, border: `1px solid ${c.border2}`, fontSize: '13px', color: c.text, lineHeight: '20px' }}>
                    <span style={{ color: c.heading, fontWeight: 500 }}>Migration needed.</span> Run <code style={{ fontFamily: 'var(--font-mono)', background: c.raised, padding: '1px 4px', borderRadius: '4px' }}>add_brand_color.sql</code> in the Supabase SQL Editor to keep brand colors. Until then they preview but don't save.
                  </div>
                )}

                {/* Action */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '20px' }}>
                  {(adminCount <= 1 || migrationNeeded) ? (
                    <button
                      onClick={() => applyAllBrandColors(pickedColor, pickedHeaderColor, pickedSidebarColor, pickedNavTextColor, pickedHeaderTextColor, pickedSidebarTextColor)}
                      disabled={brandSaving}
                      style={{ height: '36px', padding: '0 16px', borderRadius: 'var(--r-control)', border: 'none', background: pickedColor, color: pickedNavTextColor || getAutoTextColor(pickedColor), fontSize: '13px', fontWeight: 500, cursor: brandSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}
                    >
                      {brandSaving ? 'Applying…' : migrationNeeded ? 'Preview colors' : 'Apply brand colors'}
                    </button>
                  ) : (
                    <button
                      onClick={proposeBrandColor}
                      disabled={brandSaving || !!proposal}
                      style={{ height: '36px', padding: '0 16px', borderRadius: 'var(--r-control)', border: 'none', background: pickedColor, color: getAutoTextColor(pickedColor), fontSize: '13px', fontWeight: 500, cursor: brandSaving || !!proposal ? 'not-allowed' : 'pointer', opacity: !!proposal ? 0.5 : 1, fontFamily: 'inherit' }}
                    >
                      {brandSaving ? 'Submitting…' : 'Propose color change'}
                    </button>
                  )}
                  {adminCount > 1 && !migrationNeeded && <span style={{ fontSize: '13px', color: c.muted }}>Needs {Math.min(adminCount, 2)} admin approvals</span>}
                </div>
              </div>
            )}

            {!isAdmin && (
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Nav bar',           color: brandColor },
                  { label: 'Scripture bar',     color: brandHeaderColor },
                  { label: 'Sidebar',           color: brandSidebarColor },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--r-control)', background: color, boxShadow: `inset 0 0 0 1px ${c.border2}`, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '12px', color: c.muted }}>{label}</div>
                      <div style={{ fontSize: '12px', color: c.heading, fontFamily: 'var(--font-mono)' }}>{color}</div>
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