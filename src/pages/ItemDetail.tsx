import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
 ArrowLeft, Star, Edit, Trash2, ExternalLink, Eye, EyeOff, Clock, Calendar, Tag, Folder, Shield,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { CopyButton } from '../components/ui/CopyButton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { getCategoryIcon, getCategoryColor, getCategoryBg, getCategoryLabel } from '../components/vault/VaultHelpers';
import { EditItemModal } from '../components/vault/EditItemModal';
import { PasswordItem, AddressItem, CardItem, NoteItem, DocumentItem, VaultItem } from '../types/vault';

function FieldRow({ label, value, sensitive = false, copyable = true }: {
 label: string; value: string; sensitive?: boolean; copyable?: boolean;
}) {
 const [revealed, setRevealed] = useState(false);
 const displayValue = sensitive && !revealed ? 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢' : value;

 return (
 <div className="flex items-center justify-between py-4 border-b border-vault-gray-100 group">
 <div className="min-w-0 flex-1">
 <p className="text-[10px] text-vault-gray-400 uppercase tracking-widest mb-1.5 font-bold">{label}</p>
 <p className={`text-sm text-vault-gray-900 truncate font-semibold ${sensitive ? 'font-mono' : ''}`}>{displayValue}</p>
 </div>
 <div className="flex items-center gap-1.5 group-">
 {sensitive && (
 <button
 onClick={() => setRevealed(!revealed)}
 className="p-2 text-vault-gray-400  cursor-pointer"
 >
 {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
 </button>
 )}
 {copyable && <CopyButton value={value} size={16} />}
 </div>
 </div>
 );
}

function PasswordStrengthBar({ strength }: { strength: string }) {
 const levels: Record<string, number> = { weak: 1, fair: 2, strong: 3, excellent: 4 };
 const segmentColors = ['bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-green-400'];
 const badgeVariants = { weak: 'red' as const, fair: 'amber' as const, strong: 'teal' as const, excellent: 'teal' as const };
 const activeSegments = levels[strength] || 0;

 return (
 <div className="py-5 border-b border-vault-gray-100">
 <div className="flex items-center justify-between mb-3">
 <p className="text-[10px] text-vault-gray-400 uppercase tracking-widest font-bold">Security Score</p>
 <Badge variant={badgeVariants[strength as keyof typeof badgeVariants] || 'gray'}>{strength}</Badge>
 </div>
 <div className="flex gap-1.5 h-2">
 {segmentColors.map((color, i) => (
 <motion.div
 key={i}
 initial={{ scaleX: 0 }}
 animate={{ scaleX: i < activeSegments ? 1 : 0.15 }}
 transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
 className={`flex-1 rounded-full origin-left ${i < activeSegments ? color : 'bg-gray-200'}`}
 />
 ))}
 </div>
 </div>
 );
}


function renderPasswordFields(item: PasswordItem) {
 return (
 <>
 <FieldRow label="Website Name" value={item.website} />
 <FieldRow label="Login URL" value={item.url} />
 <FieldRow label="Username / Email" value={item.username} />
 <FieldRow label="Password" value={item.password} sensitive />
 <PasswordStrengthBar strength={item.strength} />
 </>
 );
}

function renderAddressFields(item: AddressItem) {
 return (
 <>
 <FieldRow label="Recipient Name" value={item.fullName} />
 <FieldRow label="Contact Number" value={item.phone} />
 <FieldRow label="Address Line 1" value={item.addressLine1} />
 {item.addressLine2 && <FieldRow label="Address Line 2" value={item.addressLine2} />}
 <FieldRow label="City" value={item.city} />
 <FieldRow label="State / Province" value={item.state} />
 <FieldRow label="Country" value={item.country} />
 <FieldRow label="ZIP / Postal Code" value={item.zipCode} />
 </>
 );
}

function renderCardFields(item: CardItem) {
 return (
 <>
 <FieldRow label="Card Label" value={item.cardName} />
 <FieldRow label="Cardholder Name" value={item.cardholderName} />
 <FieldRow label="Card Number" value={item.number} sensitive />
 <FieldRow label="Expiry Date" value={item.expiry} />
 <FieldRow label="Security Code (CVV)" value={item.cvv} sensitive />
 {item.billingAddress && <FieldRow label="Billing Address" value={item.billingAddress} />}
 </>
 );
}

function renderNoteFields(item: NoteItem) {
 return (
 <div className="py-4">
 <p className="text-[10px] text-vault-gray-400 uppercase tracking-widest mb-3 font-bold">Content</p>
 <div className="p-5 border border-vault-gray-200">
 <pre className="text-sm text-vault-gray-900 whitespace-pre-wrap font-sans leading-relaxed">{item.content}</pre>
 </div>
 </div>
 );
}

function renderDocumentFields(item: DocumentItem) {
 return (
 <>
 <FieldRow label="Filename" value={item.fileName} />
 <FieldRow label="Size" value={item.fileSize} />
 <FieldRow label="Format" value={item.fileType} />
 <div className="py-4 flex items-center justify-between border-b border-vault-gray-100">
 <p className="text-[10px] text-vault-gray-400 uppercase tracking-widest font-bold">Encryption Status</p>
 <div className="flex items-center gap-2">
 <Shield size={14} className="" strokeWidth={2.5} />
 <span className="text-xs font-bold">{item.encrypted ? 'AES-256 Protected' : 'Unprotected'}</span>
 </div>
 </div>
 </>
 );
}

export function ItemDetail() {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const { items, toggleFavorite, deleteItem } = useVault();
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 const item = items.find(i => i.id === id);

 if (!item) {
 return (
 <div className="flex items-center justify-center h-full">
 <p className="text-vault-gray-400 font-semibold">Item not found</p>
 </div>
 );
 }

 const renderFields = () => {
 switch (item.type) {
 case 'password': return renderPasswordFields(item as PasswordItem);
 case 'address': return renderAddressFields(item as AddressItem);
 case 'card': return renderCardFields(item as CardItem);
 case 'note': return renderNoteFields(item as NoteItem);
 case 'document': return renderDocumentFields(item as DocumentItem);
 }
 };

 return (
 <div className="min-h-screen bg-gray-50">
 <div className="max-w-[1100px] mx-auto px-8 py-8 space-y-8">
 {/* Navigation */}
 <button
 onClick={() => navigate(-1)}
 className="flex items-center gap-2 text-sm font-bold text-vault-gray-400 mb-8 cursor-pointer group"
 >
 <ArrowLeft size={16} className="group-" />
 Back to Gallery
 </button>

 {/* Header Card */}
 <div className="flex items-center gap-6 mb-8 p-6 border border-vault-gray-200 relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1.5 h-full" />
 <div className={`w-16 h-16 border flex items-center justify-center flex-shrink-0 ${getCategoryBg(item.type)} ${getCategoryColor(item.type)}`}>
 {getCategoryIcon(item.type, 28)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-3 mb-1.5">
 <h2 className="text-2xl font-bold text-vault-gray-950 truncate tracking-tight">{item.title}</h2>
 <button
 onClick={() => toggleFavorite(item.id)}
 className="cursor-pointer p-1 "
 >
 <Star size={20} className={item.favorite ? ' fill-amber-500' : 'text-vault-gray-300 '} />
 </button>
 </div>
 <div className="flex items-center gap-2">
 <Badge variant="teal">{getCategoryLabel(item.type)}</Badge>
 <span className="text-xs font-bold text-vault-gray-400 uppercase tracking-widest">•</span>
 <span className="text-xs font-bold text-vault-gray-400 uppercase tracking-widest">ID: {item.id.substring(0, 8)}</span>
 </div>
 </div>
 <div className="flex gap-4">
 <Button variant="secondary" onClick={() => setIsEditing(true)}><div className="flex items-center gap-2"><Edit size={16} /> Edit Detail</div></Button>
 <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}><div className="flex items-center gap-2"><Trash2 size={16} /> Delete</div></Button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 {/* Main Credentials Card */}
 <div className="vault-card p-6 border border-vault-gray-200">
 <h3 className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest mb-4 border-b border-vault-gray-50 pb-3">Secure Attributes</h3>
 <div className="px-1">
 {renderFields()}
 
 {/* Internal Notes */}
 {item.notes && item.type !== 'note' && (
 <div className="py-5">
 <p className="text-[10px] text-vault-gray-400 uppercase tracking-widest mb-2 font-bold">Internal Notes</p>
 <p className="text-sm font-medium text-vault-gray-600 leading-relaxed p-4 border border-vault-gray-200">
 {item.notes}
 </p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Sidebar Context */}
 <div className="space-y-6">
 {/* Website Link for Passwords */}
 {item.type === 'password' && (item as PasswordItem).website && (
 <a
 href={(item as PasswordItem).website}
 target="_blank"
 rel="noopener noreferrer"
 className="group flex items-center justify-between p-5  overflow-hidden relative"
 >
 <div className="relative z-10">
 <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Access Portal</p>
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold truncate max-w-[140px]">{(item as PasswordItem).website.replace(/^https?:\/\//, '')}</span>
 <ExternalLink size={14} strokeWidth={2.5}/>
 </div>
 </div>
 <div className=" p-3 scale-125 group-">
 <ExternalLink size={24} strokeWidth={1}/>
 </div>
 </a>
 )}

 {/* Metadata Card */}
 <div className="vault-card p-6 border border-vault-gray-200">
 <h3 className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest mb-5">Storage Details</h3>
 <div className="space-y-4">
 <div className="flex items-center gap-3">
 <Folder size={16} className="text-vault-gray-400" />
 <div>
 <p className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest leading-none mb-1">Folder</p>
 <p className="text-xs font-bold text-vault-gray-900">{item.folder || 'Root (Main)'}</p>
 </div>
 </div>
 
 <div className="flex items-start gap-3">
 <Tag size={16} className="text-vault-gray-400 mt-0.5" />
 <div>
 <p className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest leading-none mb-2">Classification</p>
 <div className="flex gap-1.5 flex-wrap">
 {item.tags.length > 0 ? (
 item.tags.map(tag => (
 <span key={tag} className="px-2 py-0.5 border border-vault-gray-200 text-[10px] font-bold text-vault-gray-600">
 {tag}
 </span>
 ))
 ) : (
 <span className="text-xs font-medium text-vault-gray-400 italic">No tags assigned</span>
 )}
 </div>
 </div>
 </div>

 <div className="pt-2 space-y-3">
 <div className="flex items-center justify-between text-[10px] font-bold">
 <span className="text-vault-gray-400 flex items-center gap-1.5 uppercase tracking-widest"><Calendar size={12}/> Added</span>
 <span className="text-vault-gray-700">{new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
 </div>
 <div className="flex items-center justify-between text-[10px] font-bold">
 <span className="text-vault-gray-400 flex items-center gap-1.5 uppercase tracking-widest"><Clock size={12}/> Last Revision</span>
 <span className="text-vault-gray-700">{new Date(item.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <ConfirmDialog
 isOpen={showDeleteConfirm}
 onClose={() => setShowDeleteConfirm(false)}
 onConfirm={async () => {
   setIsDeleting(true);
   await deleteItem(item.id);
   setIsDeleting(false);
   setShowDeleteConfirm(false);
   navigate(-1);
 }}
 title="Permanently Delete Item"
 description={`This will erase "${item.title}" and its associated encrypted data from your vault. This action cannot be reversed.`}
 confirmLabel={isDeleting ? 'Erasing...' : 'Erase Item'}
 danger
 />

 <EditItemModal
 isOpen={isEditing}
 onClose={() => setIsEditing(false)}
 item={item}
 />
 </div>
 </div>
 );
}
