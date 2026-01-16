
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

  // --- Login Logic ---
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

  const getBeltColor = (belt: string) => {
    switch (belt) {
      case 'Blue': return { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', shadow: 'shadow-blue-500/30' };
      case 'Purple': return { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', shadow: 'shadow-purple-500/30' };
      case 'Brown': return { bg: 'bg-amber-800', text: 'text-amber-800', border: 'border-amber-800', shadow: 'shadow-amber-900/30' };
      case 'Black': return { bg: 'bg-slate-900', text: 'text-slate-900', border: 'border-slate-900', shadow: 'shadow-slate-900/30' };
      default: return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', shadow: 'shadow-blue-900/5' };
    }
  };

  // --- Login Screen (Matches Kiosk UI exactly) ---
  if (!currentMember) {
    const isSelecting = multipleMatches.length > 0;
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 selection:bg-blue-500/20">
        <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-xl ${isSelecting ? 'bg-blue-600' : 'bg-[#059669]'}`}>
              <i className={`fas ${isSelecting ? 'fa-users' : 'fa-user-check'}`}></i>
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#0f172a] mb-2 uppercase">
              {isSelecting ? 'WHO ARE YOU?' : 'MEMBER ACCESS'}
            </h1>
            <p className="text-slate-400 font-bold text-sm">
              {isSelecting ? '일치하는 관원이 여러 명입니다. 본인을 선택해 주세요.' : '휴대폰 번호 뒷자리 4자리를 입력하세요'}
            </p>
          </div>

          <div className="bg-white p-10 rounded-[56px] shadow-2xl shadow-slate-200 border border-slate-100">
            {isSelecting ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {multipleMatches.map(m => (
                  <button
                    key={m.id}
                    onClick={() => completeLogin(m)}
                    className="w-full p-6 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-[32px] flex items-center justify-between transition-all active:scale-95 group border-2 border-transparent hover:border-blue-400"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl group-hover:scale-110 transition-transform shadow-sm">
                        {m.name[0]}
                      </div>
                      <div className="text-left font-black">
                        <p className="text-lg leading-none">{m.name} 관원님</p>
                        <p className="text-[10px] uppercase opacity-50 mt-1">{m.belt} 벨트 • {m.stripes} 그랄</p>
                      </div>
                    </div>
                    <i className="fas fa-chevron-right opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all"></i>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex justify-center space-x-3 mb-12">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`w-14 h-20 rounded-2xl flex items-center justify-center text-3xl font-black transition-all ${phoneSuffix[i] ? 'bg-white border-2 border-blue-600 text-slate-800 shadow-lg shadow-blue-500/10' : 'bg-slate-50 border-2 border-slate-100 text-transparent'}`}>
                      {phoneSuffix[i] || ''}
                    </div>
                  ))}
                </div>

                {loginError && (
                  <div className="mb-8 p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-black text-center border border-red-100 animate-in shake duration-500">
                    <i className="fas fa-exclamation-triangle mr-2"></i>{loginError}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => handleKeyPress(num.toString())}
                      className="h-20 bg-[#0f172a] text-white rounded-[24px] text-2xl font-black hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => handleAction('CLR')}
                    className="h-20 bg-slate-50 text-slate-400 rounded-[24px] text-lg font-black hover:bg-slate-100 transition-all"
                  >
                    CLR
                  </button>
                  <button
                    onClick={() => handleKeyPress('0')}
                    className="h-20 bg-[#0f172a] text-white rounded-[24px] text-2xl font-black hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
                  >
                    0
                  </button>
                  <button
                    onClick={() => handleAction('DEL')}
                    className="h-20 bg-slate-50 text-slate-400 rounded-[24px] text-lg font-black hover:bg-slate-100 transition-all"
                  >
                    <i className="fas fa-backspace"></i>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => isSelecting ? handleAction('CLR') : navigate('/')}
            className="w-full mt-10 text-slate-400 font-bold flex items-center justify-center space-x-3 hover:text-slate-600 transition-colors uppercase text-xs tracking-widest"
          >
            <i className={`fas ${isSelecting ? 'fa-arrow-left' : 'fa-house-user'} text-xs`}></i>
            <span>{isSelecting ? '번호 다시 입력하기' : 'Home Screen'}</span>
          </button>
        </div>
      </div>
    );
  }

  const myAttendance = storageService.getAttendance().filter(a => a.memberId === currentMember.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const beltColors = getBeltColor(currentMember.belt || 'White');

  return (
    <Layout role="member">
      <div className="md:max-w-lg mx-auto space-y-8 pb-40 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Profile Card */}
        <div className="bg-white rounded-[56px] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-48 h-48 ${beltColors.bg} opacity-5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-1000`}></div>
          <div className="flex flex-col items-center mb-10 relative z-10">
            <div className={`w-32 h-32 rounded-[48px] ${beltColors.bg} flex items-center justify-center text-5xl font-black text-white ${beltColors.shadow} shadow-2xl overflow-hidden border-[10px] border-white group-hover:scale-105 transition-transform duration-500`}>
              {currentMember.faceImages && currentMember.faceImages.length > 0 ? (
                <img src={currentMember.faceImages[0]} className="w-full h-full object-cover" />
              ) : (
                <span className="italic">{currentMember.name[0]}</span>
              )}
            </div>
            <div className="mt-6 text-center">
              <h2 className="text-4xl font-black italic text-slate-900 tracking-tighter uppercase leading-none">{currentMember.name}</h2>
              <div className={`inline-flex items-center px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] mt-4 bg-slate-50 ${beltColors.text} border border-slate-100 shadow-sm`}>
                <span className={`w-2 h-2 rounded-full ${beltColors.bg} mr-2.5 shadow-lg`}></span>
                {currentMember.belt || 'White'} Belt • {currentMember.stripes} Stripes
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 font-black text-center">
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 transition-all hover:bg-white hover:shadow-lg">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">Total Classes</p>
              <p className="text-3xl text-slate-900 italic leading-none">{myAttendance.length}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 transition-all hover:bg-white hover:shadow-lg">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">Mat Time</p>
              <p className="text-3xl text-slate-900 italic leading-none">{myAttendance.length * 1.5}<span className="text-xs ml-1 opacity-20">HRS</span></p>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-[#0f172a] text-white p-10 rounded-[48px] shadow-2xl flex flex-col justify-between h-64 relative overflow-hidden group font-black">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-600 opacity-20 blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-1000"></div>
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/10 text-blue-400">
                <i className="fas fa-ticket text-xl"></i>
              </div>
              <p className="text-[11px] text-blue-400/50 uppercase tracking-widest">Remaining Pass</p>
            </div>
            <div>
              <p className="text-6xl italic tracking-tighter text-glow-blue">{currentMember.remainingTickets}</p>
              <div className="flex items-center mt-4 space-x-2">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (currentMember.remainingTickets / (currentMember.totalTickets || 1)) * 100)}%` }}></div>
                </div>
                <span className="text-[10px] text-white/30 truncate">TOTAL {currentMember.totalTickets}</span>
              </div>
            </div>
          </div>

          <button onClick={() => setIsFaceModalOpen(true)} className="bg-white p-10 rounded-[48px] shadow-xl shadow-slate-200 border border-slate-100 flex flex-col justify-between h-64 relative overflow-hidden group hover:border-blue-200 transition-all text-left font-black">
            <div className="absolute right-6 top-6 w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
              <i className="fas fa-face-viewfinder"></i>
            </div>
            <div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-emerald-600">
                <i className="fas fa-shield-halved text-xl"></i>
              </div>
              <p className="text-[11px] text-slate-300 uppercase tracking-widest">Security ID</p>
            </div>
            <div>
              <p className="text-2xl text-[#0f172a] leading-tight">Biometric<br /><span className="text-blue-600 italic">Face Scan</span></p>
              <p className="text-[10px] text-blue-400 mt-3 flex items-center uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse"></span>Cloud Synced
              </p>
            </div>
          </button>
        </div>

        {/* Training Log */}
        <div className="bg-white rounded-[56px] shadow-xl shadow-slate-200 border border-slate-100 p-10 font-black">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[#0f172a]">Training Log</h3>
            <span className="text-[10px] text-blue-500 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 uppercase tracking-widest italic">RECENT 10</span>
          </div>

          <div className="space-y-10 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-[4px] before:bg-slate-50 before:rounded-full">
            {myAttendance.slice(0, 10).map((a, idx) => (
              <div key={a.id} className="flex items-start space-x-8 relative group">
                <div className={`w-12 h-12 rounded-2xl border-4 border-white flex items-center justify-center z-10 shadow-lg transition-all duration-500 group-hover:scale-110 ${idx === 0 ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'bg-slate-50 text-slate-300 shadow-sm'}`}>
                  <i className={`fas ${idx === 0 ? 'fa-check' : 'fa-bolt'} text-xs`}></i>
                </div>
                <div className="flex-1 pt-1 text-[#0f172a]">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-lg italic tracking-tight group-hover:text-blue-600 transition-colors uppercase leading-none">{new Date(a.timestamp).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded-lg ml-4">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.1em] opacity-60">Mat Session Verified</p>
                </div>
              </div>
            ))}
            {myAttendance.length === 0 && (
              <div className="text-center py-10 opacity-30">
                <i className="fas fa-ghost text-4xl mb-4"></i>
                <p className="text-xs uppercase tracking-widest">No training log yet</p>
              </div>
            )}
          </div>
        </div>

        <button onClick={handleLogout} className="w-full bg-white text-slate-300 py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.4em] border-2 border-slate-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all active:scale-95 shadow-sm">Logout Session</button>
      </div>

      {isFaceModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[200] flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setIsFaceModalOpen(false)}>
          <div className="bg-white p-3 rounded-[60px] max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="relative aspect-[3/4] bg-[#0f172a] rounded-[50px] overflow-hidden group/img">
              {currentMember.faceImages && currentMember.faceImages.length > 0 ? (
                <img src={currentMember.faceImages[0]} className="w-full h-full object-cover grayscale brightness-75 group-hover/img:grayscale-0 group-hover/img:brightness-100 transition-all duration-1000" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10"><i className="fas fa-face-viewfinder text-6xl"></i></div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent">
                <div className="flex items-center space-x-3 mb-2">
                  <i className="fas fa-shield-check text-blue-500 text-xs"></i>
                  <p className="text-white font-black text-xl italic tracking-tighter uppercase leading-none">My Secure ID</p>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed font-bold opacity-60 uppercase">Biometric data is encrypted and synced</p>
              </div>
            </div>
            <button onClick={() => setIsFaceModalOpen(false)} className="w-full py-6 text-slate-300 font-black uppercase tracking-[0.3em] text-[10px] hover:text-blue-600 transition-colors">Close Identity</button>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(37, 99, 235, 0.2); border-radius: 10px; }
      `}</style>
    </Layout>
  );
};