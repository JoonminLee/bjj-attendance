import React, { useState, useRef } from 'react';
import { storageService } from '../services/storage';
import { Layout } from '../components/Layout';
import { Member } from '../types';
import { faceRecognitionService } from '../services/faceRecognition';

export const MemberList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>(storageService.getMembers());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBelt, setSelectedBelt] = useState('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'face' | 'history' | 'tickets' | 'notes' | 'account'>('info');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Camera
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentDescriptor, setCurrentDescriptor] = useState<number[] | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form State (New Member)
  const [newMemberData, setNewMemberData] = useState({
    name: '', phone: '', birthDate: '', gender: 'Male',
    parentPhone: '', email: '', address: '',
    tickets: 10, belt: 'White', stripes: 0
  });

  // Form State (Edit Member)
  const [editFormData, setEditFormData] = useState({
    name: '', phone: '', birthDate: '', gender: 'Male',
    parentPhone: '', email: '', address: '',
    tickets: 0, memo: ''
  });

  // Promotion Form State
  const [promoDate, setPromoDate] = useState('');
  const [promoBelt, setPromoBelt] = useState<string>('White');
  const [promoStripes, setPromoStripes] = useState<number>(0);
  const [promoNote, setPromoNote] = useState('');




  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.includes(searchTerm) || m.phone.includes(searchTerm);
    const matchesBelt = selectedBelt === 'All' || m.belt === selectedBelt;
    return matchesSearch && matchesBelt;
  });

  const ADULT_BELTS = ['White', 'Blue', 'Purple', 'Brown', 'Black'];
  const KIDS_BELTS = ['Grey', 'Yellow', 'Orange', 'Green'];

  // --- Auto Formatter Helpers ---
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');

    // 02 (Seoul) case
    if (numbers.startsWith('02')) {
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 5) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
      if (numbers.length <= 9) return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`; // 02-123-4567
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`; // 02-1234-5678
    }

    // Mobile or other area codes (010, 031, etc.)
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    if (numbers.length <= 10) return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`; // 010-123-4567
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`; // 010-1234-5678
  };

  const formatDateString = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 6)}-${numbers.slice(6, 8)}`;
  };

  const handleSaveFeedback = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // --- Camera Logic ---
  const startFaceRegistration = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error", err);
      setIsCapturing(false);
      alert("Cannot access camera. Please check permissions.");
    }
  };

  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 640;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        setIsProcessingAI(true);
        storageService.resizeImage(rawDataUrl, 512).then(async (resizedDataUrl) => {
          const img = new Image();
          img.src = resizedDataUrl;
          await new Promise(r => img.onload = r);

          const descriptor = await faceRecognitionService.extractDescriptor(img);

          if (!descriptor) {
            alert("얼굴을 찾을 수 없습니다. 정면을 응시해 주세요.");
            setIsProcessingAI(false);
            return;
          }

          setCurrentDescriptor(descriptor);

          if (isAddModalOpen) {
            setCapturedImages([resizedDataUrl]);
          } else if (isEditModalOpen && editingMember) {
            const updatedMember = {
              ...editingMember,
              faceImages: [resizedDataUrl],
              faceDescriptor: descriptor
            };
            setEditingMember(updatedMember);
            storageService.updateMember(updatedMember);
            setMembers(storageService.getMembers());
            handleSaveFeedback();
          }
          setIsProcessingAI(false);
        }).catch(err => {
          console.error(err);
          setIsProcessingAI(false);
        });

        stopCamera();
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setIsProcessingAI(true);

      try {
        const resizedDataUrl = await storageService.resizeImage(dataUrl, 512);
        const img = new Image();
        img.src = resizedDataUrl;
        await new Promise(r => img.onload = r);

        const descriptor = await faceRecognitionService.extractDescriptor(img);

        if (!descriptor) {
          alert("이미지에서 얼굴을 감지하지 못했습니다.");
          setIsProcessingAI(false);
          return;
        }

        setCurrentDescriptor(descriptor);

        if (isAddModalOpen) {
          setCapturedImages([resizedDataUrl]);
        } else if (isEditModalOpen && editingMember) {
          const updatedMember = {
            ...editingMember,
            faceImages: [resizedDataUrl],
            faceDescriptor: descriptor
          };
          setEditingMember(updatedMember);
          storageService.updateMember(updatedMember);
          setMembers(storageService.getMembers());
          handleSaveFeedback();
        }
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setIsProcessingAI(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Member Actions ---
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberData.name || !newMemberData.phone) return;

    const joinDate = new Date().toISOString().split('T')[0];
    const newMember = storageService.addMember({
      name: newMemberData.name,
      phone: newMemberData.phone,
      joinDate,
      totalTickets: newMemberData.tickets,
      remainingTickets: newMemberData.tickets,
      status: 'active',
      belt: newMemberData.belt as any,
      stripes: newMemberData.stripes as any,
      faceImages: capturedImages,
      birthDate: newMemberData.birthDate,
      gender: newMemberData.gender as any,
      parentPhone: newMemberData.parentPhone,
      email: newMemberData.email,
      address: newMemberData.address,
      memo: '',
      faceDescriptor: currentDescriptor || undefined,
      promotionHistory: [
        { date: joinDate, belt: newMemberData.belt, stripes: newMemberData.stripes, note: 'Initial Registration' }
      ]
    });

    setMembers(storageService.getMembers());
    closeAddModal();
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    let updatedMember: Member = {
      ...editingMember,
      name: editFormData.name,
      phone: editFormData.phone,
      remainingTickets: Number(editFormData.tickets),
      birthDate: editFormData.birthDate,
      gender: editFormData.gender as any,
      parentPhone: editFormData.parentPhone,
      email: editFormData.email,
      address: editFormData.address,
      memo: editFormData.memo
    };

    // --- Ticket Reconciliation Logic ---
    const oldBalance = Number(editingMember.remainingTickets || 0);
    const newBalance = Number(editFormData.tickets);

    if (oldBalance !== newBalance) {
      const diff = newBalance - oldBalance;
      const historyEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: (diff > 0 ? 'add' : 'use') as any,
        amount: Math.abs(diff),
        balance: newBalance,
        note: '관리자 수동 조정'
      };

      updatedMember.ticketHistory = [...(updatedMember.ticketHistory || []), historyEntry];

      // If balance increased, we must increase totalTickets to keep 'used' count stable
      if (diff > 0) {
        updatedMember.totalTickets = Number(updatedMember.totalTickets || 0) + diff;
      }
    }

    storageService.updateMember(updatedMember);
    setMembers(storageService.getMembers());
    setEditingMember(updatedMember);
    handleSaveFeedback();
  };

  const handleAddPromotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const newHistoryItem = {
      date: promoDate,
      belt: promoBelt,
      stripes: promoStripes,
      note: promoNote
    };

    const updatedHistory = [...(editingMember.promotionHistory || []), newHistoryItem]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const latest = updatedHistory[0];

    const updatedMember: Member = {
      ...editingMember,
      promotionHistory: updatedHistory,
      belt: latest.belt as any,
      stripes: latest.stripes as any,
    };

    storageService.updateMember(updatedMember);
    setMembers(storageService.getMembers());
    setEditingMember(updatedMember);
    setPromoNote('');
    handleSaveFeedback();
  };

  const handleDeleteHistory = (index: number) => {
    if (!editingMember) return;
    const updatedHistory = [...(editingMember.promotionHistory || [])];
    updatedHistory.splice(index, 1);

    let newBelt = editingMember.belt;
    let newStripes = editingMember.stripes;

    if (updatedHistory.length > 0) {
      const latest = updatedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      newBelt = latest.belt as any;
      newStripes = latest.stripes as any;
    }

    const updatedMember = {
      ...editingMember,
      promotionHistory: updatedHistory,
      belt: newBelt,
      stripes: newStripes
    };

    storageService.updateMember(updatedMember);
    setMembers(storageService.getMembers());
    setEditingMember(updatedMember);
  };

  const handleToggleStatus = (id: string) => {
    let toggled: Member | null = null;
    const updated = members.map(m => {
      if (m.id === id) {
        const newStatus = m.status === 'active' ? 'suspended' : 'active';
        toggled = { ...m, status: newStatus as any };
        storageService.updateMember(toggled);
        return toggled;
      }
      return m;
    });
    setMembers(updated);
    if (editingMember && editingMember.id === id && toggled) {
      setEditingMember(toggled);
    }
  };

  // 회원 삭제
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });

  const handleDeleteMember = () => {
    if (!deleteModal.member) return;
    try {
      storageService.deleteMember(deleteModal.member.id);
      setMembers(storageService.getMembers());
      setDeleteModal({ open: false, member: null });
      closeEditModal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 수강권 충전
  const [ticketModal, setTicketModal] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });
  const [ticketAmount, setTicketAmount] = useState(10);
  const [ticketNote, setTicketNote] = useState('');

  const handleAddTickets = () => {
    if (!ticketModal.member || ticketAmount <= 0) return;
    try {
      const result = storageService.addTickets(ticketModal.member.id, ticketAmount, ticketNote || undefined);
      setMembers(storageService.getMembers());
      if (editingMember && editingMember.id === ticketModal.member.id) {
        setEditingMember(result.member);
        setEditFormData(prev => ({ ...prev, tickets: result.member.remainingTickets }));
      }
      setTicketModal({ open: false, member: null });
      setTicketAmount(10);
      setTicketNote('');
      handleSaveFeedback();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 수강권 수동 조정
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });
  const [adjustAmount, setAdjustAmount] = useState(1);
  const [adjustType, setAdjustType] = useState<'add' | 'sub'>('sub');
  const [adjustNote, setAdjustNote] = useState('');

  const handleAdjustTickets = () => {
    if (!adjustModal.member || adjustAmount <= 0) return;
    try {
      const finalAmount = adjustType === 'add' ? adjustAmount : -adjustAmount;
      const updated = storageService.manualAdjustTickets(adjustModal.member.id, finalAmount, adjustNote || '관리자 수동 조정');
      setMembers(storageService.getMembers());
      if (editingMember && editingMember.id === adjustModal.member.id) {
        setEditingMember(updated);
        setEditFormData(prev => ({ ...prev, tickets: updated.remainingTickets }));
      }
      setAdjustModal({ open: false, member: null });
      setAdjustAmount(1);
      setAdjustNote('');
      handleSaveFeedback();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setEditFormData({
      name: member.name,
      phone: member.phone,
      birthDate: member.birthDate || '',
      gender: (member.gender as any) || 'Male',
      parentPhone: member.parentPhone || '',
      email: member.email || '',
      address: member.address || '',
      tickets: member.remainingTickets,
      memo: member.memo || ''
    });

    setPromoDate(new Date().toISOString().split('T')[0]);
    setPromoBelt(member.belt || 'White');
    setPromoStripes(member.stripes || 0);
    setPromoNote('');

    setActiveTab('info');
    setSaveStatus('idle');
    setIsEditModalOpen(true);
  };

  const closeAddModal = () => {
    stopCamera();
    setIsAddModalOpen(false);
    setNewMemberData({
      name: '', phone: '', birthDate: '', gender: 'Male',
      parentPhone: '', email: '', address: '',
      tickets: 10, belt: 'White', stripes: 0
    });
    setCapturedImages([]);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingMember(null);
    stopCamera();
  };

  const getBeltColorClass = (belt: string) => {
    switch (belt) {
      case 'Blue': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'Purple': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'Brown': return 'text-[#451a03] bg-slate-50 border-slate-200';
      case 'Black': return 'text-slate-900 bg-slate-100 border-slate-200';
      case 'Grey': return 'text-slate-500 bg-slate-50 border-slate-200';
      case 'Yellow': return 'text-yellow-600 bg-slate-50 border-slate-200';
      case 'Orange': return 'text-[#9a3412] bg-slate-50 border-slate-200';
      case 'Green': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      default: return 'text-slate-500 bg-white border-slate-200';
    }
  };

  return (
    <Layout role="admin">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic leading-none">회원 관리 시스템</h2>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">REGISTRY</h2>
          <p className="text-slate-500 font-bold mt-1 tracking-tight">관원 등록 및 출석용 안면 인식 데이터를 관리합니다.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#0f172a] text-white px-8 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center space-x-3 active:scale-95"
        >
          <i className="fas fa-plus-circle text-blue-400"></i>
          <span>신규 관원 등록</span>
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-20">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
          <div className="relative flex-1 max-w-xl">
            <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="이름 또는 전화번호 뒷자리 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 rounded-2xl bg-[#334155] text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold placeholder:text-slate-400"
            />
          </div>
          <div className="w-full md:w-48">
            <div className="relative">
              <i className="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <select
                value={selectedBelt}
                onChange={(e) => setSelectedBelt(e.target.value)}
                className="w-full pl-10 pr-6 py-4 rounded-2xl bg-[#334155] text-white border-none focus:outline-none focus:ring-4 focus:ring-blue-500/20 font-bold appearance-none cursor-pointer"
              >
                <option value="All">전체 등급</option>
                <optgroup label="성인부">
                  {ADULT_BELTS.map(belt => <option key={belt} value={belt}>{belt}</option>)}
                </optgroup>
                <optgroup label="키즈부">
                  {KIDS_BELTS.map(belt => <option key={belt} value={belt}>{belt}</option>)}
                </optgroup>
              </select>
              <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
            </div>
          </div>
          <div className="flex items-center space-x-6 px-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
              <p className="text-xl font-black text-slate-900 italic leading-none mt-1">{filteredMembers.length}</p>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Synced</span>
            </div>
          </div>
        </div>
        {/* Member List - Responsive Design */}
        <div className="overflow-hidden min-w-full">
          {/* Desktop Table Header */}
          <table className="w-full text-left hidden md:table">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">회원 프로필</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">대역 및 레벨</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">수강권 잔여</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">계정 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((member) => (
                <tr key={member.id} onClick={() => openEditModal(member)} className="hover:bg-slate-50 transition-all cursor-pointer group">
                  <td className="px-10 py-6">
                    <div className="flex items-center space-x-5">
                      <div className="w-14 h-14 rounded-[22px] bg-white flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 shadow-sm group-hover:shadow-md transition-all">
                        {member.faceImages.length > 0 ? (
                          <img src={member.faceImages[0]} className="w-full h-full object-cover" />
                        ) : (
                          <i className="fas fa-user text-xl"></i>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-lg leading-tight tracking-tight mb-1 truncate group-hover:text-blue-600 transition-colors">{member.name}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest truncate">{member.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col space-y-2">
                      <div className={`inline-flex items-center self-start px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getBeltColorClass(member.belt || 'White')}`}>
                        <span className="mr-1">{member.belt || 'White'}</span>
                        {member.stripes > 0 && <span className="text-[9px] opacity-70"> • {member.stripes} Stripes</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <i className={`fas fa-ticket text-xs ${member.remainingTickets > 0 ? 'text-blue-500' : 'text-red-400'}`}></i>
                        <span className={`text-sm font-black italic ${member.remainingTickets > 0 ? 'text-slate-900' : 'text-red-500'}`}>
                          {member.remainingTickets} <span className="text-[10px] not-italic text-slate-400">회 남음</span>
                        </span>
                      </div>
                      {member.remainingTickets === 0 && (
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">Needs Recharge</span>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end">
                      <span className={`inline-flex items-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${member.status === 'active' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${member.status === 'active' ? 'bg-blue-500' : 'bg-slate-400'}`}></span>
                        {member.status === 'active' ? '활성' : '정지'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card Layout */}
          <div className="grid grid-cols-1 gap-4 p-6 md:hidden">
            {filteredMembers.map((member) => (
              <div key={member.id} className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 hover:border-slate-300 transition-all active:scale-[0.98] group" onClick={() => openEditModal(member)}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 overflow-hidden">
                      {member.faceImages.length > 0 ? (
                        <img src={member.faceImages[0]} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300"><i className="fas fa-user"></i></div>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 leading-tight">{member.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{member.phone}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${member.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    {member.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/50">
                  <div className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${getBeltColorClass(member.belt || 'White')}`}>
                    {member.belt} • {member.stripes} S
                  </div>
                  <div className="flex items-center space-x-1">
                    <i className="fas fa-ticket text-[10px] text-slate-300"></i>
                    <span className="text-xs font-black text-slate-700">{member.remainingTickets}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="py-24 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 text-slate-200 text-4xl shadow-inner">
                <i className="fas fa-search"></i>
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[56px] shadow-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col md:flex-row h-auto max-h-[90vh] border-4 border-white">
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
              <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase mb-8">신규 관원 등록</h3>
              <form onSubmit={handleAddMember} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 mb-2 block">기본 정보</label>
                    <input type="text" placeholder="이름 *" required value={newMemberData.name} onChange={e => setNewMemberData({ ...newMemberData, name: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 mb-3 font-bold focus:border-blue-500 focus:outline-none" />
                    <div className="flex gap-2">
                      <input type="text" inputMode="numeric" placeholder="생년월일 (YYYYMMDD)" value={newMemberData.birthDate} onChange={e => setNewMemberData({ ...newMemberData, birthDate: formatDateString(e.target.value) })} className="w-2/3 px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm focus:border-blue-500 focus:outline-none" maxLength={10} />
                      <select value={newMemberData.gender} onChange={e => setNewMemberData({ ...newMemberData, gender: e.target.value })} className="w-1/3 px-3 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm focus:border-blue-500 focus:outline-none">
                        <option value="Male">남성</option><option value="Female">여성</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 mb-2 block">연락처</label>
                    <input type="text" inputMode="numeric" placeholder="휴대폰 번호 *" required value={newMemberData.phone} onChange={e => setNewMemberData({ ...newMemberData, phone: formatPhoneNumber(e.target.value) })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 mb-3 font-bold focus:border-blue-500 focus:outline-none" maxLength={13} />
                    <input type="text" inputMode="numeric" placeholder="비상 연락처 (부모님 등)" value={newMemberData.parentPhone} onChange={e => setNewMemberData({ ...newMemberData, parentPhone: formatPhoneNumber(e.target.value) })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold focus:border-blue-500 focus:outline-none" maxLength={13} />
                  </div>
                  <div className="col-span-2">
                    <input type="email" placeholder="이메일 주소 (선택)" value={newMemberData.email} onChange={e => setNewMemberData({ ...newMemberData, email: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 mb-3 font-bold focus:border-blue-500 focus:outline-none" />
                    <input type="text" placeholder="주소 (선택)" value={newMemberData.address} onChange={e => setNewMemberData({ ...newMemberData, address: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-8">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 mb-3 block">멤버십 및 급수</label>
                  <div className="grid grid-cols-3 gap-4">
                    <select value={newMemberData.belt} onChange={e => setNewMemberData({ ...newMemberData, belt: e.target.value })} className="px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm focus:border-blue-500 focus:outline-none">
                      <optgroup label="성인부">{ADULT_BELTS.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
                      <optgroup label="키즈부">{KIDS_BELTS.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
                    </select>
                    <select value={newMemberData.stripes} onChange={e => setNewMemberData({ ...newMemberData, stripes: parseInt(e.target.value) })} className="px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm focus:border-blue-500 focus:outline-none">
                      {[0, 1, 2, 3, 4].map(s => <option key={s} value={s}>{s} 그랄</option>)}
                    </select>
                    <input type="number" placeholder="초기 수강권 횟수" value={newMemberData.tickets} onChange={e => setNewMemberData({ ...newMemberData, tickets: parseInt(e.target.value) })} className="px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>
                <button type="submit" disabled={isCapturing || capturedImages.length < 1} className={`w-full py-5 rounded-2xl font-black text-white transition-all shadow-xl active:scale-95 ${isCapturing || capturedImages.length < 1 ? 'bg-slate-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/10'}`}>회원 계정 생성하기</button>
              </form>
            </div>

            <div className="w-full md:w-[400px] bg-[#0f172a] p-10 flex flex-col text-white relative">
              <button onClick={closeAddModal} className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white flex items-center justify-center text-white hover:text-[#0f172a] transition-all active:scale-95 z-10"><i className="fas fa-times text-xl"></i></button>
              <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6 text-center">얼굴 사진 등록</p>
                {isCapturing ? (
                  <div className="relative w-full aspect-square bg-[#020617] rounded-[40px] overflow-hidden border-4 border-slate-800 shadow-2xl">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    <button type="button" onClick={captureFace} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform border-4 border-blue-500/20"><i className="fas fa-camera text-slate-900 text-xl"></i></button>
                  </div>
                ) : (
                  <div className="text-center w-full">
                    <div className="w-full aspect-square bg-white/5 rounded-[40px] border-4 border-dashed border-slate-800/50 mb-8 flex items-center justify-center overflow-hidden shadow-inner">
                      {capturedImages[0] ? <img src={capturedImages[0]} className="w-full h-full object-cover" /> : <i className="fas fa-user-circle text-8xl text-slate-800/30"></i>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button type="button" onClick={() => { setCapturedImages([]); startFaceRegistration(); }} className="bg-white text-[#0f172a] py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-lg hover:bg-blue-50">
                        {capturedImages.length > 0 ? '재촬영' : '카메라 촬영'}
                      </button>
                      <label className="bg-slate-800/50 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center cursor-pointer active:scale-95 border border-slate-700/50">
                        파일 업로드
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal (Full CRM) */}
      {isEditModalOpen && editingMember && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[56px] shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in-95 duration-200 border-4 border-white">

            {/* Header */}
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white z-10">
              <div className="flex items-center space-x-6">
                <div className={`w-14 h-14 rounded-2xl ${getBeltColorClass(editingMember.belt).split(' ')[1]} flex items-center justify-center text-xl font-black italic shadow-inner border border-white/50`}>
                  <i className="fas fa-user text-lg opacity-50"></i>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter">{editingMember.name}</h2>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mt-1">{editingMember.belt} 벨트 • {editingMember.stripes} 그랄</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {saveStatus === 'saved' && (
                  <span className="text-emerald-500 font-black text-sm uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                    <i className="fas fa-check-circle mr-2"></i>저장됨!
                  </span>
                )}
                <button onClick={closeEditModal} className="w-14 h-14 rounded-3xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all active:scale-95 shadow-sm">
                  <i className="fas fa-times text-xl"></i>
                  <span className="sr-only">닫기</span>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-10 overflow-x-auto custom-scrollbar bg-white">
              {[
                { id: 'info', label: '정보수정', icon: 'fa-user' },
                { id: 'face', label: '얼굴등록', icon: 'fa-eye' },
                { id: 'history', label: '승급내역', icon: 'fa-medal' },
                { id: 'tickets', label: '수강권', icon: 'fa-ticket-alt' },
                { id: 'notes', label: '상담메모', icon: 'fa-sticky-note' },
                { id: 'account', label: '계정설정', icon: 'fa-cog' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (isCapturing) stopCamera();
                    setActiveTab(tab.id as any);
                  }}
                  className={`px-6 py-5 text-[11px] font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap active:scale-95 ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <i className={`fas ${tab.icon} mr-3 text-sm`}></i>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-slate-50">
              {/* INFO TAB */}
              {activeTab === 'info' && (
                <div className="h-full overflow-y-auto p-10 bg-slate-50/50">
                  <form onSubmit={handleUpdateMember} className="max-w-3xl mx-auto space-y-8 pb-24">
                    {/* Basic Info */}
                    <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                      <h4 className="text-sm font-black text-slate-900 mb-8 uppercase tracking-widest flex items-center"><i className="fas fa-id-card mr-3 text-blue-500 text-lg"></i>기본 정보 수정</h4>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 block ml-1">이름</label>
                          <input type="text" required value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold focus:border-blue-500 focus:outline-none" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 block ml-1">휴대폰 번호</label>
                          <input type="text" inputMode="numeric" required value={editFormData.phone} onChange={e => setEditFormData({ ...editFormData, phone: formatPhoneNumber(e.target.value) })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold focus:border-blue-500 focus:outline-none" placeholder="010-0000-0000" maxLength={13} />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 block ml-1">생년월일</label>
                          <input type="text" inputMode="numeric" value={editFormData.birthDate} onChange={e => setEditFormData({ ...editFormData, birthDate: formatDateString(e.target.value) })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm focus:border-blue-500 focus:outline-none" placeholder="YYYY-MM-DD" maxLength={10} />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 block ml-1">성별</label>
                          <select value={editFormData.gender} onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold focus:border-blue-500 focus:outline-none">
                            <option value="Male">남성</option><option value="Female">여성</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Contact & Address */}
                    <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                      <h4 className="text-sm font-black text-slate-900 mb-8 uppercase tracking-widest flex items-center"><i className="fas fa-map-marker-alt mr-3 text-blue-500 text-lg"></i>상세 연락처 및 주소</h4>
                      <div className="space-y-8">
                        <div>
                          <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 block ml-1">비상 연락처 (부모님 등)</label>
                          <input type="text" inputMode="numeric" value={editFormData.parentPhone} onChange={e => setEditFormData({ ...editFormData, parentPhone: formatPhoneNumber(e.target.value) })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold focus:border-blue-500 focus:outline-none" placeholder="010-0000-0000" maxLength={13} />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 block ml-1">이메일 주소</label>
                            <input type="email" value={editFormData.email} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold focus:border-blue-500 focus:outline-none" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 block ml-1">거주 주소</label>
                            <input type="text" value={editFormData.address} onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 font-bold focus:border-blue-500 focus:outline-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-xl shadow-2xl shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95 italic tracking-tighter uppercase">관원 정보 업데이트</button>
                    </div>
                  </form>
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === 'history' && (
                <div className="h-full overflow-y-auto p-10 bg-slate-50/50">
                  <div className="flex flex-col xl:flex-row gap-8 min-h-min">
                    <div className="flex-1 bg-white rounded-[40px] p-10 border border-slate-100 overflow-y-auto custom-scrollbar shadow-sm">
                      <h4 className="text-xl font-black text-slate-900 mb-8 italic flex items-center">
                        <i className="fas fa-history mr-3 text-blue-500"></i>승급 히스토리
                      </h4>
                      <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                        {editingMember.promotionHistory && editingMember.promotionHistory.length > 0 ? (
                          editingMember.promotionHistory.map((history, idx) => (
                            <div key={idx} className="flex items-start space-x-6 relative group">
                              <div className="w-10 h-10 rounded-full bg-white border-4 border-blue-50 flex items-center justify-center z-10 shadow-sm">
                                {idx === 0 ? <i className="fas fa-trophy text-blue-500 text-xs shadow-blue-500/50"></i> : <i className="fas fa-circle text-slate-200 text-[6px]"></i>}
                              </div>
                              <div className="flex-1 bg-slate-50/30 p-6 rounded-[28px] border border-slate-100 hover:border-blue-200 transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-3">
                                  <div className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getBeltColorClass(history.belt)}`}>
                                    {history.belt} 벨트 <span className="mx-2 opacity-30">|</span> {history.stripes} 그랄
                                  </div>
                                  <button onClick={() => handleDeleteHistory(idx)} className="w-8 h-8 rounded-full bg-white text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center active:scale-90"><i className="fas fa-trash-alt text-xs"></i></button>
                                </div>
                                <p className="text-sm font-black text-slate-900 mb-2">{history.date}</p>
                                {history.note && <p className="text-xs text-slate-500 font-medium leading-relaxed">{history.note}</p>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest text-xs">승급 내역이 없습니다.</div>
                        )}
                      </div>
                    </div>
                    <div className="w-full xl:w-[400px] bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm flex flex-col h-fit">
                      <h4 className="text-xl font-black text-slate-900 mb-8 italic flex items-center">
                        <i className="fas fa-medal mr-3 text-blue-500"></i>신규 승급 등록
                      </h4>
                      <form onSubmit={handleAddPromotion} className="flex-1 flex flex-col space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">승급일</label>
                          <input type="text" inputMode="numeric" value={promoDate} onChange={e => setPromoDate(formatDateString(e.target.value))} className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/30 font-bold text-sm focus:border-blue-500 focus:outline-none" placeholder="YYYY-MM-DD" maxLength={10} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">벨트 선택</label>
                          <select value={promoBelt} onChange={e => setPromoBelt(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/30 font-bold focus:border-blue-500 focus:outline-none">
                            <optgroup label="성인부">{ADULT_BELTS.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
                            <optgroup label="키즈부">{KIDS_BELTS.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">그랄(Stripes)</label>
                          <select value={promoStripes} onChange={e => setPromoStripes(parseInt(e.target.value))} className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/30 font-bold focus:border-blue-500 focus:outline-none">
                            {[0, 1, 2, 3, 4].map(s => <option key={s} value={s}>{s} 그랄</option>)}
                          </select>
                        </div>
                        <div className="flex-1 flex flex-col space-y-1.5">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">비고</label>
                          <textarea placeholder="승급 관련 메모를 입력하세요..." value={promoNote} onChange={e => setPromoNote(e.target.value)} className="flex-1 w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/30 font-bold resize-none focus:border-blue-500 focus:outline-none" />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/10 hover:bg-blue-700 transition-all active:scale-95">승급 기록 추가</button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* TICKETS TAB */}
              {activeTab === 'tickets' && (
                <div className="h-full overflow-y-auto p-10 bg-slate-50/50">
                  <div className="flex flex-col min-h-min space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
                      <div>
                        <h4 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">수강권 히스토리</h4>
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mt-1">도장 멤버십 결제 및 차감 내역</p>
                      </div>
                      <div className="flex space-x-3 w-full sm:w-auto">
                        <button
                          onClick={() => setAdjustModal({ open: true, member: editingMember })}
                          className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-400 px-6 py-4 rounded-[22px] font-black text-xs uppercase tracking-widest border border-slate-100 shadow-sm transition-all active:scale-95"
                        >
                          <i className="fas fa-sliders-h mr-2"></i>수동 조정
                        </button>
                        <button
                          onClick={() => setTicketModal({ open: true, member: editingMember })}
                          className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/10 transition-all active:scale-95"
                        >
                          <i className="fas fa-plus-circle mr-2"></i>수강권 충전
                        </button>
                      </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">잔여 횟수</p>
                        <p className="text-4xl font-black text-slate-900 italic leading-none">{editingMember?.remainingTickets || 0}<span className="text-xs not-italic text-slate-400 font-bold ml-2">회 남음</span></p>
                      </div>
                      <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm">
                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-2">누적 충전</p>
                        <p className="text-4xl font-black text-blue-600 italic leading-none">{editingMember?.totalTickets || 0}<span className="text-xs not-italic text-blue-300 font-bold ml-2">회 완료</span></p>
                      </div>
                      <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">총 사용</p>
                        <p className="text-4xl font-black text-slate-800 italic leading-none">{(editingMember?.totalTickets || 0) - (editingMember?.remainingTickets || 0)}<span className="text-xs not-italic text-slate-400 font-bold ml-2">회 사용</span></p>
                      </div>
                    </div>

                    {/* History List */}
                    <div className="bg-white rounded-[40px] border border-slate-100 p-6 md:p-10 shadow-sm">
                      <div className="space-y-4">
                        {editingMember?.ticketHistory && editingMember.ticketHistory.length > 0 ? (
                          [...editingMember.ticketHistory].reverse().map((h, idx) => (
                            <div key={h.id || idx} className="flex items-center justify-between p-6 rounded-[28px] hover:bg-slate-50 transition-all border border-slate-50 group">
                              <div className="flex items-center space-x-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg shadow-sm border border-white/50 ${h.type === 'add' ? 'bg-blue-50 text-blue-600' :
                                  h.type === 'refund' ? 'bg-red-50 text-red-600' :
                                    'bg-slate-50 text-slate-400'
                                  }`}>
                                  <i className={`fas ${h.type === 'add' ? 'fa-plus' : h.type === 'refund' ? 'fa-undo' : 'fa-minus'}`}></i>
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 text-lg leading-tight">
                                    {h.type === 'add' && '수강권 충전'}
                                    {h.type === 'use' && '수강권 사용'}
                                    {h.type === 'refund' && '수강권 환불'}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">
                                    {new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {h.note && <span className="ml-3 text-blue-400 font-black">• {h.note}</span>}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-black italic ${h.type === 'use' ? 'text-slate-400' : 'text-blue-600 shadow-blue-500/50'}`}>
                                  {h.type === 'use' ? '-' : '+'}{h.amount}
                                </p>
                                <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-1">잔액: {h.balance}회</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-20">
                            <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-slate-200 text-3xl shadow-inner">
                              <i className="fas fa-receipt"></i>
                            </div>
                            <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-xs">수강권 변경 내역이 없습니다</p>
                            <p className="text-slate-200 text-[10px] font-bold mt-2 uppercase">첫 충전을 완료해 주세요</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FACE TAB */}
              {activeTab === 'face' && (
                <div className="h-full overflow-y-auto p-10 bg-slate-50/50">
                  <div className="max-w-5xl mx-auto pt-4">
                    <div className="flex flex-col lg:flex-row gap-12 items-start">
                      {/* Left: Camera/Photo */}
                      <div className="w-full lg:w-[450px] shrink-0">
                        <div className="bg-white rounded-[48px] p-8 shadow-sm relative overflow-hidden border border-slate-100">
                          <div className="w-full aspect-square bg-slate-50 rounded-[36px] overflow-hidden border border-slate-100 relative shadow-inner">
                            {isCapturing ? (
                              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            ) : editingMember.faceImages && editingMember.faceImages.length > 0 ? (
                              <img src={editingMember.faceImages[0]} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                                <i className="fas fa-user-slash text-6xl text-slate-300"></i>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-8">등록된 얼굴 데이터가 없습니다</p>
                              </div>
                            )}

                            <div className="absolute top-6 left-6 flex items-center space-x-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                              <div className={`w-2 h-2 rounded-full ${isCapturing ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{isCapturing ? '실시간 촬영 중' : '저장된 데이터'}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 mt-8">
                            {!isCapturing ? (
                              <>
                                <button
                                  onClick={startFaceRegistration}
                                  className="bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-700 active:scale-95 flex items-center justify-center space-x-3"
                                >
                                  <i className="fas fa-camera text-sm"></i>
                                  <span>{editingMember.faceImages && editingMember.faceImages.length > 0 ? '사진 재등록하기' : '카메라로 촬영하여 등록'}</span>
                                </button>
                                <label className="bg-slate-800/40 hover:bg-slate-800/60 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center space-x-3 border border-slate-700/50 active:scale-95">
                                  <i className="fas fa-upload text-[11px]"></i>
                                  <span>파일 직접 업로드</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={captureFace}
                                  className="bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all hover:bg-blue-500 active:scale-95 flex items-center justify-center space-x-3 border-b-4 border-blue-800"
                                >
                                  <i className="fas fa-check text-sm"></i>
                                  <span>현재 모습으로 등록</span>
                                </button>
                                <button
                                  onClick={stopCamera}
                                  className="bg-white/10 hover:bg-white/20 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-white/10"
                                >
                                  취소하기
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Info/Guide */}
                      <div className="flex-1 space-y-8">
                        <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center">
                            <span className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mr-4 text-sm shadow-inner">
                              <i className="fas fa-lightbulb"></i>
                            </span>
                            얼굴 등록 가이드
                          </h4>
                          <div className="space-y-8">
                            <div className="flex items-start space-x-5">
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[12px] shrink-0 mt-0.5 font-black shadow-sm">1</div>
                              <div>
                                <p className="text-[14px] font-black text-slate-800">정면을 응시해 주세요</p>
                                <p className="text-[12px] text-slate-500 mt-1.5 font-medium leading-relaxed">얼굴이 카메라 중앙에 오도록 위치하고, 정면을 바라보는 것이 가장 정확합니다.</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-5">
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[12px] shrink-0 mt-0.5 font-black shadow-sm">2</div>
                              <div>
                                <p className="text-[14px] font-black text-slate-800">밝고 고른 조명</p>
                                <p className="text-[12px] text-slate-500 mt-1.5 font-medium leading-relaxed">얼굴에 그림자가 지지 않도록 밝은 곳에서 촬영하면 인식률이 향상됩니다.</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-5">
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[12px] shrink-0 mt-0.5 font-black shadow-sm">3</div>
                              <div>
                                <p className="text-[14px] font-black text-slate-800">얼굴 가림 방지</p>
                                <p className="text-[12px] text-slate-500 mt-1.5 font-medium leading-relaxed">마스크, 선글라스, 모자 등을 착용하지 않은 상태에서 촬영해 주세요.</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex items-start space-x-5">
                          <i className="fas fa-shield-alt text-xl mt-1 opacity-50 text-blue-500"></i>
                          <div>
                            <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-1.5">개인정보 보호 안내</p>
                            <p className="text-[12px] text-slate-500 font-medium leading-relaxed">등록된 얼굴 데이터는 보안 알고리즘으로 디지털 암호화되어 관리되며, 오직 출석 체크 용도로만 사용됩니다.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NOTES TAB */}
              {activeTab === 'notes' && (
                <div className="h-full p-10 flex flex-col bg-slate-50/50">
                  <div className="max-w-3xl mx-auto w-full h-full flex flex-col">
                    <h4 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center">
                      <i className="fas fa-lock mr-3 text-blue-600"></i>관리자 전용 비공개 메모
                    </h4>
                    <div className="flex-1 bg-yellow-100 rounded-[48px] border border-yellow-200 p-10 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200 rounded-bl-full -mr-10 -mt-10 opacity-30"></div>
                      <textarea
                        className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-slate-800 font-bold text-lg leading-relaxed p-4 placeholder:text-yellow-600/50"
                        placeholder="회원의 특이사항이나 상담 로그를 입력하세요... (건강상태, 상담내용 등)"
                        value={editFormData.memo}
                        onChange={e => setEditFormData({ ...editFormData, memo: e.target.value })}
                      ></textarea>
                      <div className="absolute bottom-10 right-10">
                        <button onClick={handleUpdateMember} className="bg-yellow-500 hover:bg-yellow-600 text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-yellow-900/10 transition-all active:scale-95 flex items-center space-x-3">
                          <i className="fas fa-save"></i>
                          <span>메모 저장하기</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ACCOUNT TAB */}
              {activeTab === 'account' && (
                <div className="h-full overflow-y-auto p-10 flex flex-col items-center justify-center bg-slate-50/50">
                  <div className="max-w-md w-full text-center space-y-10 animate-in fade-in slide-in-from-bottom-6">
                    <div className="w-28 h-28 bg-white rounded-[40px] flex items-center justify-center mx-auto text-blue-600 text-5xl shadow-sm border border-slate-50">
                      <i className="fas fa-user-gear"></i>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase mb-3">계정 및 설정 관리</h3>
                      <p className="text-slate-500 text-sm font-bold leading-relaxed">
                        계정의 상태 변경과 시스템 데이터 영구 삭제를<br />
                        안전하게 수행할 수 있습니다.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <button
                        onClick={() => handleToggleStatus(editingMember.id)}
                        className={`flex items-center justify-between p-8 rounded-[36px] border-4 transition-all active:scale-95 ${editingMember.status === 'active' ? 'bg-slate-50 border-blue-100 text-blue-600 hover:bg-blue-50' : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100'}`}
                      >
                        <div className="text-left">
                          <p className="font-black text-xl">{editingMember.status === 'active' ? '계정 일시 정지' : '계정 활성화'}</p>
                          <p className="text-xs opacity-70 mt-1 font-bold">{editingMember.status === 'active' ? '오늘부터 출석 체크가 불가능해집니다.' : '정상적으로 다시 출석이 가능해집니다.'}</p>
                        </div>
                        <i className={`fas ${editingMember.status === 'active' ? 'fa-pause-circle' : 'fa-play-circle'} text-4xl opacity-50`}></i>
                      </button>

                      <button
                        onClick={() => setDeleteModal({ open: true, member: editingMember })}
                        className="flex items-center justify-between p-8 rounded-[36px] border-4 bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all group active:scale-95"
                      >
                        <div className="text-left">
                          <p className="font-black text-xl">관원 정보 영구 삭제</p>
                          <p className="text-xs opacity-70 group-hover:text-red-100 italic mt-1 font-bold">삭제된 데이터는 절대 복구할 수 없습니다.</p>
                        </div>
                        <i className="fas fa-trash-alt text-3xl opacity-50 group-hover:opacity-100"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )
      }

      <canvas ref={canvasRef} className="hidden" />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      {/* Delete Member Confirmation Modal */}
      {
        deleteModal.open && deleteModal.member && (
          <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[48px] shadow-2xl p-10 md:p-12 animate-in zoom-in-95 duration-300 border-4 border-white">
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-red-500 text-3xl shadow-inner">
                  <i className="fas fa-user-slash"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900 italic mb-3 uppercase tracking-tighter">관원 데이터 삭제</h3>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  <span className="font-black text-[#0f172a] underline decoration-red-200 decoration-4 underline-offset-4">{deleteModal.member.name}</span> 관원님의 정보를<br />
                  정말로 시스템에서 삭제하시겠습니까?
                </p>
              </div>

              <div className="bg-red-50 rounded-[32px] p-6 mb-10 border border-red-100 flex items-start space-x-4">
                <i className="fas fa-exclamation-triangle text-red-400 mt-1 text-lg"></i>
                <div>
                  <p className="font-black text-red-900 text-sm">복구가 불가능한 작업입니다</p>
                  <p className="text-[12px] text-red-600/70 mt-1 font-bold leading-relaxed">회원 정보, 얼굴 데이터, 모든 출결 및 결제 히스토리가 영구적으로 삭제됩니다.</p>
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleDeleteMember}
                  className="w-full py-5 rounded-2xl font-black text-white bg-red-500 hover:bg-red-600 transition-all shadow-xl shadow-red-900/20 active:scale-95 border-b-4 border-red-700"
                >
                  <i className="fas fa-trash-alt mr-2"></i>네, 영구 삭제합니다
                </button>
                <button
                  onClick={() => setDeleteModal({ open: false, member: null })}
                  className="w-full py-5 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95"
                >
                  아니오, 취소합니다
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Ticket Recharge Modal */}
      {
        ticketModal.open && ticketModal.member && (
          <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[56px] shadow-2xl p-10 md:p-12 animate-in zoom-in-95 duration-300 border-4 border-white">
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-blue-600 text-3xl shadow-inner">
                  <i className="fas fa-ticket-alt"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900 italic mb-3 uppercase tracking-tighter">수강권 신규 충전</h3>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  <span className="font-black text-[#0f172a]">{ticketModal.member.name}</span> 관원님에게<br />
                  수강 횟수를 추가합니다
                </p>
              </div>

              <div className="space-y-8 mb-10">
                <div>
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 block text-center">충전 횟수 선택</label>
                  <div className="flex items-center justify-center space-x-6">
                    <button
                      onClick={() => setTicketAmount(prev => Math.max(1, prev - 1))}
                      className="w-16 h-16 flex-shrink-0 rounded-[28px] bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-400 transition-all active:scale-90 text-2xl flex items-center justify-center shadow-sm"
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <div className="relative">
                      <input
                        type="number"
                        value={ticketAmount}
                        onChange={e => setTicketAmount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-32 md:w-40 px-2 py-6 rounded-[32px] border-4 border-slate-50 bg-slate-50/30 font-black text-center text-5xl text-slate-900 focus:border-blue-500 transition-all focus:outline-none shadow-inner"
                        min="1"
                      />
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-blue-400 uppercase">SESSIONS</span>
                    </div>
                    <button
                      onClick={() => setTicketAmount(prev => prev + 1)}
                      className="w-16 h-16 flex-shrink-0 rounded-[28px] bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white transition-all active:scale-90 text-2xl flex items-center justify-center shadow-lg shadow-blue-900/20"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[10, 20, 30, 50].map(preset => (
                    <button
                      key={preset}
                      onClick={() => setTicketAmount(preset)}
                      className={`py-4 rounded-[22px] font-black text-xs transition-all active:scale-95 border-2 ${ticketAmount === preset ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-50 text-slate-400 hover:bg-slate-50'}`}
                    >
                      {preset}회
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-4 block">충전 관련 메모</label>
                  <input
                    type="text"
                    value={ticketNote}
                    onChange={e => setTicketNote(e.target.value)}
                    placeholder="예: 1개월 정기권 (현금 결제)"
                    className="w-full px-8 py-5 rounded-[28px] border-2 border-slate-50 bg-slate-50/10 font-bold text-slate-800 focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="bg-[#0f172a] text-white rounded-[32px] p-6 mb-10 flex justify-between items-center shadow-xl shadow-slate-900/20 px-8">
                <span className="text-xs font-black uppercase tracking-widest opacity-50">충전 후 예상 잔액</span>
                <div className="text-right">
                  <span className="text-lg font-black italic line-through opacity-30 mr-3">{ticketModal.member.remainingTickets}회</span>
                  <span className="text-2xl font-black italic text-blue-400 shadow-blue-500/50">{ticketModal.member.remainingTickets + ticketAmount}회</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setTicketModal({ open: false, member: null }); setTicketAmount(10); setTicketNote(''); }}
                  className="py-5 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95"
                >
                  돌아가기
                </button>
                <button
                  onClick={handleAddTickets}
                  className="py-5 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 border-b-4 border-blue-800 active:scale-95 flex items-center justify-center"
                >
                  <i className="fas fa-check-circle mr-2"></i>충전 완료
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Manual Adjustment Modal */}
      {
        adjustModal.open && adjustModal.member && (
          <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[56px] shadow-2xl p-10 md:p-12 animate-in zoom-in-95 duration-300 border-4 border-white">
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-blue-600 text-3xl shadow-inner">
                  <i className="fas fa-sliders-h"></i>
                </div>
                <h3 className="text-3xl font-black text-slate-900 italic mb-3 uppercase tracking-tighter">수강권 수동 조정</h3>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  관리자가 직접 잔액을 추가하거나 차감합니다.<br />
                  오기입 정정이나 특별 보상 시 사용하세요.
                </p>
              </div>

              <div className="space-y-10 mb-10">
                <div className="flex bg-slate-50 p-2 rounded-[28px] shadow-inner">
                  <button
                    onClick={() => setAdjustType('add')}
                    className={`flex-1 py-4 rounded-[22px] font-black text-xs transition-all flex items-center justify-center space-x-2 ${adjustType === 'add' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-blue-500'}`}
                  >
                    <i className="fas fa-plus-circle"></i>
                    <span>강제 추가</span>
                  </button>
                  <button
                    onClick={() => setAdjustType('sub')}
                    className={`flex-1 py-4 rounded-[22px] font-black text-xs transition-all flex items-center justify-center space-x-2 ${adjustType === 'sub' ? 'bg-white text-red-600 shadow-md' : 'text-slate-400 hover:text-red-500'}`}
                  >
                    <i className="fas fa-minus-circle"></i>
                    <span>강제 차감</span>
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 block text-center">조정할 세션 수</label>
                  <div className="flex items-center justify-center space-x-8">
                    <button
                      onClick={() => setAdjustAmount(Math.max(1, adjustAmount - 1))}
                      className="w-16 h-16 rounded-[24px] border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center active:scale-90"
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <input
                      type="number"
                      value={adjustAmount}
                      onChange={e => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 text-center text-5xl font-black text-slate-900 focus:outline-none bg-transparent"
                    />
                    <button
                      onClick={() => setAdjustAmount(adjustAmount + 1)}
                      className="w-16 h-16 rounded-[24px] border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center active:scale-90"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-4 block">조정 사유 기록</label>
                  <input
                    type="text"
                    placeholder="예: 수강권 오등록 수정, 출석 누락 보상"
                    value={adjustNote}
                    onChange={e => setAdjustNote(e.target.value)}
                    className="w-full px-8 py-5 rounded-[28px] border-2 border-slate-50 bg-slate-50/10 font-bold text-slate-800 focus:border-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setAdjustModal({ open: false, member: null }); setAdjustAmount(1); setAdjustNote(''); }}
                  className="py-5 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95"
                >
                  나가기
                </button>
                <button
                  onClick={handleAdjustTickets}
                  className={`py-5 rounded-2xl font-black text-white transition-all shadow-xl active:scale-95 border-b-4 flex items-center justify-center ${adjustType === 'add' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/10 border-blue-800' : 'bg-red-500 hover:bg-red-600 shadow-red-900/10 border-red-700'}`}
                >
                  <i className="fas fa-check-double mr-2"></i>조정 적용
                </button>
              </div>
            </div>
          </div>
        )
      }
    </Layout >
  );
};