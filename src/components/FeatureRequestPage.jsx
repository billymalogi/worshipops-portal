import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Upload, X, ExternalLink, Clock, ChevronDown, Image, Send, Lightbulb } from 'lucide-react';

const STATUS_CONFIG = {
  new:       { label: 'New',       bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  reviewing: { label: 'Reviewing', bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
  planned:   { label: 'Planned',   bg: 'rgba(99,102,241,0.12)',  color: '#a5b4fc' },
  shipped:   { label: 'Shipped',   bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
  declined:  { label: 'Declined',  bg: 'rgba(239,68,68,0.1)',    color: '#f87171' },
};

export default function FeatureRequestPage({ isDarkMode, session, orgId, userRole }) {
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Form
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [refUrl,       setRefUrl]       = useState('');
  const [screenshot,   setScreenshot]   = useState(null);      // File object
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileRef = useRef();

  const isSuperAdmin = userRole === 'admin'; // all admins see all; beta admins see own

  const c = {
    bg:      isDarkMode ? '#000000' : '#F7F8FA',
    card:    isDarkMode ? '#111111' : '#FFFFFF',
    text:    isDarkMode ? '#A1A1AA' : '#52525B',
    heading: isDarkMode ? '#EDEDED' : '#09090B',
    border:  isDarkMode ? '#27272A' : '#E4E4E7',
    hover:   isDarkMode ? '#1F1F22' : '#F4F4F5',
    input:   isDarkMode ? '#18181B' : '#F4F4F5',
    blue:    '#3B82F6',
    green:   '#10B981',
    red:     '#EF4444',
  };

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, []);

  // ── Screenshot handling ──────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Screenshot must be under 10 MB.'); return; }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = ev => setScreenshotPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const clearScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    let screenshotUrl = null;

    // Upload screenshot if present
    if (screenshot) {
      setUploadProgress('Uploading screenshot...');
      const ext  = screenshot.name.split('.').pop();
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('feature-screenshots')
        .upload(path, screenshot, { contentType: screenshot.type });

      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from('feature-screenshots')
          .getPublicUrl(path);
        screenshotUrl = urlData?.publicUrl || null;
      }
      setUploadProgress(null);
    }

    // Get user profile name
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', session.user.id)
      .maybeSingle();

    const name = profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : session.user.email;

    const { error } = await supabase.from('feature_requests').insert([{
      submitted_by:    session.user.id,
      submitter_name:  name,
      submitter_email: session.user.email,
      organization_id: orgId,
      title:           title.trim(),
      description:     description.trim() || null,
      reference_url:   refUrl.trim()      || null,
      screenshot_url:  screenshotUrl,
    }]);

    if (!error) {
      setTitle(''); setDescription(''); setRefUrl('');
      clearScreenshot();
      setShowForm(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
      loadRequests();
    }
    setSubmitting(false);
  };

  // ── Status update (admin only) ───────────────────────────
  const handleStatusChange = async (id, status) => {
    await supabase.from('feature_requests').update({ status }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const filtered = filterStatus === 'all'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  return (
    <div style={{ padding: '32px', maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: c.heading, letterSpacing: '-0.5px' }}>
            Feature Requests
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: c.text, lineHeight: '1.5' }}>
            Saw something you'd like in WorshipOps? Share a screenshot or reference link and describe what you'd like to see.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSubmitted(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '9px', background: c.blue, color: '#fff', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: '20px' }}
        >
          <Plus size={15} /> New Request
        </button>
      </div>

      {/* Success toast */}
      {submitted && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', fontWeight: '600', color: c.green }}>
          Request submitted! Thanks — we'll review it soon.
        </div>
      )}

      {/* Submit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '14px', padding: '24px', marginBottom: '28px' }}
        >
          <div style={{ fontSize: '14px', fontWeight: '700', color: c.heading, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={16} style={{ color: c.blue }} /> Describe your feature request
          </div>

          {/* Title */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Feature Title *
            </label>
            <input
              required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Drag-to-reorder song list, Dark mode toggle..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${c.border}`, background: c.input, color: c.heading, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe how it works, what problem it solves, or what you'd expect it to do..."
              rows={4}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${c.border}`, background: c.input, color: c.heading, fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {/* Reference URL */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Reference Link (optional)
            </label>
            <input
              type="url" value={refUrl} onChange={e => setRefUrl(e.target.value)}
              placeholder="https://example.com/feature-you-liked"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${c.border}`, background: c.input, color: c.heading, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: '11px', color: c.text, marginTop: '4px', opacity: 0.8 }}>
              Link to a website, video, or app where you saw this feature.
            </div>
          </div>

          {/* Screenshot upload */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: c.text, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Screenshot (optional)
            </label>

            {screenshotPreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={screenshotPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', border: `1px solid ${c.border}`, objectFit: 'contain' }} />
                <button
                  type="button" onClick={clearScreenshot}
                  style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${c.border}`, borderRadius: '10px', padding: '28px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = c.blue}
                onMouseLeave={e => e.currentTarget.style.borderColor = c.border}
              >
                <Upload size={22} style={{ margin: '0 auto 8px', display: 'block', color: c.text, opacity: 0.6 }} />
                <div style={{ fontSize: '13px', fontWeight: '600', color: c.heading, marginBottom: '4px' }}>Click to upload a screenshot</div>
                <div style={{ fontSize: '11px', color: c.text }}>PNG, JPG, GIF up to 10 MB</div>
              </div>
            )}

            <input
              ref={fileRef} type="file" accept="image/*"
              onChange={handleFileChange} style={{ display: 'none' }}
            />
            {uploadProgress && <div style={{ fontSize: '12px', color: c.text, marginTop: '6px' }}>{uploadProgress}</div>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit" disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: '8px', background: c.blue, color: '#fff', fontWeight: '700', fontSize: '13px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              <Send size={13} />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              type="button" onClick={() => setShowForm(false)}
              style={{ padding: '10px 16px', borderRadius: '8px', background: 'transparent', color: c.text, fontWeight: '600', fontSize: '13px', border: `1px solid ${c.border}`, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'new', 'reviewing', 'planned', 'shipped', 'declined'].map(s => {
          const cfg   = s === 'all' ? { label: `All (${requests.length})`, bg: null, color: null } : { ...STATUS_CONFIG[s], label: `${STATUS_CONFIG[s].label} (${requests.filter(r => r.status === s).length})` };
          const active = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '5px 14px', borderRadius: '20px', border: `1px solid ${active ? 'transparent' : c.border}`,
                background: active ? (cfg.bg || c.hover) : 'transparent',
                color: active ? (cfg.color || c.heading) : c.text,
                fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Request list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: c.text }}>Loading requests...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: c.text }}>
          <Lightbulb size={36} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: c.heading, marginBottom: '6px' }}>
            {filterStatus === 'all' ? 'No requests yet' : `No ${STATUS_CONFIG[filterStatus]?.label} requests`}
          </div>
          <div style={{ fontSize: '13px' }}>
            {filterStatus === 'all' ? 'Click "New Request" to submit your first feature idea.' : 'Try a different filter.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.new;
            return (
              <div key={req.id} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px' }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: c.heading, lineHeight: '1.4' }}>{req.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {/* Status badge / dropdown for admins */}
                      {isSuperAdmin ? (
                        <div style={{ position: 'relative' }}>
                          <select
                            value={req.status}
                            onChange={e => handleStatusChange(req.id, e.target.value)}
                            style={{ padding: '3px 24px 3px 10px', borderRadius: '20px', border: 'none', background: cfg.bg, color: cfg.color, fontSize: '11px', fontWeight: '700', cursor: 'pointer', appearance: 'none', outline: 'none' }}
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={10} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: cfg.color, pointerEvents: 'none' }} />
                        </div>
                      ) : (
                        <span style={{ padding: '3px 10px', borderRadius: '20px', background: cfg.bg, color: cfg.color, fontSize: '11px', fontWeight: '700' }}>
                          {cfg.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {req.description && (
                    <p style={{ margin: '0 0 10px', fontSize: '13px', color: c.text, lineHeight: '1.6' }}>{req.description}</p>
                  )}

                  {/* Reference URL */}
                  {req.reference_url && (
                    <a href={req.reference_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: c.blue, textDecoration: 'none', marginBottom: '10px' }}
                    >
                      <ExternalLink size={12} /> View Reference
                    </a>
                  )}

                  {/* Screenshot thumbnail */}
                  {req.screenshot_url && (
                    <div style={{ marginBottom: '10px' }}>
                      <a href={req.screenshot_url} target="_blank" rel="noopener noreferrer">
                        <img src={req.screenshot_url} alt="Screenshot" style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '8px', border: `1px solid ${c.border}`, objectFit: 'contain', display: 'block' }} />
                      </a>
                      <div style={{ fontSize: '11px', color: c.text, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.7 }}>
                        <Image size={10} /> Click to view full size
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ fontSize: '11px', color: c.text, opacity: 0.7, display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={10} /> {formatDate(req.created_at)}
                    </span>
                    {req.submitter_name && isSuperAdmin && (
                      <span>By {req.submitter_name}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
