
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storage';
import { Layout } from '../components/Layout';
import { Member } from '../types';

export const MyProfile: React.FC = () => {
  const navigate = useNavigate();
  const [currentMember, setCurrentMember] = useState<Member | null>(storageService.getCurrentMember());
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [loginError, setLoginError] = useState('');
  const [multipleMatches, setMultipleMatches] = useState<Member[]>([]);

  const handleKeyPress = (num: string) => {
    if (phoneSuffix.length < 4) {
      const nextSuffix = phoneSuffix + num;
      setPhoneSuffix(nextSuffix);
      
      if (nextSuffix.length === 4) {
        attemptLogin(nextSuffix);
      }
    }
  };

  const handleAction = (type: 'CLR' | 'DEL') => {
    if (type === 'CLR') {
      setPhoneSuffix('');
      setMultipleMatches([]);
    }
    if (type === 'DEL') {
      setPhoneSuffix(phoneSuffix.slice(0, -1));
      setMultipleMatches([]);
    }
    setLoginError('');
  };

  const attemptLogin = (suffix: string) => {
    const matches = storageService.getMembersByPhoneSuffix(suffix);
    if (matches.length === 1) {
      completeLogin(matches[0]);
    } else if (matches.length > 1) {
      setMultipleMatches(matches);
      setLoginError('');
    } else {
      setLoginError('일치하는 회원 정보가 없습니다.');
      setPhoneSuffix('');
    }
  };

  const completeLogin = (member: Member) => {
    storageService.setCurrentMember(member.id);
    setCurrentMember(member);
    setLoginError('');
    setMultipleMatches([]);
  };

  const handleLogout = () => {
    storageService.logoutMember();
    setCurrentMember(null);
    setPhoneSuffix('');
  };

  // If not logged in, show login screen with Keypad
  if (!currentMember) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 pb-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
             <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-lg shadow-emerald-500/20">
               <i className="fas fa-user-check"></i>
             </div>
             <h2 className="text-3xl font-black italic tracking-tighter">MEMBER ACCESS</h2>
             <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest">내 정보를 조회하세요</p>
          </div>

          <div className="bg-white rounded-[40px] shadow-xl p-8 border border-slate-100">
            {multipleMatches.length > 0 ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 text-center">
                  <h3 className="text-xl font-black italic">CHOOSE YOURSELF</h3>
                  <p className="text-xs text-slate-400 mt-1 font-bold">동일한 번호의 관원이 여러 명 있습니다.</p>
                </div>
                <div className="space-y-3 mb-6 max-h-[250px] overflow-y-auto px-1">
                  {multipleMatches.map(m => (
                    <button 
                      key={m.id}
                      onClick={() => completeLogin(m)}
                      className="w-full p-5 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-2xl flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg font-black text-emerald-600 shadow-sm">
                          {m.name[0]}
                        </div>
                        <div className="text-left">
                           <p className="font-black text-slate-900">{m.name}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Joined: {m.joinDate}</p>
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-slate-200 group-hover:text-emerald-400 transition-colors"></i>
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => handleAction('CLR')}
                  className="w-full py-4 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-900"
                >
                  다시 입력하기
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-center space-x-3 mb-8">
                  {[0, 1, 2, 3].map(i => (
                    <div 
                      key={i} 
                      className={`w-14 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl font-black transition-all duration-200 
                        ${phoneSuffix[i] 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-lg shadow-emerald-500/10 scale-105' 
                          : 'border-slate-100 bg-slate-50 text-transparent'
                        }`}
                    >
                      {phoneSuffix[i] || '•'}
                    </div>
                  ))}
                </div>

                {loginError && (
                  <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold text-center border border-red-100 animate-in shake duration-300">
                    {loginError}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === 'CLR') handleAction('CLR');
                        else if (key === 'DEL') handleAction('DEL');
                        else handleKeyPress(key);
                      }}
                      className={`h-16 md:h-20 rounded-2xl text-xl font-black flex items-center justify-center transition-all active:scale-95
                        ${key === 'CLR' || key === 'DEL' 
                          ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' 
                          : 'bg-slate-900 text-white hover:bg-black active:bg-emerald-600 shadow-lg shadow-slate-900/5'
                        }
                      `}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button 
            onClick={() => navigate('/')}
            className="w-full mt-8 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-900 flex items-center justify-center space-x-2 py-4"
          >
            <i className="fas fa-arrow-left"></i>
            <span>역할 선택으로 돌아가기</span>
          </button>
        </div>
      </div>
    );
  }

  const allAttendance = storageService.getAttendance();
  const myAttendance = allAttendance.filter(a => a.memberId === currentMember.id);
  const remainingPercent = (currentMember.remainingTickets / currentMember.totalTickets) * 100;

  return (
    <Layout role="member">
      <div className="md:max-w-md mx-auto space-y-6 pb-32">
        <div className="bg-slate-900 text-white rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full -mr-20 -mt-20"></div>
          
          <div className="flex items-center space-x-5 mb-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-2xl font-black shadow-lg shadow-emerald-500/30 overflow-hidden">
               {currentMember.faceImages.length > 0 ? (
                 <img src={currentMember.faceImages[0]} className="w-full h-full object-cover" />
               ) : currentMember.name[0]}
            </div>
            <div>
              <h2 className="text-2xl font-black italic">{currentMember.name}</h2>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-400 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                Active Member
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <span className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">Tickets Left</span>
              <span className="text-5xl font-black italic tracking-tighter">
                {currentMember.remainingTickets} 
                <span className="text-lg text-slate-500 font-medium not-italic ml-2">/ {currentMember.totalTickets}</span>
              </span>
            </div>
            <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${currentMember.remainingTickets <= 2 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`} 
                style={{ width: `${remainingPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <i className="fas fa-calendar-check"></i>
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Attended</p>
            <p className="text-2xl font-black italic">{myAttendance.length} <span className="text-xs text-slate-400 font-medium not-italic">Times</span></p>
          </div>
          <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
              <i className="fas fa-face-viewfinder"></i>
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Face ID</p>
            <p className="text-2xl font-black italic">{currentMember.faceImages.length} <span className="text-xs text-slate-400 font-medium not-italic">Samples</span></p>
          </div>
        </div>

        <div className="bg-white rounded-[30px] shadow-sm border border-slate-100 p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black italic uppercase tracking-tight">Recent Activity</h3>
            <button className="text-xs text-blue-600 font-bold">전체보기</button>
          </div>
          <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
            {myAttendance.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-start space-x-6 relative">
                <div className="w-10 h-10 bg-white rounded-full border-4 border-slate-50 flex items-center justify-center text-xs text-slate-300 z-10">
                   <i className="fas fa-circle text-[8px]"></i>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-black text-slate-900">{new Date(a.timestamp).toLocaleDateString()}</p>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Normal</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 수강권 차감</p>
                </div>
              </div>
            ))}
            {myAttendance.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm text-slate-400">활동 기록이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-white border border-slate-200 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
        >
          로그아웃
        </button>
      </div>
    </Layout>
  );
};
