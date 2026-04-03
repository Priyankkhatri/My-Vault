import { useMemo } from 'react';
import { AlertTriangle, Clock, ShieldCheck, FolderLock } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { SecurityRing, getCategoryIcon } from '../components/vault/VaultHelpers';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { PasswordItem } from '../types/vault';
import { calculatePasswordStrength, findReusedPasswordsSync, calculateSecurityScore } from '../utils/securityUtils';

export function Dashboard() {
  const { items } = useVault();

  const passwords = useMemo(() => items.filter((i): i is PasswordItem => i.type === 'password'), [items]);
  
  const weakPasswords = useMemo(() => passwords.filter(i => calculatePasswordStrength(i.password) <= 1), [passwords]);
  const weakCount = weakPasswords.length;

  const reusedGroups = useMemo(() => findReusedPasswordsSync(items), [items]);
  const reusedCount = useMemo(() => reusedGroups.reduce((acc, g) => acc + g.items.length, 0), [reusedGroups]);

  const healthScore = useMemo(() => calculateSecurityScore(items, reusedGroups), [items, reusedGroups]);

  const atRiskPasswords = useMemo(() => [...weakPasswords].slice(0, 5), [weakPasswords]);
  const recentItems = useMemo(() => 
    [...items]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5), 
    [items]
  );

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your secure items and vault health</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* ROW 1: STAT CARDS */}
        <div className="grid grid-cols-4 gap-4">
          <Card variant="stat" className="flex flex-col justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Items</span>
            <span className="text-3xl font-bold text-gray-900 mt-2">{items.length}</span>
          </Card>
          <Card variant="stat" className="flex flex-col justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weak Passwords</span>
            <span className={`text-3xl font-bold mt-2 ${weakCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{weakCount}</span>
          </Card>
          <Card variant="stat" className="flex flex-col justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reused Passwords</span>
            <span className={`text-3xl font-bold mt-2 ${reusedCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{reusedCount}</span>
          </Card>
          <Card variant="stat" className="flex flex-col justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Security Score</span>
            <span className="text-3xl font-bold text-teal-600 mt-2">{healthScore}</span>
          </Card>
        </div>

        {/* ROW 2: AT RISK + SCORE */}
        <div className="grid grid-cols-3 gap-6">
          <Card variant="section" className="col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">At Risk</h3>
            {atRiskPasswords.length > 0 ? (
              <div className="divide-y divide-gray-100 -mx-6">
                {atRiskPasswords.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-50 text-red-600">
                        <AlertTriangle size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.title}</div>
                        <div className="text-xs text-gray-500">{item.username || item.website || 'No login'}</div>
                      </div>
                    </div>
                    <Badge variant="red">{item.strength}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <ShieldCheck size={32} className="text-teal-600 mb-3" />
                <span className="text-sm font-medium text-gray-900">All Good</span>
                <span className="text-xs text-gray-500">No high-risk passwords found</span>
              </div>
            )}
          </Card>

          <Card variant="section" className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 self-start">Vault Health</h3>
            <SecurityRing score={healthScore} size={140} strokeWidth={12} />
            <div className="mt-6 text-center">
              <div className="text-2xl font-bold text-gray-900">{healthScore}%</div>
              <div className="text-xs font-medium text-gray-500 mt-1">Overall Score</div>
            </div>
          </Card>
        </div>

        {/* ROW 3: RECENT ACTIVITY */}
        <Card variant="section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentItems.length > 0 ? (
            <div className="divide-y divide-gray-100 -mx-6">
              {recentItems.map(item => (
                <div key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                      {getCategoryIcon(item.type, 16)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock size={12} />
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="gray" className="uppercase">{item.type}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <FolderLock size={32} className="text-gray-400 mb-3" />
              <span className="text-sm font-medium text-gray-900">No Activity</span>
              <span className="text-xs text-gray-500">You haven't added any items yet</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}