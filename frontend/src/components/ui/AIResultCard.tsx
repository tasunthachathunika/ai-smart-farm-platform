'use client';

import React, { useState } from 'react';
import { Sparkles, AlertTriangle, HelpCircle, FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Modal } from './Modal';

export interface SourceRecord {
  id: string;
  type: string;
  title: string;
  date?: string;
  summary?: string;
}

export interface AIResultCardProps {
  title?: string;
  summary: string;
  sourceRecords?: SourceRecord[];
  missingInformation?: string[];
  suggestedQuestions?: string[];
  className?: string;
}

export const AIResultCard: React.FC<AIResultCardProps> = ({
  title = 'Crop & Advisory Overview',
  summary,
  sourceRecords = [],
  missingInformation = [],
  suggestedQuestions = [],
  className,
}) => {
  const [selectedSource, setSelectedSource] = useState<SourceRecord | null>(null);

  return (
    <div
      className={cn(
        'rounded-card border-2 border-ai-300 bg-ai-50 p-5 md:p-6 shadow-card flex flex-col gap-5 text-ai-800',
        className
      )}
    >
      {/* Top Header with AI Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-ai-300/40">
        <div className="flex items-center gap-2">
          <Badge variant="ai-suggestion" />
          <h3 className="font-bold text-lg md:text-xl text-ai-800">{title}</h3>
        </div>
      </div>

      {/* Mandatory Permanent Disclaimer Banner */}
      <div
        role="note"
        aria-label="AI Safety Disclaimer"
        className="flex items-start gap-3 p-3.5 rounded-card bg-white border border-ai-300 text-ai-800 text-xs md:text-sm font-medium shadow-sm"
      >
        <AlertTriangle className="w-5 h-5 text-gold-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong>AI-generated information.</strong> Not a pesticide or fertilizer prescription,
          dosage recommendation or confirmed crop-disease diagnosis. Please confirm with your
          extension officer.
        </p>
      </div>

      {/* Summary / Analysis Text */}
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-bold uppercase tracking-wider text-ai-800 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-ai-600" aria-hidden="true" />
          <span>Synthesis & Observations</span>
        </h4>
        <div className="text-sm md:text-base text-ink-900 leading-relaxed bg-white/70 p-4 rounded-card border border-ai-300/60 whitespace-pre-line">
          {summary}
        </div>
      </div>

      {/* "Based on:" Source Chips */}
      {sourceRecords.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ai-800">
            Based On Source Records ({sourceRecords.length}):
          </h4>
          <div className="flex flex-wrap gap-2">
            {sourceRecords.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setSelectedSource(source)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-white border border-ai-300 text-xs font-semibold text-ai-800 hover:bg-ai-50 hover:border-ai-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 min-h-touch"
                title={`Click to view record ${source.id}`}
              >
                <FileText className="w-3.5 h-3.5 text-ai-600" aria-hidden="true" />
                <span>{source.title || `Record #${source.id}`}</span>
                <ChevronRight className="w-3 h-3 text-ai-600" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* "Missing information" Section */}
      {missingInformation.length > 0 && (
        <div className="flex flex-col gap-2 p-3.5 rounded-card bg-white/80 border border-ai-300/60">
          <h4 className="text-xs font-bold uppercase tracking-wider text-status-warning flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            <span>Missing Information in Records</span>
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-ink-900">
            {missingInformation.map((info, idx) => (
              <li key={idx} className="leading-relaxed">
                {info}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Questions for Extension Officer */}
      {suggestedQuestions.length > 0 && (
        <div className="flex flex-col gap-2 p-3.5 rounded-card bg-green-50/70 border border-green-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-green-800 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-green-700" aria-hidden="true" />
            <span>Questions for Your Agricultural Extension Officer</span>
          </h4>
          <ul className="space-y-1.5 text-xs md:text-sm text-ink-900">
            {suggestedQuestions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="font-bold text-green-700" aria-hidden="true">
                  {idx + 1}.
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Source Record Details Modal */}
      {selectedSource && (
        <Modal
          isOpen={!!selectedSource}
          onClose={() => setSelectedSource(null)}
          title={`Source Record: ${selectedSource.title}`}
          description={`Type: ${selectedSource.type} | ID: ${selectedSource.id}`}
        >
          <div className="flex flex-col gap-3 py-2">
            {selectedSource.date && (
              <div className="text-xs font-medium text-ink-600">
                Recorded Date: <strong className="text-ink-900">{selectedSource.date}</strong>
              </div>
            )}
            <div className="text-sm text-ink-900 leading-relaxed bg-sand-50 p-3 rounded-card border border-sand-200">
              {selectedSource.summary || 'No additional summary text available for this record.'}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedSource(null)}
                className="px-4 py-2 text-sm font-semibold text-green-700 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 rounded-card min-h-touch"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

AIResultCard.displayName = 'AIResultCard';
