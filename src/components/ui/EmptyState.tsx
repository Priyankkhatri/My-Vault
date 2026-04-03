import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from './Card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card variant="empty">
      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4 transition-transform hover:scale-105 duration-300">
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-700 font-medium max-w-[280px] mb-6 leading-relaxed text-center">
        {description}
      </p>
      {action && (
        <div className="animate-in fade-in zoom-in duration-500 delay-150 fill-mode-both">
          {action}
        </div>
      )}
    </Card>
  );
}
