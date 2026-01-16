
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
    { name: '개발자 LAB', path: '/admin/developer', icon: 'fa-code' },
  ];

  const handleLogout = () => {
    navigate('/');
  };

  if (role === 'kiosk') {
    return <div className="min-h-screen bg-[#0f172a] text-white selection:bg-blue-500/30">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] text-slate-900 selection:bg-blue-500/20">
      {/* Mobile Header */}
      <header className="md:hidden bg-[#0f172a] p-5 flex justify-between items-center sticky top-0 z-[60] shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-bolt text-sm text-white"></i>
          </div>
          <h1 className="text-lg font-black italic tracking-tighter text-white">OSS LIVE</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 text-white active:scale-90 transition-transform"
        >
          <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars-staggered'} text-xl`}></i>
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen z-[56]
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
        w-[280px] md:w-72 bg-[#0f172a] flex-shrink-0 transition-transform duration-300 ease-in-out shadow-2xl
        ${role === 'member' ? 'hidden' : 'flex flex-col'}
      `}>
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <i className="fas fa-bolt text-xl text-white"></i>
            </div>
            <h1 className="text-2xl font-black tracking-tighter italic text-white leading-none">OSS LIVE</h1>
          </div>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] opacity-60">Management System</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-8 overflow-y-auto custom-scrollbar">
          {role === 'admin' && adminNav.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-5 py-4 rounded-2xl transition-all duration-300 group relative ${active
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 font-black'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white font-bold'
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl mr-4 transition-all ${active ? 'bg-white/20' : 'bg-slate-800/50 group-hover:bg-slate-700'}`}>
                  <i className={`fas ${item.icon} text-lg ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 group-hover:scale-110'}`}></i>
                </div>
                <span className="tracking-tight text-base">{item.name}</span>
                {active && (
                  <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-4 p-5 w-full text-left rounded-2xl text-slate-500 hover:bg-white/5 hover:text-white transition-all font-black text-sm uppercase tracking-widest"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>시스템 종료</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[#000000]/60 backdrop-blur-sm z-[55] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col relative">
        <div className="flex-1 p-4 md:p-10 lg:p-12 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
