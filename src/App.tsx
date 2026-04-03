import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { VaultProvider, useVault } from './context/VaultContext';
import { LockScreen } from './pages/LockScreen';
import { Dashboard } from './pages/Dashboard';
import { VaultLibrary } from './pages/VaultLibrary';
import { ItemDetail } from './pages/ItemDetail';
import { AddItem } from './pages/AddItem';
import { SecurityAudit } from './pages/SecurityAudit';
import { Settings } from './pages/Settings';
import { AppLayout } from './components/layout/AppLayout';
import { CommandPalette } from './features/search/CommandPalette';
import { Toaster } from 'react-hot-toast';
import { AIAssistantPanel } from './components/ai/AIAssistantPanel';
import { AnimatePresence } from 'framer-motion';
import { useIdleTimer } from './hooks/useIdleTimer';
import { useCallback } from 'react';

function AppRoutes() {
 const { isLocked, lock, autoLockTimeout } = useVault();
 const navigate = useNavigate();

 // Session timeout: lock vault after idle period
 const handleIdle = useCallback(() => {
 lock();
 navigate('/', { replace: true });
 }, [lock, navigate]);

 useIdleTimer(handleIdle, autoLockTimeout, !isLocked);

 if (isLocked) {
 return <LockScreen />;
 }

 return (
 <>
 <AppLayout>
 <AnimatePresence mode="wait">
 <Routes>
 <Route path="/dashboard" element={<Dashboard />} />
 <Route path="/vault" element={<VaultLibrary />} />
 <Route path="/vault/:category" element={<VaultLibrary />} />
 <Route path="/item/:id" element={<ItemDetail />} />
 <Route path="/add" element={<AddItem />} />
 <Route path="/add/:type" element={<AddItem />} />
 <Route path="/security" element={<SecurityAudit />} />
 <Route path="/settings" element={<Settings />} />
 <Route path="/" element={<Navigate to="/dashboard" replace />} />
 <Route path="*" element={<Navigate to="/dashboard" replace />} />
 </Routes>
 </AnimatePresence>
 </AppLayout>
 <CommandPalette />
 <AIAssistantPanel />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          success: { duration: 3000 },
          error: { duration: 5000 },
          style: {
            fontSize: '14px',
            borderRadius: '12px',
            background: '#fff',
            color: '#374151',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px border-gray-100',
            padding: '12px 16px',
            fontWeight: '600',
          },
        }}
      />
 </>
 );
}

export default function App() {
 return (
 <BrowserRouter>
 <VaultProvider>
 <AppRoutes />
 </VaultProvider>
 </BrowserRouter>
 );
}
