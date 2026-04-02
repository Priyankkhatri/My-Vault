import { VaultCategory } from '../../types/vault';
import { KeyRound, MapPin, CreditCard, FileText, FolderLock } from 'lucide-react';

interface SecurityRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function SecurityRing({ score, size = 120, strokeWidth = 10, label }: SecurityRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 90) return '#0d9488'; // Teal 600
    if (score >= 70) return '#10b981'; // Green 500
    if (score >= 50) return '#f59e0b'; // Amber 500
    return '#ef4444'; // Red 500
  };

  return (
    <div className="relative inline-flex items-center justify-center translate-y-1" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#f3f4f6" strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={getColor()} strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-vault-gray-950 tracking-tighter">{score}</span>
        {label && <span className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest leading-none mt-1">{label}</span>}
      </div>
    </div>
  );
}

export function getCategoryIcon(type: VaultCategory, size = 18) {
  switch (type) {
    case 'password': return <KeyRound size={size} />;
    case 'address': return <MapPin size={size} />;
    case 'card': return <CreditCard size={size} />;
    case 'note': return <FileText size={size} />;
    case 'document': return <FolderLock size={size} />;
  }
}

export function getCategoryLabel(type: VaultCategory) {
  switch (type) {
    case 'password': return 'Password';
    case 'address': return 'Address';
    case 'card': return 'Card';
    case 'note': return 'Note';
    case 'document': return 'Document';
  }
}

export function getCategoryColor(type: VaultCategory) {
  switch (type) {
    case 'password': return 'text-vault-primary-600';
    case 'address': return 'text-blue-600';
    case 'card': return 'text-purple-600';
    case 'note': return 'text-emerald-600';
    case 'document': return 'text-orange-600';
  }
}

export function getCategoryBg(type: VaultCategory) {
  switch (type) {
    case 'password': return 'bg-vault-primary-50 border-vault-primary-100';
    case 'address': return 'bg-blue-50 border-blue-100';
    case 'card': return 'bg-purple-50 border-purple-100';
    case 'note': return 'bg-emerald-50 border-emerald-100';
    case 'document': return 'bg-orange-50 border-orange-100';
  }
}
