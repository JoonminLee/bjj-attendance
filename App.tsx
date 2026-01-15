
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Kiosk } from './pages/Kiosk';
import { AdminDashboard } from './pages/AdminDashboard';
import { MemberList } from './pages/MemberList';
import { AttendanceList } from './pages/AttendanceList';
import { MyProfile } from './pages/MyProfile';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/kiosk" element={<Kiosk />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/members" element={<MemberList />} />
      <Route path="/admin/attendance" element={<AttendanceList />} />
      <Route path="/me" element={<MyProfile />} />
    </Routes>
  );
};

export default App;
