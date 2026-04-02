import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, Grid3X3, List, Plus, Star, FolderLock,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { VaultItemCard } from '../components/vault/VaultItemCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { VaultCategory } from '../types/vault';

const categories: { key: VaultCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All Items' },
  { key: 'password', label: 'Passwords' },
  { key: 'address', label: 'Addresses' },
  { key: 'card', label: 'Cards' },
  { key: 'note', label: 'Notes' },
  { key: 'document', label: 'Documents' },
];

type SortOption = 'recent' | 'name' | 'oldest';

export function VaultLibrary() {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const { items, searchQuery, setSearchQuery } = useVault();
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFavorites, setShowFavorites] = useState(false);

  const activeCategory = (category || 'all') as VaultCategory | 'all';

  const filteredItems = useMemo(() => {
    let filtered = activeCategory === 'all' as string ? items : items.filter(i => i.type === activeCategory);

    if (showFavorites) filtered = filtered.filter(i => i.favorite);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    switch (sortBy) {
      case 'recent':
        return [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      case 'name':
        return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
      case 'oldest':
        return [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default:
        return filtered;
    }
  }, [items, activeCategory, searchQuery, sortBy, showFavorites]);

  const getCategoryCount = (key: VaultCategory | 'all') => {
    if (key === 'all') return items.length;
    return items.filter(i => i.type === key).length;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 space-y-8 max-w-6xl mx-auto h-full overflow-y-auto scrollbar-hidden"
    >
      {/* Header */}
      <div className="flex items-end justify-between border-b border-vault-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-vault-gray-950 tracking-tight">
            {categories.find(c => c.key === activeCategory)?.label || 'Vault'}
          </h2>
          <p className="text-sm text-vault-gray-500 mt-1">{filteredItems.length} secure items stored</p>
        </div>
        <Button
          icon={<Plus size={18} strokeWidth={2.5} />}
          onClick={() => navigate('/add')}
          size="md"
        >
          Add New Item
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => navigate(cat.key === 'all' ? '/vault' : `/vault/${cat.key}`)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all cursor-pointer border shadow-sm ${
              activeCategory === cat.key
                ? 'bg-vault-primary-600 text-white border-vault-primary-600'
                : 'bg-white text-vault-gray-600 hover:text-vault-gray-900 border-vault-gray-200 hover:border-vault-gray-300'
            }`}
          >
            {cat.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              activeCategory === cat.key ? 'bg-white/20 text-white' : 'bg-vault-gray-100 text-vault-gray-500'
            }`}>
              {getCategoryCount(cat.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-vault-gray-400" />
          <input
            type="text"
            placeholder={`Search in ${categories.find(c => c.key === activeCategory)?.label.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-vault-gray-200 rounded-full pl-11 pr-4 py-2.5 text-sm text-vault-gray-900 placeholder:text-vault-gray-400 focus:outline-none focus:border-vault-primary-500 focus:ring-4 focus:ring-vault-primary-50 transition-all duration-200"
          />
        </div>

        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className={`p-2.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
            showFavorites
              ? 'bg-amber-50 border-amber-200 text-amber-500'
              : 'bg-white border-vault-gray-200 text-vault-gray-400 hover:text-vault-gray-600'
          }`}
          title="Show favorites"
        >
          <Star size={18} fill={showFavorites ? 'currentColor' : 'none'} />
        </button>

        <div className="h-8 w-[1px] bg-vault-gray-200 mx-1" />

        <div className="flex bg-white border border-vault-gray-200 rounded-lg overflow-hidden shadow-sm">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-vault-gray-100 text-vault-gray-900' : 'text-vault-gray-400 hover:text-vault-gray-600'}`}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-vault-gray-100 text-vault-gray-900' : 'text-vault-gray-400 hover:text-vault-gray-600'}`}
          >
            <Grid3X3 size={18} />
          </button>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="vault-card p-20 bg-white flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-vault-gray-50 flex items-center justify-center mb-6">
              <FolderLock size={40} className="text-vault-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-vault-gray-950 mb-2">
              {searchQuery ? 'No results matches your search' : 'No items in this category'}
            </h3>
            <p className="text-sm text-vault-gray-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery ? 'Try adjusting your search terms or filters.' : 'Your secure cabinet is ready to store your data.'}
            </p>
            {!searchQuery && (
              <Button icon={<Plus size={18} />} onClick={() => navigate('/add')} className="mt-8">
                Add Your First Item
              </Button>
            )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3 pb-8'}>
          {filteredItems.map((item, i) => (
            <VaultItemCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
