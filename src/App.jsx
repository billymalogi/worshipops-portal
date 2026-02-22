import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import Login from './Login';
import LyricsDisplay from './components/LyricsDisplay';
import StageMonitor from './components/StageMonitor';

export default function App() {
  return (
    <Routes>
      <Route path="/login"   element={<Login />} />
      <Route path="/display" element={<LyricsDisplay />} />
      <Route path="/stage"   element={<StageMonitor />} />
      <Route path="/*"       element={<Dashboard />} />
    </Routes>
  );
}