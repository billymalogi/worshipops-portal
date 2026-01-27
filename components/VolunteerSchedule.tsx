'use client'

import React from 'react';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';

export default function VolunteerSchedule({ service, planItems, onBack }: any) {
  
  // Time Calculation Helper
  const calculateRowTime = (baseIsoString: any, minutesToAdd: number) => {
    if (!baseIsoString) return "00:00";
    const safeDate = baseIsoString.includes('T') ? baseIsoString : `${baseIsoString}T10:00`;
    const date = new Date(safeDate);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  let currentAccumulatedMinutes = 0;

  return (
    <div className="max-w-2xl mx-auto font-sans pb-20">
      
      {/* Header / Nav */}
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold mb-6 hover:text-blue-600 transition-colors">
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      {/* Service Info Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{service.name}</h1>
        <div className="flex gap-4 text-gray-600 text-sm font-medium">
            <div className="flex items-center gap-1"><Calendar size={16}/> {new Date(service.date).toLocaleDateString()}</div>
            <div className="flex items-center gap-1"><Clock size={16}/> {new Date(service.date).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</div>
        </div>
      </div>

      {/* The Schedule Grid */}
      <div className="space-y-1">
        {/* Header Row */}
        <div className="grid grid-cols-[60px_1fr_auto] gap-4 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <div>Time</div>
            <div>Item</div>
            <div className="text-right">Length</div>
        </div>

        {planItems.map((item: any, i: number) => {
            const startAt = calculateRowTime(service.date, currentAccumulatedMinutes);
            const isHeader = item.type === 'header';
            if (!isHeader) currentAccumulatedMinutes += (parseInt(item.length) || 0);

            if (isHeader) {
                return (
                    <div key={i} className="mt-6 mb-2 pt-4 pb-2 border-b border-gray-200">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">{item.title}</h3>
                    </div>
                );
            }

            return (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    {/* Time Column */}
                    <div className="w-[60px] text-sm font-mono font-bold text-gray-500 shrink-0">
                        {startAt}
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 truncate">{item.title}</div>
                        {(item.notes || item.role) && (
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                                {item.role && <span className="font-medium text-blue-600 mr-2">{item.role}</span>}
                                <span className="italic">{item.notes}</span>
                            </div>
                        )}
                        {/* Song Details (Key/BPM) if available */}
                        {(item.key || item.bpm) && (
                            <div className="flex gap-2 mt-1.5">
                                {item.key && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold border border-gray-200">{item.key}</span>}
                                {item.bpm && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold border border-gray-200">{item.bpm} BPM</span>}
                            </div>
                        )}
                    </div>

                    {/* Length Column */}
                    <div className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        {item.length}m
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}