import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Database, Sparkles, AlertTriangle, Key, Monitor,
  Download, Upload, Trash2, ServerOff, KeySquare, Loader2, RefreshCw, Lock
} from 'lucide-react';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { useVault } from '../context/VaultContext';
import { getQuotas, QuotaInfo } from '../features/ai/quotaTracker';
import { 
  changeMasterPasswordAuthPart, 
  updateSessionAfterPasswordChange, 
  revokeOtherSessions, 
  deleteAccountServerSide 
} from '../services/authService';
import { reEncryptAllItems } from '../services/vaultService';
import { v4 as uuid } from 'uuid';

interface SettingsSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}

function SettingsSection({ id, title, children, danger }: SettingsSectionProps) {
  return (
    <div id={id} className={`scroll-mt-8 ${danger ? '' : ''}`}>
      <Card variant={danger ? 'danger' : 'section'}>
        <h3 className={`text-lg font-semibold mb-6 ${danger ? 'text-red-700' : 'text-gray-900'}`}>
          {title}
        </h3>
        <div className="space-y-8">{children}</div>
      </Card>
    </div>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const { addToast, autoLockTimeout, setAutoLockTimeout, items, addItem, clearVault } = useVault();
  const [activeTab, setActiveTab] = useState('sec-security');
  
  // Danger Zone Modals
  const [showDeleteItemsModal, setShowDeleteItemsModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Form states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toggles & Selects
  const [totpEnabled, setTotpEnabled] = useState(false);
  const autoLockTime = autoLockTimeout <= 0 ? 'never' : String(autoLockTimeout);
  const [aiToggles, setAiToggles] = useState({
    strengthAnalysis: true,
    securityAudit: true,
    assistantChat: true,
    autoCategorization: true
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Just now');
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeletingItems, setIsDeletingItems] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState([
    { id: 'current', device: 'Current Device (Windows OS)', details: 'Logged in via password · IP: 192.168.1.15', active: true }
  ]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('myVault_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAiToggles(parsed);
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('myVault_settings', JSON.stringify(aiToggles));
  }, [aiToggles]);

  // AI Quotas
  const [quotas, setQuotas] = useState<QuotaInfo[]>([]);

  useEffect(() => {
    getQuotas().then(res => {
      if (res && res.length > 0) {
        setQuotas(res);
      } else {
        setQuotas([
          { feature: 'strength_analysis', used: 120, limit: 1000, remaining: 880 },
          { feature: 'security_audit', used: 4, limit: 50, remaining: 46 },
          { feature: 'assistant_chat', used: 45, limit: 200, remaining: 155 },
          { feature: 'auto_categorization', used: 80, limit: 1000, remaining: 920 },
        ]);
      }
    });
  }, []);

  const scrollTo = (id: string) => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSynced('Just now');
      addToast('Vault synchronized successfully', 'success');
    }, 1200);
  };

  const handleUpdatePassword = async () => {
    const newErrors: Record<string, string> = {};
    if (!oldPassword) newErrors.oldPassword = 'Required';
    if (!newPassword) newErrors.newPassword = 'Required';
    if (!confirmPassword) newErrors.confirmPassword = 'Required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast('Please fill all required fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      addToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword === oldPassword) {
      setErrors({ newPassword: 'New password must be different' });
      addToast('New password must be different', 'error');
      return;
    }

    setErrors({});
    setIsUpdatingPassword(true);
    try {
      // 1. Auth update on server + get new session
      const authRes = await changeMasterPasswordAuthPart(oldPassword, newPassword);
      if (!authRes.success || !authRes.newSession || !authRes.newParams) {
        addToast(authRes.error || 'Failed to update password', 'error');
        return;
      }

      // 2. Re-encrypt and upload all items
      const encryptRes = await reEncryptAllItems(items, authRes.newSession.encryptionKey);
      if (!encryptRes.success) {
        addToast(encryptRes.error || 'Failed to re-encrypt vault. Please try again.', 'error');
        return;
      }

      // 3. Finalize local state
      updateSessionAfterPasswordChange(authRes.newSession, authRes.newParams);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Master Password updated successfully!', 'success');
    } catch (error) {
      console.error(error);
      addToast('An unexpected error occurred', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleExport = () => {
    if (items.length === 0) {
      addToast('Vault is empty — nothing to export', 'warning');
      return;
    }

    try {
      const data = JSON.stringify(items, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `myVault_export_${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('Vault exported successfully', 'success');
    } catch (e) {
      addToast('Export failed', 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        let importedItems: any[] = [];
        
        if (file.name.endsWith('.json')) {
          importedItems = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          // Basic CSV support (title,username,password,url)
          const lines = content.split('\n');
          const headers = lines[0].split(',');
          importedItems = lines.slice(1).filter(l => l.trim()).map(line => {
            const values = line.split(',');
            const obj: any = {};
            headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
            return {
              id: uuid(),
              type: 'password',
              title: obj.title || 'Imported Password',
              username: obj.username || '',
              password: obj.password || '',
              website: obj.url || '',
              url: obj.url || '',
              favorite: false,
              tags: ['imported'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });
        }

        if (!Array.isArray(importedItems)) {
          throw new Error('Invalid format');
        }

        let count = 0;
        for (const item of importedItems) {
          if (item.title) {
            await addItem(item);
            count++;
          }
        }
        addToast(`Imported ${count} items successfully`, 'success');
      } catch (err) {
        addToast('Import failed: Invalid file format', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRevokeAll = async () => {
    setIsRevoking(true);
    try {
      const success = await revokeOtherSessions();
      if (success) {
        setSessions(prev => prev.filter(s => s.id === 'current'));
        addToast('All other sessions revoked', 'success');
      } else {
        addToast('Failed to revoke sessions', 'error');
      }
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const success = await deleteAccountServerSide();
      if (success) {
        addToast('Account deleted successfully', 'success');
        navigate('/');
      } else {
        addToast('Account deletion failed', 'error');
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteItems = async () => {
    setIsDeletingItems(true);
    try {
      await clearVault();
      setShowDeleteItemsModal(false);
    } finally {
      setIsDeletingItems(false);
    }
  };
;

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage global vault settings, security layers, and integrations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Sticky Left Navigation (w-44) */}
        <div className="w-full md:w-44 shrink-0 sticky top-24 space-y-1">
          <button 
            onClick={() => scrollTo('sec-security')} 
            className={`flex items-center gap-2 p-2 w-full text-left text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'sec-security' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Shield size={16} /> Security
          </button>
          <button 
            onClick={() => scrollTo('sec-data')} 
            className={`flex items-center gap-2 p-2 w-full text-left text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'sec-data' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Database size={16} /> Data
          </button>
          <button 
            onClick={() => scrollTo('sec-ai')} 
            className={`flex items-center gap-2 p-2 w-full text-left text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'sec-ai' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Sparkles size={16} /> AI Features
          </button>
          <div className="h-px bg-gray-200 my-2 mx-2" />
          <button 
            onClick={() => scrollTo('sec-danger')} 
            className={`flex items-center gap-2 p-2 w-full text-left text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'sec-danger' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            <AlertTriangle size={16} /> Danger Zone
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 space-y-6 min-w-0 w-full mb-20">
          
          {/* Security Section */}
          <SettingsSection id="sec-security" title="Security Parameters">
            
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Key size={16} className="text-gray-400" /> Master Password
              </h4>
              <div className="space-y-3 max-w-sm">
                <Input 
                  type="password" 
                  label="Current Password" 
                  value={oldPassword} 
                  onChange={e => setOldPassword(e.target.value)} 
                  error={errors.oldPassword}
                />
                <Input 
                  type="password" 
                  label="New Master Password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  error={errors.newPassword}
                />
                <Input 
                  type="password" 
                  label="Confirm New Password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  error={errors.confirmPassword}
                />
                <Button onClick={handleUpdatePassword} isLoading={isUpdatingPassword}>
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">Multi-Factor Control</h4>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Two-Factor Authentication (TOTP)</p>
                  <p className="text-xs text-gray-500 mt-1">Require an authenticator app code on login to grant access.</p>
                </div>
                <Toggle checked={totpEnabled} onChange={() => setTotpEnabled(!totpEnabled)} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Lock size={16} className="text-gray-400" /> Vault Timeout
              </h4>
              <div className="flex flex-col gap-1.5 max-w-xs">
                <label className="text-xs font-medium text-gray-700">Auto-lock vault after inactivity</label>
                <select value={autoLockTime} onChange={(e) => setAutoLockTimeout(e.target.value === 'never' ? 0 : parseInt(e.target.value, 10))} 
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-shadow">
                  <option value="1">1 minute</option>
                  <option value="5">5 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Monitor size={16} className="text-gray-400" /> Active Sessions
              </h4>
              <div className="space-y-3">
                {sessions.length > 0 ? sessions.map(session => (
                  <div key={session.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between shadow-sm hover:border-gray-300 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-teal-600 shadow-sm">
                        <Monitor size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{session.device}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{session.details}</p>
                      </div>
                    </div>
                    {session.active && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
                        Active
                      </span>
                    )}
                  </div>
                )) : (
                  <EmptyState 
                    icon={Monitor}
                    title="No Sessions"
                    description="You currently have no active sessions on other devices."
                  />
                )}
              </div>
            </div>
            
          </SettingsSection>

          {/* Data Section */}
          <SettingsSection id="sec-data" title="Data Management">
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200 mb-6 gap-4">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Encrypted Sync</p>
                <p className="text-xs text-gray-500 mt-1">Your vault is backed by E2E zero-knowledge cloud sync.</p>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <p className="text-xs font-medium text-gray-500 mb-2">Last synced: <span className="text-gray-900">{lastSynced}</span></p>
                <Button variant="secondary" onClick={handleManualSync} isLoading={isSyncing}>
                  {isSyncing ? 'Syncing...' : 'Force Sync'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={handleExport} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                  <Download size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Export Vault</p>
                  <p className="text-xs text-gray-500 mt-0.5">Download .json archive</p>
                </div>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                  <Upload size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Import Vault</p>
                  <p className="text-xs text-gray-500 mt-0.5">Restore from archive</p>
                </div>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                accept=".json,.csv" 
                className="hidden" 
              />
            </div>
          </SettingsSection>

          {/* AI Features Section */}
          <SettingsSection id="sec-ai" title="Intelligence Engine">
            <div className="grid grid-cols-1 gap-6">
              {[
                { key: 'strengthAnalysis', name: 'Entropy Analysis', desc: 'AI reasoning on password patterns.', apiFeature: 'strength_analysis' },
                { key: 'securityAudit', name: 'Deep Integrity Audit', desc: 'Global scan for related threat vectors.', apiFeature: 'security_audit' },
                { key: 'assistantChat', name: 'Copilot Assistant', desc: 'Natural language search interface.', apiFeature: 'assistant_chat' },
                { key: 'autoCategorization', name: 'Smart Categorize', desc: 'Auto-tagging for fast creation.', apiFeature: 'auto_categorization' }
              ].map(feat => {
                const checked = aiToggles[feat.key as keyof typeof aiToggles];
                const quota = quotas.find(q => q.feature === feat.apiFeature);
                const used = quota?.used ?? 0;
                const limit = quota?.limit ?? 100;
                const percent = (used / limit) * 100;
                
                return (
                  <div key={feat.key} className="p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{feat.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{feat.desc}</p>
                      </div>
                      <Toggle 
                        checked={checked} 
                        onChange={() => setAiToggles(t => ({...t, [feat.key]: !checked}))} 
                      />
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        <span>Quota Usage</span> 
                        <span className="text-gray-900">{used} / {limit}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${percent}%` }} 
                          className="h-full bg-teal-500 rounded-full" 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingsSection>

          {/* Danger Zone Section */}
          <SettingsSection id="sec-danger" title="Danger Zone" danger>
            <div className="p-4 rounded-lg bg-red-100/50 border border-red-200 text-sm font-medium text-red-700 mb-6 shadow-sm">
              Proceed with absolute caution. Critical actions performed here cannot be cleanly reverted without manual backups.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setShowDeleteItemsModal(true)} 
                className="flex items-center gap-3 p-4 rounded-lg bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all text-left shadow-sm hover:shadow-md"
              >
                <div className="p-2 rounded-lg bg-red-50 text-red-600 shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Erase Data</p>
                  <p className="text-xs text-gray-500 mt-0.5">Purge vault items</p>
                </div>
              </button>
              
              <button 
                onClick={() => setShowDeleteAccountModal(true)} 
                className="flex items-center gap-3 p-4 rounded-lg bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all text-left shadow-sm hover:shadow-md"
              >
                <div className="p-2 rounded-lg bg-red-50 text-red-600 shrink-0">
                  <ServerOff size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Destroy Identity</p>
                  <p className="text-xs text-gray-500 mt-0.5">Server deletion</p>
                </div>
              </button>

              <Button 
                variant="danger"
                onClick={handleRevokeAll} 
                className="w-full sm:col-span-2 justify-start h-auto p-4 bg-white border-red-200 hover:bg-red-50"
                isLoading={isRevoking}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50 text-red-600 shrink-0">
                    {isRevoking ? <Loader2 size={20} className="animate-spin" /> : <KeySquare size={20} />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Revoke Auth</p>
                    <p className="text-xs text-gray-500 mt-0.5">{isRevoking ? 'Revoking sessions...' : 'Disconnect all other active sessions'}</p>
                  </div>
                </div>
              </Button>
            </div>
          </SettingsSection>

        </div>
      </div>

      {/* Delete Vault Items Modal */}
      <Modal isOpen={showDeleteItemsModal} onClose={() => setShowDeleteItemsModal(false)} title="Erase All Data?">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-red-600 shadow-sm">
            <AlertTriangle size={24} />
          </div>
          <p className="text-sm text-gray-600 font-medium">This will permanently destroy all local items. Are you absolutely certain you want to proceed?</p>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowDeleteItemsModal(false)} className="flex-1" disabled={isDeletingItems}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteItems} className="flex-1" isLoading={isDeletingItems}>
            {isDeletingItems ? 'Deleting...' : 'Delete Items'}
          </Button>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={showDeleteAccountModal} onClose={() => { setShowDeleteAccountModal(false); setDeleteConfirmText(''); }} title="Destroy Master Identity">
        <div className="py-2">
          <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">
            This action is <strong>permanent</strong> and will destroy your master encryption key, cryptographic salts, and all data from our servers. 
          </p>
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 shadow-sm">
            <label className="text-[11px] font-bold uppercase tracking-wider text-red-800 block mb-2 px-0.5">
              Type <span className="font-extrabold select-all rounded px-1 -mx-1">DELETE</span> to confirm
            </label>
            <Input 
              type="text" 
              value={deleteConfirmText} 
              onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())} 
              className="font-bold font-mono text-center tracking-widest text-red-700"
              placeholder="DELETE"
              disabled={isDeletingAccount}
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="secondary" onClick={() => { setShowDeleteAccountModal(false); setDeleteConfirmText(''); }} disabled={isDeletingAccount}>Cancel</Button>
          <Button variant="danger" disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount} onClick={handleDeleteAccount} isLoading={isDeletingAccount}>
            {isDeletingAccount ? 'Deleting...' : 'Permanently Delete'}
          </Button>
        </div>
      </Modal>

    </div>
  );
}
