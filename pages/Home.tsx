
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'admin',
      title: '관리자 (PC)',
      desc: '회원 관리, 출결 현황, 통계 확인',
      icon: 'fa-user-shield',
      color: 'bg-blue-600',
      path: '/admin'
    },
    {
      id: 'kiosk',
      title: '출석 키오스크 (태블릿)',
      desc: '얼굴 인식 및 번호 출석 체크',
      icon: 'fa-tablet-alt',
      color: 'bg-slate-800',
      path: '/kiosk'
    },
    {
      id: 'member',
      title: '관원 페이지 (모바일)',
      desc: '내 수강권 및 출결 이력 확인',
      icon: 'fa-user',
      color: 'bg-emerald-600',
      path: '/me'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black italic tracking-tighter text-slate-900 mb-2">OSS JIU-JITSU</h1>
          <p className="text-slate-500 font-medium uppercase tracking-widest">Gym Management System PoC</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => navigate(role.path)}
              className="group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl border border-transparent hover:border-slate-200 transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className={`${role.color} w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                <i className={`fas ${role.icon}`}></i>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{role.title}</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{role.desc}</p>
              <div className="mt-6 text-slate-300 group-hover:text-slate-900 transition-colors">
                <i className="fas fa-arrow-right"></i>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-16 text-center text-slate-400 text-xs uppercase tracking-widest font-semibold">
          © 2026 Attendance Management. Built for Web, Tablet & Mobile.
        </div>
      </div>
    </div>
  );
};
