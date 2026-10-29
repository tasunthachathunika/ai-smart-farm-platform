'use client';

import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  maxWidth = 'md',
}) => {
  const titleId = useId();
  const descId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Esc key and scroll lock
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Initial focus on autofocus element, first interactive input, or modal container
    const timeoutId = setTimeout(() => {
      if (modalRef.current) {
        const preferredFocus = modalRef.current.querySelector<HTMLElement>(
          '[autofocus], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
        );
        if (preferredFocus) {
          preferredFocus.focus();
          return;
        }
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const maxWidthStyles = {
    sm: 'md:max-w-sm',
    md: 'md:max-w-lg',
    lg: 'md:max-w-2xl',
    xl: 'md:max-w-4xl',
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-ink-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'w-full bg-white shadow-xl focus:outline-none transition-all flex flex-col',
          // Mobile: bottom sheet
          'max-h-[90vh] rounded-t-2xl',
          // Desktop: centered modal
          'md:rounded-card md:max-h-[85vh]',
          maxWidthStyles[maxWidth],
          className
        )}
      >
        {/* Mobile handle indicator */}
        <div className="md:hidden flex justify-center pt-2 pb-1" aria-hidden="true">
          <div className="w-12 h-1.5 rounded-full bg-sand-400" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sand-200">
          <div className="pr-4">
            <h2 id={titleId} className="text-lg md:text-xl font-bold text-ink-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-sm text-ink-600 mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex items-center justify-center min-h-touch min-w-touch rounded-card text-ink-600 hover:text-ink-900 hover:bg-sand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body content */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

Modal.displayName = 'Modal';
