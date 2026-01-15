
import React from 'react';
import { storageService } from '../services/storage';
import { Layout } from '../components/Layout';

export const AttendanceList: React.FC = () => {
  const attendance = storageService.getAttendance();

  return (
    <Layout role="admin">
      <div className="mb-10 animate-in fade-in duration-500">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Timeline</h2>
        <p className="text-slate-500 font-medium mt-1">전체 관원들의 출석 이력을 시간순으로 확인합니다.</p>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden mb-20">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Check-in Time</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Member Info</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-7">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900">
                        {new Date(record.timestamp).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-7">
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black italic shadow-md">
                          {record.memberName[0]}
                       </div>
                       <span className="font-black text-slate-900 text-lg tracking-tight">{record.memberName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-7">
                    <div className="flex items-center space-x-2">
                       <i className="fas fa-ticket text-slate-300 text-xs"></i>
                       <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Single Session Pass</span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <span className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-2xl text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Verified</span>
                    </span>
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-40 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-slate-200 text-3xl">
                       <i className="fas fa-clipboard-question"></i>
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No activity records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};
