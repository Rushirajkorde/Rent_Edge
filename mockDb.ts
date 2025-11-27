
import { User, UserRole, Property, TenantRecord, MaintenanceRequest, FineRecord, PaymentTransaction } from '../types';

// Helper to simulate network delay (minimal for production feel in local mode)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- SERVICE CLASS ---
export class MockDB {
  private users: User[] = [];
  private properties: Property[] = [];
  private tenants: TenantRecord[] = [];
  private requests: MaintenanceRequest[] = [];

  constructor() {
    this.load();
  }

  private load() {
    const sUsers = localStorage.getItem('re_users');
    const sProps = localStorage.getItem('re_props');
    const sTenants = localStorage.getItem('re_tenants');
    const sReqs = localStorage.getItem('re_reqs');

    this.users = sUsers ? JSON.parse(sUsers) : [];
    this.properties = sProps ? JSON.parse(sProps) : [];
    this.tenants = sTenants ? JSON.parse(sTenants) : [];
    this.requests = sReqs ? JSON.parse(sReqs) : [];
  }

  private save() {
    localStorage.setItem('re_users', JSON.stringify(this.users));
    localStorage.setItem('re_props', JSON.stringify(this.properties));
    localStorage.setItem('re_tenants', JSON.stringify(this.tenants));
    localStorage.setItem('re_reqs', JSON.stringify(this.requests));
  }

  // --- AUTH ---
  async signup(data: { name: string, email: string, phone: string, role: UserRole }): Promise<User> {
    await delay(300);
    // Check duplication
    const existing = this.users.find(u => u.email === data.email || (data.phone && u.phone === data.phone));
    if (existing) {
        throw new Error("User with this email or phone already exists");
    }

    const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role
    };
    this.users.push(newUser);
    this.save();
    return newUser;
  }

  async login(identifier: string, role: UserRole): Promise<User> {
    await delay(300);
    // Search by email OR phone
    let user = this.users.find(u => 
        (u.email === identifier || u.phone === identifier) && 
        u.role === role
    );
    
    if (!user) {
       throw new Error("User not found. Please sign up.");
    }
    return user;
  }

  // --- PROPERTY MANAGEMENT (OWNER) ---
  async createProperty(ownerId: string, data: Omit<Property, 'id' | 'ownerId' | 'propertyCode'>): Promise<Property> {
    await delay(400);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newProp: Property = {
      id: Math.random().toString(36).substr(2, 9),
      ownerId,
      propertyCode: code,
      ...data
    };
    this.properties.push(newProp);
    this.save();
    return newProp;
  }

  async getOwnerProperties(ownerId: string): Promise<Property[]> {
    return this.properties.filter(p => p.ownerId === ownerId);
  }

  async getPropertyTenants(propertyId: string): Promise<{ user: User, record: TenantRecord }[]> {
    const records = this.tenants.filter(t => t.propertyId === propertyId);
    return records.map(r => ({
      user: this.users.find(u => u.id === r.id)!,
      record: r
    })).filter(item => item.user);
  }
  
  async removeTenant(recordId: string): Promise<void> {
    await delay(300);
    const record = this.tenants.find(t => t.id === recordId);
    if (record) {
        // Find User to unlink
        const user = this.users.find(u => u.id === record.id);
        if (user) {
            user.linkedPropertyId = undefined;
        }
        // Remove Record
        this.tenants = this.tenants.filter(t => t.id !== recordId);
        this.save();
    }
  }

  // --- TENANT CONNECTION (PAYER) ---
  async connectProperty(userId: string, code: string): Promise<Property> {
    await delay(400);
    const prop = this.properties.find(p => p.propertyCode === code);
    if (!prop) throw new Error("Invalid Property Code");

    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      this.users[userIndex].linkedPropertyId = prop.id;
    }

    if (!this.tenants.find(t => t.id === userId)) {
      // Default last payment to 30 days ago so logic catches overdue immediately
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      this.tenants.push({
        id: userId,
        propertyId: prop.id,
        currentDeposit: prop.securityDeposit,
        lastPaymentDate: thirtyDaysAgo.toISOString(), 
        moveInDate: new Date().toISOString(),
        fineHistory: [],
        paymentHistory: []
      });
    }

    this.save();
    return prop;
  }

  async getTenantProperty(userId: string): Promise<{ property: Property, record: TenantRecord } | null> {
    const user = this.users.find(u => u.id === userId);
    if (!user?.linkedPropertyId) return null;

    const property = this.properties.find(p => p.id === user.linkedPropertyId);
    const record = this.tenants.find(t => t.id === userId);

    if (!property || !record) return null;
    return { property, record };
  }

  // --- CORE IP: FINE CALCULATION ---
  calculateFine(rentPaymentDateStr: string, lastPaymentDate: string): { fine: number, daysLate: number, dayOfCycle: number } {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Parse rent payment date (YYYY-MM-DD)
    const [y, m, d] = rentPaymentDateStr.split('-').map(Number);
    const paymentDate = new Date(y, m - 1, d);
    paymentDate.setHours(0,0,0,0);

    const lastPay = new Date(lastPaymentDate);
    lastPay.setHours(0,0,0,0);

    // If already paid strictly after the due date, no fine (simplistic cycle logic for MVP)
    if (lastPay >= paymentDate) return { fine: 0, daysLate: 0, dayOfCycle: 0 };
    
    // If today is on or before payment date
    if (today <= paymentDate) return { fine: 0, daysLate: 0, dayOfCycle: 1 };

    const diffTime = today.getTime() - paymentDate.getTime();
    const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const dayOfCycle = daysDiff + 1;
    
    // Grace period check (Day 1 is due date, Day 2 is late)
    if (daysDiff < 1) return { fine: 0, daysLate: 0, dayOfCycle: 1 };

    // PATENTED LOGIC: Day 2 = 100, Day 3 = 200...
    const power = daysDiff - 1;
    const fine = 100 * Math.pow(2, power);

    return { fine, daysLate: daysDiff, dayOfCycle };
  }

  // --- CORE IP: PAYMENT TRANSACTION ---
  async processRentPayment(userId: string): Promise<{success: boolean, finePaid: number}> {
    await delay(800);
    const data = await this.getTenantProperty(userId);
    if (!data) throw new Error("No property found");
    const { property, record } = data;

    const { fine, daysLate } = this.calculateFine(property.rentPaymentDate, record.lastPaymentDate);

    const newDeposit = record.currentDeposit - fine;
    const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    if (fine > 0) {
      record.fineHistory.push({
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        amountDeducted: fine,
        daysLate: daysLate,
        rentMonth: monthName
      });
    }

    const newTransaction: PaymentTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      amountPaid: property.rentAmount,
      fineDeducted: fine,
      rentMonth: monthName,
      transactionId: 'UPI' + Math.floor(100000 + Math.random() * 900000)
    };

    const updatedHistory = [newTransaction, ...(record.paymentHistory || [])];

    const updatedRecord = {
        ...record,
        currentDeposit: newDeposit,
        lastPaymentDate: new Date().toISOString(),
        paymentHistory: updatedHistory
    };

    this.tenants = this.tenants.map(t => t.id === userId ? updatedRecord : t);
    
    this.save();
    return { success: true, finePaid: fine };
  }

  async createMaintenanceRequest(req: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'status'>) {
    await delay(500);
    const newReq: MaintenanceRequest = {
        id: Math.random().toString(36).substr(2,9),
        createdAt: new Date().toISOString(),
        status: 'OPEN',
        ...req
    };
    this.requests.unshift(newReq);
    this.save();
    return newReq;
  }

  async getMaintenanceRequests(propertyId: string): Promise<MaintenanceRequest[]> {
      return this.requests.filter(r => r.propertyId === propertyId);
  }
}

export const db = new MockDB();
