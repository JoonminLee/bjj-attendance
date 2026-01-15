
import React from 'react';
import { storageService } from '../services/storage';
import { Layout } from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const members = storageService.getMembers();
  const attendance = storageService.getAttendance();
  
  const activeMembers = members.filter(m => m.status === 'active').length;
  const expiredSoonCount = members.filter(m => m.remainingTickets <= 2 && m.status === 'active').length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.timestamp.startsWith(today)).length;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    return {
      name: dateStr.slice(5),
      count: attendance.filter(a => a.timestamp.startsWith(dateStr)).length
    };
  });

  const stats = [
    { label: '전체 관원', value: members.length, icon: 'fa-users', color: 'bg-blue-500', trend: '+2 this month' },
    { label: '활성 관원', value: activeMembers, icon: 'fa-user-check', color: 'bg-emerald-500', trend: '92% of total' },
    { label: '오늘 출석', value: todayAttendance, icon: 'fa-calendar-day', color: 'bg-orange-500', trend: 'Live update' },
    { label: '만료 예정', value: expiredSoonCount, icon: 'fa-clock', color: 'bg-red-500', trend: 'Requires action' },
  ];

  return (
    <Layout role="admin">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Dashboard</h2>
          <p className="text-slate-500 font-medium mt-1">체육관의 주요 지표와 출석 현황입니다.</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-black uppercase tracking-widest text-slate-600">System Monitoring Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, idx) => (
          <div key={idx} className="group bg-white p-7 rounded-[32px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-[0.03] rounded-bl-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="flex items-center justify-between mb-6">
              <div className={`${stat.color} w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform`}>
                <i className={`fas ${stat.icon} text-lg`}></i>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.trend}</span>
            </div>
            <p className="text-slate-500 text-sm font-bold">{stat.label}</p>
            <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter italic">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
        <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-slate-100 min-h-[400px]">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-900">Attendance Trends</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">최근 7일간의 출석 인원 변화입니다.</p>
            </div>
          </div>
          {/* Recharts Fix: added aspect ratio to ensure initial height > 0 */}
          <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" aspect={2}>
              <BarChart data={last7Days} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 10}}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                />
                <Bar dataKey="count" radius={[12, 12, 12, 12]} barSize={40}>
                  {last7Days.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 6 ? '#2563eb' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-900">Live Activity</h3>
            <button className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full hover:bg-blue-100 transition-colors">View All</button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {attendance.slice(0, 10).map((record) => (
              <div key={record.id} className="flex items-center space-x-4 p-4 rounded-3xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black italic shadow-md group-hover:scale-105 transition-transform">
                  {record.memberName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{record.memberName}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2.5 py-1.5 rounded-xl">Checked</span>
                </div>
              </div>
            ))}
            {attendance.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-300">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                   <i className="fas fa-ghost text-2xl"></i>
                </div>
                <p className="text-xs font-black uppercase tracking-widest">No activity today</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </Layout>
  );
};
