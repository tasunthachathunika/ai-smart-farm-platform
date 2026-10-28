'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface ConsentToggleProps {
  title: string;
  helperText?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export const ConsentToggle: React.FC<ConsentToggleProps> = ({
  title,
  helperText,
  checked,
  onChange,
  id,
  disabled = false,
  className,
}) => {
  const generatedId = useId();
  const toggleId = id || generatedId;
  const labelId = `${toggleId}-label`;
  const helperId = `${toggleId}-helper`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 p-3 rounded-card bg-white border border-sand-200 transition-colors',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <div className="flex flex-col flex-1 select-none pr-2">
        <label
          id={labelId}
          htmlFor={toggleId}
          className="text-base font-semibold text-ink-900 cursor-pointer"
          onClick={() => !disabled && onChange(!checked)}
        >
          {title}
        </label>
        {helperText && (
          <p id={helperId} className="text-sm text-ink-600 mt-0.5">
            {helperText}
          </p>
        )}
      </div>

      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={helperText ? helperId : undefined}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
          'my-auto min-h-touch min-w-[48px] items-center justify-center p-1',
          disabled && 'cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'pointer-events-none relative inline-block h-6 w-11 rounded-full transition-colors duration-200 ease-in-out',
            checked ? 'bg-green-600' : 'bg-sand-400'
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5',
              checked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </span>
      </button>
    </div>
  );
};

ConsentToggle.displayName = 'ConsentToggle';
