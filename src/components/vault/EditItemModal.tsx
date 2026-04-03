import { useState, useEffect } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useVault } from '../../context/VaultContext';
import { VaultItem } from '../../types/vault';
import { calculatePasswordStrength, strengthScoreToLabel } from '../../utils/securityUtils';
import { analyzePassword } from '../../../packages/crypto/src/entropy';
import { aiPasswordAnalyze } from '../../services/vaultService';
import { hasQuota, invalidateQuotaCache } from '../../features/ai/quotaTracker';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: VaultItem;
}

export function EditItemModal({ isOpen, onClose, item }: EditItemModalProps) {
  const { updateItem, addToast } = useVault();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [passwordInsight, setPasswordInsight] = useState<string | null>(null);
  const [localPasswordScore, setLocalPasswordScore] = useState(0);
  const [localStrengthLabel, setLocalStrengthLabel] = useState('weak');

  // Initialize form strictly from current item values to prevent stale cache bugs
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...item });
      setTags(item.tags ? item.tags.join(', ') : '');
      setPasswordInsight(null);
    }
  }, [isOpen, item]);

  const updateField = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }));

  // Handle AI error statuses
  const handleAIError = (status?: number) => {
    if (status === 401) addToast('AI features unavailable — check your API key in .env', 'error');
    else if (status === 429) addToast('AI quota reached — try again later', 'error');
    else addToast('AI service unavailable', 'error');
  };

  // 1. Debounced Local Strength Calculation (300ms)
  useEffect(() => {
    if (item.type !== 'password') return;
    const password = formData.password || '';
    if (!password) {
      setLocalPasswordScore(0);
      setLocalStrengthLabel('weak');
      return;
    }

    const timer = setTimeout(() => {
      const score = calculatePasswordStrength(password);
      setLocalPasswordScore(score);
      setLocalStrengthLabel(strengthScoreToLabel(score));
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.password, item.type]);

  // 2. Debounced AI Password Analysis (500ms) + Cleanup
  useEffect(() => {
    if (item.type !== 'password') return;
    const password = formData.password || '';
    const abortController = new AbortController();

    if (!password) {
      setPasswordInsight(null);
      return;
    }

    const score = calculatePasswordStrength(password);
    if (score > 2) {
      setPasswordInsight(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const quotaOk = await hasQuota('password_analysis');
        if (!quotaOk) return;

        const entropy = analyzePassword(password);
        const res = await aiPasswordAnalyze(entropy.score, entropy.flags, abortController.signal);
        
        if (res.success && res.data) {
          setPasswordInsight(res.data.analysis);
          invalidateQuotaCache();
        } else if (!res.success && res.error !== 'Network error') {
          handleAIError(res.status);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('AI Analysis failed:', err);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [formData.password, item.type]);

  const handleSave = async () => {
    setIsSaving(true);
    const updated: VaultItem = {
      ...formData,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    } as VaultItem;

    await updateItem(updated);
    setIsSaving(false);
    onClose();
  };

  const segmentColors = ['bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-green-400'];

  const renderFields = () => {
    switch (item.type) {
      case 'password':
        return (
          <>
            <Input label="Title" value={formData.title || ''} onChange={e => updateField('title', e.target.value)} />
            <Input label="Website Domain" value={formData.website || ''} onChange={e => updateField('website', e.target.value)} />
            <Input label="Login URL" value={formData.url || ''} onChange={e => updateField('url', e.target.value)} />
            <Input label="Username / Email" value={formData.username || ''} onChange={e => updateField('username', e.target.value)} />
            <div className="space-y-1.5">
              <Input type="password" label="Password" value={formData.password || ''} onChange={e => updateField('password', e.target.value)} />
              {(formData.password || '').length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <div className="flex gap-1.5 h-1.5">
                    {segmentColors.map((color, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-300 ${i < localPasswordScore ? color : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${
                    localStrengthLabel === 'weak' ? 'text-red-500' :
                    localStrengthLabel === 'fair' ? 'text-amber-500' :
                    localStrengthLabel === 'strong' ? 'text-yellow-600' :
                    'text-green-500'
                  }`}>{localStrengthLabel}</p>
                  {passwordInsight && (
                    <div className="mt-2 p-2.5 rounded-lg bg-teal-50 border border-teal-100 flex gap-2 items-start">
                      < Wand2 size={14} className="text-teal-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-teal-800 font-medium leading-relaxed">{passwordInsight}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        );
      case 'address':
        return (
          <>
            <Input label="Title" value={formData.title || ''} onChange={e => updateField('title', e.target.value)} />
            <Input label="Full Name" value={formData.fullName || ''} onChange={e => updateField('fullName', e.target.value)} />
            <Input label="Phone" value={formData.phone || ''} onChange={e => updateField('phone', e.target.value)} />
            <Input label="Address Line 1" value={formData.addressLine1 || ''} onChange={e => updateField('addressLine1', e.target.value)} />
            <Input label="Address Line 2" value={formData.addressLine2 || ''} onChange={e => updateField('addressLine2', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" value={formData.city || ''} onChange={e => updateField('city', e.target.value)} />
              <Input label="State" value={formData.state || ''} onChange={e => updateField('state', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Country" value={formData.country || ''} onChange={e => updateField('country', e.target.value)} />
              <Input label="Zip Code" value={formData.zipCode || ''} onChange={e => updateField('zipCode', e.target.value)} />
            </div>
          </>
        );
      case 'card':
        return (
          <>
            <Input label="Title" value={formData.title || ''} onChange={e => updateField('title', e.target.value)} />
            <Input label="Cardholder Name" value={formData.cardholderName || ''} onChange={e => updateField('cardholderName', e.target.value)} />
            <Input type="password" label="Card Number" value={formData.number || ''} onChange={e => updateField('number', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Expiry Date" value={formData.expiry || ''} onChange={e => updateField('expiry', e.target.value)} />
              <Input type="password" label="CVV" value={formData.cvv || ''} onChange={e => updateField('cvv', e.target.value)} />
            </div>
          </>
        );
      case 'note':
        return (
          <>
            <Input label="Title" value={formData.title || ''} onChange={e => updateField('title', e.target.value)} />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">Content</label>
              <textarea
                value={formData.content || ''}
                onChange={e => updateField('content', e.target.value)}
                rows={8}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 resize-none"
              />
            </div>
          </>
        );
      case 'document':
        return (
          <>
            <Input label="Document Name" value={formData.title || ''} onChange={e => updateField('title', e.target.value)} />
            <Input label="File Name" value={formData.fileName || ''} onChange={e => updateField('fileName', e.target.value)} />
          </>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${item.type}`}>
      <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto px-1 scrollbar-thin">
        {renderFields()}
        
        <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
          <Input label="Folder" value={formData.folder || ''} onChange={e => updateField('folder', e.target.value)} />
          <Input label="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">Internal Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => updateField('notes', e.target.value)}
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 resize-none"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Modal>
  );
}
