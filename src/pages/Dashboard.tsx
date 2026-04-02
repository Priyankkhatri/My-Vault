import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound, MapPin, CreditCard, FileText, FolderLock,
  Shield, Plus, Wand2, Star, Clock, ArrowRight,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { SecurityRing, getCategoryIcon, getCategoryColor, getCategoryBg } from '../components/vault/VaultHelpers';
import { VaultItemCard } from '../components/vault/VaultItemCard';
import { Button } from '../components/ui/Button';

const quickActions = [
  { icon: KeyRound, label: 'Password', path: '/add/password', color: 'text-vault-primary-600', bg: 'bg-vault-primary-50 border-vault-primary-100' },
  { icon: MapPin, label: 'Address', path: '/add/address', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
  { icon: CreditCard, label: 'Card', path: '/add/card', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
  { icon: FileText, label: 'Note', path: '/add/note', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  { icon: FolderLock, label: 'Document', path: '/add/document', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
  { icon: Wand2, label: 'Generate', path: '/add/password', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-100' },
];

export function Dashboard() {
  const { items } = useVault();
  const navigate = useNavigate();

  const passwordCount = items.filter(i => i.type === 'password').length;
  const weakPasswords = items.filter(i => i.type === 'password' && (i.strength === 'weak' || i.strength === 'fair')).length;
  const healthScore = Math.round(((passwordCount - weakPasswords) / Math.max(passwordCount, 1)) * 100);
  const recentItems = [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  const favoriteItems = items.filter(i => i.favorite);

  const stats = [
    { label: 'Total items', value: items.length, icon: FolderLock, color: 'text-vault-gray-400' },
    { label: 'Passwords', value: passwordCount, icon: KeyRound, color: 'text-vault-primary-600' },
    { label: 'Favorites', value: favoriteItems.length, icon: Star, color: 'text-amber-500' },
    { label: 'Weak', value: weakPasswords, icon: Shield, color: weakPasswords > 0 ? 'text-red-500' : 'text-emerald-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 space-y-8 max-w-6xl mx-auto overflow-y-auto h-full scrollbar-hidden"
    >
      {/* Greeting */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-vault-gray-950 tracking-tight">Vault Overview</h2>
          <p className="text-sm text-vault-gray-500 mt-1">Manage and monitor your digital security.</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => navigate('/add')} className="px-4 py-2 bg-vault-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-vault-primary-500 transition-all shadow-sm shadow-vault-primary-200 flex items-center gap-2">
             <Plus size={16} strokeWidth={2.5}/> New Item
           </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="vault-card p-5 bg-white"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-vault-gray-400 uppercase tracking-widest">{stat.label}</p>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p className="text-2xl font-bold text-vault-gray-900 leading-none">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Actions + Security */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick actions */}
          <div>
            <h3 className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest px-1 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quickActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(action.path)}
                  className="vault-card p-4 bg-white flex flex-col items-center gap-3 cursor-pointer group hover:border-vault-primary-300"
                >
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${action.bg} ${action.color} transition-transform group-hover:scale-110`}>
                    <action.icon size={22} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-semibold text-vault-gray-700">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Recently Added Section would go here in detailed redesign if space allows */}
        </div>

        {/* Right Column: Health Ring */}
        <div className="space-y-8">
           <div>
            <h3 className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest px-1 mb-3">Security Insights</h3>
            <div className="vault-card p-6 bg-white flex flex-col items-center justify-center text-center">
              <SecurityRing score={healthScore} size={140} strokeWidth={12} label="Health" />
              <div className="mt-6 space-y-1">
                <p className="text-base font-bold text-vault-gray-900">Your vault is {healthScore}% secure</p>
                <p className="text-xs text-vault-gray-500 px-4">
                  {healthScore < 70 ? 'Several high-risk passwords detected. Review your audit.' : 'Great work! Your vault security meets premium standards.'}
                </p>
              </div>
              <button
                onClick={() => navigate('/security')}
                className="mt-6 w-full py-2.5 rounded-lg border border-vault-gray-200 text-sm font-semibold text-vault-gray-700 hover:bg-vault-gray-50 transition-all flex items-center justify-center gap-2 group"
              >
                Full Security Audit <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Clock size={14} /> Recent Activities
          </h3>
          <button
            onClick={() => navigate('/vault')}
            className="text-xs font-semibold text-vault-primary-600 hover:text-vault-primary-500 cursor-pointer flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight size={12} />
          </button>
        </div>
        <div className="space-y-3">
          {recentItems.length > 0 ? (
            recentItems.map((item, i) => (
              <VaultItemCard key={item.id} item={item} index={i} />
            ))
          ) : (
            <div className="vault-card p-12 bg-white flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-vault-gray-50 flex items-center justify-center mb-4">
                <FolderLock size={32} className="text-vault-gray-300" />
              </div>
              <p className="text-sm font-medium text-vault-gray-900">Your vault is empty</p>
              <p className="text-xs text-vault-gray-500 mt-1">Start by adding your first credential or secure note.</p>
              <Button variant="secondary" size="sm" className="mt-6" onClick={() => navigate('/add')}>
                Add Item
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
