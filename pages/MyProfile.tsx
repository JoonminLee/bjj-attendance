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
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  // --- Login Logic (Same as before) ---
  const handleKeyPress = (num: string) => {
    if (phoneSuffix.length < 4) {
      const nextSuffix = phoneSuffix + num;
      setPhoneSuffix(nextSuffix);
      if (nextSuffix.length === 4) attemptLogin(nextSuffix);
    }
  };

  const handleAction = (type: 'CLR' | 'DEL') => {
    if (type === 'CLR') { setPhoneSuffix(''); setMultipleMatches([]); }
    if (type === 'DEL') { setPhoneSuffix(phoneSuffix.slice(0, -1)); setMultipleMatches([]); }
    setLoginError('');
  };

  const attemptLogin = (suffix: string) => {
    const matches = storageService.getMembersByPhoneSuffix(suffix);
    if (matches.length === 1) completeLogin(matches[0]);
    else if (matches.length > 1) { setMultipleMatches(matches); setLoginError(''); }
    else { setLoginError('일치하는 회원 정보가 없습니다.'); setPhoneSuffix(''); }
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

  // --- Helper Functions for UI ---
  const getBeltColor = (belt: string) => {
    switch (belt) {
      case 'Blue': return { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', shadow: 'shadow-blue-500/30' };
      case 'Purple': return { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', shadow: 'shadow-purple-500/30' };
      case 'Brown': return { bg: 'bg-amber-800', text: 'text-amber-800', border: 'border-amber-800', shadow: 'shadow-amber-900/30' };
      case 'Black': return { bg: 'bg-slate-900', text: 'text-slate-900', border: 'border-slate-900', shadow: 'shadow-slate-900/30' };
      default: return { bg: 'bg-slate-200', text: 'text-slate-500', border: 'border-slate-300', shadow: 'shadow-slate-300/30' }; // White
    }
  };

  // --- Login Screen ---
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
                <div className="space-y-3 mb-6 max-h-[250px] overflow-y-auto px-1 custom-scrollbar">
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

  // --- Dashboard Logic ---
  const allAttendance = storageService.getAttendance();
  const myAttendance = allAttendance.filter(a => a.memberId === currentMember.id);
  const totalTrainingHours = myAttendance.length * 1.5; // Assuming 1.5 hours per session
  const beltColors = getBeltColor(currentMember.belt || 'White');

  return (
    <Layout role="member">
      <div className="md:max-w-md mx-auto space-y-6 pb-32">
        
        {/* Profile Card */}
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-32 h-32 ${beltColors.bg} opacity-10 blur-3xl rounded-full -mr-10 -mt-10`}></div>
          
          <div className="flex items-center space-x-5 mb-8 relative z-10">
            <div className={`w-20 h-20 rounded-3xl ${beltColors.bg} flex items-center justify-center text-3xl font-black text-white ${beltColors.shadow} shadow-lg overflow-hidden border-4 border-white`}>
               {currentMember.faceImages && currentMember.faceImages.length > 0 ? (
                 <img src={currentMember.faceImages[0]} className="w-full h-full object-cover" />
               ) : (
                 <span>{currentMember.name[0]}</span>
               )}
            </div>
            <div>
              <h2 className="text-3xl font-black italic text-slate-900">{currentMember.name}</h2>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-2 bg-slate-100 ${beltColors.text}`}>
                {currentMember.belt || 'White'} Belt
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Classes</p>
                <p className="text-2xl font-black text-slate-900 italic">{myAttendance.length}</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Mat Time</p>
                <p className="text-2xl font-black text-slate-900 italic">{totalTrainingHours} <span className="text-sm text-slate-400 not-italic">hrs</span></p>
             </div>
          </div>
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
           {/* Tickets Card */}
           <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-lg shadow-slate-900/10 flex flex-col justify-between h-40 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <div>
                <i className="fas fa-ticket text-slate-500 text-xl mb-2"></i>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Remaining</p>
              </div>
              <div>
                <p className="text-4xl font-black italic tracking-tighter">{currentMember.remainingTickets}</p>
                <p className="text-[10px] text-slate-500 font-medium">out of {currentMember.totalTickets} tickets</p>
              </div>
           </div>

           {/* Face ID Card */}
           <button 
             onClick={() => setIsFaceModalOpen(true)}
             className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between h-40 relative overflow-hidden group hover:border-blue-200 transition-colors text-left"
           >
              <div className="absolute right-3 top-3 w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-xs">
                <i className="fas fa-expand"></i>
              </div>
              <div>
                <i className="fas fa-fingerprint text-blue-500 text-xl mb-2"></i>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Security</p>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 leading-tight">Biometric<br/>Data</p>
                <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center">
                  <i className="fas fa-check-circle mr-1"></i> Registered
                </p>
              </div>
           </button>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black italic uppercase tracking-tight text-slate-900">Training Log</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Recent 10</span>
          </div>
          
          <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
            {myAttendance.slice(0, 10).map((a, idx) => (
              <div key={a.id} className="flex items-start space-x-6 relative group">
                <div className={`w-10 h-10 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110 ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                   {idx === 0 ? <i className="fas fa-check text-xs"></i> : <i className="fas fa-circle text-[6px]"></i>}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-black text-slate-900">{new Date(a.timestamp).toLocaleDateString()}</p>
                    <span className="text-[10px] font-bold text-slate-400">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Regular Class Check-in</p>
                </div>
              </div>
            ))}
            {myAttendance.length === 0 && (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <i className="fas fa-calendar-times text-2xl"></i>
                </div>
                <p className="text-sm text-slate-400 font-medium">아직 운동 기록이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-slate-100 text-slate-500 py-5 rounded-[28px] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 mb-10"
        >
          Logout
        </button>
      </div>

      {/* Face Image Modal */}
      {isFaceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setIsFaceModalOpen(false)}>
          <div className="bg-white p-2 rounded-[32px] max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="relative aspect-[3/4] bg-black rounded-[28px] overflow-hidden">
              {currentMember.faceImages && currentMember.faceImages.length > 0 ? (
                <img src={currentMember.faceImages[0]} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <i className="fas fa-user-slash text-4xl"></i>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white font-black text-lg">My Biometric Data</p>
                <p className="text-slate-300 text-xs mt-1">이 이미지는 출석 체크 시 본인 확인 용도로만 사용됩니다.</p>
              </div>
            </div>
            <button 
              onClick={() => setIsFaceModalOpen(false)}
              className="w-full py-4 text-slate-900 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 rounded-b-[28px] mt-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};