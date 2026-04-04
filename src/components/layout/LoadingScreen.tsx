import { VaultIcon } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 z-10 relative">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div className="absolute inset-0 bg-teal-500 rounded-2xl animate-ping opacity-20" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-teal-600 font-bold uppercase tracking-widest text-xs animate-pulse">
            Decrypting Matrix...
          </div>
        </div>
      </div>
    </div>
  );
}
