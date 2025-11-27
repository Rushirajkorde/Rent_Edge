
import React, { useState, useEffect } from 'react';
import { User, Property, TenantRecord } from '../types';
import { api } from '../services/api';
import { enhanceMaintenanceRequest } from '../services/aiService';
import { AlertTriangle, Home, Wrench, IndianRupee, ShieldAlert, Sparkles, Calendar, TrendingUp, Clock, X, Smartphone, History, Receipt, Download, ShieldCheck } from 'lucide-react';

interface PayerDashboardProps {
  user: User;
}

export const PayerDashboard: React.FC<PayerDashboardProps> = ({ user }) => {
  const [data, setData] = useState<{ property: Property, record: TenantRecord } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectCode, setConnectCode] = useState('');
  
  // Fine State
  const [currentFine, setCurrentFine] = useState(0);
  const [daysLate, setDaysLate] = useState(0);
  const [dayOfCycle, setDayOfCycle] = useState(1);
  const [todayDateStr, setTodayDateStr] = useState('');
  
  // Maintenance Form
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchPayerData = async () => {
    setLoading(true);
    const result = await api.getPayerDashboardData(user.id);
    setData(result);
    if (result) {
      // Use API helper to get consistent estimate
      const fineData = api.calculateFineEstimate(result.property.rentPaymentDate, result.record.lastPaymentDate);
      setCurrentFine(fineData.fine);
      setDaysLate(fineData.daysLate);
      setDayOfCycle(fineData.dayOfCycle);
    }
    
    // Set Today's Date for Display
    const d = new Date();
    setTodayDateStr(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
    
    setLoading(false);
  };

  useEffect(() => {
    fetchPayerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.connectProperty(user.id, connectCode.toUpperCase());
      fetchPayerData();
    } catch (err) {
      alert("Invalid Code");
    }
  };

  const handlePaymentClick = () => {
    setShowPayModal(true);
  };

  const confirmPayment = async () => {
    if (!data) return;
    setIsProcessingPayment(true);
    try {
        const result = await api.processPayment(user.id);
        await fetchPayerData();
        setShowPayModal(false);
        if (result.finePaid && result.finePaid > 0) {
            alert(`Payment Successful! \n\n⚠️ A Late Fine of ₹${result.finePaid.toLocaleString()} was deducted from your Security Deposit.`);
        } else {
            alert("Payment Successful! No fines were applicable.");
        }
    } catch (e) {
        alert("Error processing payment");
    }
    setIsProcessingPayment(false);
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-slate-500">Loading your home details...</div>;

  // --- CONNECT SCREEN ---
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
        <div className="w-16 h-16 bg-[#FDFBF7] border border-slate-200 rounded-full flex items-center justify-center text-[#1B2A41] mb-2 shadow-sm">
          <Home size={32} />
        </div>
        <h2 className="text-2xl font-bold text-[#1B2A41]">Link Your Home</h2>
        <p className="text-slate-500 text-sm max-w-xs">
          Enter the Property Code provided by your landlord to access your dashboard.
        </p>
        <form onSubmit={handleConnect} className="w-full max-w-xs space-y-3">
          <input 
            type="text" 
            value={connectCode}
            onChange={(e) => setConnectCode(e.target.value)}
            className="w-full text-center text-2xl tracking-widest p-3 border border-slate-300 rounded-xl uppercase font-bold focus:ring-2 focus:ring-amber-500 outline-none"
            placeholder="CODE"
            maxLength={6}
          />
          <button type="submit" className="w-full bg-amber-500 text-white py-3 rounded-xl font-semibold shadow-lg active:scale-95 hover:bg-amber-600 transition-transform">
            Connect
          </button>
        </form>
      </div>
    );
  }

  // --- DASHBOARD LOGIC ---
  const isLate = daysLate > 0;
  const paymentDateObj = new Date(data.property.rentPaymentDate);
  const nextFine = isLate ? currentFine * 2 : 100;
  
  // Calculate potential deposit after deduction (LIVE VIEW)
  const remainingDepositAfterFine = data.record.currentDeposit - currentFine;

  // UPI URL Construction
  const upiUrl = `upi://pay?pa=${data.property.ownerUpiId}&pn=${encodeURIComponent(data.property.name)}&am=${data.property.rentAmount}&cu=INR&tn=Rent Payment`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  const handleSubmitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setIsSubmittingMaint(true);

    let finalDesc = maintDesc;
    if (useAI) {
      finalDesc = await enhanceMaintenanceRequest(maintDesc);
    }

    await api.submitMaintenance({
        propertyId: data.property.id,
        tenantId: user.id,
        tenantName: user.name,
        title: maintTitle,
        description: finalDesc,
        aiEnhanced: useAI && finalDesc !== maintDesc
    });
    
    setMaintTitle('');
    setMaintDesc('');
    setIsSubmittingMaint(false);
    alert("Request submitted successfully!");
  };

  return (
    <div className="space-y-6 relative">
      {/* Property Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative">
        <div className="absolute top-4 right-4 text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full flex items-center gap-1 border border-slate-100">
            <Clock size={10} /> Today: {todayDateStr}
        </div>
        <h2 className="text-xl font-bold text-[#1B2A41] leading-tight pr-20">{data.property.name}</h2>
        <p className="text-sm text-slate-500 mt-1">{data.property.address}</p>
        <div className="mt-4 flex gap-3 text-sm">
          <div className="bg-[#FDFBF7] px-3 py-2 rounded-lg border border-slate-200 flex-1 text-center">
            <span className="block text-xs text-slate-400 uppercase tracking-wide">Monthly Rent</span>
            <span className="font-bold text-[#1B2A41]">₹{data.property.rentAmount.toLocaleString()}</span>
          </div>
          <div className="bg-[#FDFBF7] px-3 py-2 rounded-lg border border-slate-200 flex-1 text-center">
             <div className="flex items-center justify-center gap-1 text-xs text-slate-400 uppercase tracking-wide">
                 <Calendar size={12}/> Pay On
             </div>
            <span className="font-bold text-[#1B2A41]">
                {paymentDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* ACTION CARD */}
      <div className={`p-6 rounded-2xl shadow-lg text-white relative overflow-hidden transition-all ${isLate ? 'bg-gradient-to-br from-[#8B0000] to-[#A52A2A]' : 'bg-gradient-to-br from-[#1B2A41] to-[#2C3E50]'}`}>
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-300 text-sm font-medium mb-1">Current Status</p>
              <h3 className="text-3xl font-bold flex items-center gap-2">
                {isLate ? `Late by ${daysLate} Day${daysLate > 1 ? 's' : ''}` : 'On Time'}
                {isLate && <AlertTriangle className="text-amber-400 animate-pulse" size={24} />}
              </h3>
              {isLate && <p className="text-amber-200 font-mono text-sm mt-1">Cycle Day: {dayOfCycle}</p>}
            </div>
            <div className="text-right">
              <p className="text-slate-300 text-sm font-medium mb-1">Fine to Deduct</p>
              <p className={`text-3xl font-mono font-bold ${isLate ? 'text-amber-400' : 'text-emerald-400'}`}>
                ₹{currentFine.toLocaleString()}
              </p>
            </div>
          </div>

          <button 
            onClick={handlePaymentClick}
            className="w-full mt-6 bg-amber-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 active:scale-95 transition-all shadow-xl"
          >
            <IndianRupee size={18} /> 
            Pay Rent ₹{data.property.rentAmount.toLocaleString()}
          </button>
          
          <p className="text-center text-[10px] text-slate-400 mt-2">
             Fine of ₹{currentFine} will be automatically deducted from your Security Deposit.
          </p>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowPayModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-[#1B2A41] mb-1">Scan to Pay</h3>
              <p className="text-slate-500 text-sm">Paying: {data.property.name}</p>
            </div>

            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white border-2 border-amber-100 rounded-2xl shadow-sm">
                <img src={qrUrl} alt="UPI QR Code" className="w-48 h-48 object-contain" />
              </div>
            </div>

            <div className="text-center mb-6">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Amount</p>
              <p className="text-3xl font-bold text-[#1B2A41]">₹{data.property.rentAmount.toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              <a 
                href={upiUrl}
                className="w-full bg-[#1B2A41] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#2C3E50] transition-colors"
              >
                <Smartphone size={18} /> Open UPI App
              </a>
              
              <button 
                onClick={confirmPayment}
                disabled={isProcessingPayment}
                className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 py-3 rounded-xl font-semibold hover:bg-emerald-100 transition-colors"
              >
                {isProcessingPayment ? 'Processing...' : 'I have completed payment'}
              </button>
            </div>
            
            <div className="mt-4 text-center">
               <p className="text-[10px] text-slate-400">
                 UPI ID: {data.property.ownerUpiId}
               </p>
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT STATUS (LIVE DEDUCTION VIEW) */}
      <div className={`bg-white p-5 rounded-2xl shadow-sm border transition-colors ${currentFine > 0 ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2 mb-4 text-[#1B2A41]">
           {currentFine > 0 ? (
             <ShieldAlert size={18} className="text-red-500" />
           ) : (
             <ShieldCheck size={18} className="text-emerald-500" />
           )}
           <h3 className="font-bold">Security Deposit Status</h3>
           {currentFine > 0 ? (
             <span className="ml-auto bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full animate-pulse border border-red-200 uppercase tracking-wide">
               Deduction Active
             </span>
           ) : (
             <span className="ml-auto bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">
               Fully Protected
             </span>
           )}
        </div>
        
        <div className="space-y-4">
           {/* Calculation Breakdown */}
           <div className="bg-[#FDFBF7] p-4 rounded-xl border border-slate-200 space-y-2">
               <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Holding Deposit</span>
                  <span className="font-mono text-slate-700">₹{data.record.currentDeposit.toLocaleString()}</span>
               </div>
               
               <div className={`flex justify-between text-sm p-2 -mx-2 rounded-lg items-center ${currentFine > 0 ? 'bg-red-50 border border-red-100' : ''}`}>
                  <div>
                    <span className={`block ${currentFine > 0 ? 'text-red-800 font-bold' : 'text-slate-500'}`}>Pending Fine Deduction</span>
                    {currentFine > 0 && <span className="text-[10px] text-red-500">(100 × 2^{daysLate > 0 ? daysLate - 1 : 0})</span>}
                  </div>
                  <span className={`font-mono font-bold text-lg ${currentFine > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    - ₹{currentFine.toLocaleString()}
                  </span>
               </div>

               <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-[#1B2A41]">Net Refundable Balance</span>
                  <span className={`font-mono text-xl font-bold ${remainingDepositAfterFine < data.property.securityDeposit ? 'text-amber-600' : 'text-emerald-600'}`}>
                      ₹{remainingDepositAfterFine.toLocaleString()}
                  </span>
               </div>
           </div>
        </div>
      </div>

      {/* FINE ESCALATION TABLE */}
      {isLate && (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4 text-[#1B2A41]">
           <TrendingUp size={18} className="text-red-500" />
           <h3 className="font-bold">Fine Escalation Schedule</h3>
        </div>
        
        <div className="bg-[#FDFBF7] rounded-xl overflow-hidden border border-slate-200">
           <div className="grid grid-cols-4 bg-[#1B2A41] text-white text-xs font-bold p-2 text-center">
              <div>Cycle</div>
              <div>Status</div>
              <div>Late By</div>
              <div>Fine</div>
           </div>
           
           <div className={`grid grid-cols-4 text-sm p-2 text-center border-b border-slate-100 ${dayOfCycle === 1 ? 'bg-amber-100 font-bold' : ''}`}>
             <div>Day 1</div>
             <div className="text-emerald-600">Due Date</div>
             <div className="text-slate-400">-</div>
             <div>₹0</div>
           </div>

           <div className={`grid grid-cols-4 text-sm p-2 text-center border-b border-slate-100 ${dayOfCycle === 2 ? 'bg-amber-100 font-bold' : ''}`}>
             <div>Day 2</div>
             <div className="text-red-500">Late</div>
             <div>1 Day</div>
             <div>₹100</div>
           </div>

           <div className={`grid grid-cols-4 text-sm p-2 text-center border-b border-slate-100 ${dayOfCycle === 3 ? 'bg-amber-100 font-bold' : ''}`}>
             <div>Day 3</div>
             <div className="text-red-500">Late</div>
             <div>2 Days</div>
             <div>₹200</div>
           </div>
           
           <div className={`grid grid-cols-4 text-sm p-2 text-center border-b border-slate-100 ${dayOfCycle === 4 ? 'bg-amber-100 font-bold' : ''}`}>
             <div>Day 4</div>
             <div className="text-red-500">Late</div>
             <div>3 Days</div>
             <div>₹400</div>
           </div>

           {dayOfCycle > 4 && (
             <div className="grid grid-cols-4 text-sm p-2 text-center bg-amber-100 font-bold border-b border-slate-100">
               <div>Day {dayOfCycle}</div>
               <div className="text-red-600">CURRENT</div>
               <div>{daysLate} Days</div>
               <div>₹{currentFine.toLocaleString()}</div>
             </div>
           )}

           <div className="grid grid-cols-4 text-sm p-2 text-center bg-slate-50 text-slate-400 italic">
             <div>Tomorrow</div>
             <div>(Projected)</div>
             <div>{daysLate + 1} Days</div>
             <div>₹{nextFine.toLocaleString()}</div>
           </div>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
           Fine doubles every 24 hours.
        </p>
      </div>
      )}

      {/* PAYMENT HISTORY LEDGER */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
         <div className="flex items-center gap-2 mb-4 text-[#1B2A41]">
           <History size={18} className="text-slate-400" />
           <h3 className="font-bold">Payment History</h3>
         </div>
         
         {!data.record.paymentHistory || data.record.paymentHistory.length === 0 ? (
            <div className="text-center py-6 text-slate-400 bg-[#FDFBF7] rounded-xl border border-dashed border-slate-200">
              <p className="text-sm">No payment history yet.</p>
            </div>
         ) : (
           <div className="space-y-3">
             {data.record.paymentHistory.map((tx) => (
               <div key={tx.id} className="bg-[#FDFBF7] border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2">
                        <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-600">
                           <Receipt size={14} />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-[#1B2A41]">Rent - {tx.rentMonth}</p>
                           <p className="text-[10px] text-slate-400">ID: {tx.transactionId} • {new Date(tx.date).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <div className="text-right">
                       <p className="text-sm font-bold text-[#1B2A41]">₹{tx.amountPaid.toLocaleString()}</p>
                       <button className="text-[10px] text-blue-500 flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                         <Download size={10} /> Receipt
                       </button>
                     </div>
                  </div>
                  
                  {/* Fine Line Item */}
                  {tx.fineDeducted > 0 && (
                     <div className="flex justify-between items-center text-xs bg-red-50 border border-red-100 rounded px-2 py-1 mt-1">
                        <span className="text-red-700 font-medium flex items-center gap-1">
                           <AlertTriangle size={10} /> Fine Deducted (Deposit)
                        </span>
                        <span className="text-red-700 font-bold">- ₹{tx.fineDeducted.toLocaleString()}</span>
                     </div>
                  )}
               </div>
             ))}
           </div>
         )}
      </div>

      {/* MAINTENANCE */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
         <div className="flex items-center justify-between mb-4 text-[#1B2A41]">
           <div className="flex items-center gap-2">
             <Wrench size={18} className="text-slate-400" />
             <h3 className="font-bold">Request Maintenance</h3>
           </div>
        </div>
        <form onSubmit={handleSubmitMaintenance} className="space-y-3">
          <input 
            required
            className="w-full text-sm p-3 border border-slate-200 bg-[#FDFBF7] rounded-lg outline-none focus:border-amber-400 focus:bg-white transition-colors"
            placeholder="Issue Title (e.g. Leaky Tap)"
            value={maintTitle}
            onChange={e => setMaintTitle(e.target.value)}
          />
          <textarea 
            required
            className="w-full text-sm p-3 border border-slate-200 bg-[#FDFBF7] rounded-lg outline-none focus:border-amber-400 focus:bg-white transition-colors h-24 resize-none"
            placeholder="Describe the issue..."
            value={maintDesc}
            onChange={e => setMaintDesc(e.target.value)}
          />

          <div className="flex items-center justify-between bg-[#FDFBF7] p-2 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Use AI Assistant for description?</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <button 
            disabled={isSubmittingMaint}
            type="submit" 
            className="w-full bg-[#1B2A41] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#2C3E50] flex items-center justify-center gap-2 transition-all"
          >
            {isSubmittingMaint ? 'Submitting...' : (
              <>
                {useAI && <Sparkles size={14} className="text-amber-300"/>} 
                Submit Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
