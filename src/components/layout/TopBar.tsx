import { Search, Plus, Bell } from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '../ui/Input';

export function TopBar() {
  const { searchQuery, setSearchQuery } = useVault();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex-1">
        <div className="w-64">
          <Input 
            type="search" 
            placeholder="Search vault..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors">
          <Bell size={18} />
        </button>
        <button 
          onClick={() => navigate('/add')}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>
    </header>
  );
}
