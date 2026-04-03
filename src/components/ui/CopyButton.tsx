import { useState, useCallback } from 'react';
import { Copy, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface CopyButtonProps {
  value: string;
  label?: string;
  size?: number;
}

export function CopyButton({ value, label, size = 14 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard permission denied or failed:', err);
      toast.error('Failed to copy to clipboard');
    }
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
      title={label || 'Copy'}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <CheckCheck size={size} className="text-green-600" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Copy size={size} />
          </motion.span>
        )}
      </AnimatePresence>
      {label && <span className="text-xs font-medium">{copied ? 'Copied!' : label}</span>}
    </button>
  );
}
