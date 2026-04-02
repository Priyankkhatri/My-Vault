import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { VaultItem, VaultCategory, Toast, VaultState } from '../types/vault';
import { allMockItems } from '../data/mockData';

import { saveVaultItem, updateVaultItem as updateVaultItemServer, deleteVaultItemFromServer, fetchVaultItems } from '../services/vaultService';
import { login, register } from '../services/authService';

interface VaultContextType extends VaultState {
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: VaultCategory | 'all') => void;
  addItem: (item: VaultItem) => Promise<void>;
  updateItem: (item: VaultItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  getFilteredItems: () => VaultItem[];
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<VaultCategory | 'all'>('all');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const unlock = useCallback(async (password: string) => {
    try {
      const email = 'demo@vault.local';
      
      let res = await login(email, password);
      if (!res.success && res.error?.includes('Account not found')) {
        res = await register(email, password);
      }
      
      if (!res.success) {
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
  }, []);

  const lock = useCallback(() => {
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
  }, []);

  const updateItem = useCallback(async (updated: VaultItem) => {
    const res = await updateVaultItemServer(updated);
    if (!res.success) {
      addToast('Failed to update item on server', 'error');
    } else {
      setItems(prev => prev.map(item => item.id === updated.id ? updated : item));
      addToast('Item updated', 'success');
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const res = await deleteVaultItemFromServer(id);
    if (!res.success) {
      addToast('Failed to delete item from server', 'error');
    } else {
      setItems(prev => prev.filter(item => item.id !== id));
      addToast('Item deleted', 'info');
    }
  }, []);

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
  }, [items]);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const getFilteredItems = useCallback(() => {
    let filtered = items;
    if (activeCategory !== 'all') {
      filtered = filtered.filter(item => item.type === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.tags.some(tag => tag.toLowerCase().includes(q)) ||
        (item.type === 'password' && (item.username?.toLowerCase().includes(q) || item.website?.toLowerCase().includes(q)))
      );
    }
    return filtered;
  }, [items, activeCategory, searchQuery]);

  return (
    <VaultContext.Provider value={{
      isLocked, items, searchQuery, activeCategory, toasts,
      unlock, lock, setSearchQuery, setActiveCategory,
      addItem, updateItem, deleteItem, toggleFavorite,
      addToast, removeToast, getFilteredItems,
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
