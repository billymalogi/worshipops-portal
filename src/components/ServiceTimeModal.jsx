import React, { useState, useEffect } from 'react';
import { X, Clock, Plus, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function ServiceTimeModal({
  isDarkMode,
  orgId,
  date,
  onClose,
  onSave,
  existingServices = [],
  editingService = null
}) {
  const colors = {
    bg: isDarkMode ? '#111827' : '#ffffff',
    card: isDarkMode ? '#1f2937' : '#f3f4f6',
    text: isDarkMode ? '#9ca3af' : '#4b5563',
    heading: isDarkMode ? '#f9fafb' : '#111827',
    border: isDarkMode ? '#374151' : '#e5e7eb',
    primary: '#3b82f6',
    danger: '#ef4444',
    success: '#10b981',
  };

  const [serviceName, setServiceName] = useState(editingService?.name || 'Weekend Service');
  const [startTime, setStartTime] = useState(editingService?.start_time || '09:00');
  const [endTime, setEndTime] = useState(editingService?.end_time || '10:30');
  const [serviceTemplates, setServiceTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCustomTime, setShowCustomTime] = useState(!editingService);

  // Recurring service options
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('weekly'); // weekly, biweekly, monthly, quarterly, annually
  const [occurrences, setOccurrences] = useState(12);

  // Load service time templates
  useEffect(() => {
    const loadTemplates = async () => {
      const { data, error } = await supabase
        .from('service_time_templates')
        .select('*')
        .eq('organization_id', orgId)
        .order('start_time');

      if (data) setServiceTemplates(data);
    };

    if (orgId) loadTemplates();
  }, [orgId]);

  // Check for time overlap
  const checkOverlap = (start, end) => {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);

    for (const service of existingServices) {
      if (editingService && service.id === editingService.id) continue; // Skip self when editing

      const serviceStart = timeToMinutes(service.start_time || '09:00');
      const serviceEnd = timeToMinutes(service.end_time || '10:30');

      // Check for overlap
      if (
        (startMinutes >= serviceStart && startMinutes < serviceEnd) ||
        (endMinutes > serviceStart && endMinutes <= serviceEnd) ||
        (startMinutes <= serviceStart && endMinutes >= serviceEnd)
      ) {
        return service;
      }
    }
    return null;
  };

  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculateDuration = () => {
    if (!startTime || !endTime) return 0;
    const diff = timeToMinutes(endTime) - timeToMinutes(startTime);
    return diff > 0 ? diff : 0;
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setStartTime(template.start_time);
    setEndTime(template.end_time);
    setServiceName(template.name);
    setShowCustomTime(false);
    setError(null);
  };

  // Calculate next date based on recurrence pattern
  const getNextDate = (currentDate, pattern) => {
    const d = new Date(currentDate + 'T00:00:00');
    switch (pattern) {
      case 'weekly':
        d.setDate(d.getDate() + 7);
        break;
      case 'biweekly':
        d.setDate(d.getDate() + 14);
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + 1);
        break;
      case 'quarterly':
        d.setMonth(d.getMonth() + 3);
        break;
      case 'annually':
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return d.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!serviceName.trim()) {
      setError('Please enter a service name');
      return;
    }

    if (!startTime || !endTime) {
      setError('Please set start and end times');
      return;
    }

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError('End time must be after start time');
      return;
    }

    // Check for overlap (only for non-recurring or first occurrence)
    if (!isRecurring) {
      const overlapping = checkOverlap(startTime, endTime);
      if (overlapping) {
        setError(`Time overlaps with "${overlapping.name}" (${overlapping.start_time} - ${overlapping.end_time})`);
        return;
      }
    }

    setLoading(true);

    try {
      if (editingService) {
        // Update existing service
        const { error: updateError } = await supabase
          .from('services')
          .update({
            name: serviceName,
            start_time: startTime,
            end_time: endTime
          })
          .eq('id', editingService.id);

        if (updateError) throw updateError;
      } else if (isRecurring) {
        // Create recurring services
        const servicesToCreate = [];
        let currentDate = date;

        for (let i = 0; i < occurrences; i++) {
          servicesToCreate.push({
            name: serviceName,
            date: currentDate,
            start_time: startTime,
            end_time: endTime,
            organization_id: orgId,
            service_type: 'service',
            items: []
          });

          if (i < occurrences - 1) {
            currentDate = getNextDate(currentDate, recurrencePattern);
          }
        }

        const { error: insertError } = await supabase
          .from('services')
          .insert(servicesToCreate);

        if (insertError) throw insertError;
      } else {
        // Create single service
        const { error: insertError } = await supabase
          .from('services')
          .insert([{
            name: serviceName,
            date: date,
            start_time: startTime,
            end_time: endTime,
            organization_id: orgId,
            service_type: 'service',
            items: []
          }]);

        if (insertError) throw insertError;
      }

      onSave();
    } catch (err) {
      console.error('Error saving service:', err);
      setError(err.message || 'Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  const duration = calculateDuration();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: colors.bg,
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: `1px solid ${colors.border}`
      }}>

        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: colors.heading
            }}>
              {editingService ? 'Edit Service' : 'Create Service'}
            </h2>
            <p style={{
              margin: '4px 0 0',
              fontSize: '14px',
              color: colors.text
            }}>
              {date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Select date and time'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: colors.text,
              padding: '8px',
              borderRadius: '6px'
            }}
            onMouseEnter={(e) => e.target.style.background = colors.card}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: `1px solid rgba(239, 68, 68, 0.3)`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              color: colors.danger
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '14px' }}>{error}</div>
            </div>
          )}

          {/* Service Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: colors.heading
            }}>
              Service Name
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g., Morning Worship, Evening Service"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.card,
                color: colors.heading,
                fontSize: '15px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = colors.primary}
              onBlur={(e) => e.target.style.borderColor = colors.border}
            />
          </div>

          {/* Recurring Options */}
          {!editingService && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.heading
              }}>
                Service Type
              </label>

              {/* Toggle between One-time and Recurring */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: isRecurring ? '16px' : '0' }}>
                <button
                  type="button"
                  onClick={() => setIsRecurring(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `2px solid ${!isRecurring ? colors.primary : colors.border}`,
                    background: !isRecurring
                      ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)')
                      : colors.card,
                    color: !isRecurring ? colors.primary : colors.text,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  One-time
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecurring(true)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `2px solid ${isRecurring ? colors.primary : colors.border}`,
                    background: isRecurring
                      ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)')
                      : colors.card,
                    color: isRecurring ? colors.primary : colors.text,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Recurring
                </button>
              </div>

              {/* Recurring Options */}
              {isRecurring && (
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: colors.card,
                  border: `1px solid ${colors.border}`
                }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.heading
                  }}>
                    Frequency
                  </label>
                  <select
                    value={recurrencePattern}
                    onChange={(e) => setRecurrencePattern(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      background: isDarkMode ? '#111827' : '#ffffff',
                      color: colors.heading,
                      fontSize: '14px',
                      marginBottom: '12px',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly (Every 2 weeks)</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly (Every 3 months)</option>
                    <option value="annually">Annually</option>
                  </select>

                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.heading
                  }}>
                    Number of Services
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={occurrences}
                    onChange={(e) => setOccurrences(Math.min(52, Math.max(1, parseInt(e.target.value) || 1)))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      background: isDarkMode ? '#111827' : '#ffffff',
                      color: colors.heading,
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: colors.text
                  }}>
                    This will create {occurrences} service{occurrences !== 1 ? 's' : ''} {recurrencePattern === 'weekly' ? 'every week' : recurrencePattern === 'biweekly' ? 'every 2 weeks' : recurrencePattern === 'monthly' ? 'every month' : recurrencePattern === 'quarterly' ? 'every 3 months' : 'every year'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Time Templates */}
          {!editingService && serviceTemplates.length > 0 && !showCustomTime && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.heading
              }}>
                Choose Service Time
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {serviceTemplates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: `2px solid ${selectedTemplate?.id === template.id ? colors.primary : colors.border}`,
                      background: selectedTemplate?.id === template.id
                        ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)')
                        : colors.card,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedTemplate?.id !== template.id) {
                        e.currentTarget.style.borderColor = colors.primary;
                        e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedTemplate?.id !== template.id) {
                        e.currentTarget.style.borderColor = colors.border;
                        e.currentTarget.style.background = colors.card;
                      }
                    }}
                  >
                    <div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: colors.heading,
                        marginBottom: '4px'
                      }}>
                        {template.name}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: colors.text,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Clock size={13} />
                        {template.start_time} - {template.end_time}
                      </div>
                    </div>
                    {template.is_default && (
                      <span style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: colors.primary,
                        color: 'white',
                        fontWeight: '600'
                      }}>
                        DEFAULT
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowCustomTime(true)}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px dashed ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = colors.primary;
                  e.target.style.color = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = colors.border;
                  e.target.style.color = colors.text;
                }}
              >
                <Plus size={16} />
                Use Custom Time
              </button>
            </div>
          )}

          {/* Custom Time Inputs */}
          {(showCustomTime || editingService || serviceTemplates.length === 0) && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.heading
              }}>
                Service Time
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Start Time */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    color: colors.text
                  }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setError(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.card,
                      color: colors.heading,
                      fontSize: '15px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = colors.primary}
                    onBlur={(e) => e.target.style.borderColor = colors.border}
                  />
                </div>

                {/* End Time */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    color: colors.text
                  }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setError(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.card,
                      color: colors.heading,
                      fontSize: '15px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = colors.primary}
                    onBlur={(e) => e.target.style.borderColor = colors.border}
                  />
                </div>
              </div>

              {/* Duration Display */}
              {duration > 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                  border: `1px solid ${isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'}`,
                  fontSize: '13px',
                  color: colors.success,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Clock size={14} />
                  Duration: {Math.floor(duration / 60)}h {duration % 60}m
                </div>
              )}

              {!editingService && serviceTemplates.length > 0 && showCustomTime && (
                <button
                  onClick={() => {
                    setShowCustomTime(false);
                    setSelectedTemplate(null);
                  }}
                  style={{
                    marginTop: '12px',
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: colors.primary,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  ← Back to Templates
                </button>
              )}
            </div>
          )}

          {/* Existing Services on This Day */}
          {existingServices.length > 0 && (
            <div style={{
              padding: '14px',
              borderRadius: '8px',
              background: colors.card,
              border: `1px solid ${colors.border}`,
              marginBottom: '20px'
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: colors.heading,
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Other Services Today
              </div>
              {existingServices
                .filter(s => !editingService || s.id !== editingService.id)
                .sort((a, b) => (a.start_time || '09:00').localeCompare(b.start_time || '09:00'))
                .map(service => (
                  <div
                    key={service.id}
                    style={{
                      padding: '8px',
                      fontSize: '13px',
                      color: colors.text,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ color: colors.heading, fontWeight: '500' }}>
                      {service.name}
                    </span>
                    <span style={{ fontSize: '12px' }}>
                      {service.start_time || '9:00'} - {service.end_time || '10:30'}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.background = colors.card}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: colors.primary,
              color: 'white',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.opacity = '1';
            }}
          >
            {loading ? 'Saving...' : (editingService ? 'Save Changes' : isRecurring ? `Create ${occurrences} Services` : 'Create Service')}
          </button>
        </div>
      </div>
    </div>
  );
}
