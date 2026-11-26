import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import ServiceTimeModal from './ServiceTimeModal';

export default function PersistentCalendar({ isDarkMode, onDateSelect, services = [], orgId, onRefresh }) {
  const colors = {
    text: 'var(--text-2)',
    subText: 'var(--text-3)',
    hover: 'var(--raised)',
    accent: 'var(--accent)',
    accentInk: 'var(--accent-ink)',
    accentSoft: 'var(--accent-soft)',
    onAccent: 'var(--on-accent)',
    bg: 'var(--deep)',
    border: 'var(--line)',
    heading: 'var(--text-1)',
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  // Generate days array
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  // Check if a day has services
  const getServicesForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return services.filter(s => s.date && s.date.startsWith(dateStr));
  };

  const today = new Date();
  const isToday = (day) => {
    return day === today.getDate() &&
           month === today.getMonth() &&
           year === today.getFullYear();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setShowServiceModal(true);
  };

  const handleServiceSave = () => {
    setShowServiceModal(false);
    setSelectedDate(null);
    if (onRefresh) onRefresh();
  };

  return (
    <div style={{
      width: '280px',
      background: colors.bg,
      borderLeft: `1px solid ${colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'sticky',
      top: 0,
      overflowY: 'auto'
    }}>

      {/* Calendar Header */}
      <div style={{
        padding: '16px 20px 20px',
        borderBottom: `1px solid ${colors.border}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '28px',
          marginBottom: '12px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 500,
            color: colors.subText
          }}>
            Calendar
          </h3>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h4 style={{
            margin: 0,
            fontWeight: 500,
            fontSize: '15px',
            color: colors.heading
          }}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={prevMonth}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '28px',
                height: '28px',
                borderRadius: 'var(--r-tag)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.subText,
                transition: 'background-color var(--t-fast) var(--ease)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.hover}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextMonth}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '28px',
                height: '28px',
                borderRadius: 'var(--r-tag)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.subText,
                transition: 'background-color var(--t-fast) var(--ease)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.hover}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Weekday Labels */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          marginBottom: '10px'
        }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: colors.subText
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          textAlign: 'center'
        }}>
          {days.map((day, index) => {
            const dayServices = getServicesForDay(day);
            const hasServices = dayServices.length > 0;
            const isTodayDay = isToday(day);

            return (
              <div
                key={index}
                onClick={() => handleDayClick(day)}
                style={{
                  fontSize: '13px',
                  fontVariantNumeric: 'tabular-nums',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--r-control)',
                  cursor: day ? 'pointer' : 'default',
                  background: isTodayDay
                    ? colors.accent
                    : hasServices
                      ? colors.accentSoft
                      : 'transparent',
                  color: isTodayDay
                    ? colors.onAccent
                    : hasServices
                      ? colors.accentInk
                      : colors.text,
                  opacity: day ? 1 : 0,
                  fontWeight: hasServices || isTodayDay ? 500 : 400,
                  position: 'relative',
                  transition: 'background-color var(--t-fast) var(--ease)'
                }}
                onMouseEnter={(e) => {
                  if (day && !isTodayDay) {
                    e.currentTarget.style.backgroundColor = colors.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (day && !isTodayDay) {
                    e.currentTarget.style.backgroundColor = hasServices
                      ? colors.accentSoft
                      : 'transparent';
                  }
                }}
              >
                {day}
                {hasServices && (
                  <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '2px'
                  }}>
                    {dayServices.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '3px',
                          height: '3px',
                          borderRadius: '50%',
                          background: isTodayDay ? colors.onAccent : colors.accent
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Services */}
      {services.filter(s => {
        if (!s.date) return false;
        const serviceDate = new Date(s.date);
        return serviceDate.getDate() === today.getDate() &&
               serviceDate.getMonth() === today.getMonth() &&
               serviceDate.getFullYear() === today.getFullYear();
      }).length > 0 && (
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.border}`
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '13px',
            fontWeight: 500,
            color: colors.subText
          }}>
            Today
          </h4>
          {services
            .filter(s => {
              if (!s.date) return false;
              const serviceDate = new Date(s.date);
              return serviceDate.getDate() === today.getDate() &&
                     serviceDate.getMonth() === today.getMonth() &&
                     serviceDate.getFullYear() === today.getFullYear();
            })
            .sort((a, b) => (a.start_time || '09:00').localeCompare(b.start_time || '09:00'))
            .map(service => (
              <div
                key={service.id}
                style={{
                  padding: '8px 12px',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-control)',
                  marginBottom: '8px',
                  fontSize: '13px'
                }}
              >
                <div style={{
                  fontWeight: 500,
                  color: colors.heading,
                  marginBottom: '2px'
                }}>
                  {service.name}
                </div>
                <div style={{
                  color: colors.subText,
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Clock size={12} strokeWidth={1.5} />
                  {service.start_time || '9:00'}–{service.end_time || '10:30'}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Quick Info */}
      <div style={{
        padding: '16px 20px',
        fontSize: '13px',
        color: colors.subText,
        lineHeight: '20px'
      }}>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: colors.heading, fontWeight: 500 }}>Click a date</span> to create a new service
        </div>
        <div>
          Days with <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: colors.accent,
            margin: '0 4px',
            verticalAlign: 'middle'
          }}></span> have scheduled services
        </div>
      </div>

      {/* Service Time Modal */}
      {showServiceModal && selectedDate && (
        <ServiceTimeModal
          isDarkMode={isDarkMode}
          orgId={orgId}
          date={selectedDate}
          onClose={() => {
            setShowServiceModal(false);
            setSelectedDate(null);
          }}
          onSave={handleServiceSave}
          existingServices={getServicesForDay(new Date(selectedDate).getDate())}
        />
      )}
    </div>
  );
}
