import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Upload, Plus, X, User, Calendar, Home, ChevronDown, TrendingUp } from 'lucide-react';

const SERVE_OPTIONS = [
  { value: 'weekly',    label: 'Weekly' },
  { value: 'biweekly',  label: 'Bi-weekly' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'seasonal',  label: 'Seasonal' },
  { value: 'flexible',  label: 'Flexible / As needed' },
];

const RELATIONSHIP_OPTIONS = ['Spouse', 'Partner', 'Child', 'Parent', 'Sibling', 'Other'];

// â”€â”€ Compute accept/decline stats from services array â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function calcStats(services, userEmail, displayName) {
  let total = 0, accepted = 0, declined = 0;
  const needle = [userEmail?.toLowerCase(), displayName?.toLowerCase()].filter(Boolean);
  services.forEach(svc => {
    const items = Array.isArray(svc.items) ? svc.items : [];
    items.forEach(item => {
      const whom = (item.assignedTo || item.member || item.name || '').toLowerCase();
      if (needle.some(n => n && whom.includes(n))) {
        total++;
        if (item.status === 'accepted') accepted++;
        else if (item.status === 'declined') declined++;
      }
    });
  });
  return { total, accepted, declined, pending: total - accepted - declined };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ProfileSettings({ session, isDarkMode, services = [], teamMembers = [] }) {
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [dbErr,    setDbErr]    = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    display_name:       '',
    avatar_url:         '',
    phone:              '',
    bio:                '',
    date_of_birth:      '',
    wedding_anniversary:'',
    team_joined_date:   '',
    serve_capacity:     'flexible',
    church_role:        '',
    household:          [],
  });

  // â”€â”€ Load existing profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error?.code === '42P01') {
        setDbErr('Run the migration SQL first: supabase/add_profile_org_tables.sql');
      } else if (data) {
        setForm({
          display_name:        data.display_name        || '',
          avatar_url:          data.avatar_url          || '',
          phone:               data.phone               || '',
          bio:                 data.bio                 || '',
          date_of_birth:       data.date_of_birth       || '',
          wedding_anniversary: data.wedding_anniversary || '',
          team_joined_date:    data.team_joined_date    || '',
          serve_capacity:      data.serve_capacity      || 'flexible',
          church_role:         data.church_role         || '',
          household:           Array.isArray(data.household) ? data.household : [],
        });
      }
      setLoading(false);
    })();
  }, [userId]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // â”€â”€ Avatar upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const ext  = file.name.split('.').pop();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) {
      alert(`Upload failed: ${upErr.message}\n\nMake sure you created the "avatars" bucket in Supabase Storage.`);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    set('avatar_url', urlData.publicUrl);
    setUploading(false);
  };

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('user_profiles').upsert({
      id: userId,
      ...form,
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

  // â”€â”€ Household helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addMember = () => set('household', [...form.household, { name: '', relationship: 'Spouse' }]);
  const updateMember = (i, field, val) => {
    const next = [...form.household];
    next[i] = { ...next[i], [field]: val };
    set('household', next);
  };
  const removeMember = (i) => set('household', form.household.filter((_, idx) => idx !== i));

  // â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const stats = calcStats(services, userEmail, form.display_name);
  const acceptRate  = stats.total > 0 ? Math.round((stats.accepted  / stats.total) * 100) : null;
  const declineRate = stats.total > 0 ? Math.round((stats.declined  / stats.total) * 100) : null;

  // â”€â”€ Colours â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const inp = {
    padding: '9px 12px', borderRadius: '7px',
    border: `1px solid ${c.border}`, background: c.input,
    color: c.heading, fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  };
  const label = (text) => (
    <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '5px' }}>
      {text}
    </label>
  );
  const card = (title, icon, children) => (
    <div style={{ background: c.card, borderRadius: '12px', border: `1px solid ${c.border}`, overflow: 'hidden', marginBottom: '20px' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: c.section }}>
        {icon}
        <span style={{ fontWeight: '700', fontSize: '14px', color: c.heading }}>{title}</span>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: c.muted, fontSize: '14px' }}>
      Loading profile…
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 108px)', overflowY: 'auto', background: c.bg }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: c.heading }}>My Profile</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.muted }}>{userEmail}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ border: 'none', borderRadius: '8px', padding: '9px 20px', background: saved ? c.success : c.primary, color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0, opacity: saving ? 0.75 : 1 }}
          >
            <Save size={15} /> {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>

        {/* Migration warning */}
        {dbErr && (
          <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: isDarkMode ? '#fcd34d' : '#92400e' }}>
            âš  {dbErr}
          </div>
        )}

        {/* â”€â”€ SECTION 1: Identity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {card('Identity', <User size={15} color={c.primary} />, (
          <div>
            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '20px' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {form.avatar_url
                  ? <img src={form.avatar_url} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${c.border}` }} />
                  : <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${c.border}` }}>
                      <User size={32} color={c.primary} />
                    </div>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: c.heading, marginBottom: '6px' }}>Profile Photo</div>
                <div style={{ fontSize: '12px', color: c.muted, marginBottom: '10px' }}>JPG, PNG or GIF — recommended 400×400px</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{ border: `1px solid ${c.border}`, borderRadius: '6px', padding: '6px 12px', background: 'transparent', color: c.text, fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Upload size={12} /> {uploading ? 'Uploading…' : 'Upload Photo'}
                  </button>
                  {form.avatar_url && (
                    <button
                      onClick={() => set('avatar_url', '')}
                      style={{ border: 'none', background: 'none', color: c.danger, fontSize: '12px', cursor: 'pointer', padding: '6px 8px' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarUpload(e.target.files[0])} />
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                {label('Display Name')}
                <input style={inp} value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="Your name" />
              </div>
              <div>
                {label('Phone')}
                <input style={inp} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" type="tel" />
              </div>
            </div>
            <div style={{ marginTop: '14px' }}>
              {label('Bio')}
              <textarea
                style={{ ...inp, minHeight: '80px', resize: 'vertical', lineHeight: '1.6' }}
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="A short bio about yourself…"
              />
            </div>
          </div>
        ))}

        {/* â”€â”€ SECTION 2: Key Dates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {card('Key Dates', <Calendar size={15} color={c.primary} />, (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              {label('Date of Birth')}
              <input style={inp} type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
            <div>
              {label('Wedding Anniversary')}
              <input style={inp} type="date" value={form.wedding_anniversary} onChange={e => set('wedding_anniversary', e.target.value)} />
            </div>
            <div>
              {label('Team Join Date')}
              <input style={inp} type="date" value={form.team_joined_date} onChange={e => set('team_joined_date', e.target.value)} />
              <div style={{ fontSize: '11px', color: c.muted, marginTop: '4px' }}>When they joined the worship team</div>
            </div>
          </div>
        ))}

        {/* â”€â”€ SECTION 3: Ministry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {card('Ministry', <ChevronDown size={15} color={c.primary} />, (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              {label('Role at Church')}
              <input style={inp} value={form.church_role} onChange={e => set('church_role', e.target.value)} placeholder="e.g. Worship Leader, Guitarist, Sound Tech…" />
            </div>
            <div>
              {label('Serve Capacity')}
              <select style={{ ...inp, appearance: 'none' }} value={form.serve_capacity} onChange={e => set('serve_capacity', e.target.value)}>
                {SERVE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        ))}

        {/* â”€â”€ SECTION 4: Household â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {card('Household', <Home size={15} color={c.primary} />, (
          <div>
            <div style={{ fontSize: '12px', color: c.muted, marginBottom: '14px' }}>
              Optional — helps the team coordinate and celebrate family milestones.
            </div>
            {form.household.map((member, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 32px', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <input
                  style={inp}
                  value={member.name}
                  onChange={e => updateMember(i, 'name', e.target.value)}
                  placeholder="Name"
                />
                <select style={{ ...inp, appearance: 'none' }} value={member.relationship} onChange={e => updateMember(i, 'relationship', e.target.value)}>
                  {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => removeMember(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.danger, display: 'flex', alignItems: 'center', padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={addMember}
              style={{ border: `1px dashed ${c.border}`, borderRadius: '7px', padding: '7px 14px', background: 'transparent', color: c.muted, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}
            >
              <Plus size={13} /> Add Household Member
            </button>
          </div>
        ))}

        {/* â”€â”€ SECTION 5: Serve Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {card('Serve Statistics', <TrendingUp size={15} color={c.primary} />, (
          <div>
            {stats.total === 0 ? (
              <div style={{ fontSize: '13px', color: c.muted, textAlign: 'center', padding: '16px 0' }}>
                No scheduling data found yet. Stats will appear once services are assigned.
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: 'Total Assigned', value: stats.total,    color: c.primary },
                    { label: 'Accepted',        value: stats.accepted, color: '#10b981' },
                    { label: 'Declined',        value: stats.declined, color: c.danger  },
                    { label: 'Pending',         value: stats.pending,  color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} style={{ background: isDarkMode ? '#111111' : '#f8fafc', borderRadius: '8px', padding: '14px', border: `1px solid ${c.border}`, textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '11px', color: c.muted, marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Accept / decline bars */}
                {acceptRate !== null && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: c.text, marginBottom: '5px' }}>
                      <span>Accept Rate</span><span style={{ fontWeight: '700', color: '#10b981' }}>{acceptRate}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: c.border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${acceptRate}%`, background: '#10b981', borderRadius: '4px' }} />
                    </div>
                  </div>
                )}
                {declineRate !== null && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: c.text, marginBottom: '5px' }}>
                      <span>Decline Rate</span><span style={{ fontWeight: '700', color: c.danger }}>{declineRate}%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: c.border, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${declineRate}%`, background: c.danger, borderRadius: '4px' }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

      </div>
    </div>
  );
}