import React from 'react';
import { CheckCircle, XCircle, HelpCircle, Mail } from 'lucide-react';

const dates = [
  { id: 1, date: 'Oct 15', service: 'Sunday AM' },
  { id: 2, date: 'Oct 22', service: 'Sunday AM' },
  { id: 3, date: 'Oct 29', service: 'Youth Night' },
];

const roles = [
  { id: 'r1', title: 'Worship Leader' },
  { id: 'r2', title: 'Acoustic Guitar' },
  { id: 'r3', title: 'Drums' },
  { id: 'r4', title: 'Bass' },
];

const scheduleData = {
  'r1-1': { name: 'Sarah J.', status: 'confirmed', avatar: 'SJ' },
  'r3-1': { name: 'Mike D.', status: 'declined', avatar: 'MD' },
  'r3-2': { name: 'Waiting...', status: 'pending', avatar: '?' },
  'r4-2': { name: 'Alex B.', status: 'confirmed', avatar: 'AB' },
};

const MatrixScheduler = () => {
  
  const getStatusClass = (status) => {
    switch(status) {
      case 'confirmed': return 'status-confirmed';
      case 'declined': return 'status-declined';
      case 'pending': return 'status-pending';
      default: return '';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed': return <CheckCircle size={14} />;
      case 'declined': return <XCircle size={14} />;
      case 'pending': return <HelpCircle size={14} />;
      default: return null;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="scheduler-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Matrix Scheduler</h2>
          <p style={{ color: '#9ca3af' }}>Manage teams and auto-fill positions.</p>
        </div>
        <button className="btn-primary">
          <Mail size={16} /> Email Team
        </button>
      </div>

      {/* The Matrix Table */}
      <div className="matrix-container">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="sticky-col">Role / Date</th>
              {dates.map((d) => (
                <th key={d.id}>
                  <div className="date-header">{d.date}</div>
                  <div className="service-sub">{d.service}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="sticky-col">{role.title}</td>
                {dates.map((date) => {
                  const key = `${role.id}-${date.id}`;
                  const entry = scheduleData[key];

                  return (
                    <td key={key}>
                      {entry ? (
                        <div className={`status-card ${getStatusClass(entry.status)}`}>
                          <div className="user-info">
                            <div className="avatar">{entry.avatar}</div>
                            <span>{entry.name}</span>
                          </div>
                          {getStatusIcon(entry.status)}
                        </div>
                      ) : (
                        <div className="add-slot">+ Add</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatrixScheduler;