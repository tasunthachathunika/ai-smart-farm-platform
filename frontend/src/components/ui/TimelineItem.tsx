'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineItemProps {
  id?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  date: string;
  badge?: React.ReactNode;
  notes?: string;
  metadata?: Array<{ label: string; value: string | number }>;
  isLast?: boolean;
  className?: string;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  icon: Icon,
  iconColor = 'text-green-600',
  iconBg = 'bg-green-100',
  title,
  date,
  badge,
  notes,
  metadata,
  isLast = false,
  className,
}) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  return (
    <div className={cn('relative flex gap-4 pb-8', isLast && 'pb-0', className)}>
      {/* Timeline connector line */}
      {!isLast && (
        <span
          className="absolute left-5 top-10 -bottom-2 w-0.5 bg-sand-200"
          aria-hidden="true"
        />
      )}

      {/* Icon node */}
      <div
        className={cn(
          'relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0 border-2 border-white shadow-sm',
          iconBg,
          iconColor
        )}
        aria-hidden="true"
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 bg-white p-4 rounded-card border border-sand-200 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-base text-ink-900">{title}</h4>
            {badge && <div>{badge}</div>}
          </div>
          <time className="text-xs sm:text-sm text-ink-600 shrink-0 font-medium">{date}</time>
        </div>

        {/* Metadata pills */}
        {metadata && metadata.length > 0 && (
          <div className="flex flex-wrap gap-2 my-2 text-xs">
            {metadata.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sand-50 border border-sand-200 text-ink-600 font-medium"
              >
                <span>{item.label}:</span>
                <strong className="text-ink-900">{item.value}</strong>
              </span>
            ))}
          </div>
        )}

        {/* Collapsible notes */}
        {notes && (
          <div className="mt-3 pt-3 border-t border-sand-200/60">
            <button
              type="button"
              onClick={() => setIsNotesExpanded(!isNotesExpanded)}
              aria-expanded={isNotesExpanded}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 rounded px-1.5 py-1 -ml-1.5"
            >
              <span>{isNotesExpanded ? 'Hide notes' : 'View notes'}</span>
              {isNotesExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>

            {isNotesExpanded && (
              <div className="mt-2 text-sm text-ink-600 bg-sand-50 p-3 rounded-card border border-sand-200 leading-relaxed break-words animate-in fade-in duration-150">
                {notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

TimelineItem.displayName = 'TimelineItem';
