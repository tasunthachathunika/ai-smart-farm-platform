import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: ButtonProps['variant'];
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-card border-2 border-dashed border-sand-200 bg-sand-50/50',
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-sand-200 flex items-center justify-center text-ink-600 mb-4" aria-hidden="true">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg md:text-xl font-bold text-ink-900 mb-1">{title}</h3>
      <p className="text-sm md:text-base text-ink-600 max-w-md mb-6">{description}</p>
      {action && (
        <Button
          variant={action.variant || 'primary'}
          onClick={action.onClick}
          leftIcon={action.icon}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
