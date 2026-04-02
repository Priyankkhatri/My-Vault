import { Search, Plus, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVault } from '../../context/VaultContext';
import { Badge } from '../ui/Badge';

interface TopBarProps {
  onOpenCommandPalette?: () => void;
}

export function TopBar({ onOpenCommandPalette }: TopBarProps) {
  const { searchQuery, setSearchQuery } = useVault();
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-vault-gray-200 bg-white flex items-center gap-4 px-6 flex-shrink-0 z-10 shadow-sm">
      {/* Search */}
      <div className="flex-1 relative max-w-lg mx-auto">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-vault-gray-400" />
        <input
          type="text"
          placeholder="Search items, passwords, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (onOpenCommandPalette) onOpenCommandPalette();
          }}
          className="w-full bg-vault-gray-100 border border-transparent rounded-full pl-11 pr-16 py-2.5 text-sm text-vault-gray-900 placeholder:text-vault-gray-400 focus:outline-none focus:bg-white focus:border-vault-primary-500 focus:ring-4 focus:ring-vault-primary-50 transition-all duration-200"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold text-vault-gray-400 bg-white px-2 py-1 rounded-md border border-vault-gray-200 shadow-sm">
            <Command size={10} /> K
          </kbd>
        </div>
      </div>

      {/* Status */}
      <Badge variant="teal" className="hidden sm:inline-flex">
        <span className="w-1.5 h-1.5 rounded-full bg-vault-primary-600" />
        Unlocked
      </Badge>

      {/* Quick Add */}
      <button
        onClick={() => navigate('/add')}
        className="w-9 h-9 rounded-lg bg-vault-primary-600 flex items-center justify-center text-white hover:bg-vault-primary-500 transition-all cursor-pointer shadow-sm shadow-vault-primary-200 active:scale-95"
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>
    </header>
  );
}
