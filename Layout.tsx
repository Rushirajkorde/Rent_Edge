import React from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  role?: UserRole;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, role, onLogout }) => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex justify-center font-sans">
      <div className="w-full max-w-md bg-[#FDFBF7] min-h-screen shadow-2xl relative flex flex-col border-x border-slate-200">
        {/* Header - Soft Navy Blue */}
        <header className="bg-[#1B2A41] text-white p-4 sticky top-0 z-50 flex justify-between items-center shadow-md">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-amber-50">RentEdge</h1>
            {title && <p className="text-xs text-slate-300 uppercase tracking-wider">{title}</p>}
          </div>
          {role && (
            <button 
              onClick={onLogout}
              className="text-xs bg-[#2C3E50] hover:bg-[#34495E] px-3 py-1 rounded border border-slate-600 transition-colors text-amber-50"
            >
              Sign Out
            </button>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 p-4 pb-24 overflow-y-auto no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};