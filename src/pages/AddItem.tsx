import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, MapPin, CreditCard, FileText, FolderLock, ArrowLeft, ArrowRight, Check, Wand2, ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useVault } from '../context/VaultContext';
import { VaultCategory, VaultItem } from '../types/vault';

const itemTypes = [
  { type: 'password' as VaultCategory, icon: KeyRound, label: 'Password', desc: 'Login credentials for websites & apps', color: 'text-vault-primary-600', bg: 'bg-vault-primary-50 border-vault-primary-100' },
  { type: 'address' as VaultCategory, icon: MapPin, label: 'Address', desc: 'Physical storage for autofill data', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
  { type: 'card' as VaultCategory, icon: CreditCard, label: 'Card', desc: 'Secure credit & debit card details', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
  { type: 'note' as VaultCategory, icon: FileText, label: 'Secure Note', desc: 'Encrypted private text content', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  { type: 'document' as VaultCategory, icon: FolderLock, label: 'Document', desc: 'AES-256 cloud file storage', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
];

function generatePassword(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  return Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map(x => chars[x % chars.length]).join('');
}

export function AddItem() {
  const { type: preselectedType } = useParams<{ type?: string }>();
  const navigate = useNavigate();
  const { addItem } = useVault();

  const [step, setStep] = useState(preselectedType ? 2 : 1);
  const [selectedType, setSelectedType] = useState<VaultCategory | null>(
    preselectedType as VaultCategory || null
  );
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [tags, setTags] = useState('');

  const updateField = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const now = new Date().toISOString();
    const base = {
      id: `item-${Date.now()}`,
      type: selectedType!,
      title: formData.title || formData.siteName || formData.cardName || formData.fileName || 'Untitled',
      favorite: false,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      folder: formData.folder || '',
      notes: formData.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    let item: VaultItem;
    switch (selectedType) {
      case 'password':
        item = { ...base, type: 'password', website: formData.website || '', url: formData.url || '', username: formData.username || '', password: formData.password || '', strength: getStrength(formData.password || '') } as any;
        break;
      case 'address':
        item = { ...base, type: 'address', fullName: formData.fullName || '', phone: formData.phone || '', addressLine1: formData.addressLine1 || '', addressLine2: formData.addressLine2, city: formData.city || '', state: formData.state || '', country: formData.country || '', zipCode: formData.zipCode || '' } as any;
        break;
      case 'card':
        item = { ...base, type: 'card', cardName: formData.cardName || '', cardholderName: formData.cardholderName || '', number: formData.number || '', expiry: formData.expiry || '', cvv: formData.cvv || '', billingAddress: formData.billingAddress } as any;
        break;
      case 'note':
        item = { ...base, type: 'note', content: formData.content || '', sensitive: true } as any;
        break;
      case 'document':
        item = { ...base, type: 'document', fileName: formData.fileName || '', fileSize: '0 KB', fileType: 'application/octet-stream', encrypted: true } as any;
        break;
      default:
        return;
    }
    addItem(item);
    navigate('/vault');
  };

  const getStrength = (pw: string): 'weak' | 'fair' | 'strong' | 'excellent' => {
    if (pw.length < 8) return 'weak';
    if (pw.length < 12) return 'fair';
    if (pw.length < 16 || !/[!@#$%^&*]/.test(pw)) return 'strong';
    return 'excellent';
  };

  const renderFields = () => {
    switch (selectedType) {
      case 'password':
        return (
          <div className="space-y-5">
            <Input label="Site Name" placeholder="e.g. Google" value={formData.title || ''} onChange={e => updateField('title', e.target.value)} />
            <Input label="Website Domain" placeholder="google.com" value={formData.website || ''} onChange={e => updateField('website', e.target.value)} />
            <Input label="Username / Email" placeholder="user@email.com" value={formData.username || ''} onChange={e => updateField('username', e.target.value)} />
            <div className="space-y-2">
              <Input label="Secure Password" sensitive placeholder="••••••••••••" value={formData.password || ''} onChange={e => updateField('password', e.target.value)} />
              <button
                onClick={() => updateField('password', generatePassword())}
                className="flex items-center gap-1.5 text-[10px] font-bold text-vault-primary-600 uppercase tracking-widest hover:text-vault-primary-500 cursor-pointer transition-colors"
              >
                <Wand2 size={12} strokeWidth={2.5} /> Generate High Entropy Key
              </button>
            </div>
          </div>
        );
      case 'address':
        return (
          <div className="space-y-5">
            <Input label="Label" placeholder="e.g. Primary Residence" value={formData.title || ''} onChange={e => updateField('title', e.target.value)} />
            <Input label="Full Name" placeholder="Alex Morgan" value={formData.fullName || ''} onChange={e => updateField('fullName', e.target.value)} />
            <Input label="Phone Number" placeholder="+1 (555) 000-0000" value={formData.phone || ''} onChange={e => updateField('phone', e.target.value)} />
            <Input label="Address Line 1" placeholder="742 Evergreen Terrace" value={formData.addressLine1 || ''} onChange={e => updateField('addressLine1', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" placeholder="San Francisco" value={formData.city || ''} onChange={e => updateField('city', e.target.value)} />
              <Input label="State / Province" placeholder="California" value={formData.state || ''} onChange={e => updateField('state', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Country" placeholder="United States" value={formData.country || ''} onChange={e => updateField('country', e.target.value)} />
              <Input label="ZIP / Postal Code" placeholder="94102" value={formData.zipCode || ''} onChange={e => updateField('zipCode', e.target.value)} />
            </div>
          </div>
        );
      case 'card':
        return (
          <div className="space-y-5">
            <Input label="Financial Label" placeholder="e.g. Visa Corporate" value={formData.cardName || ''} onChange={e => updateField('cardName', e.target.value)} />
            <Input label="Cardholder Name" placeholder="ALEX MORGAN" value={formData.cardholderName || ''} onChange={e => updateField('cardholderName', e.target.value)} />
            <Input label="Card Number" sensitive placeholder="•••• •••• •••• ••••" value={formData.number || ''} onChange={e => updateField('number', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Expiry Date" placeholder="MM / YY" value={formData.expiry || ''} onChange={e => updateField('expiry', e.target.value)} />
              <Input label="CVV" sensitive placeholder="•••" value={formData.cvv || ''} onChange={e => updateField('cvv', e.target.value)} />
            </div>
          </div>
        );
      case 'note':
        return (
          <div className="space-y-5">
            <Input label="Note Title" placeholder="e.g. Recovery Phrases" value={formData.title || ''} onChange={e => updateField('title', e.target.value)} />
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest">Secure Content</label>
              <textarea
                placeholder="Paste your sensitive content here..."
                value={formData.content || ''}
                onChange={e => updateField('content', e.target.value)}
                rows={8}
                className="w-full bg-white border border-vault-gray-200 rounded-2xl px-4 py-4 text-sm text-vault-gray-950 placeholder:text-vault-gray-400 focus:outline-none focus:border-vault-primary-500 focus:ring-4 focus:ring-vault-primary-50 resize-none transition-all"
              />
            </div>
          </div>
        );
      case 'document':
        return (
          <div className="space-y-5">
            <Input label="Document Name" placeholder="identity_scan.pdf" value={formData.fileName || ''} onChange={e => updateField('fileName', e.target.value)} />
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest">Internal Security Protocol</label>
              <div className="border-2 border-dashed border-vault-gray-200 rounded-2xl p-10 text-center hover:border-vault-primary-300 hover:bg-vault-primary-50 transition-all cursor-pointer group">
                <div className="w-16 h-16 bg-vault-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-vault-primary-100 transition-colors">
                  <FolderLock size={32} className="text-vault-gray-400 group-hover:text-vault-primary-600 transition-colors" />
                </div>
                <p className="text-sm font-bold text-vault-gray-900 mb-1">Click to securely append file</p>
                <p className="text-xs text-vault-gray-400">All documents are AES-256 encrypted Client-side</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto p-8 h-full overflow-y-auto scrollbar-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl bg-white border border-vault-gray-200 text-vault-gray-400 hover:text-vault-gray-900 hover:border-vault-gray-300 shadow-sm transition-all cursor-pointer">
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-vault-gray-950 tracking-tight">Create Secure Entry</h2>
          <p className="text-sm font-bold text-vault-primary-600 uppercase tracking-widest mt-0.5">Phase {step} <span className="text-vault-gray-300">/ 3</span></p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-vault-primary-600 shadow-sm shadow-vault-primary-100' : 'bg-vault-gray-100'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Choose type */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-3"
          >
            <h3 className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest mb-5 px-1">Infrastructure Selection</h3>
            {itemTypes.map(it => (
              <button
                key={it.type}
                onClick={() => { setSelectedType(it.type); setStep(2); }}
                className="w-full group flex items-center gap-5 p-5 rounded-2xl bg-white border border-vault-gray-200 hover:border-vault-primary-500 hover:shadow-xl hover:shadow-vault-gray-100 transition-all cursor-pointer text-left relative overflow-hidden"
              >
                <div className={`w-14 h-14 rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${it.bg} ${it.color}`}>
                  <it.icon size={28} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-vault-gray-900 leading-none mb-1.5">{it.label}</p>
                  <p className="text-xs font-medium text-vault-gray-400">{it.desc}</p>
                </div>
                <ChevronRight size={20} className="text-vault-gray-300 group-hover:text-vault-primary-500 transition-colors" />
              </button>
            ))}
          </motion.div>
        )}

        {/* Step 2: Fill details */}
        {step === 2 && selectedType && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-8"
          >
             <div className="bg-white p-6 rounded-2xl border border-vault-gray-200 shadow-sm">
                <h3 className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest mb-6 border-b border-vault-gray-50 pb-3">Identification & Attributes</h3>
                {renderFields()}
             </div>

             <div className="bg-white p-6 rounded-2xl border border-vault-gray-200 shadow-sm">
                <h3 className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest mb-6 border-b border-vault-gray-50 pb-3">Classification & Meta</h3>
                <div className="space-y-6">
                  <Input label="Search Keywords (Tags)" placeholder="e.g. Work, Finance, Social (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />
                  <Input label="Directory Folder" placeholder="e.g. Master Vault" value={formData.folder || ''} onChange={e => updateField('folder', e.target.value)} />
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest">Additional Context</label>
                    <textarea
                      placeholder="Enter optional metadata or remarks..."
                      value={formData.notes || ''}
                      onChange={e => updateField('notes', e.target.value)}
                      rows={3}
                      className="w-full bg-white border border-vault-gray-200 rounded-2xl px-4 py-3 text-sm text-vault-gray-950 placeholder:text-vault-gray-400 focus:outline-none focus:border-vault-primary-500 focus:ring-4 focus:ring-vault-primary-50 resize-none transition-all"
                    />
                  </div>
                </div>
             </div>

            <div className="flex gap-4 pt-4 pb-20">
              <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                <ArrowLeft size={16} /> Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Security Review <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review & Save */}
        {step === 3 && selectedType && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8 pb-20"
          >
            <div className="vault-card bg-white p-8 relative overflow-hidden border border-vault-gray-200 shadow-xl">
              <div className="absolute top-0 left-0 w-2 h-full bg-vault-primary-600" />
              <div className="flex items-center gap-5 mb-8">
                {(() => {
                  const typeInfo = itemTypes.find(t => t.type === selectedType)!;
                  return (
                    <>
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm ${typeInfo.bg} ${typeInfo.color}`}>
                        <typeInfo.icon size={28} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-vault-gray-950 leading-tight">{formData.title || formData.siteName || formData.cardName || formData.fileName || 'Untitled Entry'}</p>
                        <p className="text-xs font-bold text-vault-primary-600 uppercase tracking-widest mt-1">{typeInfo.label} Object</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="space-y-4">
                 {Object.entries(formData).filter(([k, v]) => v && !['title', 'folder', 'notes'].includes(k)).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-3 border-b border-vault-gray-50 last:border-0 group transition-all">
                    <span className="text-[10px] text-vault-gray-400 font-bold uppercase tracking-widest pt-1">{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-sm font-bold text-vault-gray-900 truncate max-w-[70%] text-right bg-vault-gray-50 px-3 py-1 rounded-lg">
                      {['password', 'cvv'].includes(k.toLowerCase()) ? '••••••••••••' : v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-vault-primary-50 border border-vault-primary-100 p-6 rounded-2xl flex items-start gap-4">
                <div className="p-2 bg-vault-primary-100 rounded-lg text-vault-primary-600">
                    <Check size={20} strokeWidth={2.5} />
                </div>
                <div>
                   <p className="text-sm font-bold text-vault-primary-900 mb-1">Zero-Knowledge Verification</p>
                   <p className="text-xs text-vault-primary-700 leading-relaxed font-medium">All sensitive attributes will be encrypted with your Master Key before being transmitted to the secure cloud directory.</p>
                </div>
            </div>

            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                Modify Detail
              </Button>
              <Button onClick={handleSave} icon={<Check size={18} strokeWidth={2.5} />} className="flex-1">
                Finalize & Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
