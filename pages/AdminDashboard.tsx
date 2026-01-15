
import React, { useMemo } from 'react';
import { storageService } from '../services/storage';
import { Layout } from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const members = storageService.getMembers();
  const attendance = storageService.getAttendance();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const activeMembers = members.filter(m => m.status === 'active').length;
    const todayAttendance = attendance.filter(a => a.timestamp.startsWith(today)).length;

    // 수강권 충전 합계 (최근 30일)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let monthlyTickets = 0;
    members.forEach(m => {
      m.ticketHistory?.forEach(h => {
        if (h.type === 'add' && new Date(h.date) >= thirtyDaysAgo) {
          monthlyTickets += h.amount;
        }
      });
    });

    return { activeMembers, todayAttendance, monthlyTickets };
  }, [members, attendance]);

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => ({
      date: new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      count: attendance.filter(a => a.timestamp.startsWith(date)).length,
      fullDate: date
    }));
  }, [attendance]);

  const recentActivities = useMemo(() => {
    const activities: any[] = [];

    // 최근 출결
    attendance.slice(0, 5).forEach(a => {
      activities.push({
        id: `att-${a.id}`,
        type: 'attendance',
        title: a.memberName,
        subtitle: '출석 체크 완료',
        time: a.timestamp,
        icon: 'fa-check-circle',
        iconCol: 'text-emerald-500',
        bgCol: 'bg-emerald-50'
      });
    });

    // 최근 수강권 충전
    members.forEach(m => {
      m.ticketHistory?.slice(-3).forEach(h => {
        if (h.type === 'add') {
          activities.push({
            id: `tic-${h.id}`,
            type: 'ticket',
            title: m.name,
            subtitle: `수강권 ${h.amount}회 충전`,
            time: h.date,
            icon: 'fa-ticket-alt',
            iconCol: 'text-blue-500',
            bgCol: 'bg-blue-50'
          });
        }
      });
    });

    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [members, attendance]);

  return (
    <Layout role="admin">
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Command Center</h2>
        <p className="text-slate-500 font-medium mt-1">도장 운영 현황을 실시간으로 모니터링합니다.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
            <i className="fas fa-users text-8xl"></i>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Active Members</p>
          <div className="flex items-end space-x-2">
            <span className="text-5xl font-black text-slate-900 tracking-tighter italic">{stats.activeMembers}</span>
            <span className="text-slate-400 font-bold mb-2">명</span>
          </div>
          <div className="mt-6 flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 w-fit px-3 py-1 rounded-full uppercase tracking-wider">
            <i className="fas fa-arrow-up mr-1 text-[8px]"></i> 12% from last month
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl shadow-slate-900/20 relative overflow-hidden group transition-all duration-500">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <i className="fas fa-calendar-check text-8xl text-white"></i>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Today's Check-ins</p>
          <div className="flex items-end space-x-2">
            <span className="text-5xl font-black text-white tracking-tighter italic">{stats.todayAttendance}</span>
            <span className="text-slate-500 font-bold mb-2">회</span>
          </div>
          <div className="mt-6 flex items-center text-[10px] font-bold text-blue-400 bg-white/5 w-fit px-3 py-1 rounded-full uppercase tracking-wider">
            Peak time: 7:00 PM - 9:00 PM
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
            <i className="fas fa-receipt text-8xl"></i>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Monthly Ticket Sales</p>
          <div className="flex items-end space-x-2">
            <span className="text-5xl font-black text-slate-900 tracking-tighter italic">{stats.monthlyTickets}</span>
            <span className="text-slate-400 font-bold mb-2">회</span>
          </div>
          <div className="mt-6 flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 w-fit px-3 py-1 rounded-full uppercase tracking-wider">
            30 Days Rolling Window
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
        {/* Chart View */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[48px] shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 italic tracking-tight">Attendance Trend</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">최근 7일간의 출석 추이를 분석합니다.</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-2xl">
              <button className="px-6 py-2.5 bg-white shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900">Weekly</button>
              <button className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Monthly</button>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f172a" stopOpacity={1} />
                    <stop offset="100%" stopColor="#334155" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                  dy={20}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{payload[0].payload.fullDate}</p>
                          <p className="text-xl font-black text-white italic">{payload[0].value} <span className="text-xs not-italic text-slate-400">Check-ins</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[12, 12, 4, 4]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'url(#barGradient)' : '#f1f5f9'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Feed */}
        <div className="bg-white p-10 rounded-[48px] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-black text-slate-900 italic tracking-tight">Activity Feed</h3>
            <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
              <i className="fas fa-ellipsis-h"></i>
            </button>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto max-h-[400px] pr-4 custom-scrollbar">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 group">
                <div className={`w-12 h-12 shrink-0 rounded-2xl ${activity.bgCol} flex items-center justify-center ${activity.iconCol} transition-transform group-hover:scale-110 duration-300`}>
                  <i className={`fas ${activity.icon}`}></i>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-slate-900 truncate">{activity.title}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                      {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{activity.subtitle}</p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 text-slate-200">
                  <i className="fas fa-ghost text-2xl"></i>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No recent logs</p>
              </div>
            )}
          </div>
          <button className="w-full mt-10 py-4 rounded-2xl border-2 border-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all">
            View All Journals
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 10px; }
      `}</style>
    </Layout>
  );
};
