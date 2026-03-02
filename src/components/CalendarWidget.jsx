import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarWidget({ isDarkMode, onDateSelect }) {
  const colors = {
    text: isDarkMode ? '#e5e7eb' : '#27272a',
    subText: isDarkMode ? '#9ca3af' : '#6b7280',
    hover: isDarkMode ? '#1f1f22' : '#f3f4f6',
    accent: '#3b82f6',
    bg: isDarkMode ? '#111111' : '#ffffff',
    border: isDarkMode ? '#27272a' : '#e5e7eb',
  };

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  // Simple Month Grid Generator
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null); // Empty slots
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div style={{ padding: '15px', color: colors.text }}>
      {/* Month Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4 style={{ margin: 0, fontWeight: '700', fontSize: '14px' }}>
          {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h4>
        <div style={{ display: 'flex', gap: '5px' }}>
          <ChevronLeft size={16} color={colors.subText} style={{ cursor: 'pointer' }} />
          <ChevronRight size={16} color={colors.subText} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      {/* Weekday Labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '10px' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ fontSize: '11px', color: colors.subText, fontWeight: '600' }}>{d}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center' }}>
        {days.map((day, index) => (
          <div
            key={index}
            onClick={() => {
              if (day && onDateSelect) {
                // Format: YYYY-MM-DD
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                if(confirm(`Create/Open plan for ${dateStr}?`)) onDateSelect(dateStr);
              }
            }}
            style={{
              fontSize: '13px',
              padding: '6px',
              borderRadius: '6px',
              cursor: day ? 'pointer' : 'default',
              background: day === today.getDate() ? colors.accent : 'transparent',
              color: day === today.getDate() ? 'white' : colors.text,
              opacity: day ? 1 : 0,
            }}
            onMouseEnter={(e) => { if(day && day !== today.getDate()) e.currentTarget.style.backgroundColor = colors.hover }}
            onMouseLeave={(e) => { if(day && day !== today.getDate()) e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}