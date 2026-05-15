import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';

const isValidHex = (h) => /^#[0-9A-Fa-f]{6}$/.test(h);

export default function ColorPicker({
  value = '#6366f1',
  onChange,
  isDarkMode = false,
  presets = [],
  label,
  align = 'left',
}) {
  const [open, setOpen]         = useState(false);
  const [hexInput, setHexInput] = useState((value || '#6366f1').replace('#', '').toUpperCase());
  const [pos, setPos]           = useState({ x: 0, y: 0 });   // portal position
  const [dragging, setDragging] = useState(false);
  const dragOffset              = useRef({ x: 0, y: 0 });

  const swatchRef  = useRef(null);
  const popoverRef = useRef(null);

  const safeValue = isValidHex(value) ? value : '#6366f1';

  // Sync hex input when value changes externally
  useEffect(() => {
    if (!open) setHexInput((value || '#6366f1').replace('#', '').toUpperCase());
  }, [value, open]);

  // Position popover below the swatch when opening
  const openPicker = () => {
    if (open) { setOpen(false); return; }
    const rect = swatchRef.current?.getBoundingClientRect();
    if (!rect) return;
    const POPOVER_W = 248;
    let x = align === 'right' ? rect.right - POPOVER_W : rect.left;
    // Keep within viewport horizontally
    x = Math.max(8, Math.min(x, window.innerWidth - POPOVER_W - 8));
    // Position below swatch, flip above if not enough room
    const POPOVER_H = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const y = spaceBelow >= POPOVER_H + 8
      ? rect.bottom + 8
      : rect.top - POPOVER_H - 8;
    setPos({ x, y });
    setOpen(true);
  };

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        swatchRef.current  && !swatchRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  // ── Drag logic ──────────────────────────────────────────────────────────────
  const onDragStart = (e) => {
    // Don't drag when interacting with color picker internals
    if (e.target.tagName === 'INPUT') return;
    e.preventDefault();
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      setPos({
        x: Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth  - 248)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 60)),
      });
    };
    const onUp = () => setDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

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

  // ── Tokens ──────────────────────────────────────────────────────────────────
  const bg       = isDarkMode ? '#1c1c1e' : '#ffffff';
  const border   = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const inputBg  = isDarkMode ? '#2c2c2e' : '#f2f2f7';
  const textCol  = isDarkMode ? '#ffffff' : '#000000';
  const mutedCol = isDarkMode ? '#8e8e93' : '#8e8e93';
  const handleCol= isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  // ── Portal popover ──────────────────────────────────────────────────────────
  const popover = open && createPortal(
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 99999,
        width: 248,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 20,
        boxShadow: isDarkMode
          ? '0 32px 80px rgba(0,0,0,0.7), 0 4px 20px rgba(0,0,0,0.5)'
          : '0 32px 80px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* ── Drag handle ── */}
      <div
        onMouseDown={onDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px 8px',
          cursor: dragging ? 'grabbing' : 'grab',
          background: handleCol,
          borderBottom: `1px solid ${border}`,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: mutedCol, letterSpacing: '0.3px' }}>
          {label || 'Color'}
        </span>
        {/* Drag indicator dots */}
        <span style={{ display: 'flex', gap: 3 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: mutedCol, opacity: 0.5 }} />
          ))}
        </span>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setOpen(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedCol, fontSize: 16, lineHeight: 1, padding: '0 2px', display: 'flex', alignItems: 'center' }}
        >×</button>
      </div>

      {/* ── Color picker ── */}
      <div style={{ padding: '12px 14px 0' }}>
        <div className="wo-color-picker">
          <HexColorPicker color={safeValue} onChange={handlePickerChange} />
        </div>

        {/* ── Hex input row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <div style={{
            width: 32, height: 32, flexShrink: 0,
            borderRadius: 9,
            background: safeValue,
            boxShadow: `0 2px 10px ${safeValue}66`,
            border: `1.5px solid ${border}`,
          }} />
          <div style={{
            display: 'flex', alignItems: 'center', flex: 1,
            background: inputBg,
            borderRadius: 10,
            padding: '0 10px',
            height: 36,
            gap: 2,
          }}>
            <span style={{ color: mutedCol, fontSize: 13, fontFamily: 'ui-monospace, monospace', userSelect: 'none' }}>#</span>
            <input
              value={hexInput}
              onChange={e => handleHexTyping(e.target.value)}
              onMouseDown={e => e.stopPropagation()}
              maxLength={6}
              spellCheck={false}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, fontFamily: 'ui-monospace, monospace',
                color: textCol, letterSpacing: '1.5px', textTransform: 'uppercase',
                caretColor: safeValue,
              }}
            />
          </div>
        </div>

        {/* ── Presets ── */}
        {presets.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {presets.map(color => (
              <button
                key={color}
                onClick={() => handlePickerChange(color)}
                onMouseDown={e => e.stopPropagation()}
                title={color}
                style={{
                  width: 24, height: 24,
                  borderRadius: 7,
                  background: color,
                  border: safeValue.toLowerCase() === color.toLowerCase()
                    ? `2.5px solid ${isDarkMode ? '#ffffff' : '#000000'}`
                    : '2px solid transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            ))}
          </div>
        )}
      </div>

      {/* bottom padding */}
      <div style={{ height: 14 }} />
    </div>,
    document.body
  );

  return (
    <>
      {/* ── Swatch button ── */}
      <button
        ref={swatchRef}
        onClick={openPicker}
        title={safeValue}
        style={{
          width: 36,
          height: 36,
          background: safeValue,
          border: `2px solid ${open
            ? (isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.4)')
            : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')}`,
          borderRadius: 10,
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          transition: 'border-color 0.15s, transform 0.12s',
          transform: open ? 'scale(0.9)' : 'scale(1)',
          boxShadow: `0 2px 8px ${safeValue}55`,
        }}
      />
      {popover}
    </>
  );
}
