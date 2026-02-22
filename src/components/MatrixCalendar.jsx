import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users } from 'lucide-react';

export default function MatrixCalendar({ isDarkMode, services = [], onServiceClick }) {
  const colors = {
    bg: isDarkMode ? '#111827' : '#f3f4f6',
    card: isDarkMode ? '#1f2937' : '#ffffff',
    text: isDarkMode ? '#9ca3af' : '#4b5563',
    heading: isDarkMode ? '#f9fafb' : '#111827',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    primary: '#3b82f6',
    accent: '#10b981',
    subText: isDarkMode ? '#6b7280' : '#9ca3af',
  };

  const [weeksBack, setWeeksBack] = useState(2);
  const [weeksAhead, setWeeksAhead] = useState(6);
  const [startDate, setStartDate] = useState(new Date());

  // Helper to format time
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const isPM = hour >= 12;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
  };

  // Get Sunday of a given week
  const getSunday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // Generate weeks array
  const generateWeeks = () => {
    const weeks = [];
    const today = new Date();
    const sunday = getSunday(today);

    // Go back
    const startSunday = new Date(sunday);
    startSunday.setDate(sunday.getDate() - (weeksBack * 7));

    // Generate weeks
    const totalWeeks = weeksBack + weeksAhead + 1;
    for (let i = 0; i < totalWeeks; i++) {
      const weekStart = new Date(startSunday);
      weekStart.setDate(startSunday.getDate() + (i * 7));
      weeks.push(weekStart);
    }

    return weeks;
  };

  const weeks = generateWeeks();

  // Get services for a specific week
  const getServicesForWeek = (weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return services.filter(service => {
      if (!service.date) return false;
      const serviceDate = new Date(service.date);
      return serviceDate >= weekStart && serviceDate <= weekEnd;
    }).sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.start_time || '09:00').localeCompare(b.start_time || '09:00');
    });
  };

  // Check if week is current week
  const isCurrentWeek = (weekStart) => {
    const today = new Date();
    const todaySunday = getSunday(today);
    return weekStart.getTime() === todaySunday.getTime();
  };

  return (
    <div style={{
      padding: '20px',
      background: colors.bg,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '20px',
        background: colors.card,
        padding: '20px',
        borderRadius: '12px',
        border: `1px solid ${colors.border}`
      }}>
        <h1 style={{
          margin: '0 0 15px 0',
          fontSize: '24px',
          fontWeight: '700',
          color: colors.heading
        }}>
          Matrix Calendar
        </h1>

        <div style={{
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: colors.subText,
              marginBottom: '5px',
              fontWeight: '600'
            }}>
              Weeks Back
            </label>
            <input
              type="number"
              min="0"
              max="12"
              value={weeksBack}
              onChange={(e) => setWeeksBack(Math.min(12, Math.max(0, parseInt(e.target.value) || 0)))}
              style={{
                width: '80px',
                padding: '8px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                background: isDarkMode ? '#111827' : '#ffffff',
                color: colors.heading,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: colors.subText,
              marginBottom: '5px',
              fontWeight: '600'
            }}>
              Weeks Ahead
            </label>
            <input
              type="number"
              min="1"
              max="26"
              value={weeksAhead}
              onChange={(e) => setWeeksAhead(Math.min(26, Math.max(1, parseInt(e.target.value) || 1)))}
              style={{
                width: '80px',
                padding: '8px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                background: isDarkMode ? '#111827' : '#ffffff',
                color: colors.heading,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{
            fontSize: '13px',
            color: colors.text,
            padding: '8px 12px',
            background: colors.bg,
            borderRadius: '6px',
            border: `1px solid ${colors.border}`
          }}>
            Showing {weeksBack + weeksAhead + 1} weeks
          </div>
        </div>
      </div>

      {/* Matrix Grid */}
      <div style={{
        overflowX: 'auto',
        background: colors.card,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${weeks.length}, minmax(250px, 1fr))`,
          gap: '1px',
          background: colors.border,
          border: `1px solid ${colors.border}`,
          minWidth: 'max-content'
        }}>
          {weeks.map((weekStart, weekIndex) => {
            const weekServices = getServicesForWeek(weekStart);
            const isCurrent = isCurrentWeek(weekStart);

            return (
              <div
                key={weekIndex}
                style={{
                  background: colors.card,
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Week Header */}
                <div style={{
                  padding: '16px',
                  borderBottom: `2px solid ${isCurrent ? colors.primary : colors.border}`,
                  background: isCurrent ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : colors.bg
                }}>
                  <div style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    color: isCurrent ? colors.primary : colors.subText,
                    marginBottom: '4px'
                  }}>
                    {isCurrent ? 'This Week' : weekStart.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: colors.heading
                  }}>
                    {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.text,
                    marginTop: '2px'
                  }}>
                    {weekStart.getFullYear()}
                  </div>
                </div>

                {/* Services List */}
                <div style={{ padding: '12px', flex: 1 }}>
                  {weekServices.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: colors.subText,
                      fontSize: '13px'
                    }}>
                      No services scheduled
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {weekServices.map(service => {
                        const serviceDate = new Date(service.date);
                        const duration = service.duration_minutes || 90;

                        return (
                          <div
                            key={service.id}
                            onClick={() => onServiceClick && onServiceClick(service.id)}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              border: `1px solid ${colors.border}`,
                              background: colors.bg,
                              cursor: onServiceClick ? 'pointer' : 'default',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (onServiceClick) {
                                e.currentTarget.style.borderColor = colors.primary;
                                e.currentTarget.style.background = isDarkMode ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (onServiceClick) {
                                e.currentTarget.style.borderColor = colors.border;
                                e.currentTarget.style.background = colors.bg;
                              }
                            }}
                          >
                            {/* Date Badge */}
                            <div style={{
                              fontSize: '11px',
                              color: colors.primary,
                              fontWeight: '700',
                              marginBottom: '6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {serviceDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>

                            {/* Service Name */}
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: colors.heading,
                              marginBottom: '8px'
                            }}>
                              {service.name}
                            </div>

                            {/* Time */}
                            <div style={{
                              fontSize: '12px',
                              color: colors.text,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '6px'
                            }}>
                              <Clock size={12} />
                              {formatTime(service.start_time || '09:00')} - {formatTime(service.end_time || '10:30')}
                              <span style={{ opacity: 0.6 }}>({duration}min)</span>
                            </div>

                            {/* Items count */}
                            {service.items && service.items.length > 0 && (
                              <div style={{
                                fontSize: '11px',
                                color: colors.subText,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Users size={11} />
                                {service.items.length} item{service.items.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
