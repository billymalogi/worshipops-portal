import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit2, Trash2, LayoutTemplate, Clock, Folder, FolderOpen, ChevronDown } from 'lucide-react';

/**
 * TemplatesManager — folder sidebar + template grid.
 * Opening a template calls `onOpen(template)` which sets `selectedTemplate`
 * in Dashboard, causing ScheduleTable to render for editing.
 */
export default function TemplatesManager({ templates = [], isDarkMode, userRole, orgId, onRefresh, onOpen }) {
  const [showCreate, setShowCreate]   = useState(false);
  const [newName,    setNewName]      = useState('');
  const [creating,   setCreating]     = useState(false);
  const [createErr,  setCreateErr]    = useState('');

  // Folders state
  const [folders,        setFolders]        = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null); // null = All
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Move-to-folder dropdown
  const [movingId, setMovingId] = useState(null);

  const c = {
    bg:      isDarkMode ? '#111111' : '#f9fafb',
    card:    isDarkMode ? '#1f1f22' : '#ffffff',
    text:    isDarkMode ? '#d1d5db' : '#27272a',
    heading: isDarkMode ? '#f9fafb' : '#111111',
    border:  isDarkMode ? '#27272a' : '#e5e7eb',
    muted:   isDarkMode ? '#6b7280' : '#9ca3af',
    hover:   isDarkMode ? '#27272a' : '#f3f4f6',
    input:   isDarkMode ? '#111111' : '#f9fafb',
    sidebar: isDarkMode ? '#0a0a0a' : '#f8f9fa',
    primary: '#3b82f6',
    danger:  '#ef4444',
  };

  const inp = {
    padding: '8px 12px', borderRadius: '6px',
    border: `1px solid ${c.border}`, background: c.input,
    color: c.heading, fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  };

  const btn = (bg, fg, extra = {}) => ({
    border: 'none', borderRadius: '7px', fontWeight: '600', fontSize: '13px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', background: bg, color: fg, ...extra,
  });

  // â”€â”€ Fetch folders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchFolders = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from('template_folders')
      .select('*')
      .eq('organization_id', orgId)
      .order('name', { ascending: true });
    setFolders(data || []);
  };

  useEffect(() => { fetchFolders(); }, [orgId]);

  // â”€â”€ Create template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleCreate = async () => {
    if (!newName.trim()) { setCreateErr('Please enter a template name.'); return; }
    setCreating(true);
    setCreateErr('');
    const { data, error } = await supabase
      .from('service_templates')
      .insert([{ name: newName.trim(), organization_id: orgId, items: [], folder_id: selectedFolder?.id || null }])
      .select()
      .single();

    setCreating(false);
    if (error) { setCreateErr(error.message); return; }
    setShowCreate(false);
    setNewName('');
    onRefresh();
    onOpen(data);
  };

  // â”€â”€ Delete template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    await supabase.from('service_templates').delete().eq('id', id);
    onRefresh();
  };

  // â”€â”€ Create folder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const { data } = await supabase
      .from('template_folders')
      .insert([{ name: newFolderName.trim(), organization_id: orgId }])
      .select()
      .single();
    setCreatingFolder(false);
    setNewFolderName('');
    setShowNewFolder(false);
    await fetchFolders();
    if (data) setSelectedFolder(data);
  };

  // â”€â”€ Delete folder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDeleteFolder = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this folder? Templates inside become uncategorized.')) return;
    await supabase.from('template_folders').delete().eq('id', id);
    if (selectedFolder?.id === id) setSelectedFolder(null);
    await fetchFolders();
    onRefresh();
  };

  // â”€â”€ Move template to folder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleMove = async (templateId, folderId) => {
    await supabase.from('service_templates').update({ folder_id: folderId }).eq('id', templateId);
    setMovingId(null);
    onRefresh();
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const visibleTemplates = selectedFolder
    ? templates.filter(t => t.folder_id === selectedFolder.id)
    : templates;

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div style={{ height: 'calc(100vh - 108px)', display: 'flex', background: c.bg, overflow: 'hidden' }}>

      {/* â”€â”€ Left Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{
        width: '220px',
        background: c.sidebar,
        borderRight: `1px solid ${c.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Sidebar header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: c.muted }}>
              Folders
            </span>
            {(userRole === 'admin') && (
              <button
                onClick={() => setShowNewFolder(v => !v)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: c.primary, padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                title="New Folder"
              >
                <Plus size={15} />
              </button>
            )}
          </div>
          {showNewFolder && (
            <div style={{ marginTop: '10px' }}>
              <input
                style={{ ...inp, marginBottom: '6px' }}
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                placeholder="Folder name…"
                autoFocus
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()} style={btn(c.primary, 'white', { flex: 1, padding: '5px 8px', fontSize: '12px', justifyContent: 'center' })}>
                  {creatingFolder ? '…' : 'Create'}
                </button>
                <button onClick={() => setShowNewFolder(false)} style={btn(c.hover, c.text, { padding: '5px 8px', fontSize: '12px' })}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {/* All Templates */}
          <div
            onClick={() => setSelectedFolder(null)}
            style={{
              padding: '8px 10px', marginBottom: '2px', borderRadius: '6px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
              background: !selectedFolder ? (isDarkMode ? '#1c2128' : '#e1e4e8') : 'transparent',
              color: !selectedFolder ? c.heading : c.text,
              fontWeight: !selectedFolder ? '600' : '500',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (selectedFolder) e.currentTarget.style.background = c.hover; }}
            onMouseLeave={e => { if (selectedFolder) e.currentTarget.style.background = 'transparent'; }}
          >
            <LayoutTemplate size={14} style={{ opacity: 0.7 }} />
            <span style={{ flex: 1 }}>All Templates</span>
            <span style={{ fontSize: '11px', color: c.muted, background: isDarkMode ? '#27272a' : '#f3f4f6', padding: '1px 6px', borderRadius: '10px' }}>
              {templates.length}
            </span>
          </div>

          {/* Folder items */}
          {folders.map(folder => {
            const count = templates.filter(t => t.folder_id === folder.id).length;
            const isActive = selectedFolder?.id === folder.id;
            return (
              <div
                key={folder.id}
                onClick={() => setSelectedFolder(folder)}
                style={{
                  padding: '8px 10px', marginBottom: '2px', borderRadius: '6px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
                  background: isActive ? (isDarkMode ? '#1c2128' : '#e1e4e8') : 'transparent',
                  color: isActive ? c.heading : c.text,
                  fontWeight: isActive ? '600' : '500',
                  transition: 'background 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = c.hover; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {isActive ? <FolderOpen size={14} /> : <Folder size={14} style={{ opacity: 0.7 }} />}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
                <span style={{ fontSize: '11px', color: c.muted, background: isDarkMode ? '#27272a' : '#f3f4f6', padding: '1px 6px', borderRadius: '10px', flexShrink: 0 }}>
                  {count}
                </span>
                {userRole === 'admin' && (
                  <button
                    onClick={e => handleDeleteFolder(e, folder.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.danger, padding: '2px', display: 'flex', alignItems: 'center', opacity: 0.5, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                    title="Delete folder"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}

          {folders.length === 0 && (
            <div style={{ fontSize: '12px', color: c.muted, padding: '8px 10px', fontStyle: 'italic' }}>
              No folders yet
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Right: Header + Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 28px', background: c.card, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: c.heading }}>
              {selectedFolder ? selectedFolder.name : 'All Templates'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: c.muted }}>
              {selectedFolder
                ? `${visibleTemplates.length} template${visibleTemplates.length !== 1 ? 's' : ''} in this folder`
                : 'Build reusable rundowns — apply them to any service in seconds'}
            </p>
          </div>
          {(userRole === 'admin' || userRole === 'editor') && (
            <button onClick={() => { setShowCreate(true); setNewName(''); setCreateErr(''); }} style={btn(c.primary, 'white')}>
              <Plus size={15} /> New Template
            </button>
          )}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {visibleTemplates.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', opacity: 0.18 }}>ðŸ“‹</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: c.heading }}>No Templates Yet</div>
              <div style={{ fontSize: '13px', color: c.muted, maxWidth: '400px', lineHeight: '1.8' }}>
                {selectedFolder
                  ? 'This folder is empty. Create a template or move existing ones here.'
                  : 'Templates let you pre-build a service rundown — songs, readings, announcements — and reuse it every week without starting from scratch.'}
              </div>
              {(userRole === 'admin' || userRole === 'editor') && (
                <button onClick={() => { setShowCreate(true); setNewName(''); setCreateErr(''); }} style={btn(c.primary, 'white', { marginTop: '8px' })}>
                  <Plus size={15} /> Create Your First Template
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {visibleTemplates.map(t => {
                const itemCount = Array.isArray(t.items) ? t.items.length : 0;
                const folderName = folders.find(f => f.id === t.folder_id)?.name;
                return (
                  <div
                    key={t.id}
                    onClick={() => onOpen(t)}
                    style={{
                      background: c.card, border: `1px solid ${c.border}`, borderRadius: '12px',
                      padding: '20px', cursor: 'pointer', transition: 'all 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = c.primary; e.currentTarget.style.boxShadow = `0 4px 16px rgba(59,130,246,0.1)`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Icon */}
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                      <LayoutTemplate size={20} color={c.primary} />
                    </div>

                    {/* Name */}
                    <div style={{ fontSize: '15px', fontWeight: '700', color: c.heading, marginBottom: '6px' }}>
                      {t.name}
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: c.muted, marginBottom: '16px', flexWrap: 'wrap' }}>
                      <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                      {t.created_at && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {formatDate(t.created_at)}
                        </span>
                      )}
                      {folderName && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Folder size={11} /> {folderName}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={e => { e.stopPropagation(); onOpen(t); }}
                        style={btn('rgba(59,130,246,0.1)', c.primary, { fontSize: '12px', padding: '5px 12px', border: `1px solid rgba(59,130,246,0.2)` })}
                      >
                        <Edit2 size={12} /> Edit
                      </button>

                      {/* Move to folder */}
                      {(userRole === 'admin' || userRole === 'editor') && folders.length > 0 && (
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setMovingId(movingId === t.id ? null : t.id); }}
                            style={btn('rgba(107,114,128,0.1)', c.muted, { fontSize: '12px', padding: '5px 10px', border: `1px solid rgba(107,114,128,0.2)` })}
                          >
                            <Folder size={12} /> Move <ChevronDown size={10} />
                          </button>
                          {movingId === t.id && (
                            <div
                              onClick={e => e.stopPropagation()}
                              style={{
                                position: 'absolute', bottom: '100%', left: 0, zIndex: 50,
                                background: c.card, border: `1px solid ${c.border}`, borderRadius: '8px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', minWidth: '160px', overflow: 'hidden',
                                marginBottom: '4px',
                              }}
                            >
                              <div
                                onClick={() => handleMove(t.id, null)}
                                style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', color: c.text, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${c.border}` }}
                                onMouseEnter={e => e.currentTarget.style.background = c.hover}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <LayoutTemplate size={13} /> No folder
                              </div>
                              {folders.map(f => (
                                <div
                                  key={f.id}
                                  onClick={() => handleMove(t.id, f.id)}
                                  style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', color: t.folder_id === f.id ? c.primary : c.text, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: t.folder_id === f.id ? '600' : '400' }}
                                  onMouseEnter={e => e.currentTarget.style.background = c.hover}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Folder size={13} /> {f.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {userRole === 'admin' && (
                        <button
                          onClick={e => handleDelete(e, t.id, t.name)}
                          style={btn('rgba(239,68,68,0.08)', c.danger, { fontSize: '12px', padding: '5px 12px', border: `1px solid rgba(239,68,68,0.15)` })}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Create modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: c.card, borderRadius: '14px', border: `1px solid ${c.border}`, width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${c.border}` }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: c.heading }}>New Template</div>
              <div style={{ fontSize: '12px', color: c.muted, marginTop: '2px' }}>
                {selectedFolder ? `Will be added to "${selectedFolder.name}"` : 'Give your template a name to get started'}
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: c.text, display: 'block', marginBottom: '6px' }}>
                Template Name
              </label>
              <input
                style={inp}
                value={newName}
                onChange={e => { setNewName(e.target.value); setCreateErr(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }}
                placeholder="e.g. Sunday Morning Service, Midweek Worship…"
                autoFocus
              />
              {createErr && <div style={{ fontSize: '12px', color: c.danger, marginTop: '6px' }}>{createErr}</div>}
            </div>
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowCreate(false)} style={btn(c.hover, c.text)}>Cancel</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()} style={btn(c.primary, 'white', { opacity: creating || !newName.trim() ? 0.65 : 1 })}>
                {creating ? 'Creating…' : 'Create & Edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
