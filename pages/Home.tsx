
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'admin',
      title: '관리자',
      desc: '회원 관리, 출결 현황, 통계 확인',
      icon: 'fa-user-shield',
      color: 'bg-blue-600',
      path: '/admin',
      label: '관리자 모드'
    },
    {
      id: 'kiosk',
      title: '출석 키오스크',
      desc: '얼굴 인식 및 번호 출석 체크',
      icon: 'fa-tablet-screen-button',
      color: 'bg-[#1e293b]',
      path: '/kiosk',
      label: '출석 키오스크'
    },
    {
      id: 'member',
      title: '관원 페이지',
      desc: '내 수강권 및 출결 이력 확인',
      icon: 'fa-user',
      color: 'bg-[#059669]',
      path: '/me',
      label: '관원 전용 포털'
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 selection:bg-blue-500/30">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
          <h1 className="text-6xl md:text-7xl font-black italic tracking-tighter text-[#0f172a] mb-2 leading-none uppercase">OSS JIU-JITSU</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-sm italic">GYM MANAGEMENT SYSTEM POC</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {roles.map((role, idx) => (
            <button
              key={role.id}
              onClick={() => navigate(role.path)}
              className={`group bg-white p-10 rounded-[32px] shadow-sm hover:shadow-2xl border border-slate-100 hover:border-blue-100 transition-all duration-500 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-700`}
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <div className={`${role.color} w-20 h-20 rounded-[24px] flex items-center justify-center text-white text-3xl mb-8 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <i className={`fas ${role.icon}`}></i>
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2 tracking-tight">{role.title}</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed px-4">{role.desc}</p>

              <div className="mt-8 text-slate-200 group-hover:text-blue-500 transition-colors">
                <i className="fas fa-arrow-right"></i>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">© 2026 OSS JIU-JITSU MANAGEMENT. BUILT FOR WEB, TABLET & MOBILE.</p>
        </div>
      </div>
    </div>
  );
};
