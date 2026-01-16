
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storage';
import { Member } from '../types';
import { faceRecognitionService } from '../services/faceRecognition';

export const Kiosk: React.FC = () => {
  const navigate = useNavigate();
  const [isManualMode, setIsManualMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'detecting' | 'success' | 'error' | 'selecting'>('idle');
  const [matchedMember, setMatchedMember] = useState<Member | null>(null);
  const [multipleMatches, setMultipleMatches] = useState<Member[]>([]);
  const [message, setMessage] = useState('');
  const statusRef = useRef(status);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Verification logic refs
  const lastMatchedIdRef = useRef<string | null>(null);
  const matchCountRef = useRef<number>(0);
  const REQUIRED_MATCHES = 2;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detectionTimeout: any;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        if (!isManualMode) {
          setStatus('error');
          setMessage('카메라 권한이 필요합니다.');
        }
      }
    };

    const runDetection = async () => {
      if (isManualMode) return;
      if (statusRef.current === 'idle' || statusRef.current === 'detecting') {
        await triggerAutoDetection();
      }
      detectionTimeout = setTimeout(runDetection, 600);
    };

    if (!isManualMode) {
      startCamera();
      detectionTimeout = setTimeout(runDetection, 1000);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      clearTimeout(detectionTimeout);
    };
  }, [isManualMode]);

  const triggerAutoDetection = async () => {
    if (isManualMode || (statusRef.current !== 'idle' && statusRef.current !== 'detecting') || !videoRef.current) return;

    if (statusRef.current === 'idle') {
      setStatus('detecting');
      matchCountRef.current = 0;
      lastMatchedIdRef.current = null;
    }

    try {
      await faceRecognitionService.loadModels();
      const queryDescriptor = await faceRecognitionService.extractDescriptor(videoRef.current);

      if (!queryDescriptor) {
        matchCountRef.current = 0;
        setStatus('idle');
        return;
      }

      const allMembers = storageService.getMembers().filter(m => m.status === 'active' && m.faceDescriptor);
      const match = faceRecognitionService.findBestMatch(queryDescriptor, allMembers);

      if (match) {
        if (match.memberId === lastMatchedIdRef.current) {
          matchCountRef.current += 1;
        } else {
          lastMatchedIdRef.current = match.memberId;
          matchCountRef.current = 1;
        }

        if (matchCountRef.current >= REQUIRED_MATCHES) {
          executeCheckIn(match.memberId);
          matchCountRef.current = 0;
        }
      } else {
        matchCountRef.current = 0;
        lastMatchedIdRef.current = null;
      }
    } catch (err) {
      console.error("AI Recognition Error:", err);
      setStatus('idle');
    }
  };

  const executeCheckIn = (memberId: string) => {
    setIsManualMode(false);
    try {
      const result = storageService.addAttendance(memberId);
      setMatchedMember(result.member);
      setStatus('success');
      setMessage(`${result.member.name}님 환영합니다!`);

      setTimeout(() => {
        resetToIdle();
      }, 4000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || '출결 처리 중 오류가 발생했습니다.');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const resetToIdle = () => {
    setStatus('idle');
    setMatchedMember(null);
    setMultipleMatches([]);
    setMessage('');
    setIsManualMode(false);
    setPhoneNumber('');
  };

  const handleNumberInput = (num: string) => {
    if (phoneNumber.length < 4) {
      const newNumber = phoneNumber + num;
      setPhoneNumber(newNumber);
      if (newNumber.length === 4) {
        const matches = storageService.getMembersByPhoneSuffix(newNumber);
        if (matches.length === 1) {
          executeCheckIn(matches[0].id);
        } else if (matches.length > 1) {
          setMultipleMatches(matches);
          setStatus('selecting');
        } else {
          setStatus('error');
          setMessage('일치하는 회원이 없습니다.');
          setTimeout(() => {
            setPhoneNumber('');
            setStatus('idle');
          }, 2000);
        }
      }
    }
  };

  if (isManualMode || status === 'selecting') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 selection:bg-blue-500/20">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-xl ${status === 'selecting' ? 'bg-blue-600' : 'bg-[#059669]'}`}>
              <i className={`fas ${status === 'selecting' ? 'fa-users' : 'fa-user-check'}`}></i>
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-[#0f172a] mb-2 uppercase">
              {status === 'selecting' ? 'WHO ARE YOU?' : 'MEMBER ACCESS'}
            </h1>
            <p className="text-slate-400 font-bold text-sm">
              {status === 'selecting' ? '일치하는 관원이 여러 명입니다. 본인을 선택해 주세요.' : '휴대폰 번호 뒷자리 4자리를 입력하세요'}
            </p>
          </div>

          <div className="bg-white p-10 rounded-[56px] shadow-2xl shadow-slate-200 border border-slate-100">
            {status === 'selecting' ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {multipleMatches.map(m => (
                  <button
                    key={m.id}
                    onClick={() => executeCheckIn(m.id)}
                    className="w-full p-6 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-[32px] flex items-center justify-between transition-all active:scale-95 group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl group-hover:scale-110 transition-transform shadow-sm">
                        {m.name[0]}
                      </div>
                      <div className="text-left font-black">
                        <p className="text-lg leading-none">{m.name}</p>
                        <p className="text-[10px] uppercase opacity-50 mt-1">{m.belt} Belt</p>
                      </div>
                    </div>
                    <i className="fas fa-chevron-right opacity-30"></i>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex justify-center space-x-3 mb-10">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-14 h-20 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-center text-3xl font-black text-slate-800">
                      {phoneNumber[i] || ''}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button key={num} onClick={() => handleNumberInput(num.toString())} className="h-20 bg-[#0f172a] text-white rounded-[24px] text-2xl font-black hover:bg-slate-800 active:scale-95 transition-all shadow-lg">{num}</button>
                  ))}
                  <button onClick={() => setPhoneNumber('')} className="h-20 bg-slate-50 text-slate-400 rounded-[24px] text-lg font-black">CLR</button>
                  <button onClick={() => handleNumberInput('0')} className="h-20 bg-[#0f172a] text-white rounded-[24px] text-2xl font-black hover:bg-slate-800 active:scale-95 transition-all shadow-lg">0</button>
                  <button onClick={() => setPhoneNumber(prev => prev.slice(0, -1))} className="h-20 bg-slate-50 text-slate-400 rounded-[24px] text-lg font-black"><i className="fas fa-backspace"></i></button>
                </div>
              </>
            )}
          </div>

          <button onClick={resetToIdle} className="w-full mt-10 text-slate-400 font-bold flex items-center justify-center space-x-2 hover:text-slate-600 transition-colors">
            <i className="fas fa-arrow-left text-xs"></i>
            <span>돌아가기</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col overflow-hidden relative font-outfit">
      {/* Scan Line Animation Styles */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; opacity: 0; }
          40%, 60% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-8 z-30 flex justify-between items-start">
        <div className="flex items-center space-x-4 bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/10">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <i className="fas fa-bolt text-white text-xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-black text-white italic tracking-tighter leading-none">OSS LIVE SCAN</h2>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1 opacity-80">REAL-TIME MULTI-SAMPLE RECOGNITION</p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90">
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Main View */}
      <div className="flex-1 relative flex items-center justify-center">
        <video ref={videoRef} autoPlay muted playsInline className={`absolute inset-0 w-full h-full object-cover brightness-50 transition-all duration-1000 scale-x-[-1] ${status === 'detecting' ? 'brightness-75' : ''}`} />

        {/* Face Frame */}
        <div className="relative z-10 w-full max-w-2xl aspect-square flex items-center justify-center p-12">
          <div className={`absolute inset-0 border-2 rounded-[80px] transition-all duration-500 ${status === 'detecting' ? 'border-blue-500 scale-105 shadow-[0_0_100px_rgba(37,99,235,0.2)]' : 'border-white/20'}`}></div>

          {/* Animated Scan Line */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-[scan_3s_ease-in-out_infinite] shadow-[0_0_20px_rgba(37,99,235,0.5)]"></div>

          <div className="bg-black/40 backdrop-blur-md p-10 rounded-full border border-white/10 shadow-2xl animate-pulse">
            <p className="text-white text-xl font-black tracking-tight uppercase">카메라를 응시하거나 번호를 입력하세요</p>
          </div>
        </div>

        {/* Success / Error Popup */}
        {(status === 'success' || status === 'error') && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`w-full max-w-lg bg-white rounded-[48px] shadow-2xl p-10 text-center animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border-4 ${status === 'success' ? 'border-blue-100' : 'border-red-100'}`}>
              <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl ${status === 'success' ? 'bg-blue-600 text-white' : 'bg-red-50 text-red-500'}`}>
                <i className={`fas ${status === 'success' ? 'fa-check' : 'fa-exclamation-triangle'}`}></i>
              </div>

              {status === 'success' && matchedMember ? (
                <>
                  <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2">{matchedMember.name} 관원님</h2>
                  <p className="text-lg text-blue-600 font-bold uppercase tracking-widest">출석 체크 완료!</p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2 uppercase">CHECK-IN FAILED</h2>
                  <p className="text-lg text-red-500 font-bold">{message}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="bg-[#0f172a] h-32 border-t border-white/5 flex items-center justify-between px-12 relative z-20">
        <div className="flex items-center space-x-12">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">STATUS</span>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-base font-black text-white italic tracking-tight uppercase">SYSTEM ONLINE</span>
            </div>
          </div>
          <div className="w-px h-10 bg-white/10"></div>
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">DAILY COUNT</span>
            <span className="text-2xl font-black text-white italic">
              {storageService.getAttendance().filter(a => a.timestamp.startsWith(new Date().toISOString().split('T')[0])).length}
            </span>
          </div>
        </div>

        <button onClick={() => setIsManualMode(true)} className="bg-white/5 hover:bg-white/10 text-white px-10 py-6 rounded-[28px] border border-white/10 flex items-center space-x-4 transition-all active:scale-95 group">
          <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <i className="fas fa-keyboard"></i>
          </div>
          <span className="text-sm font-black uppercase tracking-widest italic">번호로 직접 입력</span>
        </button>
      </div>
    </div>
  );
};
