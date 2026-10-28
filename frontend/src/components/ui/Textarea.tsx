'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, id, className, required, disabled, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    const describedBy = [
      error ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <label
          htmlFor={textareaId}
          className="text-sm font-semibold text-ink-900 flex items-center gap-1 select-none"
        >
          {label}
          {required && (
            <span className="text-status-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          disabled={disabled}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            'w-full min-h-[96px] px-3.5 py-2.5 rounded-card text-ink-900 bg-white border text-base transition-colors resize-y',
            'placeholder:text-ink-600/60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
            'disabled:bg-sand-50 disabled:text-ink-600/70 disabled:cursor-not-allowed',
            error
              ? 'border-status-danger focus-visible:ring-status-danger'
              : 'border-sand-200 focus:border-green-600',
            className
          )}
          {...props}
        />
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

Textarea.displayName = 'Textarea';
