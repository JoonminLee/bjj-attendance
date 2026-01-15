
export interface Member {
  id: string;
  name: string;
  phone: string;
  joinDate: string;
  totalTickets: number;
  remainingTickets: number;
  status: 'active' | 'expired' | 'suspended';
  faceImages: string[]; // Array of base64 strings for better recognition
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  timestamp: string;
  type: 'check-in';
}

export type UserRole = 'admin' | 'kiosk' | 'member' | null;
