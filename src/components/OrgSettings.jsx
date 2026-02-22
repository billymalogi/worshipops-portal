import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Upload, Plus, X, Building, MapPin, Clock, Layers, BookOpen, Heart, ChevronDown, ChevronUp } from 'lucide-react';

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

// ─────────────────────────────────────────────────────────────────────────────
export default function OrgSettings({ orgId, isDarkMode, userRole }) {
  const isAdmin = userRole === 'admin';

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [dbErr,     setDbErr]     = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [showDefaultVerses, setShowDefaultVerses] = useState(false);
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
  });

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle();

      if (error?.code === '42P01') {
        setDbErr('Run the migration SQL first: supabase/add_profile_org_tables.sql');
      } else if (data) {
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
        });
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
  const addMinistry = () => set('ministries', [...form.ministries, { name: '', description: '' }]);
  const updateMin = (i, field, val) => {
    const next = [...form.ministries];
    next[i] = { ...next[i], [field]: val };
    set('ministries', next);
  };
  const removeMin = (i) => set('ministries', form.ministries.filter((_, idx) => idx !== i));

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

  // ── Colors ────────────────────────────────────────────────────────────────
  const c = {
    bg:      isDarkMode ? '#111827' : '#f9fafb',
    card:    isDarkMode ? '#1f2937' : '#ffffff',
    text:    isDarkMode ? '#d1d5db' : '#374151',
    heading: isDarkMode ? '#f9fafb' : '#111827',
    border:  isDarkMode ? '#374151' : '#e5e7eb',
    muted:   isDarkMode ? '#6b7280' : '#9ca3af',
    input:   isDarkMode ? '#111827' : '#f9fafb',
    primary: '#3b82f6',
    success: '#10b981',
    danger:  '#ef4444',
    section: isDarkMode ? '#161b22' : '#f0f9ff',
  };

  const inp = (disabled = false) => ({
    padding: '9px 12px', borderRadius: '7px',
    border: `1px solid ${c.border}`, background: disabled ? (isDarkMode ? '#161b22' : '#f3f4f6') : c.input,
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
            ⚠ {dbErr}
          </div>
        )}

        {/* ── SECTION 1: Identity ─────────────────────────────────────────── */}
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

        {/* ── SECTION 2: Location ─────────────────────────────────────────── */}
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

        {/* ── SECTION 3: Service Times ─────────────────────────────────────── */}
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

        {/* ── SECTION 4: Ministries ────────────────────────────────────────── */}
        {sectionCard('Ministries & Positions', <Layers size={15} color={c.primary} />, (
          <div>
            <div style={{ fontSize: '12px', color: c.muted, marginBottom: '14px' }}>
              Define the ministry areas and volunteer positions within your organization.
            </div>
            {form.ministries.map((m, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 32px', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
                <input
                  style={inp(!isAdmin)}
                  value={m.name}
                  onChange={e => updateMin(i, 'name', e.target.value)}
                  placeholder="Ministry / Position"
                  disabled={!isAdmin}
                />
                <input
                  style={inp(!isAdmin)}
                  value={m.description}
                  onChange={e => updateMin(i, 'description', e.target.value)}
                  placeholder="Short description (optional)"
                  disabled={!isAdmin}
                />
                {isAdmin && (
                  <button onClick={() => removeMin(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.danger, display: 'flex', alignItems: 'center', padding: '4px', marginTop: '4px' }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {isAdmin && (
              <button
                onClick={addMinistry}
                style={{ border: `1px dashed ${c.border}`, borderRadius: '7px', padding: '7px 14px', background: 'transparent', color: c.muted, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}
              >
                <Plus size={13} /> Add Ministry / Position
              </button>
            )}
            {form.ministries.length === 0 && (
              <div style={{ fontSize: '13px', color: c.muted, fontStyle: 'italic' }}>No ministries defined yet.</div>
            )}
          </div>
        ))}

        {/* ── SECTION 5: Uplifting Verses ──────────────────────────────────── */}
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
              <div style={{ background: isDarkMode ? '#111827' : '#f8fafc', borderRadius: '8px', border: `1px solid ${c.border}`, padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Default verse pool (read-only)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {DEFAULT_VERSE_SAMPLES.map(r => (
                    <span key={r} style={{ fontSize: '11px', background: isDarkMode ? '#374151' : '#e5e7eb', color: c.text, padding: '2px 8px', borderRadius: '10px' }}>{r}</span>
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

        {/* ── SECTION 6: Volunteer Wellbeing (Burnout) ─────────────────────── */}
        {sectionCard('Volunteer Wellbeing', <Heart size={15} color='#ef4444' />, (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: c.heading }}>Burnout Prevention</div>
                <div style={{ fontSize: '12px', color: c.muted, marginTop: '3px' }}>
                  Automatically flag volunteers who may be over-serving.
                </div>
              </div>
              {/* Toggle */}
              <button
                onClick={() => isAdmin && set('burnout_prevention_enabled', !form.burnout_prevention_enabled)}
                style={{
                  width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: isAdmin ? 'pointer' : 'default',
                  background: form.burnout_prevention_enabled ? '#10b981' : (isDarkMode ? '#374151' : '#d1d5db'),
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
              <div style={{ background: isDarkMode ? '#111827' : '#f8fafc', borderRadius: '10px', border: `1px solid ${c.border}`, padding: '16px' }}>
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
                  <strong style={{ color: c.text }}>Research-backed guidelines:</strong><br />
                  · No more than 3 consecutive Sundays without a break<br />
                  · No more than 6 serves in any 60-day period<br />
                  · Every volunteer deserves at least 1 Sunday per month as a congregant<br />
                  <span style={{ opacity: 0.7, fontSize: '11px' }}>Sources: Lifeway Research, Planning Center, Church Juice</span>
                </div>
              </div>
            )}
          </div>
        ))}

      </div>
    </div>
  );
}