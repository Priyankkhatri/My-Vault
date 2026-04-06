import { Search, Plus, Bell } from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { useNavigate } from 'react-router-dom';

export function TopBar() {
  const { searchQuery, setSearchQuery } = useVault();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-8">
      {/* Search Area */}
      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-sm flex items-center group">
          <Search size={15} className="absolute left-3 text-gray-400 group-focus-within:text-teal-600 transition-colors" />
          <input 
            type="search" 
            placeholder="Search your vault..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 pl-9 pr-4 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 font-medium outline-none"
            spellCheck="false"
          />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1">
        <button 
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors focus:outline-none"
          title="Notifications"
        >
          <Bell size={16} />
        </button>
        <div className="w-px h-4 bg-gray-200 mx-2" />
        <button 
          onClick={() => navigate('/add')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[12px] font-medium rounded-md shadow-sm active:scale-[0.98] transition-all"
        >
          <Plus size={14} />
          New Item
        </button>
      </div>
    </header>
  );
}
