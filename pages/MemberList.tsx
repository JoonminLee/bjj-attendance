import React, { useState, useRef } from 'react';
import { storageService } from '../services/storage';
import { Layout } from '../components/Layout';
import { Member } from '../types';

export const MemberList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>(storageService.getMembers());
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'tickets' | 'notes'>('info');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Camera
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
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

  const filteredMembers = members.filter(m =>
    m.name.includes(searchTerm) || m.phone.includes(searchTerm)
  );

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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        if (isAddModalOpen) {
          setCapturedImages([dataUrl]);
        } else if (isEditModalOpen && editingMember) {
          const updatedMember = { ...editingMember, faceImages: [dataUrl] };
          setEditingMember(updatedMember);
          storageService.updateMember(updatedMember);
          setMembers(storageService.getMembers());
          handleSaveFeedback();
        }

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

    const updatedMember: Member = {
      ...editingMember,
      name: editFormData.name,
      phone: editFormData.phone,
      remainingTickets: editFormData.tickets,
      birthDate: editFormData.birthDate,
      gender: editFormData.gender as any,
      parentPhone: editFormData.parentPhone,
      email: editFormData.email,
      address: editFormData.address,
      memo: editFormData.memo
    };

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
      case 'Brown': return 'text-amber-800 bg-amber-50 border-amber-100';
      case 'Black': return 'text-slate-900 bg-slate-100 border-slate-200';
      case 'Grey': return 'text-slate-500 bg-slate-50 border-slate-200';
      case 'Yellow': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      case 'Orange': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'Green': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      default: return 'text-slate-500 bg-white border-slate-200';
    }
  };

  return (
    <Layout role="admin">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic leading-none">Registry</h2>
          <p className="text-slate-500 font-medium mt-2">Manage member registration and facial recognition data.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-slate-900 hover:bg-black text-white px-8 py-5 rounded-[28px] font-black flex items-center justify-center space-x-3 transition-all shadow-2xl shadow-slate-900/20 active:scale-95 group"
        >
          <i className="fas fa-plus-circle text-lg group-hover:rotate-90 transition-transform"></i>
          <span>New Member</span>
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden mb-20">
        {/* Search Bar */}
        <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="relative w-full max-w-md">
            <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search by name or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 rounded-[22px] border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
            />
          </div>
          <div className="flex items-center space-x-5 whitespace-nowrap">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total: {filteredMembers.length}</span>
          </div>
        </div>

        {/* Member List - Responsive Design */}
        <div className="overflow-hidden min-w-full">
          {/* Desktop Table Header */}
          <table className="w-full text-left hidden md:table">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profile Info</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rank & Stats</th>
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
                    <div className="flex flex-col space-y-2">
                      <div className={`inline-flex items-center self-start px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getBeltColorClass(member.belt || 'White')}`}>
                        <span className="mr-1">{member.belt || 'White'}</span>
                        {member.stripes > 0 && <span className="text-[9px] opacity-70"> • {member.stripes} Stripes</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-ticket text-[10px] text-slate-300"></i>
                        <span className="text-xs font-bold text-slate-500">{member.remainingTickets} Left</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${member.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${member.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      {member.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => openEditModal(member)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all active:scale-90 flex items-center justify-center shadow-sm" title="Edit Member">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button onClick={() => handleToggleStatus(member.id)} className={`w-10 h-10 rounded-xl transition-all active:scale-90 flex items-center justify-center shadow-sm ${member.status === 'active' ? 'bg-slate-50 text-slate-400 hover:bg-orange-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`} title={member.status === 'active' ? 'Suspend' : 'Activate'}>
                        <i className={`fas ${member.status === 'active' ? 'fa-ban' : 'fa-check'}`}></i>
                      </button>
                      <button onClick={() => setDeleteModal({ open: true, member })} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white transition-all active:scale-90 flex items-center justify-center shadow-sm" title="Delete Member">
                        <i className="fas fa-trash-alt"></i>
                      </button>
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
              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 text-slate-200 text-4xl">
                <i className="fas fa-search"></i>
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No records found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[56px] shadow-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col md:flex-row h-auto max-h-[90vh]">
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
              <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase mb-8">New Member</h3>
              <form onSubmit={handleAddMember} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Personal Info</label>
                    <input type="text" placeholder="Full Name *" required value={newMemberData.name} onChange={e => setNewMemberData({ ...newMemberData, name: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 mb-3 font-bold" />
                    <div className="flex gap-2">
                      <input type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={newMemberData.birthDate} onChange={e => setNewMemberData({ ...newMemberData, birthDate: formatDateString(e.target.value) })} className="w-2/3 px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm" maxLength={10} />
                      <select value={newMemberData.gender} onChange={e => setNewMemberData({ ...newMemberData, gender: e.target.value })} className="w-1/3 px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm">
                        <option value="Male">Male</option><option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Contact</label>
                    <input type="text" inputMode="numeric" placeholder="Phone * (010-0000-0000)" required value={newMemberData.phone} onChange={e => setNewMemberData({ ...newMemberData, phone: formatPhoneNumber(e.target.value) })} className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 mb-3 font-bold" maxLength={13} />
                    <input type="text" inputMode="numeric" placeholder="Parent Phone (Kids)" value={newMemberData.parentPhone} onChange={e => setNewMemberData({ ...newMemberData, parentPhone: formatPhoneNumber(e.target.value) })} className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold" maxLength={13} />
                  </div>
                  <div className="col-span-2">
                    <input type="email" placeholder="Email (Optional)" value={newMemberData.email} onChange={e => setNewMemberData({ ...newMemberData, email: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 mb-3 font-bold" />
                    <input type="text" placeholder="Address (Optional)" value={newMemberData.address} onChange={e => setNewMemberData({ ...newMemberData, address: e.target.value })} className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold" />
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Membership & Rank</label>
                  <div className="grid grid-cols-3 gap-3">
                    <select value={newMemberData.belt} onChange={e => setNewMemberData({ ...newMemberData, belt: e.target.value })} className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm">
                      <optgroup label="Adult">{ADULT_BELTS.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
                      <optgroup label="Kids">{KIDS_BELTS.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
                    </select>
                    <select value={newMemberData.stripes} onChange={e => setNewMemberData({ ...newMemberData, stripes: parseInt(e.target.value) })} className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm">
                      {[0, 1, 2, 3, 4].map(s => <option key={s} value={s}>{s} Stripes</option>)}
                    </select>
                    <input type="number" placeholder="Tickets" value={newMemberData.tickets} onChange={e => setNewMemberData({ ...newMemberData, tickets: parseInt(e.target.value) })} className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm" />
                  </div>
                </div>
                <button type="submit" disabled={isCapturing || capturedImages.length < 1} className={`w-full py-4 rounded-xl font-black text-white transition-all shadow-xl ${isCapturing || capturedImages.length < 1 ? 'bg-slate-200' : 'bg-slate-900 hover:bg-black'}`}>Create Account</button>
              </form>
            </div>

            <div className="w-full md:w-[350px] bg-slate-900 p-10 flex flex-col text-white relative">
              <button onClick={closeAddModal} className="absolute top-6 right-6 text-white hover:text-slate-300"><i className="fas fa-times text-2xl"></i></button>
              <div className="flex-1 flex flex-col items-center justify-center">
                {isCapturing ? (
                  <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden border-2 border-slate-700">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                    <button onClick={captureFace} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg"><i className="fas fa-camera text-slate-900"></i></button>
                  </div>
                ) : (
                  <div className="text-center w-full">
                    <div className="w-full aspect-[3/4] bg-white/5 rounded-3xl border-2 border-dashed border-slate-700 mb-6 flex items-center justify-center overflow-hidden">
                      {capturedImages[0] ? <img src={capturedImages[0]} className="w-full h-full object-cover" /> : <span className="text-slate-500 font-bold">No Photo</span>}
                    </div>
                    <button onClick={() => { setCapturedImages([]); startFaceRegistration(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest w-full">
                      {capturedImages.length > 0 ? 'Retake Photo' : 'Open Camera'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal (Full CRM) */}
      {isEditModalOpen && editingMember && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl ${getBeltColorClass(editingMember.belt).split(' ')[1]} flex items-center justify-center text-lg font-black italic shadow-inner`}>
                  {editingMember.name[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter">{editingMember.name}</h2>
                  <p className="text-xs text-slate-500 font-medium">{editingMember.belt} Belt • {editingMember.stripes} Stripes</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {saveStatus === 'saved' && (
                  <span className="text-emerald-500 font-black text-sm uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                    <i className="fas fa-check-circle mr-2"></i>Saved!
                  </span>
                )}
                <button onClick={closeEditModal} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-10">
              {(['info', 'history', 'tickets', 'notes'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  {tab === 'info' && <i className="fas fa-user mr-2"></i>}
                  {tab === 'history' && <i className="fas fa-medal mr-2"></i>}
                  {tab === 'tickets' && <i className="fas fa-ticket-alt mr-2"></i>}
                  {tab === 'notes' && <i className="fas fa-sticky-note mr-2"></i>}
                  {tab === 'history' ? 'Belt' : tab}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-slate-50">
              {/* INFO TAB */}
              {activeTab === 'info' && (
                <div className="h-full overflow-y-auto p-10">
                  <form onSubmit={handleUpdateMember} className="max-w-3xl mx-auto space-y-8">
                    {/* Basic Info */}
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                      <h4 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest"><i className="fas fa-id-card mr-2 text-blue-500"></i>Basic Information</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
                          <input type="text" required value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Phone Number</label>
                          <input type="text" inputMode="numeric" required value={editFormData.phone} onChange={e => setEditFormData({ ...editFormData, phone: formatPhoneNumber(e.target.value) })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold" placeholder="Parent Phone" maxLength={13} />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Birth Date</label>
                          <input type="text" inputMode="numeric" value={editFormData.birthDate} onChange={e => setEditFormData({ ...editFormData, birthDate: formatDateString(e.target.value) })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm" placeholder="YYYY-MM-DD" maxLength={10} />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Gender</label>
                          <select value={editFormData.gender} onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold">
                            <option value="Male">Male</option><option value="Female">Female</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Contact & Address */}
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                      <h4 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest"><i className="fas fa-map-marker-alt mr-2 text-orange-500"></i>Contact Details</h4>
                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Parent Phone (For Kids)</label>
                          <input type="text" inputMode="numeric" value={editFormData.parentPhone} onChange={e => setEditFormData({ ...editFormData, parentPhone: formatPhoneNumber(e.target.value) })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold" placeholder="Parent Phone" maxLength={13} />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Email Address</label>
                            <input type="email" value={editFormData.email} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Home Address</label>
                            <input type="text" value={editFormData.address} onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Face Data */}
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                      <h4 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-widest"><i className="fas fa-eye mr-2 text-indigo-500"></i>Facial Recognition</h4>
                      <div className="flex items-center space-x-8">
                        <div className="w-32 h-40 bg-slate-100 rounded-2xl border-2 border-slate-200 overflow-hidden shadow-inner flex items-center justify-center">
                          {isCapturing ? (
                            <div className="relative w-full h-full bg-black">
                              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                              <button type="button" onClick={captureFace} className="absolute inset-0 m-auto w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white"><i className="fas fa-camera"></i></button>
                            </div>
                          ) : editingMember.faceImages && editingMember.faceImages.length > 0 ? (
                            <img src={editingMember.faceImages[0]} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <i className="fas fa-user-circle text-3xl text-slate-300"></i>
                              <p className="text-[8px] font-bold text-slate-400 mt-2">NO DATA</p>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                            {editingMember.faceImages && editingMember.faceImages.length > 0
                              ? "이미 등록된 얼굴 데이터가 있습니다. 다시 등록하면 기존 데이터가 교체됩니다."
                              : "출석 키오스크에서 얼굴 인식을 사용하려면 정면 사진을 등록해 주세요."}
                          </p>
                          <button
                            type="button"
                            onClick={() => isCapturing ? stopCamera() : startFaceRegistration()}
                            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isCapturing ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                          >
                            {isCapturing ? "Cancel" : editingMember.faceImages && editingMember.faceImages.length > 0 ? "Update Photo" : "Register Photo"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tickets */}
                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest"><i className="fas fa-ticket-alt mr-2 text-emerald-500"></i>Membership</h4>
                        <button
                          type="button"
                          onClick={() => setTicketModal({ open: true, member: editingMember })}
                          className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full hover:bg-emerald-100 transition-colors"
                        >
                          <i className="fas fa-plus mr-1"></i> 수강권 충전
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Remaining Tickets</label>
                        <div className="flex items-center space-x-4">
                          <button type="button" onClick={() => setEditFormData(prev => ({ ...prev, tickets: Math.max(0, prev.tickets - 1) }))} className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black">-</button>
                          <input type="number" value={editFormData.tickets} onChange={e => setEditFormData({ ...editFormData, tickets: parseInt(e.target.value) })} className="flex-1 px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-black text-center text-2xl" />
                          <button type="button" onClick={() => setEditFormData(prev => ({ ...prev, tickets: prev.tickets + 1 }))} className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black">+</button>
                        </div>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-50 p-6 rounded-[24px] border border-red-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-red-900 text-sm">위험 구역</p>
                          <p className="text-xs text-red-400">회원 정보와 모든 출결 기록이 영구 삭제됩니다</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteModal({ open: true, member: editingMember })}
                          className="px-5 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors"
                        >
                          <i className="fas fa-trash-alt mr-2"></i>회원 삭제
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 pb-20">
                      <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95">Save Changes</button>
                    </div>
                  </form>
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === 'history' && (
                <div className="h-full flex flex-col md:flex-row p-6 gap-6 overflow-hidden">
                  <div className="flex-1 bg-white rounded-[32px] p-8 border border-slate-100 overflow-y-auto custom-scrollbar shadow-sm">
                    <h4 className="text-lg font-black text-slate-900 mb-6 italic">Timeline</h4>
                    <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                      {editingMember.promotionHistory && editingMember.promotionHistory.length > 0 ? (
                        editingMember.promotionHistory.map((history, idx) => (
                          <div key={idx} className="flex items-start space-x-5 relative group">
                            <div className="w-10 h-10 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center z-10 shadow-sm">
                              {idx === 0 ? <i className="fas fa-trophy text-yellow-500 text-xs"></i> : <i className="fas fa-circle text-slate-200 text-[6px]"></i>}
                            </div>
                            <div className="flex-1 bg-slate-50 p-5 rounded-2xl border border-slate-100 hover:border-slate-300 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getBeltColorClass(history.belt)}`}>
                                  {history.belt} <span className="mx-1">•</span> {history.stripes} Stripes
                                </div>
                                <button onClick={() => handleDeleteHistory(idx)} className="text-slate-300 hover:text-red-500"><i className="fas fa-trash-alt"></i></button>
                              </div>
                              <p className="text-sm font-black text-slate-900 mb-1">{history.date}</p>
                              {history.note && <p className="text-xs text-slate-500">{history.note}</p>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20 text-slate-400">No promotion history found.</div>
                      )}
                    </div>
                  </div>
                  <div className="w-full md:w-[350px] bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex flex-col">
                    <h4 className="text-lg font-black text-slate-900 mb-6 italic">Promote</h4>
                    <form onSubmit={handleAddPromotion} className="flex-1 flex flex-col space-y-4">
                      <input type="text" inputMode="numeric" value={promoDate} onChange={e => setPromoDate(formatDateString(e.target.value))} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm" placeholder="YYYY-MM-DD" maxLength={10} />
                      <select value={promoBelt} onChange={e => setPromoBelt(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold">
                        <optgroup label="Adult">{ADULT_BELTS.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
                        <optgroup label="Kids">{KIDS_BELTS.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
                      </select>
                      <select value={promoStripes} onChange={e => setPromoStripes(parseInt(e.target.value))} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold">
                        {[0, 1, 2, 3, 4].map(s => <option key={s} value={s}>{s} Stripes</option>)}
                      </select>
                      <textarea placeholder="Promotion Note" value={promoNote} onChange={e => setPromoNote(e.target.value)} className="flex-1 w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold resize-none" />
                      <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all">Add Record</button>
                    </form>
                  </div>
                </div>
              )}

              {/* TICKETS TAB */}
              {activeTab === 'tickets' && (
                <div className="h-full flex flex-col p-6 overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-lg font-black text-slate-900 italic">Ticket History</h4>
                      <p className="text-xs text-slate-500 mt-1">수강권 충전 및 사용 내역</p>
                    </div>
                    <button
                      onClick={() => setTicketModal({ open: true, member: editingMember })}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      <i className="fas fa-plus mr-2"></i>충전하기
                    </button>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">잔여</p>
                      <p className="text-3xl font-black text-slate-900 italic">{editingMember?.remainingTickets || 0}<span className="text-sm not-italic text-slate-400 ml-1">회</span></p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">총 충전</p>
                      <p className="text-3xl font-black text-emerald-600 italic">{editingMember?.totalTickets || 0}<span className="text-sm not-italic text-slate-400 ml-1">회</span></p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">사용</p>
                      <p className="text-3xl font-black text-blue-600 italic">{(editingMember?.totalTickets || 0) - (editingMember?.remainingTickets || 0)}<span className="text-sm not-italic text-slate-400 ml-1">회</span></p>
                    </div>
                  </div>

                  {/* History List */}
                  <div className="flex-1 bg-white rounded-[32px] border border-slate-100 p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                      {editingMember?.ticketHistory && editingMember.ticketHistory.length > 0 ? (
                        [...editingMember.ticketHistory].reverse().map((h, idx) => (
                          <div key={h.id || idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-50">
                            <div className="flex items-center space-x-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${h.type === 'add' ? 'bg-emerald-100 text-emerald-600' :
                                h.type === 'refund' ? 'bg-blue-100 text-blue-600' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                <i className={`fas ${h.type === 'add' ? 'fa-plus' : h.type === 'refund' ? 'fa-undo' : 'fa-minus'}`}></i>
                              </div>
                              <div>
                                <p className="font-black text-slate-900">
                                  {h.type === 'add' && '수강권 충전'}
                                  {h.type === 'use' && '수강권 사용'}
                                  {h.type === 'refund' && '수강권 환불'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {h.note && <span className="ml-2 text-slate-400">• {h.note}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-black ${h.type === 'use' ? 'text-red-500' : 'text-emerald-500'}`}>
                                {h.type === 'use' ? '-' : '+'}{h.amount}
                              </p>
                              <p className="text-xs text-slate-400">잔액: {h.balance}회</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20">
                          <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-200 text-2xl">
                            <i className="fas fa-receipt"></i>
                          </div>
                          <p className="text-slate-400 font-bold text-sm">수강권 변경 내역이 없습니다</p>
                          <p className="text-slate-300 text-xs mt-1">충전하면 여기에 표시됩니다</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* NOTES TAB */}
              {activeTab === 'notes' && (
                <div className="h-full p-10 flex flex-col">
                  <h4 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest"><i className="fas fa-lock mr-2 text-red-500"></i>Private Admin Memo</h4>
                  <div className="flex-1 bg-yellow-50 rounded-[32px] border border-yellow-100 p-6 shadow-sm relative">
                    <textarea
                      className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-slate-800 font-medium leading-relaxed p-4"
                      placeholder="Write private notes about this member (e.g. medical conditions, consultation log)..."
                      value={editFormData.memo}
                      onChange={e => setEditFormData({ ...editFormData, memo: e.target.value })}
                    ></textarea>
                    <div className="absolute bottom-6 right-6">
                      <button onClick={handleUpdateMember} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-8 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95">Save Note</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      {/* Delete Member Confirmation Modal */}
      {deleteModal.open && deleteModal.member && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500 text-2xl">
                <i className="fas fa-user-slash"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 italic mb-2">회원 삭제</h3>
              <p className="text-slate-500 text-sm">
                <span className="font-black text-slate-900">{deleteModal.member.name}</span>님을<br />
                정말로 삭제하시겠습니까?
              </p>
            </div>

            <div className="bg-red-50 rounded-2xl p-5 mb-8 border border-red-100">
              <div className="flex items-start space-x-3">
                <i className="fas fa-exclamation-triangle text-red-400 mt-0.5"></i>
                <div>
                  <p className="font-bold text-red-900 text-sm">이 작업은 되돌릴 수 없습니다</p>
                  <p className="text-xs text-red-500 mt-1">회원 정보, 얼굴 데이터, 모든 출결 기록이 영구적으로 삭제됩니다.</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setDeleteModal({ open: false, member: null })}
                className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteMember}
                className="flex-1 py-4 rounded-2xl font-black text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                <i className="fas fa-trash-alt mr-2"></i>삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Recharge Modal */}
      {ticketModal.open && ticketModal.member && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-10 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500 text-2xl">
                <i className="fas fa-ticket-alt"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 italic mb-2">수강권 충전</h3>
              <p className="text-slate-500 text-sm">
                <span className="font-black text-slate-900">{ticketModal.member.name}</span>님에게<br />
                수강권을 충전합니다
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">충전 횟수</label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setTicketAmount(prev => Math.max(1, prev - 1))}
                    className="w-14 h-14 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xl"
                  >-</button>
                  <input
                    type="number"
                    value={ticketAmount}
                    onChange={e => setTicketAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-black text-center text-3xl"
                    min="1"
                  />
                  <button
                    onClick={() => setTicketAmount(prev => prev + 1)}
                    className="w-14 h-14 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xl"
                  >+</button>
                </div>
              </div>
              <div className="flex space-x-2">
                {[10, 20, 30, 50].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setTicketAmount(preset)}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${ticketAmount === preset ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {preset}회
                  </button>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">메모 (선택)</label>
                <input
                  type="text"
                  value={ticketNote}
                  onChange={e => setTicketNote(e.target.value)}
                  placeholder="예: 1개월 정기권 결제"
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-medium"
                />
              </div>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-5 mb-8 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-600">현재 잔액</span>
              <span className="text-lg font-black text-slate-900">{ticketModal.member.remainingTickets}회 → <span className="text-emerald-600">{ticketModal.member.remainingTickets + ticketAmount}회</span></span>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => { setTicketModal({ open: false, member: null }); setTicketAmount(10); setTicketNote(''); }}
                className="flex-1 py-4 rounded-2xl font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddTickets}
                className="flex-1 py-4 rounded-2xl font-black text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <i className="fas fa-plus mr-2"></i>충전하기
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};