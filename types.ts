
export enum UserRole {
  OWNER = 'OWNER',
  PAYER = 'PAYER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  // If payer, which property are they linked to?
  linkedPropertyId?: string;
  token?: string; // JWT for backend
}

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  ownerUpiId: string;
  rentAmount: number;
  securityDeposit: number;
  rentPaymentDate: string; // ISO Date string (e.g. 2025-12-01)
  propertyCode: string; // The 6-char shareable code
}

export interface PaymentTransaction {
  id: string;
  date: string;
  amountPaid: number; // Rent Amount
  fineDeducted: number; // Fine deducted from deposit at this time
  rentMonth: string; // e.g. "November 2024"
  transactionId: string; // Simulated UPI Ref ID
}

export interface TenantRecord {
  id: string; // matches User.id
  propertyId: string;
  currentDeposit: number;
  lastPaymentDate: string; // ISO Date string
  fineHistory: FineRecord[];
  paymentHistory: PaymentTransaction[];
  moveInDate: string;
}

export interface FineRecord {
  id: string;
  date: string;
  amountDeducted: number;
  daysLate: number;
  rentMonth: string;
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  tenantId: string;
  tenantName: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  aiEnhanced: boolean;
}
