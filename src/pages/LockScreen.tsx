import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Shield, Fingerprint, FolderLock } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { Button } from '../components/ui/Button';

export function LockScreen() {
  const { unlock } = useVault();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleUnlock = async () => {
    if (!password) {
      setError('Please enter your master password');
      return;
    }
    setIsUnlocking(true);
    // Simulate unlock delay
    await new Promise(resolve => setTimeout(resolve, 800));
    const success = await unlock(password);
    if (!success) {
      setError('Invalid identity credentials');
      setIsUnlocking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-white relative overflow-hidden">
      {/* Premium Background Mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-vault-primary-50/40 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-50/40 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] px-10 py-12 bg-white rounded-[40px] border border-vault-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)]"
      >
        {/* Vault identity */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            animate={isUnlocking ? { rotateY: 180, scale: 0.9 } : { rotateY: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-24 h-24 rounded-[32px] bg-white border border-vault-gray-200 shadow-xl flex items-center justify-center mb-8 relative"
          >
            <div className="absolute inset-0 rounded-[32px] bg-vault-primary-50/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <AnimatePresence mode="wait">
              {isUnlocking ? (
                <motion.div
                  key="unlocking"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-vault-primary-600 relative z-10"
                >
                  <Shield size={40} strokeWidth={2.5} />
                </motion.div>
              ) : (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-vault-primary-600 relative z-10"
                >
                  <FolderLock size={40} strokeWidth={2.5} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <h1 className="text-3xl font-bold text-vault-gray-950 tracking-tight mb-2">My-Vault</h1>
          <p className="text-sm font-bold text-vault-gray-400 uppercase tracking-widest">Authentication Required</p>
        </div>

        {/* Password input */}
        <div className="space-y-6">
          <div className="relative group">
            <input
              type="password"
              placeholder="Enter Master Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
              className={`w-full bg-vault-gray-50 border-2 rounded-2xl px-6 py-4.5 text-base text-vault-gray-950 placeholder:text-vault-gray-300 focus:outline-none transition-all duration-300 font-mono tracking-[0.2em] ${
                error ? 'border-red-500' : focused ? 'border-vault-primary-500 bg-white ring-8 ring-vault-primary-50/50' : 'border-transparent'
              }`}
            />
            {!focused && !password && (
               <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-3">
                  <Lock size={18} className="text-vault-gray-300" strokeWidth={2.5} />
                  <span className="text-vault-gray-300 font-bold uppercase tracking-widest text-xs">Master Key</span>
               </div>
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-bold text-red-600 text-center uppercase tracking-widest"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <Button
            onClick={handleUnlock}
            disabled={isUnlocking}
            className="w-full py-5 rounded-2xl text-base font-bold shadow-lg shadow-vault-primary-100"
            size="lg"
          >
            {isUnlocking ? (
              <span className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Verifying Cluster...
              </span>
            ) : (
              'Unlock Directory'
            )}
          </Button>
        </div>

        {/* Secondary actions */}
        <div className="mt-10 flex items-center justify-between px-2">
          <button className="flex items-center gap-2 text-[10px] font-bold text-vault-gray-400 hover:text-vault-primary-600 transition-colors cursor-pointer uppercase tracking-widest">
            <Fingerprint size={16} strokeWidth={2.5} />
            Hardware Key
          </button>
          <button className="text-[10px] font-bold text-vault-gray-400 hover:text-vault-primary-600 transition-colors cursor-pointer uppercase tracking-widest">
            Recover Access?
          </button>
        </div>

        {/* Encrypted status */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm">
            <Shield size={14} className="text-emerald-600" strokeWidth={2.5} />
            <span className="text-[10px] text-emerald-700 uppercase tracking-widest font-bold">AES-256 Protected</span>
          </div>
        </div>
      </motion.div>

      {/* Version Tag */}
      <div className="absolute bottom-8 text-[10px] font-bold text-vault-gray-300 uppercase tracking-[0.3em]">
        My-Vault Security Infrastructure v4.0.0
      </div>
    </div>
  );
}
