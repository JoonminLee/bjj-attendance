
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
    belt: 'White',
    stripes: 0,
    promotionHistory: [
      { date: '2023-10-01', belt: 'White', stripes: 0, note: '입관' }
    ],
    memo: '초기 멤버. 성실함.',
    gender: 'Male',
    birthDate: '1990-01-01',
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
    const joinDate = member.joinDate || new Date().toISOString().split('T')[0];
    const initialBelt = (member as any).belt || 'White';
    const initialStripes = (member as any).stripes || 0;

    const newMember: Member = {
      ...member,
      id: Date.now().toString(),
      joinDate,
      belt: initialBelt,
      stripes: initialStripes,
      memo: (member as any).memo || '',
      parentPhone: (member as any).parentPhone || '',
      birthDate: (member as any).birthDate || '',
      gender: (member as any).gender || 'Male',
      email: (member as any).email || '',
      address: (member as any).address || '',
      promotionHistory: [
        { date: joinDate, belt: initialBelt, stripes: initialStripes, note: 'Initial Registration' }
      ],
      ticketHistory: [
        {
          id: 'initial',
          date: new Date().toISOString(),
          type: 'add',
          amount: Number(member.totalTickets || 0),
          balance: Number(member.remainingTickets || 0),
          note: '최초 등록'
        }
      ]
    };
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

    const newBalance = member.remainingTickets - 1;
    const updatedMember: Member = {
      ...member,
      remainingTickets: newBalance,
      ticketHistory: [
        ...(member.ticketHistory || []),
        {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: 'use',
          amount: 1,
          balance: newBalance,
          note: '출석 체크'
        }
      ]
    };
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
  },

  // 출결 기록 삭제 (수강권 복구 포함)
  deleteAttendance: (attendanceId: string, refundTicket: boolean = true) => {
    const attendance = storageService.getAttendance();
    const record = attendance.find(a => a.id === attendanceId);

    if (!record) throw new Error('출결 기록을 찾을 수 없습니다.');

    // 수강권 복구
    if (refundTicket) {
      const members = storageService.getMembers();
      const member = members.find(m => m.id === record.memberId);
      if (member) {
        const updatedMember: Member = {
          ...member,
          remainingTickets: member.remainingTickets + 1,
          ticketHistory: [
            ...(member.ticketHistory || []),
            {
              id: Date.now().toString(),
              date: new Date().toISOString(),
              type: 'refund',
              amount: 1,
              balance: member.remainingTickets + 1,
              note: `출결 취소로 인한 복구 (${new Date(record.timestamp).toLocaleDateString()})`
            }
          ]
        };
        storageService.updateMember(updatedMember);
      }
    }

    // 출결 기록 삭제
    const updatedAttendance = attendance.filter(a => a.id !== attendanceId);
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(updatedAttendance));
    return { deleted: record };
  },

  // --- Performance Testing Helpers ---
  generateDummyMembers: (count: number, imagePool?: string[], descriptorPool?: number[][]) => {
    const existingMembers = storageService.getMembers();
    const dummyMembers: Member[] = [];
    const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
    const names = ['철수', '영희', '민수', '지수', '태현', '서연', '도윤', '하윤', '준우', '민준'];

    for (let i = 0; i < count; i++) {
      const surname = surnames[Math.floor(Math.random() * surnames.length)];
      const name = names[Math.floor(Math.random() * names.length)];
      const id = `dummy-${Date.now()}-${i}`;

      const faceImages = imagePool && imagePool.length > 0
        ? [imagePool[i % imagePool.length]]
        : ['mock-face-data'];

      const faceDescriptor = descriptorPool && descriptorPool.length > 0
        ? descriptorPool[i % descriptorPool.length]
        : Array.from({ length: 128 }, () => Math.random());

      dummyMembers.push({
        id,
        name: `${surname}${name}${i}`,
        phone: `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        joinDate: new Date().toISOString().split('T')[0],
        belt: 'White',
        stripes: 0,
        remainingTickets: 10,
        totalTickets: 10,
        status: 'active',
        faceImages,
        faceDescriptor,
        promotionHistory: []
      });
    }

    storageService.saveMembers([...existingMembers, ...dummyMembers]);
    return dummyMembers.length;
  },

  clearDummyMembers: () => {
    const members = storageService.getMembers().filter(m => !m.id.startsWith('dummy-'));
    storageService.saveMembers(members);
  },

  // 회원 완전 삭제
  deleteMember: (memberId: string) => {
    const members = storageService.getMembers();
    const member = members.find(m => m.id === memberId);

    if (!member) throw new Error('회원을 찾을 수 없습니다.');

    // 해당 회원의 출결 기록도 함께 삭제
    const attendance = storageService.getAttendance();
    const updatedAttendance = attendance.filter(a => a.memberId !== memberId);
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(updatedAttendance));

    // 회원 삭제
    const updatedMembers = members.filter(m => m.id !== memberId);
    storageService.saveMembers(updatedMembers);

    return { deleted: member };
  },

  // 수강권 충전
  addTickets: (memberId: string, amount: number, note?: string) => {
    const members = storageService.getMembers();
    const member = members.find(m => m.id === memberId);

    if (!member) throw new Error('회원을 찾을 수 없습니다.');

    const numAmount = Number(amount);
    const newBalance = Number(member.remainingTickets) + numAmount;
    const newTotal = Number(member.totalTickets || 0) + numAmount;

    const updatedMember: Member = {
      ...member,
      remainingTickets: newBalance,
      totalTickets: newTotal,
      ticketHistory: [
        ...(member.ticketHistory || []),
        {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: 'add',
          amount: numAmount,
          balance: newBalance,
          note: note || `수강권 ${numAmount}회 충전`
        }
      ]
    };

    storageService.updateMember(updatedMember);
    return { member: updatedMember };
  },

  manualAdjustTickets: (memberId: string, amount: number, note: string) => {
    const members = storageService.getMembers();
    const member = members.find(m => m.id === memberId);

    if (!member) throw new Error('회원을 찾을 수 없습니다.');

    const numAmount = Number(amount);
    const newBalance = Math.max(0, Number(member.remainingTickets) + numAmount);

    const updatedMember: Member = {
      ...member,
      remainingTickets: newBalance,
      totalTickets: numAmount > 0 ? (Number(member.totalTickets || 0) + numAmount) : Number(member.totalTickets || 0),
      ticketHistory: [
        ...(member.ticketHistory || []),
        {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: numAmount > 0 ? 'add' : 'use',
          amount: Math.abs(numAmount),
          balance: newBalance,
          note: note
        }
      ]
    };

    storageService.updateMember(updatedMember);
    return updatedMember;
  },

  resizeImage: (dataUrl: string, targetSize: number = 512): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > targetSize) {
            height *= targetSize / width;
            width = targetSize;
          }
        } else {
          if (height > targetSize) {
            width *= targetSize / height;
            height = targetSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error("Image processing failed"));
    });
  }
};
