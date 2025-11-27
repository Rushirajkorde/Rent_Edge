
import { User, UserRole, Property, TenantRecord, MaintenanceRequest } from '../types';
import { db as mockDb } from './mockDb';
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, mapAuthError, isFirebaseConfigured } from './firebase';

// --- CONFIGURATION ---
// PRODUCTION SETUP:
// 1. To use the Real MERN Backend (MongoDB), set USE_REAL_BACKEND = true
// 2. Ensure API_URL points to your deployed server (e.g., https://api.rentedge.com/api)
// 3. For Browser-Only Mode (Local Storage), keep USE_REAL_BACKEND = false
const USE_REAL_BACKEND = false; 
const API_URL = 'http://localhost:3001/api';

class ApiService {
  
  // --- AUTH ---
  async signup(data: { name: string, email: string, password?: string, role: UserRole }): Promise<User> {
      // Check if Firebase is configured, if not, warn and fallback to mock
      if (!isFirebaseConfigured && !USE_REAL_BACKEND) {
          console.warn("[API] Firebase not configured. Falling back to Mock DB for Signup.");
          return mockDb.signup({
              name: data.name,
              email: data.email,
              phone: '', // Phone removed from requirement
              role: data.role
          });
      }

      try {
          // Firebase Registration
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password || 'password123');
          
          // Update Profile (Name)
          await updateProfile(userCredential.user, {
              displayName: data.name
          });

          // Construct User Object
          const user: User = {
              id: userCredential.user.uid,
              name: data.name,
              email: data.email,
              phone: '',
              role: data.role,
              token: await userCredential.user.getIdToken()
          };
          
          return user;
      } catch (error: any) {
          throw new Error(mapAuthError(error));
      }
  }

  async login(identifier: string, password?: string, role?: UserRole): Promise<User> {
    // Check if Firebase is configured, if not, warn and fallback to mock
    if (!isFirebaseConfigured && !USE_REAL_BACKEND) {
        console.warn("[API] Firebase not configured. Falling back to Mock DB for Login.");
        return mockDb.login(identifier, role || UserRole.OWNER);
    }

    try {
        // Firebase Login
        const userCredential = await signInWithEmailAndPassword(auth, identifier, password || '');
        
        const fbUser = userCredential.user;

        const user: User = {
            id: fbUser.uid,
            name: fbUser.displayName || 'User',
            email: fbUser.email || identifier,
            phone: '', 
            role: role || UserRole.OWNER,
            token: await fbUser.getIdToken()
        };

        return user;
    } catch (error: any) {
        throw new Error(mapAuthError(error));
    }
  }

  // --- OWNER ACTIONS ---
  async createProperty(ownerId: string, data: any): Promise<Property> {
    if (USE_REAL_BACKEND) {
        const res = await fetch(`${API_URL}/properties`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ ownerId, ...data })
        });
        const prop = await res.json();
        if (prop._id) prop.id = prop._id;
        return prop;
    } else {
        return mockDb.createProperty(ownerId, data);
    }
  }

  async getOwnerDashboardData(ownerId: string): Promise<{ properties: Property[], tenants: any[], requests: MaintenanceRequest[] }> {
    if (USE_REAL_BACKEND) {
        const res = await fetch(`${API_URL}/owner/dashboard/${ownerId}`);
        const data = await res.json();
        // Normalize IDs
        data.properties = data.properties.map((p: any) => ({ ...p, id: p._id || p.id }));
        data.tenants = data.tenants.map((t: any) => ({
             user: { ...t.user, id: t.user._id || t.user.id },
             record: { ...t.record, id: t.record._id || t.record.id }
        }));
        data.requests = data.requests.map((r: any) => ({ ...r, id: r._id || r.id }));
        return data;
    } else {
        const properties = await mockDb.getOwnerProperties(ownerId);
        let tenants: any[] = [];
        let requests: MaintenanceRequest[] = [];
        for (const p of properties) {
            const t = await mockDb.getPropertyTenants(p.id);
            tenants = [...tenants, ...t];
            const r = await mockDb.getMaintenanceRequests(p.id);
            requests = [...requests, ...r];
        }
        return { properties, tenants, requests };
    }
  }

  async removeTenant(recordId: string): Promise<void> {
    if (USE_REAL_BACKEND) {
      const res = await fetch(`${API_URL}/owner/tenant/${recordId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Failed to remove tenant");
    } else {
      await mockDb.removeTenant(recordId);
    }
  }

  // --- PAYER ACTIONS ---
  async connectProperty(userId: string, code: string): Promise<Property> {
    if (USE_REAL_BACKEND) {
        const res = await fetch(`${API_URL}/payer/connect`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId, code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const prop = data.property;
        if (prop._id) prop.id = prop._id;
        return prop;
    } else {
        return mockDb.connectProperty(userId, code);
    }
  }

  async getPayerDashboardData(userId: string): Promise<{ property: Property, record: TenantRecord } | null> {
    if (USE_REAL_BACKEND) {
        const res = await fetch(`${API_URL}/payer/dashboard/${userId}`);
        const data = await res.json();
        if (!data.linked) return null;
        
        const prop = data.property;
        if (prop._id) prop.id = prop._id;
        
        const record = data.record;
        if (record._id) record.id = record._id;
        
        return { property: prop, record: record };
    } else {
        return mockDb.getTenantProperty(userId);
    }
  }

  async processPayment(userId: string): Promise<{success: boolean, finePaid?: number}> {
    if (USE_REAL_BACKEND) {
        const res = await fetch(`${API_URL}/payer/pay`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId })
        });
        if (!res.ok) throw new Error("Payment Failed");
        const data = await res.json();
        return { success: true, finePaid: data.finePaid };
    } else {
        return mockDb.processRentPayment(userId);
    }
  }

  // --- SHARED ---
  async submitMaintenance(data: any): Promise<void> {
    if (USE_REAL_BACKEND) {
         const res = await fetch(`${API_URL}/maintenance`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
         });
         if (!res.ok) throw new Error("Failed to submit");
    } else {
        await mockDb.createMaintenanceRequest(data);
    }
  }
  
  // Expose helper for frontend fine calc if needed (for UI estimation only)
  calculateFineEstimate(paymentDate: string, lastPayment: string) {
      return mockDb.calculateFine(paymentDate, lastPayment);
  }
}

export const api = new ApiService();
