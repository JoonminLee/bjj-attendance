
import React, { useState, useMemo } from 'react';
import { storageService } from '../services/storage';
import { Layout } from '../components/Layout';
import { AttendanceRecord } from '../types';

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

export const AttendanceList: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(storageService.getAttendance());
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; record: AttendanceRecord | null }>({ open: false, record: null });
  const [refundTicket, setRefundTicket] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const handleDelete = () => {
    if (!deleteModal.record) return;

    try {
      storageService.deleteAttendance(deleteModal.record.id, refundTicket);
      setAttendance(storageService.getAttendance());
      setDeleteModal({ open: false, record: null });
      setRefundTicket(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered attendance
  const filteredAttendance = useMemo(() => {
    let result = [...attendance];

    // Date filter
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    switch (dateFilter) {
      case 'today':
        result = result.filter(a => a.timestamp.startsWith(today));
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        result = result.filter(a => new Date(a.timestamp) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        result = result.filter(a => new Date(a.timestamp) >= monthAgo);
        break;
      case 'custom':
        if (customStartDate) {
          result = result.filter(a => a.timestamp >= customStartDate);
        }
        if (customEndDate) {
          result = result.filter(a => a.timestamp.split('T')[0] <= customEndDate);
        }
        break;
    }

    // Search filter
    if (searchTerm) {
      result = result.filter(a => a.memberName.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return result;
  }, [attendance, dateFilter, searchTerm, customStartDate, customEndDate]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = attendance.filter(a => a.timestamp.startsWith(today)).length;

    const uniqueMembers = new Set(filteredAttendance.map(a => a.memberId)).size;

    return { todayCount, filteredCount: filteredAttendance.length, uniqueMembers };
  }, [attendance, filteredAttendance]);

  return (
    <Layout role="admin">
      <div className="mb-8 animate-in fade-in duration-500">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Timeline</h2>
        <p className="text-slate-500 font-medium mt-1">전체 관원들의 출석 이력을 시간순으로 확인합니다.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">오늘 출석</p>
              <p className="text-3xl font-black text-slate-900 italic">{stats.todayCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-500">
              <i className="fas fa-calendar-day"></i>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">조회 결과</p>
              <p className="text-3xl font-black text-slate-900 italic">{stats.filteredCount}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-500">
              <i className="fas fa-filter"></i>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">관원 수</p>
              <p className="text-3xl font-black text-slate-900 italic">{stats.uniqueMembers}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-500">
              <i className="fas fa-users"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden mb-20">
        {/* Filter Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: '전체' },
                { key: 'today', label: '오늘' },
                { key: 'week', label: '7일' },
                { key: 'month', label: '30일' },
                { key: 'custom', label: '기간 선택' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setDateFilter(f.key as DateFilter)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${dateFilter === f.key
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold"
                  />
                </div>
              )}
              <div className="relative flex-1 lg:flex-initial">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input
                  type="text"
                  placeholder="회원 검색..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full lg:w-64 pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden min-w-full">
          {/* Desktop Table View */}
          <table className="w-full text-left hidden md:table">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Check-in Time</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Member Info</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttendance.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-7">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 leading-none">
                        {new Date(record.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 bg-slate-100 w-fit px-2 py-0.5 rounded">
                        {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-7">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black italic shadow-lg shadow-slate-900/10">
                        {record.memberName[0]}
                      </div>
                      <span className="font-black text-slate-900 text-lg tracking-tight">{record.memberName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-7">
                    <span className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-2xl text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Verified</span>
                    </span>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <button
                      onClick={() => setDeleteModal({ open: true, record })}
                      className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white transition-all active:scale-90 flex items-center justify-center lg:opacity-0 group-hover:opacity-100 shadow-sm"
                      title="Delete Record"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 divide-y divide-slate-100 md:hidden">
            {filteredAttendance.map((record) => (
              <div key={record.id} className="p-6 flex items-center justify-between group active:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-center justify-center w-12 h-14 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-900/10">
                    <span className="text-[9px] font-black uppercase opacity-60 leading-none mb-1">{new Date(record.timestamp).toLocaleDateString([], { month: 'short' })}</span>
                    <span className="text-xl font-black italic leading-none">{new Date(record.timestamp).getDate()}</span>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-lg tracking-tight leading-none mb-1">{record.memberName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteModal({ open: true, record })}
                  className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 active:bg-red-500 active:text-white transition-all flex items-center justify-center"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            ))}
          </div>

          {filteredAttendance.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-[28px] flex items-center justify-center mb-6 text-slate-200 text-3xl">
                <i className="fas fa-ghost"></i>
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                No activity records found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.record && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500 text-2xl">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 italic mb-2">출결 기록 삭제</h3>
              <p className="text-slate-500 text-sm">
                <span className="font-black text-slate-900">{deleteModal.record.memberName}</span>님의<br />
                {new Date(deleteModal.record.timestamp).toLocaleDateString()} {new Date(deleteModal.record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 출결을 삭제합니다.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 mb-8">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-bold text-slate-900">수강권 복구</p>
                  <p className="text-xs text-slate-500">삭제와 함께 1회 수강권을 복구합니다</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRefundTicket(!refundTicket)}
                  className={`w-14 h-8 rounded-full transition-colors relative ${refundTicket ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${refundTicket ? 'left-7' : 'left-1'}`}></span>
                </button>
              </label>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => { setDeleteModal({ open: false, record: null }); setRefundTicket(true); }}
                className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-4 rounded-2xl font-black text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
