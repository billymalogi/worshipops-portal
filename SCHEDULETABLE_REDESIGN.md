# ScheduleTable Redesign - Implementation Guide

## ✅ Completed
1. **Gradient Background** - Done! Subtle gradient now applied.

## 🚧 Remaining Changes

### #2 - Add Button Dropdown

**Current:** Full-width "Add Element" button
**New:** Small button with dropdown menu

```jsx
// Around line 276, replace the BIG ADD BUTTON section with:
{canEdit && (
  <div style={{ marginBottom: '10px', position: 'relative', zIndex: 20 }}>
    <button
      onClick={() => setShowAddMenu(!showAddMenu)}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        background: colors.accent,
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => e.target.style.opacity = '0.9'}
      onMouseLeave={(e) => e.target.style.opacity = '1'}
    >
      <Plus size={16} /> Add
    </button>

    {showAddMenu && (
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '8px',
        background: colors.popover,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        zIndex: 50,
        minWidth: '200px'
      }}>
        {[
          { type: 'song', label: 'Song', icon: Music },
          { type: 'header', label: 'Header', icon: LayoutTemplate },
          { type: 'item', label: 'Item', icon: FileText },
          { type: 'media', label: 'Media', icon: Video }
        ].map(({ type, label, icon: Icon }) => (
          <div
            key={type}
            onClick={() => handleAddItemClick(type)}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.15s',
              color: colors.text,
              fontWeight: '500',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = colors.hover}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Icon size={18} color={colors.accent} />
            {label}
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

### #3 - BPM/Key Plain Editable with Chord Dropdown

**Add this constant before the component:**

```jsx
const MUSIC_KEYS = [
  // Major keys
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  // Minor keys
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
  // 7th chords
  'C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7',
  'Cmaj7', 'Dmaj7', 'Emaj7', 'Fmaj7', 'Gmaj7', 'Amaj7', 'Bmaj7',
  'Cm7', 'Dm7', 'Em7', 'Fm7', 'Gm7', 'Am7', 'Bm7',
  // Suspended
  'Csus2', 'Csus4', 'Dsus2', 'Dsus4', 'Esus4', 'Fsus2', 'Fsus4', 'Gsus2', 'Gsus4', 'Asus2', 'Asus4', 'Bsus4',
  // Diminished & Augmented
  'Cdim', 'Ddim', 'Edim', 'Fdim', 'Gdim', 'Adim', 'Bdim',
  'Caug', 'Daug', 'Eaug', 'Faug', 'Gaug', 'Aaug', 'Baug',
  // Add9, Add11
  'Cadd9', 'Dadd9', 'Eadd9', 'Fadd9', 'Gadd9', 'Aadd9',
  // 9th, 11th, 13th
  'C9', 'D9', 'E9', 'F9', 'G9', 'A9', 'B9',
  'C11', 'D11', 'E11', 'F11', 'G11', 'A11', 'B11',
  'C13', 'D13', 'E13', 'F13', 'G13', 'A13', 'B13'
];
```

**Replace BPM/Key rendering in the items map:**

```jsx
{/* BPM - Plain Editable */}
<input
  value={item.bpm || ''}
  onChange={(e) => updateItem(idx, 'bpm', e.target.value)}
  placeholder="BPM"
  disabled={!canEdit}
  style={{
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: colors.text,
    fontSize: '13px',
    outline: 'none',
    padding: '2px 4px',
    borderBottom: canEdit ? `1px solid transparent` : 'none'
  }}
  onFocus={(e) => e.target.style.borderBottom = `1px solid ${colors.accent}`}
  onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
/>

{/* Key - Dropdown with all chords */}
<select
  value={item.key || ''}
  onChange={(e) => updateItem(idx, 'key', e.target.value)}
  disabled={!canEdit}
  style={{
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: colors.text,
    fontSize: '13px',
    outline: 'none',
    padding: '2px 4px',
    cursor: canEdit ? 'pointer' : 'default',
    borderBottom: canEdit ? `1px solid transparent` : 'none'
  }}
  onFocus={(e) => e.target.style.borderBottom = `1px solid ${colors.accent}`}
  onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
>
  <option value="">Key</option>
  {MUSIC_KEYS.map(key => (
    <option key={key} value={key}>{key}</option>
  ))}
</select>
```

### #4 - Header Section Refactor

**Find the header rendering section and update:**

```jsx
{item.type === 'header' && (
  <>
    {/* HEADER TEXT - Capitalized, Left-aligned, 30-50px padding */}
    <div style={{
      gridColumn: '3 / -1',
      fontSize: '16px',
      fontWeight: '700',
      textTransform: 'uppercase',
      paddingLeft: '40px',  // 30-50px padding left
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      {canEdit ? (
        <input
          value={item.title}
          onChange={(e) => updateItem(idx, 'title', e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.heading,
            fontSize: '16px',
            fontWeight: '700',
            textTransform: 'uppercase',
            outline: 'none',
            flex: 1
          }}
        />
      ) : (
        <span style={{ color: colors.heading }}>{item.title}</span>
      )}

      {/* Recolor and Reposition buttons grouped */}
      {canEdit && (
        <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
          <button
            onClick={() => updateItem(idx, 'color', null)}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: colors.text
            }}
          >
            <Palette size={14} /> Recolor
          </button>
          <button style={{ /* reposition button styles */ }}>
            Reposition
          </button>
        </div>
      )}
    </div>
  </>
)}
```

### #7 - Auto-Signature Notes

**Update Notes rendering:**

```jsx
// Add to state
const [currentUser, setCurrentUser] = useState('');

// Get user email from session
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user?.email) {
      const name = session.user.email.split('@')[0];
      setCurrentUser(name.charAt(0).toUpperCase() + name.slice(1));
    }
  });
}, []);

// Notes input with Enter key handler
<textarea
  value={item.notes || ''}
  onChange={(e) => updateItem(idx, 'notes', e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const timestamp = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const signature = `\n${currentUser}: "${e.target.value}" - ${timestamp}`;
      updateItem(idx, 'notes', (item.notes || '') + signature);
      e.target.value = '';
    }
  }}
  placeholder="Add note and press Enter..."
  disabled={!canEdit}
  style={{
    width: '100%',
    background: colors.inputBg,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    fontSize: '13px',
    padding: '8px',
    borderRadius: '6px',
    resize: 'vertical',
    minHeight: '60px',
    outline: 'none'
  }}
/>
```

### #5 - Collapse Sidebar (Already Done!)

The sidebar already collapses when viewing a service - this is handled in Dashboard.jsx where PersistentCalendar only shows when `!selectedService`.

### #6 - Song Playlists/Folders

**Add state:**

```jsx
const [playlists, setPlaylists] = useState([]);
const [currentPlaylist, setCurrentPlaylist] = useState(null);
```

**Add playlist UI in sidebar:**

```jsx
<div style={{ marginTop: '12px', padding: '12px', borderTop: `1px solid ${colors.border}` }}>
  <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: colors.subText }}>
    PLAYLISTS
  </div>
  {playlists.map(playlist => (
    <div
      key={playlist.id}
      onClick={() => setCurrentPlaylist(playlist)}
      style={{
        padding: '8px',
        borderRadius: '6px',
        cursor: 'pointer',
        background: currentPlaylist?.id === playlist.id ? colors.hover : 'transparent',
        marginBottom: '4px'
      }}
    >
      {playlist.name}
    </div>
  ))}
  <button
    onClick={() => {
      const name = prompt('Playlist name:');
      if (name) {
        setPlaylists([...playlists, { id: Date.now(), name, songs: [] }]);
      }
    }}
    style={{
      marginTop: '8px',
      padding: '6px 12px',
      background: 'transparent',
      border: `1px dashed ${colors.border}`,
      borderRadius: '6px',
      color: colors.accent,
      fontSize: '12px',
      cursor: 'pointer',
      width: '100%'
    }}
  >
    + New Playlist
  </button>
</div>
```

### #1 - Multiple Services Collapsible Table

**Add to top of component after service data loads:**

```jsx
// Fetch other services on same day
const [sameDayServices, setSameDayServices] = useState([]);

useEffect(() => {
  if (serviceData?.date && orgId) {
    supabase
      .from('services')
      .select('*')
      .eq('date', serviceData.date.split('T')[0])
      .neq('id', serviceData.id)
      .then(({ data }) => {
        if (data) setSameDayServices(data);
      });
  }
}, [serviceData?.date, serviceData?.id, orgId]);

// Render at bottom of component
{sameDayServices.length > 0 && (
  <div style={{ marginTop: '30px', padding: '20px', background: colors.card, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
    <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: colors.subText }}>
      OTHER SERVICES TODAY
    </div>
    {sameDayServices.map(service => (
      <div
        key={service.id}
        onClick={() => window.location.reload()} // Or proper navigation
        style={{
          padding: '12px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = colors.hover}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{service.name}</div>
        <div style={{ fontSize: '12px', color: colors.subText }}>
          {formatTime(service.start_time)} - {formatTime(service.end_time)}
        </div>
      </div>
    ))}
  </div>
)}
```

### #9 - Custom Loading Animation

**Create new component LoadingLogo.jsx:**

```jsx
export default function LoadingLogo() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'spin 2s linear infinite'
    }}>
      <img src="/favicon.ico" alt="Loading" style={{ width: '48px', height: '48px' }} />
    </div>
  );
}
```

**Add CSS to index.css:**

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

## Summary

✅ Gradient background
🔨 Add button dropdown
🔨 BPM/Key plain editable
🔨 Header refactor
✅ Sidebar collapse (already works!)
🔨 Song playlists
🔨 Auto-signature notes
🔨 Multiple services table
🔨 Custom loading

Would you like me to implement any of these specifically, or shall I create a complete new ScheduleTable.jsx with all changes?