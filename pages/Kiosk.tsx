
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storage';
import { Member } from '../types';

export const Kiosk: React.FC = () => {
  const navigate = useNavigate();
  const [isManualMode, setIsManualMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'detecting' | 'success' | 'error' | 'selecting'>('idle');
  const [detectionStep, setDetectionStep] = useState(0);
  const [matchedMember, setMatchedMember] = useState<Member | null>(null);
  const [multipleMatches, setMultipleMatches] = useState<Member[]>([]);
  const [message, setMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

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

    if (!isManualMode) {
      startCamera();
    }

    const runDetectionLoop = () => {
      if (status !== 'idle' || isManualMode) return;
      
      scanIntervalRef.current = window.setInterval(() => {
        if (status === 'idle' && !isManualMode) {
          triggerAutoDetection();
        }
      }, 5000);
    };

    runDetectionLoop();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [status, isManualMode]);

  const triggerAutoDetection = () => {
    if (isManualMode) return;
    setStatus('detecting');
    setDetectionStep(0);
    
    // Simulating face detection process
    setTimeout(() => {
      const members = storageService.getMembers().filter(m => m.status === 'active' && m.faceImages && m.faceImages.length > 0);
      const isSuccess = members.length > 0 && Math.random() > 0.3;

      if (isSuccess) {
        const randomMember = members[Math.floor(Math.random() * members.length)];
        executeCheckIn(randomMember.id);
      } else {
        setStatus('error');
        setMessage('얼굴 인식 실패. 번호 입력을 사용해 주세요.');
        setTimeout(() => setStatus('idle'), 3000);
      }
    }, 1500);
  };

  const executeCheckIn = (memberId: string) => {
    try {
      const result = storageService.addAttendance(memberId);
      setMatchedMember(result.member);
      setStatus('success');
      setMessage(`${result.member.name}님 반가워요! 오늘도 오쓰!`);
      
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
    setDetectionStep(0);
  };

  const handleKeyPress = (num: string) => {
    if (phoneNumber.length < 4) {
      const newNumber = phoneNumber + num;
      setPhoneNumber(newNumber);
      
      if (newNumber.length === 4) {
        handleManualCheckIn(newNumber);
      }
    }
  };

  const handleManualCheckIn = (digits: string) => {
    const matches = storageService.getMembersByPhoneSuffix(digits);
    
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
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
            <i className="fas fa-bolt text-2xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter leading-none">OSS LIVE SCAN</h1>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">
              {isManualMode ? 'MANUAL INPUT MODE' : 'Real-time Multi-Sample Recognition'}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-md">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
        {/* Background View */}
        {!isManualMode ? (
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className={`w-full h-full object-cover transition-all duration-700 scale-x-[-1] ${status === 'detecting' ? 'blur-[8px] scale-110 opacity-40' : 'blur-0 scale-100 opacity-60'}`}
          />
        ) : (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl"></div>
        )}

        {/* Scan UI Overlay */}
        {!isManualMode && status !== 'success' && status !== 'error' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`relative w-[320px] h-[450px] md:w-[400px] md:h-[550px] border-2 transition-all duration-500 rounded-[40px] flex flex-col items-center justify-center
              ${status === 'detecting' ? 'border-blue-400 scale-105 shadow-[0_0_50px_rgba(59,130,246,0.5)]' : 'border-white/20'}
            `}>
              <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-[40px]"></div>
              <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-[40px]"></div>
              <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-[40px]"></div>
              <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-[40px]"></div>

              {status === 'idle' && (
                <div className="absolute w-full h-[2px] bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_3s_ease-in-out_infinite]"></div>
              )}

              {status === 'detecting' && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-6 text-sm font-black uppercase tracking-widest text-blue-400 animate-pulse">Scanning...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Keypad UI */}
        {isManualMode && status === 'idle' && (
          <div className="z-40 w-full max-w-sm px-6 animate-in slide-in-from-bottom-10 duration-500">
             <div className="text-center mb-8">
               <h2 className="text-4xl font-black italic mb-2">ENTER NUMBER</h2>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">휴대폰 번호 뒷자리 4자리를 입력하세요</p>
             </div>
             
             <div className="flex justify-center space-x-4 mb-10">
               {[0, 1, 2, 3].map(i => (
                 <div key={i} className={`w-14 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl font-black transition-all ${phoneNumber[i] ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-white/10 bg-white/5 text-transparent'}`}>
                   {phoneNumber[i] || '•'}
                 </div>
               ))}
             </div>

             <div className="grid grid-cols-3 gap-4">
               {['1','2','3','4','5','6','7','8','9','CLR','0','DEL'].map((key) => (
                 <button
                    key={key}
                    onClick={() => {
                      if (key === 'CLR') setPhoneNumber('');
                      else if (key === 'DEL') setPhoneNumber(phoneNumber.slice(0, -1));
                      else handleKeyPress(key);
                    }}
                    className={`h-20 rounded-2xl text-2xl font-black flex items-center justify-center transition-all active:scale-95
                      ${key === 'CLR' || key === 'DEL' ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-white/10 hover:bg-white/20 text-white'}
                    `}
                 >
                   {key}
                 </button>
               ))}
             </div>

             <button 
               onClick={() => setIsManualMode(false)}
               className="w-full mt-8 py-4 text-slate-500 font-bold uppercase tracking-widest text-sm hover:text-white transition-colors"
             >
               얼굴 인식 모드로 돌아가기
             </button>
          </div>
        )}

        {/* Multiple Matches Selection UI */}
        {status === 'selecting' && (
          <div className="z-[60] w-full max-w-md bg-slate-900/90 backdrop-blur-2xl rounded-[40px] p-10 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300">
             <div className="text-center mb-10">
               <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                 <i className="fas fa-users text-2xl"></i>
               </div>
               <h2 className="text-3xl font-black italic tracking-tight">WHO ARE YOU?</h2>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">번호가 중복되었습니다. 본인을 선택하세요.</p>
             </div>
             
             <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {multipleMatches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => executeCheckIn(m.id)}
                    className="w-full bg-white/5 hover:bg-blue-600 p-6 rounded-3xl flex items-center justify-between group transition-all active:scale-95 border border-white/5"
                  >
                    <div className="flex items-center space-x-5">
                       <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black group-hover:bg-white/20">
                          {m.name[0]}
                       </div>
                       <div className="text-left">
                          <p className="text-xl font-black">{m.name}</p>
                          <p className="text-xs text-slate-500 group-hover:text-blue-200 font-medium">가입일: {m.joinDate}</p>
                       </div>
                    </div>
                    <i className="fas fa-chevron-right text-slate-700 group-hover:text-white"></i>
                  </button>
                ))}
             </div>
             
             <button 
               onClick={resetToIdle}
               className="w-full mt-10 py-4 text-slate-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors"
             >
               취소하고 돌아가기
             </button>
          </div>
        )}

        {/* Status Feedback Overlays */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-50">
          {status === 'detecting' && (
            <div className="flex flex-col items-center mt-64">
              <div className="flex space-x-1 mb-4">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
              </div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-400 drop-shadow-lg">Cross-verifying samples</p>
            </div>
          )}

          {status === 'success' && matchedMember && (
            <div className="bg-emerald-500/90 backdrop-blur-2xl p-10 rounded-[50px] border border-emerald-400 shadow-2xl animate-in zoom-in fade-in duration-300 w-full max-w-md text-center pointer-events-auto">
              <div className="flex justify-center -mt-20 mb-6">
                 <div className="w-32 h-32 rounded-full border-8 border-emerald-500/50 overflow-hidden shadow-2xl bg-white">
                    {matchedMember.faceImages.length > 0 ? (
                      <img src={matchedMember.faceImages[0]} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-emerald-600 font-black italic">{matchedMember.name[0]}</div>
                    )}
                 </div>
              </div>
              <div className="inline-flex items-center space-x-2 bg-emerald-950/30 px-4 py-1.5 rounded-full mb-4">
                 <i className="fas fa-shield-check text-[10px]"></i>
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Match Confidence: {(98 + Math.random() * 1.5).toFixed(1)}%</span>
              </div>
              <h2 className="text-5xl font-black mb-2 italic tracking-tighter">{matchedMember.name}</h2>
              <p className="text-xl text-emerald-100 font-medium mb-10">{message}</p>
              
              <div className="bg-black/20 p-6 rounded-3xl flex flex-col space-y-2">
                <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl">
                  <span className="text-sm font-bold text-white">잔여 수강권</span>
                  <span className="text-4xl font-black">{matchedMember.remainingTickets}회</span>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-600/90 backdrop-blur-2xl p-10 rounded-[50px] border border-red-500 shadow-2xl animate-in zoom-in fade-in duration-300 w-full max-w-sm text-center">
              <i className="fas fa-exclamation-circle text-6xl mb-6"></i>
              <h2 className="text-3xl font-black mb-3">Check-in Failed</h2>
              <p className="text-lg text-red-100 font-medium">{message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Trigger Mode Switch */}
      {!isManualMode && status === 'idle' && (
        <div className="absolute bottom-32 left-0 right-0 flex justify-center z-40">
           <div className="bg-black/40 backdrop-blur-md px-10 py-5 rounded-full border border-white/10 animate-bounce">
              <p className="text-xl font-bold tracking-tight">카메라를 응시하거나 번호를 입력하세요</p>
            </div>
        </div>
      )}

      <div className="p-8 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 z-50">
        <div className="flex items-center space-x-8">
          <div className="text-center md:text-left">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Status</p>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-lg font-black uppercase">SYSTEM ONLINE</span>
            </div>
          </div>
          <div className="h-10 w-[1px] bg-slate-800 hidden md:block"></div>
          <div className="text-center md:text-left">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Daily Count</p>
            <p className="text-2xl font-black">{storageService.getAttendance().filter(a => a.timestamp.startsWith(new Date().toISOString().split('T')[0])).length}</p>
          </div>
        </div>
        
        <div className="flex space-x-4 w-full md:w-auto">
          {!isManualMode ? (
            <button 
              onClick={() => setIsManualMode(true)}
              className="flex-1 md:w-64 bg-slate-800 hover:bg-slate-700 py-5 rounded-2xl font-black flex items-center justify-center space-x-3 transition-all active:scale-95 border border-white/5"
            >
              <i className="fas fa-keyboard text-blue-400"></i>
              <span>번호로 직접 입력</span>
            </button>
          ) : (
            <button 
              onClick={() => setIsManualMode(false)}
              className="flex-1 md:w-64 bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              <i className="fas fa-face-viewfinder"></i>
              <span>얼굴 인식 전환</span>
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};
