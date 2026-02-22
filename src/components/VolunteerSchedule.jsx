import React from 'react';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';

export default function VolunteerSchedule({ service, planItems, onBack }) {
  
  const calculateRowTime = (baseIsoString, minutesToAdd) => {
    if (!baseIsoString) return "00:00";
    const safeDate = baseIsoString.includes('T') ? baseIsoString : `${baseIsoString}T10:00`;
    const date = new Date(safeDate);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  let currentAccumulatedMinutes = 0;

  return (
    <div style={{maxWidth: '800px', margin: '0 auto', paddingBottom: '80px', fontFamily: 'Inter, sans-serif'}}>
      
      {/* Header */}
      <button onClick={onBack} style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontWeight: 'bold', marginBottom: '24px', background: 'none', border: 'none', cursor: 'pointer'}}>
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      {/* Service Card */}
      <div style={{background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb', marginBottom: '32px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'}}>
        <h1 style={{fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px', marginTop: 0}}>{service.name}</h1>
        <div style={{display: 'flex', gap: '16px', color: '#4b5563', fontSize: '14px', fontWeight: '500'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Calendar size={16}/> {new Date(service.date).toLocaleDateString()}</div>
            <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={16}/> {new Date(service.date).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</div>
        </div>
      </div>

      {/* Grid */}
      <div>
        <div style={{display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: '16px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
            <div>Time</div>
            <div>Item</div>
            <div style={{textAlign: 'right'}}>Length</div>
        </div>

        {planItems.map((item, i) => {
            const startAt = calculateRowTime(service.date, currentAccumulatedMinutes);
            const isHeader = item.type === 'header';
            if (!isHeader) currentAccumulatedMinutes += (parseInt(item.length) || 0);

            if (isHeader) {
                return (
                    <div key={i} style={{marginTop: '24px', marginBottom: '8px', paddingTop: '16px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb'}}>
                        <h3 style={{fontSize: '14px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0}}>{item.title}</h3>
                    </div>
                );
            }

            return (
                <div key={i} style={{background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #f3f4f6', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'}}>
                    <div style={{width: '60px', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', color: '#6b7280', flexShrink: 0}}>{startAt}</div>
                    <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontWeight: 'bold', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.title}</div>
                        {(item.notes || item.role) && (
                            <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                {item.role && <span style={{fontWeight: '500', color: '#2563eb', marginRight: '8px'}}>{item.role}</span>}
                                <span style={{fontStyle: 'italic'}}>{item.notes}</span>
                            </div>
                        )}
                        {(item.key || item.bpm) && (
                            <div style={{display: 'flex', gap: '8px', marginTop: '6px'}}>
                                {item.key && <span style={{padding: '2px 6px', borderRadius: '4px', background: '#f3f4f6', color: '#4b5563', fontSize: '10px', fontWeight: 'bold', border: '1px solid #e5e7eb'}}>{item.key}</span>}
                                {item.bpm && <span style={{padding: '2px 6px', borderRadius: '4px', background: '#f3f4f6', color: '#4b5563', fontSize: '10px', fontWeight: 'bold', border: '1px solid #e5e7eb'}}>{item.bpm} BPM</span>}
                            </div>
                        )}
                    </div>
                    <div style={{fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', background: '#f9fafb', padding: '4px 8px', borderRadius: '4px'}}>{item.length}m</div>
                </div>
            );
        })}
      </div>
    </div>
  );
}