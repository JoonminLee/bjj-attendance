
import React, { useState, useRef } from 'react';
import { storageService } from '../services/storage';
import { Layout } from '../components/Layout';
import { Member } from '../types';

export const MemberList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>(storageService.getMembers());
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTickets, setNewTickets] = useState(10);

  const filteredMembers = members.filter(m => 
    m.name.includes(searchTerm) || m.phone.includes(searchTerm)
  );

  const startFaceRegistration = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error", err);
      setIsCapturing(false);
      alert("카메라를 시작할 수 없습니다. 권한을 확인해주세요.");
    }
  };

  const captureFace = () => {
    if (videoRef.current && canvasRef.current && capturedImages.length < 1) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 480;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImages(prev => [...prev, dataUrl]);
        
        if (capturedImages.length === 0) {
            stopCamera();
        }
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    
    const newMember = storageService.addMember({
      name: newName,
      phone: newPhone,
      joinDate: new Date().toISOString().split('T')[0],
      totalTickets: newTickets,
      remainingTickets: newTickets,
      status: 'active',
      faceImages: capturedImages
    });
    
    setMembers([...members, newMember]);
    closeModal();
  };

  const closeModal = () => {
    stopCamera();
    setIsAddModalOpen(false);
    setNewName('');
    setNewPhone('');
    setNewTickets(10);
    setCapturedImages([]);
  };

  const handleToggleStatus = (id: string) => {
    const updated = members.map(m => {
      if (m.id === id) {
        const newStatus = m.status === 'active' ? 'suspended' : 'active';
        const updatedMember = { ...m, status: newStatus as any };
        storageService.updateMember(updatedMember);
        return updatedMember;
      }
      return m;
    });
    setMembers(updated);
  };

  return (
    <Layout role="admin">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic leading-none">Registry</h2>
          <p className="text-slate-500 font-medium mt-2">관원 등록 및 출석용 안면 인식 데이터를 관리합니다.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 hover:bg-black text-white px-8 py-5 rounded-[28px] font-black flex items-center justify-center space-x-3 transition-all shadow-2xl shadow-slate-900/20 active:scale-95 group"
        >
          <i className="fas fa-plus-circle text-lg group-hover:rotate-90 transition-transform"></i>
          <span>신규 관원 등록</span>
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden mb-20">
        <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="relative w-full max-w-md">
            <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="이름 또는 전화번호 뒷자리 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 rounded-[22px] border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
            />
          </div>
          <div className="flex items-center space-x-5 whitespace-nowrap">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total: {filteredMembers.length}</span>
             <div className="h-4 w-[1px] bg-slate-200"></div>
             <div className="flex items-center space-x-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <span>Cloud Synced</span>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profile Info</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Biometrics</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center space-x-5">
                      <div className="w-14 h-14 rounded-[22px] bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 shadow-inner group-hover:scale-105 transition-transform">
                        {member.faceImages.length > 0 ? (
                          <img src={member.faceImages[0]} className="w-full h-full object-cover" />
                        ) : (
                          <i className="fas fa-user text-xl"></i>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-lg leading-tight tracking-tight mb-1 truncate">{member.name}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest truncate">{member.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex -space-x-4">
                      {member.faceImages.length > 0 ? (
                        member.faceImages.map((img, i) => (
                          <div key={i} className="w-10 h-10 rounded-full border-4 border-white overflow-hidden bg-slate-100 shadow-md transition-transform hover:-translate-y-2 hover:z-10">
                            <img src={img} className="w-full h-full object-cover" />
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center space-x-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                           <i className="fas fa-triangle-exclamation"></i>
                           <span>Data Missing</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                      member.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${member.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      {member.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => handleToggleStatus(member.id)} 
                      className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all active:scale-90 flex items-center justify-center ml-auto"
                    >
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 && (
            <div className="py-40 text-center flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mb-6 text-slate-200 text-5xl">
                <i className="fas fa-fingerprint"></i>
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No records found matching your search</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[56px] shadow-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col md:flex-row h-auto max-h-[90vh]">
            
            {/* Left: Registration Info */}
            <div className="flex-1 p-8 md:p-14 overflow-y-auto custom-scrollbar">
              <div className="mb-12">
                <div className="w-14 h-14 bg-blue-600 rounded-[20px] flex items-center justify-center text-white mb-8 shadow-xl shadow-blue-500/20">
                  <i className="fas fa-id-card text-2xl"></i>
                </div>
                <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">Enrolment</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">관원의 기본 정보와 안면 인식용 샘플 데이터를 등록합니다.</p>
              </div>

              <form id="add-member-form" onSubmit={handleAddMember} className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Member Name</label>
                    <input 
                      type="text" required value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-7 py-5 rounded-[28px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-lg placeholder:text-slate-300"
                      placeholder="성함을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Contact Details</label>
                    <input 
                      type="text" required value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-7 py-5 rounded-[28px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-lg placeholder:text-slate-300"
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Tickets Pool</label>
                      <input 
                        type="number" required min="1" value={newTickets}
                        onChange={(e) => setNewTickets(parseInt(e.target.value))}
                        className="w-full px-7 py-5 rounded-[28px] border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-lg"
                      />
                    </div>
                    <div className="flex items-end">
                       <button 
                        type="submit" 
                        disabled={isCapturing || capturedImages.length < 1}
                        className={`w-full py-5 rounded-[28px] font-black text-white transition-all shadow-2xl
                          ${isCapturing || capturedImages.length < 1 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-black shadow-slate-900/30 active:scale-95'}
                        `}
                      >
                        CREATE ACCOUNT
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Right: Face Data Capture */}
            <div className="w-full md:w-[450px] bg-slate-900 p-8 md:p-14 flex flex-col text-white relative">
              <button onClick={closeModal} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all z-10 active:scale-90">
                <i className="fas fa-times text-xl"></i>
              </button>

              <div className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Biometric Samples</p>
                <h4 className="text-2xl font-black italic uppercase leading-none tracking-tight">AI Face Setup</h4>
              </div>

              <div className="flex-1 bg-black rounded-[48px] overflow-hidden relative flex items-center justify-center min-h-[350px] border border-white/10 group shadow-2xl">
                 {isCapturing ? (
                   <>
                     <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                     <div className="absolute inset-0 border-[30px] border-black/50 rounded-[48px] pointer-events-none"></div>
                     <div className="absolute inset-x-12 inset-y-16 border-2 border-dashed border-blue-500/60 rounded-full animate-pulse pointer-events-none"></div>
                     <button 
                       type="button"
                       onClick={captureFace}
                       className="absolute bottom-10 bg-white text-slate-900 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all z-20 border-[6px] border-white/20"
                     >
                       <i className="fas fa-camera text-3xl"></i>
                     </button>
                   </>
                 ) : (
                                      <div className="text-center p-8 flex flex-col items-center">
                                         <div className="flex space-x-4 mb-12">
                                           {[0].map(i => (
                                               <div key={i} className={`w-32 h-40 rounded-3xl border-2 transition-all duration-700 overflow-hidden flex items-center justify-center ${capturedImages[i] ? 'border-blue-500 bg-blue-500/20' : 'border-white/10 bg-white/5 opacity-40'}`}>
                                                   {capturedImages[i] ? (
                                                       <img src={capturedImages[i]} className="w-full h-full object-cover animate-in zoom-in duration-500" />
                                                   ) : (
                                                       <span className="text-sm font-black text-slate-600">PHOTO</span>
                                                   )}
                                               </div>
                                           ))}
                                         </div>
                                         <button                           type="button"
                         onClick={() => { setCapturedImages([]); startFaceRegistration(); }}
                         className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-2xl shadow-blue-600/30 active:scale-95"
                      >
                        {capturedImages.length === 0 ? 'Initialize Scanner' : 'Retake Samples'}
                      </button>
                   </div>
                 )}
              </div>
              
              <div className="mt-10 bg-white/5 p-6 rounded-[32px] border border-white/10">
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
                  <i className="fas fa-lightbulb mr-2 text-blue-400"></i>
                  정면 사진을 선명하게 촬영해주세요.
                </p>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </Layout>
  );
};
