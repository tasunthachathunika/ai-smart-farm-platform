'use client';

import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options?: SelectOption[];
  error?: string;
  helperText?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      placeholder,
      id,
      className,
      required,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label
          htmlFor={selectId}
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
          <select
            ref={ref}
            id={selectId}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              'w-full min-h-touch pl-3.5 pr-10 py-2.5 rounded-card text-ink-900 bg-white border text-base appearance-none transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
              'disabled:bg-sand-50 disabled:text-ink-600/70 disabled:cursor-not-allowed',
              error
                ? 'border-status-danger focus-visible:ring-status-danger'
                : 'border-sand-200 focus:border-green-600',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-600 flex items-center">
            <ChevronDown className="w-5 h-5" aria-hidden="true" />
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

Select.displayName = 'Select';
