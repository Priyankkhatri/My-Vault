import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, KeyRound, MapPin, CreditCard, FileText, FolderLock,
  Shield, Settings, Lock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { useState } from 'react';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/vault', icon: FolderLock, label: 'All Items' },
  { path: '/vault/password', icon: KeyRound, label: 'Passwords' },
  { path: '/vault/address', icon: MapPin, label: 'Addresses' },
  { path: '/vault/card', icon: CreditCard, label: 'Cards' },
  { path: '/vault/note', icon: FileText, label: 'Notes' },
  { path: '/vault/document', icon: FolderLock, label: 'Documents' },
  { path: '/security', icon: Shield, label: 'Security' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { items, lock } = useVault();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const getCategoryCount = (type: string) => {
    if (type === 'All Items') return items.length;
    const map: Record<string, string> = {
      Passwords: 'password', Addresses: 'address', Cards: 'card',
      Notes: 'note', Documents: 'document',
    };
    return items.filter(i => i.type === map[type]).length;
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="h-full bg-white border-r border-vault-gray-200 flex flex-col flex-shrink-0 overflow-hidden z-20 shadow-sm"
    >
      {/* Header */}
      <div className="px-4 py-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-vault-primary-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-vault-primary-200">
          <Shield size={20} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
            <h1 className="text-base font-bold text-vault-gray-950 tracking-tight">My-Vault</h1>
            <p className="text-[10px] text-vault-primary-600 font-bold uppercase tracking-widest">Enterprise</p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-3 space-y-1 overflow-y-auto">
        {!collapsed && <p className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest px-3 mb-2 mt-2">Vault</p>}
        {navItems.slice(0, 7).map(({ path, icon: Icon, label }) => {
          const count = getCategoryCount(label);
          return (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-100 group ${
                  isActive
                    ? 'bg-vault-primary-50 text-vault-primary-600 font-semibold'
                    : 'text-vault-gray-600 hover:text-vault-gray-900 hover:bg-vault-gray-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className="flex-shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {count > 0 && (
                        <span className="text-[10px] font-bold text-vault-gray-500 bg-vault-gray-100 px-1.5 py-0.5 rounded-full">
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {!collapsed && <p className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest px-3 mb-2 mt-6">System</p>}
        {navItems.slice(7).map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-100 group ${
                isActive
                  ? 'bg-vault-primary-50 text-vault-primary-600 font-semibold'
                  : 'text-vault-gray-600 hover:text-vault-gray-900 hover:bg-vault-gray-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} className="flex-shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-vault-gray-100 space-y-1 bg-vault-gray-50/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-vault-gray-500 hover:text-vault-gray-900 hover:bg-white transition-all cursor-pointer border border-transparent hover:border-vault-gray-200"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="font-medium">Collapse</span>}
        </button>
        <button
          onClick={() => { lock(); navigate('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-vault-gray-500 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-transparent hover:border-red-100"
        >
          <Lock size={18} className="flex-shrink-0" />
          {!collapsed && <span className="font-medium">Lock Vault</span>}
        </button>
      </div>
    </motion.aside>
  );
}
