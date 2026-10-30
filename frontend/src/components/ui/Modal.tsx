'use client';

import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  open,
  onClose,
  title,
  description,
  children,
  className,
  maxWidth = 'md',
}) => {
  const isModalOpen = Boolean(open !== undefined ? open : isOpen);

  const titleId = useId();
  const descId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const backdropMouseDownTarget = useRef<EventTarget | null>(null);

  // Keep onClose in a ref to avoid re-triggering focus-trap effects on parent re-renders
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Esc key, focus-trap, and body scroll lock
  useEffect(() => {
    if (!isModalOpen) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc closes only on keydown Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    // Initial focus to the first input/autofocus ONLY when the modal opens, never on re-render
    const timeoutId = setTimeout(() => {
      if (modalRef.current) {
        const preferredFocus = modalRef.current.querySelector<HTMLElement>(
          '[autofocus], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
        );
        if (preferredFocus) {
          preferredFocus.focus();
        } else {
          const firstFocusable = modalRef.current.querySelector<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            modalRef.current.focus();
          }
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
  }, [isModalOpen]);

  if (!isModalOpen || typeof document === 'undefined') {
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
      onMouseDown={(e) => {
        backdropMouseDownTarget.current = e.target;
      }}
      onClick={(e) => {
        // Backdrop closes only when mousedown AND click target === the backdrop element itself
        if (
          e.target === e.currentTarget &&
          backdropMouseDownTarget.current === e.currentTarget
        ) {
          onCloseRef.current();
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
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
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
