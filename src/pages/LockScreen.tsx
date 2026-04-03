import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LockScreen() {
  const { unlock } = useVault();
  const navigate = useNavigate();
  const [password, setPassword] = useState(import.meta.env.DEV ? 'priyank@1237' : '');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Please enter your master password');
      triggerShake();
      return;
    }

    setIsUnlocking(true);
    setError('');

    // Simulate unlock delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));
    const success = await unlock(password);

    if (success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError('Invalid identity credentials');
      triggerShake();
      setIsUnlocking(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-sm p-8"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-6">
            <ShieldCheck size={32} className="text-teal-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">My-Vault</h1>
          <p className="text-sm font-medium text-gray-600">Enter your master key to unlock</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="password"
              placeholder="Master Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoFocus
              error={!!error}
              className="text-center font-mono tracking-widest text-lg"
            />
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold text-red-600 text-center mt-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <Button
            type="submit"
            disabled={isUnlocking}
            className="w-full py-2.5 text-base font-semibold"
          >
            {isUnlocking ? <Loader2 className="animate-spin" size={20} /> : 'Unlock Vault'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
