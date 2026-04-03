import React from 'react';

type CardVariant = 'default' | 'stat' | 'section' | 'danger' | 'empty';

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ variant = 'default', children, className = '', onClick }: CardProps) {
  const baseClasses = 'bg-white rounded-xl shadow-sm overflow-hidden border';
  
  const variantClasses = {
    default: 'border-gray-200',
    stat: 'border-gray-200 p-4',
    section: 'border-gray-200 p-6',
    danger: 'bg-red-50 border-red-200',
    empty: 'border-gray-200 p-12 flex flex-col items-center gap-4 text-center'
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
