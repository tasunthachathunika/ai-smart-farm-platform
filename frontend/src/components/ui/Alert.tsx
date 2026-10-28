'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  dismissLabel = 'Dismiss alert',
  className,
  ...props
}) => {
  const variantConfig = {
    success: {
      container: 'bg-status-success-bg border-status-success/30 text-ink-900',
      iconColor: 'text-status-success',
      icon: CheckCircle2,
    },
    warning: {
      container: 'bg-status-warning-bg border-status-warning/40 text-ink-900',
      iconColor: 'text-status-warning',
      icon: AlertTriangle,
    },
    error: {
      container: 'bg-status-danger-bg border-status-danger/40 text-ink-900',
      iconColor: 'text-status-danger',
      icon: AlertCircle,
    },
    info: {
      container: 'bg-status-info-bg border-status-info/40 text-ink-900',
      iconColor: 'text-status-info',
      icon: Info,
    },
  };

  const { container, iconColor, icon: IconComponent } = variantConfig[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3.5 p-4 rounded-card border shadow-sm',
        container,
        className
      )}
      {...props}
    >
      <div className={cn('shrink-0 mt-0.5', iconColor)}>
        <IconComponent className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-bold text-base text-ink-900 mb-0.5">{title}</h4>}
        <div className="text-sm text-ink-900 leading-relaxed break-words">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 -mr-1 -mt-1 p-2 rounded-card text-ink-600 hover:text-ink-900 hover:bg-black/5 min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

Alert.displayName = 'Alert';
