
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'member' | 'kiosk';
}

export const Layout: React.FC<LayoutProps> = ({ children, role }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const adminNav = [
    { name: '대시보드', path: '/admin', icon: 'fa-chart-pie' },
    { name: '회원관리', path: '/admin/members', icon: 'fa-users-gear' },
    { name: '출결기록', path: '/admin/attendance', icon: 'fa-clipboard-list' },
  ];

  const handleLogout = () => {
    navigate('/');
  };

  if (role === 'kiosk') {
    return <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white p-5 flex justify-between items-center sticky top-0 z-[60] shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-bolt text-sm"></i>
          </div>
          <h1 className="text-lg font-black italic tracking-tighter">OSS JIU-JITSU</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 active:scale-90 transition-transform"
        >
          <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars-staggered'} text-xl`}></i>
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen z-[56]
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
        w-[280px] md:w-72 bg-slate-900 text-white flex-shrink-0 transition-transform duration-300 ease-in-out
        ${role === 'member' ? 'hidden' : 'flex flex-col'}
      `}>
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="fas fa-bolt text-xl"></i>
            </div>
            <h1 className="text-2xl font-black tracking-tighter italic text-white">OSS LIVE</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Management System</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          {role === 'admin' && adminNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-200 group ${isActive(item.path)
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <i className={`fas ${item.icon} text-lg ${isActive(item.path) ? 'text-white' : 'group-hover:text-blue-400'}`}></i>
              <span className="font-bold tracking-tight">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-4 p-5 w-full text-left rounded-2xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold"
          >
            <i className="fas fa-right-from-bracket"></i>
            <span>시스템 종료</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col relative">
        <div className="flex-1 p-4 md:p-10 lg:p-12 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Member Mobile Bottom Nav */}
      {role === 'member' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center p-3 pb-8 z-50">
          <Link to="/me" className={`flex flex-col items-center space-y-1 px-8 py-2 rounded-2xl transition-all ${isActive('/me') ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
            <i className="fas fa-user-circle text-xl"></i>
            <span className="text-[10px] font-black uppercase tracking-widest">My Profile</span>
          </Link>
          <button onClick={handleLogout} className="flex flex-col items-center space-y-1 px-8 py-2 text-slate-400 active:text-red-500">
            <i className="fas fa-power-off text-xl"></i>
            <span className="text-[10px] font-black uppercase tracking-widest">Exit</span>
          </button>
        </nav>
      )}
    </div>
  );
};
