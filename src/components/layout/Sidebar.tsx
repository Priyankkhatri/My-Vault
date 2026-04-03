import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Lock, ShieldCheck, Settings } from 'lucide-react';
import { useVault } from '../../context/VaultContext';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/vault', icon: Lock, label: 'Vault' },
  { path: '/security', icon: ShieldCheck, label: 'Security' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { lock } = useVault();
  const navigate = useNavigate();

  const handleLock = () => {
    lock(); // clears encryption key, tokens, and vault state
    navigate('/', { replace: true }); // redirect to root (LockScreen renders when isLocked=true)
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 flex flex-col z-40">
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <span className="text-base font-semibold text-gray-900">My-Vault</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLock}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-full"
        >
          <Lock size={18} />
          Lock Vault
        </button>
      </div>
    </aside>
  );
}
