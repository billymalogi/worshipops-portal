import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';

// ── Utility ──────────────────────────────────────────────────────────────────
const isValidHex = (h) => /^#[0-9A-Fa-f]{6}$/.test(h);

// ── ColorPicker ───────────────────────────────────────────────────────────────
// Props:
//   value       string   — current hex color  e.g. "#3b82f6"
//   onChange    fn       — called with new hex string
//   isDarkMode  bool
//   presets     string[] — array of hex preset colors
//   label       string   — optional label shown at top of popover
//   align       'left' | 'right'  — popover alignment (default 'left')
export default function ColorPicker({
  value = '#6366f1',
  onChange,
  isDarkMode = false,
  presets = [],
  label,
  align = 'left',
}) {
  const [open, setOpen]       = useState(false);
  const [hexInput, setHexInput] = useState((value || '#6366f1').replace('#', '').toUpperCase());
  const containerRef  = useRef(null);
  const inputRef      = useRef(null);

  // Keep hex input in sync when value changes externally
  useEffect(() => {
    if (!open) setHexInput((value || '#6366f1').replace('#', '').toUpperCase());
  }, [value, open]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onKey   = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handlePickerChange = useCallback((hex) => {
    onChange?.(hex);
    setHexInput(hex.replace('#', '').toUpperCase());
  }, [onChange]);

  const handleHexTyping = (raw) => {
    const clean = raw.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6).toUpperCase();
    setHexInput(clean);
    const full = `#${clean}`;
    if (clean.length === 6 && isValidHex(full)) onChange?.(full);
  };

  const safeValue = isValidHex(value) ? value : '#6366f1';

  // ── Tokens ──
  const bg      = isDarkMode ? '#1c1c1e' : '#ffffff';
  const border  = isDarkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
  const inputBg = isDarkMode ? '#2c2c2e' : '#f2f2f7';
  const textCol = isDarkMode ? '#ffffff' : '#000000';
  const mutedCol= isDarkMode ? '#8e8e93' : '#8e8e93';
  const labelCol= isDarkMode ? '#ebebf5cc' : '#3c3c4399';

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>

      {/* ── Swatch trigger ── */}
      <button
        onClick={() => setOpen(v => !v)}
        title={safeValue}
        style={{
          width: 36,
          height: 36,
          background: safeValue,
          border: `2px solid ${open
            ? (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)')
            : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')}`,
          borderRadius: 10,
          cursor: 'pointer',
          padding: 0,
          transition: 'border-color 0.15s, transform 0.1s',
          transform: open ? 'scale(0.93)' : 'scale(1)',
          boxShadow: `0 2px 8px ${safeValue}55`,
        }}
      />

      {/* ── Popover ── */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            zIndex: 10000,
            width: 230,
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 18,
            padding: '14px 14px 12px',
            boxShadow: isDarkMode
              ? '0 24px 64px rgba(0,0,0,0.65), 0 4px 16px rgba(0,0,0,0.4)'
              : '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Optional label */}
          {label && (
            <div style={{ fontSize: 11, fontWeight: 600, color: labelCol, marginBottom: 10, letterSpacing: '0.3px' }}>
              {label}
            </div>
          )}

          {/* react-colorful — override styles via CSS class */}
          <div className="wo-color-picker">
            <HexColorPicker color={safeValue} onChange={handlePickerChange} />
          </div>

          {/* Hex input row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            {/* Live color swatch */}
            <div style={{
              width: 30, height: 30, flexShrink: 0,
              borderRadius: 8,
              background: safeValue,
              boxShadow: `0 2px 8px ${safeValue}55`,
              border: `1.5px solid ${border}`,
            }} />

            {/* # + text input */}
            <div style={{
              display: 'flex', alignItems: 'center', flex: 1,
              background: inputBg,
              borderRadius: 9,
              padding: '0 10px',
              height: 34,
              gap: 2,
            }}>
              <span style={{ color: mutedCol, fontSize: 13, fontFamily: 'ui-monospace, monospace', userSelect: 'none' }}>#</span>
              <input
                ref={inputRef}
                value={hexInput}
                onChange={e => handleHexTyping(e.target.value)}
                maxLength={6}
                spellCheck={false}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 13, fontFamily: 'ui-monospace, monospace',
                  color: textCol, letterSpacing: '1px', textTransform: 'uppercase',
                  caretColor: safeValue,
                }}
              />
            </div>
          </div>

          {/* Presets */}
          {presets.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {presets.map(color => (
                <button
                  key={color}
                  onClick={() => handlePickerChange(color)}
                  title={color}
                  style={{
                    width: 22, height: 22,
                    borderRadius: 6,
                    background: color,
                    border: safeValue.toLowerCase() === color.toLowerCase()
                      ? `2px solid ${isDarkMode ? '#ffffff' : '#000000'}`
                      : '2px solid transparent',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
