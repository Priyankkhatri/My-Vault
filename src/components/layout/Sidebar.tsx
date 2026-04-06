import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Lock, ShieldCheck, Settings, LogOut, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/vault', icon: Lock, label: 'Vault Library' },
  { path: '/security', icon: ShieldCheck, label: 'Security Audit' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`fixed left-0 top-0 h-full w-56 bg-[#F9FAFB] border-r border-gray-200 flex flex-col z-50 md:z-40 selection:bg-teal-100 transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        {/* Brand & Mobile Close */}
        <div className="h-16 flex items-center justify-between gap-2.5 px-6 shrink-0 border-b border-gray-100 md:border-b-0 md:mt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-teal-600 rounded-md flex items-center justify-center shadow-sm">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="text-[15px] font-bold text-gray-900 tracking-tight">Vestiga</span>
          </div>
          <button 
            className="md:hidden p-1.5 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-1">
            Menu
          </div>
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors group ${
                  isActive
                    ? 'bg-gray-200/50 text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={`${isActive ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-600'} transition-colors`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 mt-auto">
          <div className="flex flex-col gap-1 p-3 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                <User size={14} className="text-teal-600" />
              </div>
              <div className="min-w-0 pr-2">
                <div className="text-[12px] font-semibold text-gray-900 truncate">
                  {user?.email?.split('@')[0] || 'My Account'}
                </div>
                <div className="text-[11px] text-gray-500 truncate">
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="h-px bg-gray-100 w-full mb-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] font-medium text-gray-500 rounded hover:bg-gray-50 hover:text-red-600 transition-colors group"
            >
              <LogOut size={14} className="group-hover:text-red-500" />
              Log Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
