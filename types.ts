
export interface Member {
  id: string;
  name: string;
  phone: string;
  joinDate: string;
  totalTickets: number;
  remainingTickets: number;
  status: 'active' | 'expired' | 'suspended';
  belt: 'White' | 'Grey' | 'Yellow' | 'Orange' | 'Green' | 'Blue' | 'Purple' | 'Brown' | 'Black';
  stripes: 0 | 1 | 2 | 3 | 4;
  promotionHistory: {
    date: string;
    belt: string;
    stripes: number;
    note?: string;
  }[];
  // Extended Profile Info
  birthDate?: string;
  gender?: 'Male' | 'Female' | 'Other';
  parentPhone?: string;
  email?: string;
  address?: string;
  memo?: string; // Admin private notes
  faceImages: string[]; // Array of base64 strings for better recognition
  ticketHistory?: TicketHistory[]; // 수강권 변경 이력
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  timestamp: string;
  type: 'check-in';
}

export interface TicketHistory {
  id: string;
  date: string;
  type: 'add' | 'use' | 'refund';
  amount: number;
  balance: number; // 변경 후 잔액
  note?: string;
}

export type UserRole = 'admin' | 'kiosk' | 'member' | null;
