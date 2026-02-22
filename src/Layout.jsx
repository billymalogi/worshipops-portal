import React, { useState } from 'react';
import { Menu, Calendar, Users, Music, PlayCircle, LogOut } from 'lucide-react';
import './App.css'; 

const Layout = ({ children }) => {
  const [isCollapsed, setCollapsed] = useState(false);

  const navItems = [
    { label: "Dashboard", icon: <Menu size={20} /> },
    { label: "Matrix Scheduler", icon: <Calendar size={20} />, active: true },
    { label: "Team", icon: <Users size={20} /> },
    { label: "Songs & Stems", icon: <Music size={20} /> },
    { label: "Playback", icon: <PlayCircle size={20} /> },
  ];

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="logo-area">
          <h2 className={isCollapsed ? 'hide' : ''}>WORSHIP<span style={{color: '#3b82f6'}}>CMD</span></h2>
          <button onClick={() => setCollapsed(!isCollapsed)} className="toggle-btn">
            <Menu size={20} />
          </button>
        </div>

        <nav>
          {navItems.map((item) => (
            <div key={item.label} className={`nav-item ${item.active ? 'active' : ''}`}>
              {item.icon}
              <span className={isCollapsed ? 'hide' : ''}>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="logout-area">
          <LogOut size={20} />
          <span className={isCollapsed ? 'hide' : ''}>Logout</span>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="top-bar">
          <h3>Worship Department</h3>
          <div className="user-profile">JD</div>
        </header>
        <div className="content-scrollable">
          {children} 
        </div>
      </main>
    </div>
  );
};

// THIS IS THE MISSING LINE THAT CAUSED YOUR ERROR
export default Layout;