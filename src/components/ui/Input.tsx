import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  sensitive?: boolean;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, sensitive, icon, className = '', type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isSensitive = sensitive || type === 'password';
    const inputType = isSensitive ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-xs font-semibold text-vault-gray-500 uppercase tracking-widest pl-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-gray-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`w-full bg-white border border-vault-gray-300 rounded-lg px-3 py-2 text-sm text-vault-gray-900 placeholder:text-vault-gray-400 focus:outline-none focus:border-vault-primary-500 focus:ring-4 focus:ring-vault-primary-50 transition-all duration-100 ${icon ? 'pl-9' : ''} ${isSensitive ? 'pr-9 font-mono' : ''} ${error ? 'border-red-300 focus:ring-red-50' : ''} ${className}`}
            {...props}
          />
          {isSensitive && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-gray-400 hover:text-vault-gray-600 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500 font-medium pl-1">{error}</p>}
      </div>
    );
  }
);
