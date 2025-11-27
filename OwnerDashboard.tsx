
import React, { useState, useEffect } from 'react';
import { User, Property, TenantRecord, MaintenanceRequest } from '../types';
import { api } from '../services/api';
import { Plus, Users, Wallet, CheckCircle2, Copy, Calendar, ArrowLeft, Trash2, ArrowRight, AlertTriangle, X } from 'lucide-react';

interface OwnerDashboardProps {
  user: User;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ user }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<{ user: User, record: TenantRecord }[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'add' | 'propertyDetail'>('overview');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<{id: string, name: string} | null>(null);
  
  // Form State
  const [newProp, setNewProp] = useState({
    name: '',
    address: '',
    rentAmount: '',
    securityDeposit: '',
    rentPaymentDate: '', // Specific date
    ownerUpiId: ''
  });

  const fetchData = async () => {
    const data = await api.getOwnerDashboardData(user.id);
    setProperties(data.properties);
    setTenants(data.tenants);
    setRequests(data.requests);
  };

  useEffect(() => {
    fetchData();
  }, [user.id, activeTab]);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createProperty(user.id, {
      name: newProp.name,
      address: newProp.address,
      rentAmount: Number(newProp.rentAmount),
      securityDeposit: Number(newProp.securityDeposit),
      rentPaymentDate: newProp.rentPaymentDate,
      ownerUpiId: newProp.ownerUpiId
    });
    setActiveTab('overview');
    setNewProp({ name: '', address: '', rentAmount: '', securityDeposit: '', rentPaymentDate: '', ownerUpiId: '' });
  };

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    setActiveTab('propertyDetail');
  };

  const handleBackToOverview = () => {
    setSelectedProperty(null);
    setActiveTab('overview');
  };

  const handleRemoveTenantClick = (e: React.MouseEvent, recordId: string, tenantName: string) => {
    e.stopPropagation(); // Prevent card click
    setTenantToDelete({ id: recordId, name: tenantName });
    setShowDeleteModal(true);
  };

  const confirmRemoveTenant = async () => {
    if (!tenantToDelete) return;
    try {
      await api.removeTenant(tenantToDelete.id);
      await fetchData(); // Refresh data immediately
      setShowDeleteModal(false);
      setTenantToDelete(null);
    } catch (error) {
      alert("Failed to remove tenant.");
    }
  };

  // --- STATS CALCULATION ---
  const totalFinesCollected = tenants.reduce((acc, t) => {
      const historyTotal = t.record.fineHistory ? t.record.fineHistory.reduce((fAcc, f) => fAcc + f.amountDeducted, 0) : 0;
      return acc + historyTotal;
  }, 0);

  // Calculate REAL-TIME Pending Fines across all tenants
  let totalPendingFines = 0;
  const tenantsWithRisk = tenants.map(t => {
      const prop = properties.find(p => p.id === t.record.propertyId);
      let daysLate = 0;
      let pendingFine = 0;
      
      if (prop) {
          const today = new Date();
          const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const paymentDate = new Date(prop.rentPaymentDate);
          const pD = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate()); // Naive comparison
          const lastPay = new Date(t.record.lastPaymentDate);
          const lPayDate = new Date(lastPay.getFullYear(), lastPay.getMonth(), lastPay.getDate());

          // If due date passed AND last payment was before due date
          if (tDate > pD && lPayDate < pD) {
              const diff = Math.floor((tDate.getTime() - pD.getTime()) / (1000 * 3600 * 24));
              daysLate = diff;
              if (daysLate >= 1) {
                  pendingFine = 100 * Math.pow(2, daysLate - 1);
              }
          }
      }
      totalPendingFines += pendingFine;
      return { ...t, daysLate, pendingFine };
  });

  // --- RENDER ADD FORM ---
  if (activeTab === 'add') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#1B2A41]">New Property</h2>
          <button onClick={() => setActiveTab('overview')} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
        </div>

        <form onSubmit={handleCreateProperty} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Property Name</label>
            <input required className="w-full p-3 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-amber-400 outline-none" 
              value={newProp.name} onChange={e => setNewProp({...newProp, name: e.target.value})} placeholder="e.g. Sunset Apt 402" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Address</label>
            <input required className="w-full p-3 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-amber-400 outline-none" 
              value={newProp.address} onChange={e => setNewProp({...newProp, address: e.target.value})} placeholder="Full address" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Rent (₹)</label>
              <input required type="number" className="w-full p-3 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-amber-400 outline-none" 
                value={newProp.rentAmount} onChange={e => setNewProp({...newProp, rentAmount: e.target.value})} placeholder="25000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Payment Date</label>
              <input required type="date" className="w-full p-3 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-amber-400 outline-none"
                value={newProp.rentPaymentDate} onChange={e => setNewProp({...newProp, rentPaymentDate: e.target.value})} />
              <p className="text-[10px] text-slate-500 mt-1">Rent must be paid by this date.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Security Deposit (₹)</label>
            <input required type="number" className="w-full p-3 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-amber-400 outline-none" 
              value={newProp.securityDeposit} onChange={e => setNewProp({...newProp, securityDeposit: e.target.value})} placeholder="100000" />
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
            <label className="block text-sm font-bold text-amber-900 mb-1">Your UPI ID (VPA)</label>
            <p className="text-xs text-amber-700 mb-2">Rent payments will be directed here.</p>
            <input required className="w-full p-3 border border-amber-200 bg-white rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" 
              value={newProp.ownerUpiId} onChange={e => setNewProp({...newProp, ownerUpiId: e.target.value})} placeholder="username@oksbi" />
          </div>

          <button type="submit" className="w-full bg-[#1B2A41] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-[#2C3E50] transition-all">
            Create Property
          </button>
        </form>
      </div>
    );
  }

  // --- RENDER PROPERTY DETAIL ---
  if (activeTab === 'propertyDetail' && selectedProperty) {
      const propTenants = tenantsWithRisk.filter(t => t.record.propertyId === selectedProperty.id);

      // PROPERTY SPECIFIC STATS
      const propTotalDeposit = propTenants.reduce((acc, t) => acc + t.record.currentDeposit, 0);
      const propTotalFines = propTenants.reduce((acc, t) => {
          const historyTotal = t.record.fineHistory ? t.record.fineHistory.reduce((fAcc, f) => fAcc + f.amountDeducted, 0) : 0;
          return acc + historyTotal;
      }, 0);

      return (
        <div className="space-y-6 animate-fade-in relative">
           <div className="flex items-center gap-3">
               <button onClick={handleBackToOverview} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                   <ArrowLeft size={20} className="text-slate-600" />
               </button>
               <div>
                   <h2 className="text-xl font-bold text-[#1B2A41]">{selectedProperty.name}</h2>
                   <p className="text-xs text-slate-500">{selectedProperty.address}</p>
               </div>
           </div>
           
           {/* PROPERTY SPECIFIC STATS CARDS */}
           <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
               <div className="flex items-center gap-2 text-slate-500 mb-1">
                 <Wallet size={14} />
                 <span className="text-[10px] font-bold uppercase tracking-wide">Total Deposit</span>
               </div>
               <p className="text-lg font-bold text-[#1B2A41]">
                 ₹{propTotalDeposit.toLocaleString()}
               </p>
             </div>
             
             <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
               <div className="flex items-center gap-2 text-slate-500 mb-1">
                 <CheckCircle2 size={14} className="text-emerald-500" />
                 <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Fines Collected</span>
               </div>
               <p className="text-lg font-bold text-emerald-600">
                 ₹{propTotalFines.toLocaleString()}
               </p>
             </div>
           </div>

           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 grid grid-cols-2 gap-4">
                <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Monthly Rent</span>
                    <span className="font-bold text-[#1B2A41]">₹{selectedProperty.rentAmount.toLocaleString()}</span>
                </div>
                <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Code</span>
                    <span className="font-mono font-bold text-amber-600 tracking-wider">{selectedProperty.propertyCode}</span>
                </div>
           </div>

           <h3 className="text-lg font-bold text-[#1B2A41] flex items-center gap-2">
               <Users size={18} /> Tenants ({propTenants.length})
           </h3>
           
           <div className="space-y-3">
               {propTenants.map(({ user: tUser, record, daysLate, pendingFine }) => {
                   const totalFinePaid = record.fineHistory ? record.fineHistory.reduce((a, b) => a + b.amountDeducted, 0) : 0;
                   return (
                       <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative group">
                           <div className="flex justify-between items-start mb-3">
                               <div>
                                   <div className="flex items-center gap-2">
                                       <h4 className="font-bold text-[#1B2A41] text-lg">{tUser.name}</h4>
                                       {daysLate > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">Late</span>}
                                   </div>
                                   <p className="text-xs text-slate-400">{tUser.email}</p>
                               </div>
                               <button 
                                 onClick={(e) => handleRemoveTenantClick(e, record.id, tUser.name)}
                                 className="text-white bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-colors shadow-sm"
                                 title="Remove Tenant"
                               >
                                   <Trash2 size={16} />
                               </button>
                           </div>
                           
                           <div className="bg-[#FDFBF7] rounded-lg p-3 space-y-2 text-sm border border-slate-50">
                               <div className="flex justify-between">
                                   <span className="text-slate-500">Deposit Balance</span>
                                   <span className="font-bold text-slate-700">₹{record.currentDeposit.toLocaleString()}</span>
                               </div>
                               <div className="flex justify-between">
                                   <span className="text-slate-500">Collected Fines</span>
                                   <span className="font-bold text-emerald-600">₹{totalFinePaid.toLocaleString()}</span>
                               </div>
                               {pendingFine > 0 && (
                                   <div className="flex justify-between bg-red-50 p-1 -mx-1 rounded">
                                       <span className="text-red-500 font-medium">Pending Fine</span>
                                       <span className="font-bold text-red-600">₹{pendingFine.toLocaleString()}</span>
                                   </div>
                               )}
                               <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                                   <span className="text-slate-500">Last Payment</span>
                                   <span className="text-slate-700">{new Date(record.lastPaymentDate).toLocaleDateString()}</span>
                               </div>
                           </div>
                       </div>
                   );
               })}
               {propTenants.length === 0 && (
                   <div className="text-center p-8 bg-slate-50 rounded-xl text-slate-400 text-sm">
                       No tenants currently linked to this property.
                   </div>
               )}
           </div>

           {/* DELETE CONFIRMATION MODAL */}
           {showDeleteModal && tenantToDelete && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
               {/* Backdrop */}
               <div 
                 className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                 onClick={() => setShowDeleteModal(false)}
               ></div>
               
               {/* Modal Content */}
               <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                 <button 
                   onClick={() => setShowDeleteModal(false)}
                   className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                 >
                   <X size={20} />
                 </button>
                 
                 <div className="flex flex-col items-center text-center">
                   <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                     <AlertTriangle className="text-red-500" size={24} />
                   </div>
                   
                   <h3 className="text-xl font-bold text-[#1B2A41] mb-2">Remove Tenant?</h3>
                   
                   <div className="text-sm text-slate-600 mb-6 space-y-2">
                     <p>Are you sure you want to remove <span className="font-bold text-[#1B2A41]">{tenantToDelete.name}</span>?</p>
                     <p className="bg-red-50 text-red-700 p-3 rounded-lg text-xs text-left border border-red-100">
                       <strong>Warning:</strong> They will be unlinked from this property immediately. All fine history and deposit records for their active session will be detached. This action cannot be undone.
                     </p>
                   </div>
                   
                   <div className="flex gap-3 w-full">
                     <button 
                       onClick={() => setShowDeleteModal(false)}
                       className="flex-1 py-3 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                     >
                       Cancel
                     </button>
                     <button 
                       onClick={confirmRemoveTenant}
                       className="flex-1 py-3 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 shadow-md transition-colors"
                     >
                       Remove Tenant
                     </button>
                   </div>
                 </div>
               </div>
             </div>
           )}

        </div>
      );
  }

  // --- RENDER DASHBOARD OVERVIEW ---
  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#1B2A41]">Dashboard</h2>
        <button 
          onClick={() => setActiveTab('add')}
          className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:bg-amber-600 transition-colors">
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        {/* Collected Fines Card */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Fines Collected</span>
          </div>
          <p className="text-lg font-bold text-emerald-600">
            ₹{totalFinesCollected.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400">Total revenue</p>
        </div>

        {/* Pending Fines Card */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-red-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-16 h-16 bg-red-50 rounded-full -mr-4 -mt-4 opacity-50"></div>
          <div className="relative z-10">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-red-700">Pending Fines</span>
              </div>
              <p className="text-lg font-bold text-red-600">
                ₹{totalPendingFines.toLocaleString()}
              </p>
              <p className="text-[10px] text-red-400">Outstanding risk</p>
          </div>
        </div>
      </div>

      {/* Property Codes */}
      <section>
        <h3 className="text-lg font-semibold text-[#1B2A41] mb-3">Your Properties</h3>
        {properties.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
            No properties yet. Add one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map(p => (
              <div 
                key={p.id} 
                onClick={() => handlePropertyClick(p)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 cursor-pointer hover:border-amber-300 transition-all active:scale-98"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-[#1B2A41]">{p.name}</h4>
                    <p className="text-xs text-slate-500">{p.address}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 bg-[#FDFBF7] px-3 py-1 rounded-lg border border-slate-200">
                      <span className="font-mono font-bold text-[#1B2A41] tracking-widest">{p.propertyCode}</span>
                      <Copy size={14} className="text-slate-400" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 border-t border-slate-50 pt-2">
                   <Calendar size={12}/>
                   <span>Payment Date: <span className="font-semibold text-slate-700">{new Date(p.rentPaymentDate).toLocaleDateString()}</span></span>
                   <span className="ml-auto text-blue-600 font-semibold flex items-center gap-1">
                       View Details <ArrowRight size={10} />
                   </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tenant Ledger */}
      <section>
        <h3 className="text-lg font-semibold text-[#1B2A41] mb-3">Tenant Status Overview</h3>
        <div className="space-y-3">
          {tenantsWithRisk.map(({ user: tUser, record, daysLate, pendingFine }) => {
            return (
              <div key={record.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-[#1B2A41]">{tUser.name}</h4>
                  {daysLate > 0 ? (
                      <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-bold border border-red-100 animate-pulse">
                          Late: {daysLate} Days
                      </span>
                  ) : (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium">
                          Good Standing
                      </span>
                  )}
                </div>
                
                <div className="bg-[#FDFBF7] rounded-lg p-3 space-y-2 border border-slate-50">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Deposit Balance</span>
                    <span className={`font-mono font-bold ${pendingFine > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                      ₹{record.currentDeposit.toLocaleString()}
                    </span>
                  </div>
                  {pendingFine > 0 && (
                     <div className="flex justify-between text-sm">
                        <span className="text-red-500 font-medium">Pending Fine</span>
                        <span className="font-mono font-bold text-red-600">
                             ₹{pendingFine.toLocaleString()}
                        </span>
                     </div>
                  )}
                </div>
              </div>
            );
          })}
          {tenantsWithRisk.length === 0 && <p className="text-sm text-slate-500 italic">No tenants linked yet.</p>}
        </div>
      </section>

      {/* Maintenance Requests */}
      <section>
        <h3 className="text-lg font-semibold text-[#1B2A41] mb-3">Maintenance Issues</h3>
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-amber-400">
              <div className="flex justify-between">
                <h4 className="font-bold text-[#1B2A41]">{req.title}</h4>
                <span className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{req.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs bg-[#FDFBF7] text-slate-500 px-2 py-1 rounded">
                  Tenant: {req.tenantName}
                </span>
                {req.aiEnhanced && (
                  <span className="text-xs flex items-center gap-1 text-purple-600">
                    <CheckCircle2 size={12} /> AI Summarized
                  </span>
                )}
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-slate-500 italic">No open requests.</p>}
        </div>
      </section>
    </div>
  );
};
