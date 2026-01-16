
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

    return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
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
      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">TIMELINE</h2>
        <p className="text-slate-500 font-bold mt-1 tracking-tight">전체 관원들의 출석 이력을 시간순으로 관리합니다.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl hover:shadow-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">오늘 출석</p>
              <p className="text-4xl font-black text-slate-900 italic leading-none">{stats.todayCount}<span className="text-sm not-italic text-slate-400 ml-2">건</span></p>
            </div>
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
              <i className="fas fa-calendar-day text-xl"></i>
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl hover:shadow-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">검색 결과</p>
              <p className="text-4xl font-black text-slate-900 italic leading-none">{stats.filteredCount}<span className="text-sm not-italic text-slate-400 ml-2">건</span></p>
            </div>
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
              <i className="fas fa-filter text-xl"></i>
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl hover:shadow-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">대상 관원</p>
              <p className="text-4xl font-black text-slate-900 italic leading-none">{stats.uniqueMembers}<span className="text-sm not-italic text-slate-400 ml-2">명</span></p>
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
              <i className="fas fa-users text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[48px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-20 border-b-8 border-b-blue-600/50">
        {/* Filter Bar */}
        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            {/* Left side: Buttons */}
            <div className="flex flex-wrap gap-2.5">
              {[
                { key: 'all', label: '전체 내역' },
                { key: 'today', label: '오늘 실시간' },
                { key: 'week', label: '최근 7일' },
                { key: 'month', label: '최근 30일' },
                { key: 'custom', label: '기간 직접 선택' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setDateFilter(f.key as DateFilter)}
                  className={`px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 border-b-4 ${dateFilter === f.key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/20 border-blue-800'
                    : 'bg-white text-slate-400 hover:bg-slate-50 border-slate-100 hover:text-blue-600'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Right side: Inputs (Custom Date + Search) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 xl:justify-end">
              <div className={`flex items-center gap-2 overflow-hidden transition-all duration-500 ${dateFilter === 'custom' ? 'max-w-[500px] opacity-100' : 'max-w-0 opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-2 shrink-0 px-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      maxLength={10}
                      value={customStartDate}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 4) setCustomStartDate(val);
                        else if (val.length <= 6) setCustomStartDate(`${val.slice(0, 4)}-${val.slice(4)}`);
                        else setCustomStartDate(`${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`);
                      }}
                      className="w-full sm:w-36 px-4 py-3.5 rounded-2xl border-2 border-slate-50 bg-white text-xs font-black focus:border-blue-500 focus:outline-none shadow-sm"
                    />
                    <span className="absolute -top-2 left-3 px-1 bg-white text-[8px] font-black text-slate-300 uppercase rounded">From</span>
                  </div>
                  <span className="text-slate-200 font-black">~</span>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      maxLength={10}
                      value={customEndDate}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 4) setCustomEndDate(val);
                        else if (val.length <= 6) setCustomEndDate(`${val.slice(0, 4)}-${val.slice(4)}`);
                        else setCustomEndDate(`${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`);
                      }}
                      className="w-full sm:w-36 px-4 py-3.5 rounded-2xl border-2 border-slate-50 bg-white text-xs font-black focus:border-blue-500 focus:outline-none shadow-sm"
                    />
                    <span className="absolute -top-2 left-3 px-1 bg-white text-[8px] font-black text-slate-300 uppercase rounded">To</span>
                  </div>
                </div>
              </div>

              <div className="relative flex-1 sm:flex-none">
                <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                <input
                  type="text"
                  placeholder="관원 이름으로 검색..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full sm:w-72 pl-12 pr-5 py-4 rounded-[24px] border-2 border-slate-50 bg-white focus:outline-none focus:border-blue-500 transition-all font-bold text-sm placeholder:text-slate-200 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden min-w-full">
          {/* Desktop Table View */}
          <table className="w-full text-left hidden md:table">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">출석 일시</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">관원 정보</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">상태</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAttendance.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex flex-col">
                      <span className="text-base font-black text-slate-900 leading-none mb-2">
                        {new Date(record.timestamp).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 w-fit px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                        <i className="far fa-clock mr-1.5"></i>
                        {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <div className="flex items-center space-x-5">
                      <div className="w-14 h-14 rounded-2xl bg-white text-slate-300 flex items-center justify-center font-black italic shadow-sm border border-slate-100">
                        <i className="fas fa-user text-lg opacity-50"></i>
                      </div>
                      <span className="font-black text-slate-900 text-xl tracking-tight leading-none group-hover:text-blue-600 transition-colors">{record.memberName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <span className="inline-flex items-center space-x-2.5 px-5 py-2 rounded-2xl text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      <span>출석 확인됨</span>
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button
                      onClick={() => setDeleteModal({ open: true, record })}
                      className="w-12 h-12 rounded-2xl bg-white text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90 flex items-center justify-center shadow-sm border border-slate-100"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 divide-y divide-slate-100 md:hidden bg-white">
            {filteredAttendance.map((record) => (
              <div key={record.id} className="p-8 flex items-center justify-between group active:bg-blue-50 transition-all">
                <div className="flex items-center space-x-5">
                  <div className="flex flex-col items-center justify-center w-14 h-16 bg-[#0f172a] rounded-[24px] text-white shadow-xl shadow-slate-900/10 border-2 border-slate-800/20">
                    <span className="text-[10px] font-black uppercase opacity-50 mb-1">{new Date(record.timestamp).toLocaleDateString([], { month: 'short' })}</span>
                    <span className="text-2xl font-black italic leading-none">{new Date(record.timestamp).getDate()}</span>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-xl tracking-tight leading-none mb-2">{record.memberName}</p>
                    <p className="text-[11px] text-blue-600 font-bold uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-lg w-fit">
                      <i className="far fa-clock mr-1.5"></i>
                      {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteModal({ open: true, record })}
                  className="w-14 h-14 rounded-[24px] bg-white border-2 border-slate-50 text-slate-300 active:bg-red-500 active:text-white transition-all flex items-center justify-center shadow-sm"
                >
                  <i className="fas fa-trash-alt text-lg"></i>
                </button>
              </div>
            ))}
          </div>

          {filteredAttendance.length === 0 && (
            <div className="py-32 text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
              <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-8 text-slate-200 text-4xl shadow-inner">
                <i className="fas fa-ghost"></i>
              </div>
              <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-xs">
                검색 결과가 없습니다
              </p>
              <p className="text-slate-200 text-[10px] font-bold mt-2 uppercase tracking-widest">필터를 변경하거나 다른 이름으로 검색하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {
        deleteModal.open && deleteModal.record && (
          <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[56px] shadow-2xl p-10 md:p-12 animate-in zoom-in-95 duration-300 border-4 border-white">
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-red-500 text-3xl shadow-inner">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900 italic mb-3 uppercase tracking-tighter">출결 기록 삭제</h3>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  <span className="font-black text-[#0f172a] underline decoration-red-200 decoration-4 underline-offset-4">{deleteModal.record.memberName}</span> 관원님의<br />
                  출석 데이터를 삭제하시겠습니까?
                </p>
                <p className="text-[11px] text-slate-400 font-bold mt-4 uppercase">
                  {new Date(deleteModal.record.timestamp).toLocaleDateString()} {new Date(deleteModal.record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="bg-slate-50 rounded-[40px] p-8 mb-10 border border-slate-100 shadow-inner">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-lg leading-tight">수강권 자동 복구</p>
                    <p className="text-[12px] text-blue-600 font-bold mt-1">삭제와 동시에 차감된 수강권을 다시 채웁니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRefundTicket(!refundTicket)}
                    className={`w-16 h-10 rounded-full transition-all relative flex-shrink-0 active:scale-95 ${refundTicket ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-200'}`}
                  >
                    <span className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-md transition-all ${refundTicket ? 'left-7' : 'left-1'}`}></span>
                  </button>
                </label>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleDelete}
                  className="w-full py-5 rounded-2xl font-black text-white bg-red-500 hover:bg-red-600 transition-all shadow-xl shadow-red-900/20 active:scale-95 border-b-4 border-red-700 flex items-center justify-center"
                >
                  <i className="fas fa-trash-alt mr-2"></i>기록 삭제하기
                </button>
                <button
                  onClick={() => { setDeleteModal({ open: false, record: null }); setRefundTicket(true); }}
                  className="w-full py-5 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95"
                >
                  아니오, 돌아가기
                </button>
              </div>
            </div>
          </div>
        )
      }
    </Layout >
  );
};
