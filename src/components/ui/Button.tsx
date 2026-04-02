import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-vault-teal text-white hover:bg-vault-teal-hover active:scale-[0.98]',
  secondary: 'bg-white text-vault-gray-700 border border-vault-gray-300 hover:bg-vault-gray-50',
  ghost: 'text-vault-gray-600 hover:bg-vault-gray-100',
  danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  outline: 'bg-transparent border border-vault-gray-300 text-vault-gray-700 hover:bg-gray-50',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5 h-8',
  md: 'px-4 py-2 text-sm rounded-lg gap-2 h-10',
  lg: 'px-6 py-2.5 text-base rounded-lg gap-2 h-12',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, children, className = '', ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={`inline-flex items-center justify-center font-medium transition-all duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...(props as any)}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children && <span className="truncate">{children}</span>}
      </motion.button>
    );
  }
);
