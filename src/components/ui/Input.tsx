import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helper, error, type = 'text', className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    const isSearch = type === 'search';

    const baseInputClasses = 'w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none transition-all duration-200 shadow-sm';
    
    let stateClasses = '';
    if (isSearch) {
      stateClasses = 'bg-gray-100 border border-transparent focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-50';
    } else {
      stateClasses = error 
        ? 'bg-white border-2 border-red-500 focus:ring-4 focus:ring-red-50'
        : isFocused 
          ? 'bg-white border-2 border-teal-600 focus:ring-4 focus:ring-teal-50'
          : 'bg-white border border-gray-200 hover:border-gray-300';
    }

    return (
      <div className="w-full">
        {label && (
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 transition-colors ${error ? 'text-red-500' : isFocused ? 'text-teal-600' : 'text-gray-500'}`}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`${baseInputClasses} ${stateClasses} ${isPassword ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && (
          <p className="text-[11px] font-bold text-red-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
            <span className="w-1 h-1 rounded-full bg-red-500" /> {error}
          </p>
        )}
        {helper && !error && (
          <p className="text-[11px] mt-1.5 text-gray-500 font-medium px-0.5">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
