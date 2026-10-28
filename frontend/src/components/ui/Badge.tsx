import React from 'react';
import { Share2, Lock, Sparkles, ShieldCheck, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'shared' | 'private' | 'ai-suggestion' | 'officer-confirmed' | 'default';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: LucideIcon;
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  icon: CustomIcon,
  label,
  children,
  className,
  size = 'md',
  ...props
}) => {
  const configs: Record<
    BadgeVariant,
    {
      container: string;
      icon: LucideIcon;
      defaultLabel: string;
    }
  > = {
    shared: {
      container: 'bg-status-info-bg text-status-info border-status-info/30',
      icon: Share2,
      defaultLabel: 'Shared',
    },
    private: {
      container: 'bg-sand-200 text-ink-900 border-sand-400/40',
      icon: Lock,
      defaultLabel: 'Private',
    },
    'ai-suggestion': {
      container: 'bg-ai-50 text-ai-800 border-ai-300',
      icon: Sparkles,
      defaultLabel: 'AI Suggestion',
    },
    'officer-confirmed': {
      container: 'bg-status-success-bg text-status-success border-status-success/30',
      icon: ShieldCheck,
      defaultLabel: 'Officer Confirmed',
    },
    default: {
      container: 'bg-sand-100 text-ink-600 border-sand-200',
      icon: Lock,
      defaultLabel: '',
    },
  };

  const currentConfig = configs[variant];
  const IconComponent = CustomIcon || (variant !== 'default' ? currentConfig.icon : null);
  const displayLabel = label || children || currentConfig.defaultLabel;

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border shadow-sm select-none shrink-0',
        sizeStyles[size],
        currentConfig.container,
        className
      )}
      {...props}
    >
      {IconComponent && <IconComponent className={cn('shrink-0', iconSizes[size])} aria-hidden="true" />}
      <span>{displayLabel}</span>
    </span>
  );
};

Badge.displayName = 'Badge';
