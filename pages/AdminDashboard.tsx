import React, { useMemo, useState } from 'react';
import { storageService } from '../services/storage';
import { Layout } from '../components/Layout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Member, AttendanceRecord, TicketHistory } from '../types';

export const AdminDashboard: React.FC = () => {
  const members = storageService.getMembers();
  const attendance = storageService.getAttendance();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const activeMembers = members.filter(m => m.status === 'active' && !m.id.startsWith('dummy-')).length;
    const dummyCount = members.filter(m => m.id.startsWith('dummy-')).length;
    const todayAttendance = attendance.filter(a => a.timestamp.startsWith(today)).length;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let monthlyTickets = 0;
    members.forEach(m => {
      m.ticketHistory?.forEach(h => {
        if (h.type === 'add' && new Date(h.date) >= thirtyDaysAgo) {
          monthlyTickets += h.amount;
        }
      });
    });

    return { activeMembers, dummyCount, todayAttendance, monthlyTickets };
  }, [members, attendance]);

  type TimeScale = '시간별' | '일별' | '주별' | '월별' | '년별' | '직접설정';
  const [timeScale, setTimeScale] = useState<TimeScale>('일별');
  const [customRangeInput, setCustomRangeInput] = useState({ start: '', end: '' });
  const [appliedCustomRange, setAppliedCustomRange] = useState({ start: '', end: '' });

  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'attendance' | 'ticket' | 'promotion' | 'registration'>('all');
  const [logDateInput, setLogDateInput] = useState({ start: '', end: '' });
  const [appliedLogDateRange, setAppliedLogDateRange] = useState({ start: '', end: '' });

  const formatDateInput = (value: string) => {
    const val = value.replace(/[^0-9]/g, '');
    if (val.length <= 4) return val;
    if (val.length <= 6) return `${val.slice(0, 4)}-${val.slice(4)}`;
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
  };

  const chartData = useMemo(() => {
    const now = new Date();

    if (timeScale === '시간별') {
      // Today 00:00 to 23:00
      return [...Array(24)].map((_, i) => {
        const d = new Date(now);
        d.setHours(i, 0, 0, 0);
        const nextH = new Date(d);
        nextH.setHours(i + 1);

        return {
          date: `${String(i).padStart(2, '0')}:00`,
          count: attendance.filter(a => {
            const t = new Date(a.timestamp);
            return t >= d && t < nextH;
          }).length,
          fullDate: d.toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        };
      });
    }

    if (timeScale === '일별') {
      // Last 14 days
      return [...Array(14)].map((_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        return {
          date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          count: attendance.filter(a => a.timestamp.startsWith(dateStr)).length,
          fullDate: dateStr
        };
      }).reverse();
    }

    if (timeScale === '주별') {
      // Last 12 weeks (Monday Start)
      return [...Array(12)].map((_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - i * 7);

        // Adjust to Monday
        const day = d.getDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        const start = new Date(d);
        start.setDate(d.getDate() - diffToMonday);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 7);

        return {
          date: `${start.getMonth() + 1}/${start.getDate()}~`,
          count: attendance.filter(a => {
            const t = new Date(a.timestamp);
            return t >= start && t < end;
          }).length,
          fullDate: `${start.toLocaleDateString()} - ${new Date(end.getTime() - 1).toLocaleDateString()}`
        };
      }).reverse();
    }

    if (timeScale === '월별') {
      // Last 12 months (Include Year)
      return [...Array(12)].map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM (Local)
        return {
          date: d.toLocaleDateString([], { month: 'short', year: '2-digit' }),
          count: attendance.filter(a => a.timestamp.startsWith(monthStr)).length,
          fullDate: d.toLocaleDateString([], { year: 'numeric', month: 'long' })
        };
      }).reverse();
    }

    if (timeScale === '년별') {
      // Last 5 years
      return [...Array(5)].map((_, i) => {
        const year = now.getFullYear() - i;
        return {
          date: `${year}`,
          count: attendance.filter(a => a.timestamp.startsWith(`${year}`)).length,
          fullDate: `${year}년 총합`
        };
      }).reverse();
    }

    if (timeScale === '직접설정' && appliedCustomRange.start && appliedCustomRange.end) {
      const start = new Date(appliedCustomRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(appliedCustomRange.end);
      end.setHours(23, 59, 59, 999);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Limit to max 60 days for visualization clarity
      const daysToShow = Math.min(diffDays + 1, 60);

      return [...Array(daysToShow)].map((_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        return {
          date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
          count: attendance.filter(a => a.timestamp.startsWith(dateStr)).length,
          fullDate: dateStr
        };
      });
    }

    return [];
  }, [attendance, timeScale, appliedCustomRange]);

  const allActivities = useMemo(() => {
    let activities: any[] = [];

    // Attendance activities
    attendance.forEach(a => {
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

    // Member related activities (registrations, promotions, tickets)
    members.forEach(m => {
      // Registration
      if (m.joinDate) {
        activities.push({
          id: `reg-${m.id}`,
          type: 'registration',
          title: m.name,
          subtitle: '신규 회원 등록',
          time: m.joinDate,
          icon: 'fa-user-plus',
          iconCol: 'text-blue-500',
          bgCol: 'bg-blue-50'
        });
      }

      // Promotions
      m.promotionHistory?.forEach((p, idx) => {
        if (p.note !== 'Initial Registration') {
          activities.push({
            id: `pro-${m.id}-${idx}`,
            type: 'promotion',
            title: m.name,
            subtitle: `${p.belt} 벨트 승급 (${p.stripes} 그랄)`,
            time: p.date,
            icon: 'fa-award',
            iconCol: 'text-indigo-500',
            bgCol: 'bg-indigo-50'
          });
        }
      });

      // Ticket History
      m.ticketHistory?.forEach(h => {
        // Skip ticket usages that are already tracked as 'attendance' to avoid redundancy
        if (h.note === '출석 체크') return;

        activities.push({
          id: `tic-${h.id}`,
          type: 'ticket',
          title: m.name,
          subtitle: h.note || (h.type === 'add' ? `수강권 ${h.amount}회 충전` : `수강권 ${h.amount}회 사용`),
          time: h.date,
          icon: h.type === 'add' ? 'fa-ticket-alt' : 'fa-minus-circle',
          iconCol: h.type === 'add' ? 'text-emerald-500' : 'text-blue-500',
          bgCol: h.type === 'add' ? 'bg-emerald-50' : 'bg-blue-50'
        });
      });
    });

    // Apply Filters
    if (logFilter !== 'all') {
      activities = activities.filter(a => a.type === logFilter);
    }

    if (appliedLogDateRange.start) {
      activities = activities.filter(a => new Date(a.time) >= new Date(appliedLogDateRange.start));
    }
    if (appliedLogDateRange.end) {
      const endDate = new Date(appliedLogDateRange.end);
      endDate.setHours(23, 59, 59, 999);
      activities = activities.filter(a => new Date(a.time) <= endDate);
    }

    if (appliedLogDateRange.start) {
      activities = activities.filter(a => new Date(a.time) >= new Date(appliedLogDateRange.start));
    }
    if (appliedLogDateRange.end) {
      const endDate = new Date(appliedLogDateRange.end);
      endDate.setHours(23, 59, 59, 999);
      activities = activities.filter(a => new Date(a.time) <= endDate);
    }


    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [members, attendance, logFilter, appliedLogDateRange]);

  const recentActivities = useMemo(() => allActivities.slice(0, 8), [allActivities]);

  return (
    <Layout role="admin">
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">대시보드</h2>
          <p className="text-slate-500 font-bold mt-1 tracking-tight">체육관의 주요 지표와 출석 현황입니다.</p>
        </div>
        <div className="hidden sm:flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">실시간 모니터링 중</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative group transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
              <i className="fas fa-users text-lg"></i>
            </div>
            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">이번 달 +2명</div>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">전체 관원</p>
          <div className="flex items-end space-x-2">
            <span className="text-5xl font-black text-slate-900 tracking-tighter italic">{stats.activeMembers + stats.dummyCount}</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative group transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
              <i className="fas fa-user-check text-lg"></i>
            </div>
            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">전체의 92%</div>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">활성 관원</p>
          <div className="flex items-end space-x-2">
            <span className="text-5xl font-black text-slate-900 tracking-tighter italic">{stats.activeMembers}</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative group transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
              <i className="fas fa-clock text-lg"></i>
            </div>
            <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest">실시간 업데이트</div>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">오늘 출석</p>
          <div className="flex items-end space-x-2">
            <span className="text-5xl font-black text-slate-900 tracking-tighter italic">{stats.todayAttendance}</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative group transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
              <i className="fas fa-exclamation-circle text-lg"></i>
            </div>
            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest">조치 필요</div>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">만료 예정</p>
          <div className="flex items-end space-x-2">
            <span className="text-5xl font-black text-slate-900 tracking-tighter italic">0</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Chart View */}
        <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[48px] shadow-sm border border-slate-100 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 italic tracking-tight uppercase">출석 추이 분석</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1 text-blue-500">최근 7일간의 출석 인원 변화입니다.</p>
            </div>
            <div className="flex flex-wrap bg-slate-50 p-2 rounded-[24px] gap-1 shadow-inner">
              {(['시간별', '일별', '주별', '월별', '년별', '직접설정'] as const).map(scale => (
                <button
                  key={scale}
                  onClick={() => setTimeScale(scale)}
                  className={`px-4 py-2.5 rounded-[18px] text-[10px] font-black transition-all active:scale-95 ${timeScale === scale ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-slate-900 hover:bg-white/50'}`}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>

          <div className={`overflow-hidden transition-all duration-500 ${timeScale === '직접설정' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
            <div className="flex items-center space-x-3 mb-8 animate-in slide-in-from-top-2 duration-500">
              <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    maxLength={10}
                    value={customRangeInput.start}
                    onChange={e => setCustomRangeInput(prev => ({ ...prev, start: formatDateInput(e.target.value) }))}
                    className="w-36 md:w-40 px-4 py-3 bg-transparent text-[11px] font-black focus:outline-none placeholder:text-slate-300"
                  />
                  <span className="absolute -top-2.5 left-2 px-1.5 bg-white text-[8px] font-black text-slate-400 uppercase border border-slate-50 rounded">Start</span>
                </div>
                <span className="text-slate-200 font-black px-1">~</span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    maxLength={10}
                    value={customRangeInput.end}
                    onChange={e => setCustomRangeInput(prev => ({ ...prev, end: formatDateInput(e.target.value) }))}
                    className="w-36 md:w-40 px-4 py-3 bg-transparent text-[11px] font-black focus:outline-none placeholder:text-slate-300"
                  />
                  <span className="absolute -top-2.5 left-2 px-1.5 bg-white text-[8px] font-black text-slate-400 uppercase border border-slate-50 rounded">End</span>
                </div>
                <button
                  onClick={() => setAppliedCustomRange({ ...customRangeInput })}
                  className="ml-2 bg-blue-600 text-white px-5 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-900/10 transition-all active:scale-95 shrink-0"
                >
                  조회하기
                </button>
              </div>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                  dy={15}
                  minTickGap={20}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                  width={40}
                />
                <Tooltip cursor={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '5 5' }} content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{payload[0].payload.fullDate}</p>
                        <p className="text-xl font-black text-slate-900 italic">{payload[0].value} <span className="text-xs not-italic text-slate-400">명 출석</span></p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white p-6 md:p-10 rounded-[48px] shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 italic tracking-tight uppercase">실시간 활동</h3>
            <button
              onClick={() => setIsJournalOpen(true)}
              className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
            >
              전체 로그 보기
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 group">
                <div className={`w-12 h-12 shrink-0 rounded-2xl ${activity.bgCol} flex items-center justify-center ${activity.iconCol} transition-transform group-hover:scale-110 duration-300 border border-slate-50`}>
                  <i className={`fas ${activity.icon} text-sm`}></i>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-black text-slate-900 truncate tracking-tighter">{activity.title}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                      {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium tracking-tight">{activity.subtitle}</p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                <i className="fas fa-ghost text-4xl mb-4"></i>
                <p className="text-[10px] font-bold uppercase tracking-widest">No activity today</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log Modal */}
      {isJournalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[56px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-white">
            <div className="px-8 md:px-12 py-8 border-b border-slate-100 bg-white sticky top-0 z-20">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">활동 기록 로그</h3>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mt-1">도장의 실시간 운영 이력을 확인합니다</p>
                </div>
                <button onClick={() => setIsJournalOpen(false)} className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-sm border border-slate-100">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-wrap gap-2 bg-slate-50 p-2 rounded-3xl shrink-0 border border-slate-100">
                  {[
                    { id: 'all', label: '전체' },
                    { id: 'attendance', label: '출석' },
                    { id: 'ticket', label: '수강권' },
                    { id: 'promotion', label: '승급' },
                    { id: 'registration', label: '회원등록' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setLogFilter(cat.id as any)}
                      className={`px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${logFilter === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD"
                        maxLength={10}
                        value={logDateInput.start}
                        onChange={e => setLogDateInput(prev => ({ ...prev, start: formatDateInput(e.target.value) }))}
                        className="w-32 px-3 py-2 bg-transparent text-[11px] font-black focus:outline-none placeholder:text-slate-300"
                      />
                      <span className="absolute -top-2 left-2 px-1 bg-white text-[7px] font-black text-slate-400 uppercase border border-slate-50 rounded">Start</span>
                    </div>
                    <span className="text-slate-200 font-black px-1">~</span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD"
                        maxLength={10}
                        value={logDateInput.end}
                        onChange={e => setLogDateInput(prev => ({ ...prev, end: formatDateInput(e.target.value) }))}
                        className="w-32 px-3 py-2 bg-transparent text-[11px] font-black focus:outline-none placeholder:text-slate-300"
                      />
                      <span className="absolute -top-2 left-2 px-1 bg-white text-[7px] font-black text-slate-400 uppercase border border-slate-50 rounded">End</span>
                    </div>
                    <button
                      onClick={() => setAppliedLogDateRange({ ...logDateInput })}
                      className="ml-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-md transition-all active:scale-90"
                    >
                      조회
                    </button>
                  </div>
                  {(appliedLogDateRange.start || appliedLogDateRange.end) && (
                    <button
                      onClick={() => {
                        setLogDateInput({ start: '', end: '' });
                        setAppliedLogDateRange({ start: '', end: '' });
                      }}
                      className="w-12 h-12 rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
                      title="날짜 필터 초기화"
                    >
                      <i className="fas fa-undo"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 bg-slate-50/20 custom-scrollbar">
              {Object.entries(
                allActivities.reduce((groups: any, activity) => {
                  const date = new Date(activity.time).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
                  if (!groups[date]) groups[date] = [];
                  groups[date].push(activity);
                  return groups;
                }, {})
              ).map(([date, activities]: [string, any]) => (
                <div key={date}>
                  <div className="flex items-center space-x-4 mb-8">
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600/60 whitespace-nowrap bg-white px-5 py-2 rounded-full shadow-sm">{date}</span>
                    <div className="h-px w-full bg-slate-100"></div>
                  </div>
                  <div className="space-y-4">
                    {activities.map((activity: any) => (
                      <div key={activity.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center space-x-6 group hover:shadow-xl transition-all active:scale-[0.98]">
                        <div className={`w-14 h-14 shrink-0 rounded-2xl ${activity.bgCol} flex items-center justify-center ${activity.iconCol} text-xl border border-white/50 backdrop-blur-sm`}>
                          <i className={`fas ${activity.icon}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors text-lg tracking-tight">{activity.title}</p>
                          <p className="text-xs text-slate-500 font-bold mt-1 tracking-tight">{activity.subtitle}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">
                            {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span className="inline-block px-3 py-1 bg-slate-50 text-[9px] font-black text-slate-400 rounded-full uppercase tracking-widest mt-2">{activity.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 10px; }
      `}</style>
    </Layout>
  );
};
