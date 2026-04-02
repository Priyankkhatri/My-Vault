import { motion } from 'framer-motion';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <label className="flex items-center gap-4 cursor-pointer group select-none">
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <p className="text-sm font-bold text-vault-gray-900 leading-none">{label}</p>}
          {description && <p className="text-[11px] font-medium text-vault-gray-400 mt-1.5 leading-relaxed">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 cursor-pointer shadow-inner ${
          checked ? 'bg-vault-primary-600 ring-2 ring-vault-primary-100' : 'bg-vault-gray-200 hover:bg-vault-gray-300'
        }`}
      >
        <motion.div
          layout
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md cursor-pointer"
          animate={{ left: checked ? 24 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </label>
  );
}
