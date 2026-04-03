import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import toast from 'react-hot-toast';
import { VaultItem, VaultCategory, VaultState } from '../types/vault';

import { saveVaultItem, updateVaultItem as updateVaultItemServer, deleteVaultItemFromServer, fetchVaultItems } from '../services/vaultService';
import { login, register, logout as authLogout } from '../services/authService';

interface VaultContextType extends VaultState {
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: VaultCategory | 'all') => void;
  setAutoLockTimeout: (minutes: number) => void;
  addItem: (item: VaultItem) => Promise<void>;
  updateItem: (item: VaultItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  getFilteredItems: () => VaultItem[];
  clearVault: () => Promise<void>;
  debouncedSearchQuery: string;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<VaultCategory | 'all'>('all');
  const [autoLockTimeout, setAutoLockTimeout] = useState(15); // default 15 minutes

  // 150ms Debounce for search to improve responsiveness of the list filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Development setup: Clear stale salts to ensure the pre-filled password works
  useEffect(() => {
    if (import.meta.env.DEV) {
      localStorage.removeItem('vault_salt_demo@vault.local');
      localStorage.removeItem('vault_iterations_demo@vault.local');
      console.log('[Dev] Cleared stale vault identity salts');
    }
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success': toast.success(message); break;
      case 'error': toast.error(message); break;
      case 'warning': toast.error(message, { icon: '⚠️' }); break;
      case 'info': toast(message, { icon: 'ℹ️' }); break;
      default: toast(message);
    }
  }, []);

  const unlock = useCallback(async (password: string) => {
    try {
      const email = 'demo@vault.local';
      
      console.log('[Auth] Attempting login for', email);
      let res = await login(email, password);
      
      if (!res.success && (res.error?.includes('Account not found') || res.error?.includes('mapping not found'))) {
        console.log('[Auth] Account not found, attempting auto-registration');
        res = await register(email, password);
      }
      
      if (!res.success) {
        console.error('[Auth] Unlock failed:', res.error);
        return false;
      }
      
      setIsLocked(false);
      
      try {
        const serverItems = await fetchVaultItems();
        setItems(serverItems);
      } catch (err) {
        addToast('Failed to load items from server', 'error');
        console.error(err);
      }
      
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, [addToast]);

  const lock = useCallback(() => {
    // Clear encryption key and tokens from memory via authService
    authLogout();
    // Reset vault state
    setIsLocked(true);
    setSearchQuery('');
    setItems([]);
  }, []);

  const addItem = useCallback(async (item: VaultItem) => {
    const res = await saveVaultItem(item);
    if (!res.success) {
      addToast('Failed to sync item to server', 'error');
    } else {
      setItems(prev => [item, ...prev]);
      addToast('Item added to vault', 'success');
    }
  }, [addToast]);

  const updateItem = useCallback(async (updated: VaultItem) => {
    const res = await updateVaultItemServer(updated);
    if (!res.success) {
      addToast('Failed to update item on server', 'error');
    } else {
      setItems(prev => prev.map(item => item.id === updated.id ? updated : item));
      addToast('Item updated', 'success');
    }
  }, [addToast]);

  const deleteItem = useCallback(async (id: string) => {
    const res = await deleteVaultItemFromServer(id);
    if (!res.success) {
      addToast('Failed to delete item from server', 'error');
    } else {
      setItems(prev => prev.filter(item => item.id !== id));
      addToast('Item deleted', 'success');
    }
  }, [addToast]);

  const toggleFavorite = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const updated = { ...item, favorite: !item.favorite };
    
    // First update locally for immediate UI response
    setItems(prev => prev.map(i => i.id === id ? updated : i));
    
    // Then sync
    const res = await updateVaultItemServer(updated);
    if (!res.success) {
      // Revert on failure
      setItems(prev => prev.map(i => i.id === id ? item : i));
      addToast('Failed to update favorite', 'error');
    }
  }, [items, addToast]);

  const clearVault = useCallback(async () => {
    try {
      await Promise.all(items.map(item => deleteVaultItemFromServer(item.id)));
      setItems([]);
      addToast('All vault data cleared', 'info');
    } catch (err) {
      addToast('Failed to clear some items', 'error');
    }
  }, [items, addToast]);

  const getFilteredItems = useCallback(() => {
    let filtered = items;
    if (activeCategory !== 'all') {
      filtered = filtered.filter(item => item.type === activeCategory);
    }
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.tags.some(tag => tag.toLowerCase().includes(q)) ||
        (item.type === 'password' && (item.username?.toLowerCase().includes(q) || item.website?.toLowerCase().includes(q)))
      );
    }
    return filtered;
  }, [items, activeCategory, debouncedSearchQuery]);

  return (
    <VaultContext.Provider value={{
      isLocked, items, searchQuery, debouncedSearchQuery, activeCategory, autoLockTimeout,
      unlock, lock, setSearchQuery, setActiveCategory, setAutoLockTimeout,
      addItem, updateItem, deleteItem, toggleFavorite,
      addToast, getFilteredItems, clearVault,
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVault must be used within VaultProvider');
  return context;
}
