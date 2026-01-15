
import { Member, AttendanceRecord } from '../types';

const KEYS = {
  MEMBERS: 'oss_gym_members',
  ATTENDANCE: 'oss_gym_attendance',
  CURRENT_MEMBER_ID: 'oss_gym_current_member_id'
};

const INITIAL_MEMBERS: Member[] = [
  { 
    id: '1', 
    name: '김철수', 
    phone: '010-1234-5678', 
    joinDate: '2023-10-01', 
    totalTickets: 20, 
    remainingTickets: 12, 
    status: 'active',
    faceImages: []
  }
];

export const storageService = {
  getMembers: (): Member[] => {
    const data = localStorage.getItem(KEYS.MEMBERS);
    if (!data) {
      localStorage.setItem(KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
      return INITIAL_MEMBERS;
    }
    return JSON.parse(data);
  },

  getMembersByPhoneSuffix: (suffix: string): Member[] => {
    const members = storageService.getMembers().filter(m => m.status === 'active');
    return members.filter(m => {
      const cleanPhone = m.phone.replace(/[^0-9]/g, '');
      return cleanPhone.endsWith(suffix);
    });
  },

  saveMembers: (members: Member[]) => {
    localStorage.setItem(KEYS.MEMBERS, JSON.stringify(members));
  },

  addMember: (member: Omit<Member, 'id'>) => {
    const members = storageService.getMembers();
    const newMember = { ...member, id: Date.now().toString() };
    storageService.saveMembers([...members, newMember]);
    return newMember;
  },

  updateMember: (updatedMember: Member) => {
    const members = storageService.getMembers();
    storageService.saveMembers(members.map(m => m.id === updatedMember.id ? updatedMember : m));
  },

  getAttendance: (): AttendanceRecord[] => {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  },

  addAttendance: (memberId: string) => {
    const members = storageService.getMembers();
    const member = members.find(m => m.id === memberId);
    
    if (!member) throw new Error('회원을 찾을 수 없습니다.');
    if (member.remainingTickets <= 0) throw new Error('수강권이 부족합니다.');

    const updatedMember = { ...member, remainingTickets: member.remainingTickets - 1 };
    storageService.updateMember(updatedMember);

    const attendance = storageService.getAttendance();
    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      memberId,
      memberName: member.name,
      timestamp: new Date().toISOString(),
      type: 'check-in'
    };
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([newRecord, ...attendance]));
    return { member: updatedMember, record: newRecord };
  },

  logoutMember: () => {
    localStorage.removeItem(KEYS.CURRENT_MEMBER_ID);
  },

  setCurrentMember: (id: string) => {
    localStorage.setItem(KEYS.CURRENT_MEMBER_ID, id);
  },

  getCurrentMember: (): Member | null => {
    const id = localStorage.getItem(KEYS.CURRENT_MEMBER_ID);
    if (!id) return null;
    return storageService.getMembers().find(m => m.id === id) || null;
  }
};
