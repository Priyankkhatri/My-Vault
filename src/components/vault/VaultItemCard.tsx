import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, ExternalLink } from 'lucide-react';
import { VaultItem, PasswordItem } from '../../types/vault';
import { CopyButton } from '../ui/CopyButton';
import { Badge } from '../ui/Badge';
import { getCategoryIcon, getCategoryColor, getCategoryBg } from './VaultHelpers';
import { useVault } from '../../context/VaultContext';

interface VaultItemCardProps {
  item: VaultItem;
  index?: number;
}

export function VaultItemCard({ item, index = 0 }: VaultItemCardProps) {
  const navigate = useNavigate();
  const { toggleFavorite } = useVault();

  const getSubtitle = () => {
    switch (item.type) {
      case 'password': return item.username;
      case 'address': return `${item.city}, ${item.state}`;
      case 'card': return item.number;
      case 'note': return item.content.substring(0, 50) + '...';
      case 'document': return `${item.fileName} · ${item.fileSize}`;
    }
  };

  const getCopyValue = () => {
    switch (item.type) {
      case 'password': return item.password;
      case 'address': return `${item.addressLine1}, ${item.city}, ${item.state} ${item.zipCode}`;
      case 'card': return item.number.replace(/\s/g, '');
      case 'note': return item.content;
      default: return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      onClick={() => navigate(`/item/${item.id}`)}
      className="vault-card p-4 cursor-pointer group bg-white border-l-4 border-l-vault-primary-600 relative overflow-hidden"
    >
      <div className="flex items-center gap-4">
        {/* Icon / Favicon Backdrop */}
        <div className="w-11 h-11 rounded-lg bg-vault-gray-50 border border-vault-gray-100 flex items-center justify-center flex-shrink-0 transition-all group-hover:bg-vault-gray-100">
          <div className="text-vault-gray-400 group-hover:text-vault-gray-600 transition-colors">
            {getCategoryIcon(item.type, 20)}
          </div>
        </div>

        {/* Info Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-vault-gray-900 truncate leading-snug">
              {item.title}
            </p>
            {item.favorite && (
              <Star 
                size={12} 
                className="text-amber-500 fill-amber-500 flex-shrink-0" 
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            <p className="text-xs text-vault-gray-500 truncate">{getSubtitle()}</p>
            {item.type === 'password' && (item as PasswordItem).strength && (
               <Badge 
                 variant={(item as PasswordItem).strength === 'excellent' ? 'success' : 'warning'} 
                 size="sm"
                 className="scale-90 origin-left"
               >
                 {(item as PasswordItem).strength}
               </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons (Visible on hover) */}
        <div className="flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-all sm:translate-x-2 sm:group-hover:translate-x-0">
          {getCopyValue() && (
            <div onClick={e => e.stopPropagation()}>
              <CopyButton value={getCopyValue()} size={16} />
            </div>
          )}
          {item.type === 'password' && (item as PasswordItem).website && (
            <a
              href={(item as PasswordItem).website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md text-vault-gray-400 hover:text-vault-primary-600 hover:bg-vault-primary-50 transition-all"
              title="Visit website"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
