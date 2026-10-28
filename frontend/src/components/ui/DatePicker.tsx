'use client';

import React, { forwardRef, useId } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    { label, error, helperText, min, max, id, className, required, disabled, ...props },
    ref
  ) => {
    const generatedId = useId();
    const dateId = id || generatedId;
    const errorId = `${dateId}-error`;
    const helperId = `${dateId}-helper`;

    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label
          htmlFor={dateId}
          className="text-sm font-semibold text-ink-900 flex items-center gap-1 select-none"
        >
          {label}
          {required && (
            <span className="text-status-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <div className="relative">
          <input
            ref={ref}
            type="date"
            id={dateId}
            min={min}
            max={max}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              'w-full min-h-touch pl-3.5 pr-10 py-2.5 rounded-card text-ink-900 bg-white border text-base transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
              'disabled:bg-sand-50 disabled:text-ink-600/70 disabled:cursor-not-allowed',
              error
                ? 'border-status-danger focus-visible:ring-status-danger'
                : 'border-sand-200 focus:border-green-600',
              className
            )}
            {...props}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-600 flex items-center">
            <Calendar className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-sm font-medium text-status-danger">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-sm text-ink-600">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
