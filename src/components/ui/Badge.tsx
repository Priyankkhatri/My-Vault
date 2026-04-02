import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'teal' | 'success' | 'danger' | 'info' | 'warning' | 'gold';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-vault-gray-100 text-vault-gray-600 border-vault-gray-200',
  teal: 'bg-vault-primary-50 text-vault-primary-700 border-vault-primary-100',
  success: 'bg-green-50 text-green-700 border-green-100',
  danger: 'bg-red-50 text-red-700 border-red-100',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  // Map 'gold' to 'teal' for backward compatibility if needed, though PRD says primary is teal
  const styleVariant = variant === ('gold' as any) ? 'teal' : variant;
  
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full border uppercase tracking-wider ${variantStyles[styleVariant as keyof typeof variantStyles]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}
