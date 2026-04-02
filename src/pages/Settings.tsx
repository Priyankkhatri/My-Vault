import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Download, Upload, Key, Clock, Eye, Keyboard, Palette, AlertTriangle,
  Trash2, RotateCcw, Lock, Monitor, Fingerprint, Bell, Moon, Zap,
} from 'lucide-react';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useVault } from '../context/VaultContext';

interface SettingsSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
}

function SettingsSection({ title, icon, children, danger }: SettingsSectionProps) {
  return (
    <div className={`vault-card bg-white p-6 shadow-sm border ${danger ? 'border-red-100 bg-red-50/30' : 'border-vault-gray-200'}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${danger ? 'bg-red-100 text-red-600' : 'bg-vault-gray-50 text-vault-primary-600'}`}>
          {icon}
        </div>
        <h3 className={`text-[10px] font-bold uppercase tracking-widest ${danger ? 'text-red-700' : 'text-vault-gray-400'}`}>
          {title}
        </h3>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export function Settings() {
  const { addToast } = useVault();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Mock settings state
  const [settings, setSettings] = useState({
    biometric: false,
    autoLock: true,
    lockOnClose: true,
    clipboardClear: true,
    autofill: true,
    autofillOverlay: true,
    multiAccount: true,
    darkMode: false, // Changed default for light-first focus
    compactMode: false,
    motionReduce: false,
    tooltips: true,
    showHidden: false,
    backupReminder: true,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-4xl mx-auto space-y-8 h-full overflow-y-auto scrollbar-hidden">
      <div className="flex items-end justify-between border-b border-vault-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-vault-gray-950 tracking-tight">System Preferences</h2>
          <p className="text-sm text-vault-gray-500 mt-1">Configure your security protocols and workspace appearance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security */}
        <SettingsSection title="Security Protocol" icon={<Shield size={18} strokeWidth={2.5} />}>
          <Button variant="secondary" size="md" icon={<Key size={16} />} className="w-full justify-start font-bold">
            Rotate Master Password
          </Button>
          <Toggle checked={settings.biometric} onChange={() => toggle('biometric')} label="Biometric Unlock" description="Allow authentication via hardware biometrics" />
          <Toggle checked={settings.autoLock} onChange={() => toggle('autoLock')} label="Session Timeout" description="Auto-lock vault after 5 minutes of inactivity" />
          <Toggle checked={settings.lockOnClose} onChange={() => toggle('lockOnClose')} label="Lock on Terminate" description="Lock immediately upon browser tab closure" />
          <Toggle checked={settings.clipboardClear} onChange={() => toggle('clipboardClear')} label="Memory Sanitation" description="Securely wipe clipboard contents after 30 seconds" />
        </SettingsSection>

        {/* Data Architecture */}
        <SettingsSection title="Data Architecture" icon={<Download size={18} strokeWidth={2.5} />}>
          <div className="flex gap-3">
            <Button variant="secondary" size="md" icon={<Download size={16} />} className="flex-1 font-bold"
              onClick={() => addToast('Encryption archive generated', 'success')}>
              Export
            </Button>
            <Button variant="secondary" size="md" icon={<Upload size={16} />} className="flex-1 font-bold">
              Import
            </Button>
          </div>
          <Button variant="secondary" size="md" icon={<Lock size={16} />} className="w-full justify-start font-bold">
            View Recovery Cluster
          </Button>
          <Toggle checked={settings.backupReminder} onChange={() => toggle('backupReminder')} label="Persistence Audits" description="Schedule monthly encrypted backup reminders" />
        </SettingsSection>

        {/* Intelligence & Autofill */}
        <SettingsSection title="Intelligence Layer" icon={<Zap size={18} strokeWidth={2.5} />}>
          <Toggle checked={settings.autofill} onChange={() => toggle('autofill')} label="Neural Autofill" description="Synthesize logins into active form fields" />
          <Toggle checked={settings.autofillOverlay} onChange={() => toggle('autofillOverlay')} label="Smart Overlay" description="Display contextual action popups on focus" />
          <Toggle checked={settings.multiAccount} onChange={() => toggle('multiAccount')} label="Identity Resolver" description="Sort and suggest multiple matched identities" />
        </SettingsSection>

        {/* User Interface */}
        <SettingsSection title="Workspace Aesthetic" icon={<Palette size={18} strokeWidth={2.5} />}>
          <Toggle checked={settings.darkMode} onChange={() => toggle('darkMode')} label="Developer Theme" description="High-contrast dark mode environment" />
          <Toggle checked={settings.compactMode} onChange={() => toggle('compactMode')} label="Information Density" description="Reduce layout inertia and scale typography" />
          <div>
            <p className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest mb-4">Core Accent Token</p>
            <div className="flex gap-2.5">
              {['#0d9488', '#2563eb', '#16a34a', '#7c3aed', '#dc2626', '#d97706'].map(color => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-full border-2 transition-all p-0.5 shadow-sm cursor-pointer ${
                    color === '#0d9488' ? 'border-vault-primary-600 scale-110 shadow-vault-primary-200' : 'border-transparent'
                  }`}
                >
                  <div className="w-full h-full rounded-full" style={{ backgroundColor: color }} />
                </button>
              ))}
            </div>
          </div>
        </SettingsSection>
      </div>

      {/* Danger Zone */}
      <div className="pt-4 pb-20">
        <SettingsSection title="Critical Actions" icon={<AlertTriangle size={18} strokeWidth={2.5} />} danger>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 transition-all cursor-pointer group text-left"
            >
              <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                <Trash2 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Destroy Vault</p>
                <p className="text-[11px] font-medium opacity-80">Erase all encrypted records</p>
              </div>
            </button>
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-3 p-4 rounded-xl border border-vault-gray-200 bg-white hover:bg-vault-gray-50 text-vault-gray-900 transition-all cursor-pointer group text-left"
            >
              <div className="p-2 bg-vault-gray-50 rounded-lg group-hover:bg-vault-gray-100 transition-colors">
                <RotateCcw size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Hard Reset</p>
                <p className="text-[11px] font-medium opacity-60">Factory reset configuration</p>
              </div>
            </button>
          </div>
        </SettingsSection>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => addToast('Nuclear protocol initiated (demo)', 'info')}
        title="Destroy Vault?"
        description="This action is absolute. Your entire encrypted database will be purged from memory and disk. Are you certain?"
        confirmLabel="Destroy Data"
        danger
      />
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => addToast('Preferences sanitized (demo)', 'info')}
        title="Sanitize Workspace?"
        description="All configuration parameters and UI states will return to local defaults. Your encrypted items will remain safe."
        confirmLabel="Execute Reset"
        danger
      />
    </motion.div>
  );
}
