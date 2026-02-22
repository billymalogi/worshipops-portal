import React from 'react';

export default function LoadingLogo() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      gap: '20px'
    }}>
      <div className="loading-logo-spin">
        <img
          src="/favicon.ico"
          alt="Loading"
          style={{
            width: '48px',
            height: '48px'
          }}
        />
      </div>
      <div style={{
        fontSize: '14px',
        color: '#9ca3af',
        fontWeight: '500'
      }}>
        Loading...
      </div>
    </div>
  );
}