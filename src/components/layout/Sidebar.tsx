import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Lock, ShieldCheck, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/vault', icon: Lock, label: 'Vault' },
  { path: '/security', icon: ShieldCheck, label: 'Security' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 flex flex-col z-40">
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-gray-100">
        <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-teal-700 rounded-lg flex items-center justify-center shadow-sm">
          <ShieldCheck size={15} className="text-white" />
        </div>
        <span className="text-base font-bold text-gray-900 tracking-tight">Vestiga</span>
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
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 max-w-full group"
        >
          <LogOut size={18} className="group-hover:text-red-500 transition-colors" />
          <span className="group-hover:text-red-600 transition-colors">Log Out</span>
        </button>
      </div>
    </aside>
  );
}
