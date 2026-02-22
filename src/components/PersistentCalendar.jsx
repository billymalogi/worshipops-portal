import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import ServiceTimeModal from './ServiceTimeModal';

export default function PersistentCalendar({ isDarkMode, onDateSelect, services = [], orgId, onRefresh }) {
  const colors = {
    text: isDarkMode ? '#e5e7eb' : '#374151',
    subText: isDarkMode ? '#9ca3af' : '#6b7280',
    hover: isDarkMode ? '#1f2937' : '#f3f4f6',
    accent: '#3b82f6',
    bg: isDarkMode ? '#0d1117' : '#f8f9fa',
    border: isDarkMode ? '#21262d' : '#e1e4e8',
    heading: isDarkMode ? '#f9fafb' : '#111827',
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
        padding: '20px 20px 15px',
        borderBottom: `1px solid ${colors.border}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: colors.subText
          }}>
            Calendar
          </h3>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <h4 style={{
            margin: 0,
            fontWeight: '700',
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
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                color: colors.subText
              }}
              onMouseEnter={(e) => e.target.style.background = colors.hover}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextMonth}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                color: colors.subText
              }}
              onMouseEnter={(e) => e.target.style.background = colors.hover}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
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
              fontSize: '11px',
              color: colors.subText,
              fontWeight: '600'
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
                  padding: '8px 4px',
                  borderRadius: '6px',
                  cursor: day ? 'pointer' : 'default',
                  background: isTodayDay
                    ? colors.accent
                    : hasServices
                      ? isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'
                      : 'transparent',
                  color: isTodayDay
                    ? 'white'
                    : hasServices
                      ? colors.accent
                      : colors.text,
                  opacity: day ? 1 : 0,
                  fontWeight: hasServices || isTodayDay ? '700' : '400',
                  position: 'relative',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (day && !isTodayDay) {
                    e.currentTarget.style.backgroundColor = colors.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (day && !isTodayDay) {
                    e.currentTarget.style.backgroundColor = hasServices
                      ? (isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)')
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
                          background: isTodayDay ? 'white' : colors.accent
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
          padding: '15px 20px',
          borderBottom: `1px solid ${colors.border}`
        }}>
          <h4 style={{
            margin: '0 0 10px 0',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: colors.subText
          }}>
            Today's Services
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
                  padding: '8px 10px',
                  background: isDarkMode ? '#1c2128' : '#f3f4f6',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  fontSize: '13px'
                }}
              >
                <div style={{
                  fontWeight: '600',
                  color: colors.heading,
                  marginBottom: '2px'
                }}>
                  {service.name}
                </div>
                <div style={{
                  color: colors.subText,
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Clock size={11} />
                  {service.start_time || '9:00'} - {service.end_time || '10:30'}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Quick Info */}
      <div style={{
        padding: '15px 20px',
        fontSize: '12px',
        color: colors.subText,
        lineHeight: '1.6'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: colors.heading }}>Click a date</strong> to create a new service
        </div>
        <div>
          Days with <span style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: colors.accent,
            margin: '0 2px'
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
