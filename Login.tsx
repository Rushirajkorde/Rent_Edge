
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { isFirebaseConfigured } from '../services/firebase';
import { ShieldCheck, UserCircle2, Building2, ArrowRight, CheckCircle2, Mail, User as UserIcon, Lock, AlertTriangle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.OWNER);
  const [errorMsg, setErrorMsg] = useState('');

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup State
  const [signupData, setSignupData] = useState({
      name: '',
      email: '',
      password: '',
      repeatPassword: ''
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
        const user = await api.login(email, password, role);
        onLogin(user);
    } catch (err: any) {
        setErrorMsg(err.message || "Password or Email Incorrect.");
    }
    setLoading(false);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    // Validation
    if (signupData.password !== signupData.repeatPassword) {
        setErrorMsg("Passwords do not match.");
        setLoading(false);
        return;
    }

    try {
        const user = await api.signup({
            name: signupData.name,
            email: signupData.email,
            password: signupData.password,
            role
        });
        onLogin(user);
    } catch (err: any) {
        setErrorMsg(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-fade-in">
        
        {/* Header Section */}
        <div className="bg-[#1B2A41] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-200 to-transparent"></div>
          <div className="relative z-10 flex justify-center mb-4">
             <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm border border-white/20">
                <ShieldCheck className="text-amber-400 w-10 h-10" />
             </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight relative z-10">RentEdge</h1>
          <p className="text-slate-300 text-sm mt-2 relative z-10">Risk Management & Payment Platform</p>
          
          {!isFirebaseConfigured && (
              <div className="mt-4 bg-red-500/20 text-red-200 text-[10px] py-1 px-3 rounded-full inline-flex items-center gap-1 border border-red-500/30">
                  <AlertTriangle size={10} /> Offline Mode: Data NOT saved to Firebase
              </div>
          )}
        </div>

        {/* Role Toggle (Common for both) */}
        <div className="px-6 pt-6">
            <div className="p-2 bg-slate-50 rounded-xl flex border border-slate-200">
            <button 
                onClick={() => setRole(UserRole.OWNER)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${role === UserRole.OWNER ? 'bg-white text-[#1B2A41] shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Building2 size={16} /> Owner
            </button>
            <button 
                onClick={() => setRole(UserRole.PAYER)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${role === UserRole.PAYER ? 'bg-white text-[#1B2A41] shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <UserCircle2 size={16} /> Tenant
            </button>
            </div>
        </div>

        {/* Dynamic Content */}
        <div className="p-6">
           <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-[#1B2A41] mb-1">
                {view === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-slate-500 text-sm">
                  {view === 'login' ? 'Access your dashboard securely.' : 'Join to manage your rentals.'}
              </p>
           </div>

           {errorMsg && (
             <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium border border-red-100">
               {errorMsg}
             </div>
           )}

           {view === 'login' ? (
               <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 p-4 bg-[#FDFBF7] border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-[#1B2A41]"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-3.5 text-slate-400" />
                      <input 
                        type="password" 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 p-4 bg-[#FDFBF7] border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-[#1B2A41]"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#1B2A41] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-[#2C3E50] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? 'Verifying...' : (
                      <>Sign In <ArrowRight size={18} /></>
                    )}
                  </button>
                  
                  <div className="text-center pt-2">
                      <p className="text-sm text-slate-500">
                          Don't have an account? <button type="button" onClick={() => { setView('signup'); setErrorMsg(''); }} className="text-amber-600 font-bold hover:underline">Sign Up</button>
                      </p>
                  </div>
               </form>
           ) : (
               <form onSubmit={handleSignupSubmit} className="space-y-3">
                  <div className="relative">
                    <UserIcon size={18} className="absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      required 
                      value={signupData.name}
                      onChange={(e) => setSignupData({...signupData, name: e.target.value})}
                      className="w-full pl-10 p-3 bg-[#FDFBF7] border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-[#1B2A41]"
                      placeholder="Full Name"
                    />
                  </div>

                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type="email" 
                      required 
                      value={signupData.email}
                      onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                      className="w-full pl-10 p-3 bg-[#FDFBF7] border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-[#1B2A41]"
                      placeholder="Email Address"
                    />
                  </div>

                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type="password" 
                      required 
                      value={signupData.password}
                      onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                      className="w-full pl-10 p-3 bg-[#FDFBF7] border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-[#1B2A41]"
                      placeholder="Password"
                    />
                  </div>

                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type="password" 
                      required 
                      value={signupData.repeatPassword}
                      onChange={(e) => setSignupData({...signupData, repeatPassword: e.target.value})}
                      className="w-full pl-10 p-3 bg-[#FDFBF7] border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-[#1B2A41]"
                      placeholder="Repeat Password"
                    />
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100 flex gap-2">
                     <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                     <p>You are registering as a <span className="font-bold text-[#1B2A41]">{role === UserRole.OWNER ? 'Property Owner' : 'Tenant'}</span>.</p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#1B2A41] text-white py-3.5 rounded-xl font-bold text-lg shadow-lg hover:bg-[#2C3E50] active:scale-95 transition-all"
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>

                  <div className="text-center pt-2">
                      <p className="text-sm text-slate-500">
                          Already registered? <button type="button" onClick={() => { setView('login'); setErrorMsg(''); }} className="text-amber-600 font-bold hover:underline">Sign In</button>
                      </p>
                  </div>
               </form>
           )}
        </div>
      </div>
    </div>
  );
};
