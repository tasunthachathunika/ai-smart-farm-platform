'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  HelpCircle,
  FileText,
  Copy,
  Check,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { Modal } from './Modal';
import { Button } from './Button';
import { useI18n } from '@/i18n';

export interface SourceRecord {
  id: string;
  type: string;
  title: string;
  date?: string;
  summary?: string;
}

export interface ObservationOrIssue {
  text: string;
  sourceRecordIds?: string[];
  action?: string;
}

export interface AIResultCardProps {
  title?: string;
  analysisType?: 'summary' | 'visit_prep';
  summary?: string;
  overview?: string;
  timelineSummary?: string;
  keyObservations?: ObservationOrIssue[];
  keyIssues?: ObservationOrIssue[];
  missingInformation?: string[];
  suggestedQuestions?: string[];
  discussionQuestions?: string[];
  inspectionsRecommended?: string[];
  sourceRecords?: SourceRecord[];
  isFallback?: boolean;
  className?: string;
}

export const AIResultCard: React.FC<AIResultCardProps> = ({
  title = 'Crop & Advisory Overview',
  analysisType = 'summary',
  summary,
  overview,
  timelineSummary,
  keyObservations = [],
  keyIssues = [],
  missingInformation = [],
  suggestedQuestions = [],
  discussionQuestions = [],
  inspectionsRecommended = [],
  sourceRecords = [],
  isFallback = false,
  className,
}) => {
  const [selectedSource, setSelectedSource] = useState<SourceRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  // Unify primary summary/overview text
  const mainOverviewText = overview || summary || '';

  // Unify questions to discuss
  const questions = useMemo(() => {
    return suggestedQuestions.length > 0 ? suggestedQuestions : discussionQuestions;
  }, [suggestedQuestions, discussionQuestions]);

  // Unify items with source citations
  const observationsList = useMemo(() => {
    return keyObservations.length > 0 ? keyObservations : keyIssues;
  }, [keyObservations, keyIssues]);

  // Build full plain text for copying
  const fullPlainText = useMemo(() => {
    const parts: string[] = [];
    parts.push(`--- ${title} ---`);
    if (isFallback) {
      parts.push('[Notice: Automated non-AI record summary]');
    }
    if (mainOverviewText) {
      parts.push(`\nOVERVIEW:\n${mainOverviewText}`);
    }
    if (timelineSummary) {
      parts.push(`\nTIMELINE & ACTIVITIES:\n${timelineSummary}`);
    }
    if (observationsList.length > 0) {
      parts.push('\nKEY OBSERVATIONS & ISSUES:');
      observationsList.forEach((item, idx) => {
        parts.push(`${idx + 1}. ${item.text}`);
        if (item.action) {
          parts.push(`   Suggested Action: ${item.action}`);
        }
        if (item.sourceRecordIds && item.sourceRecordIds.length > 0) {
          parts.push(`   Source Records: ${item.sourceRecordIds.join(', ')}`);
        }
      });
    }
    if (inspectionsRecommended.length > 0) {
      parts.push('\nRECOMMENDED INSPECTIONS:');
      inspectionsRecommended.forEach((rec) => {
        parts.push(`- ${rec}`);
      });
    }
    if (sourceRecords.length > 0) {
      parts.push('\nREFERENCED RECORDS:');
      sourceRecords.forEach((s) => {
        parts.push(`- ${s.title} (${s.id})`);
      });
    }
    if (missingInformation.length > 0) {
      parts.push('\nMISSING INFORMATION / DATA GAPS:');
      missingInformation.forEach((gap) => {
        parts.push(`- ${gap}`);
      });
    }
    if (questions.length > 0) {
      parts.push('\nQUESTIONS TO DISCUSS WITH EXTENSION OFFICER:');
      questions.forEach((q, idx) => {
        parts.push(`${idx + 1}. ${q}`);
      });
    }
    parts.push(
      '\nDISCLAIMER: AI-generated agronomic analysis. Informational only. Not a prescription or dosage. Confirm with your agricultural extension officer.'
    );
    return parts.join('\n');
  }, [
    title,
    isFallback,
    mainOverviewText,
    timelineSummary,
    observationsList,
    inspectionsRecommended,
    sourceRecords,
    missingInformation,
    questions,
  ]);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullPlainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={cn(
        'rounded-card border-2 border-ai-300 bg-ai-50 p-5 md:p-6 shadow-card flex flex-col gap-5 text-ai-800',
        className
      )}
    >
      {/* Top Header with AI Badge & Copy Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-ai-300/40">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="ai-suggestion" />
          {isFallback ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Non-AI Record Summary
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-ai-100 text-ai-800 border border-ai-300">
              {analysisType === 'visit_prep' ? 'Visit Preparation' : 'Season Synthesis'}
            </span>
          )}
          <h3 className="font-extrabold text-lg md:text-xl text-ai-800">{title}</h3>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          leftIcon={copied ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
          className="min-h-touch bg-white text-xs font-bold"
          aria-label="Copy AI analysis to clipboard"
        >
          {copied ? 'Copied to Clipboard' : 'Copy Analysis'}
        </Button>
      </div>

      {/* Fallback Notice (if AI LLM was unreachable and rule-based fallback was used) */}
      {isFallback && (
        <div
          role="status"
          aria-label="Fallback Notice"
          className="flex items-start gap-3 p-3.5 rounded-card bg-amber-50 border border-amber-200 text-amber-900 text-xs md:text-sm font-medium shadow-sm"
        >
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong>{t('ai.fallbackNotice')}</strong> Displaying an automated summary synthesized directly from your verified crop cycles, activity logs, inputs, and harvests.
          </p>
        </div>
      )}

      {/* Mandatory Permanent Disclaimer Banner */}
      <div
        role="note"
        aria-label="AI Safety Disclaimer"
        className="flex items-start gap-3 p-3.5 rounded-card bg-white border border-ai-300 text-ai-800 text-xs md:text-sm font-medium shadow-sm"
      >
        <AlertTriangle className="w-5 h-5 text-gold-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong>{t('ai.disclaimerTitle')}:</strong> {t('ai.disclaimerNotice')}
        </p>
      </div>

      {/* Section 1: Overview */}
      {mainOverviewText && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs md:text-sm font-bold uppercase tracking-wider text-ai-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-ai-600" aria-hidden="true" />
            <span>Overview &amp; Purpose</span>
          </h4>
          <div className="text-sm md:text-base text-ink-900 leading-relaxed bg-white/80 p-4 rounded-card border border-ai-300/60 whitespace-pre-line">
            {mainOverviewText}
          </div>
        </div>
      )}

      {/* Section 2: Key Activities / Timeline Summary */}
      {timelineSummary && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs md:text-sm font-bold uppercase tracking-wider text-ai-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-ai-600" aria-hidden="true" />
            <span>Key Activities &amp; Timeline</span>
          </h4>
          <div className="text-sm md:text-base text-ink-900 leading-relaxed bg-white/80 p-4 rounded-card border border-ai-300/60 whitespace-pre-line">
            {timelineSummary}
          </div>
        </div>
      )}

      {/* Section 3: Key Observations & Issues Grounded with Sources */}
      {observationsList.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-xs md:text-sm font-bold uppercase tracking-wider text-ai-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-ai-600" aria-hidden="true" />
            <span>Observations &amp; Issues to Discuss ({observationsList.length})</span>
          </h4>

          <div className="space-y-2.5">
            {observationsList.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-card bg-white/90 border border-ai-300/60 flex flex-col gap-2 shadow-sm"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-ai-100 text-ai-800 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 text-sm text-ink-900 font-medium leading-relaxed">
                    {item.text}
                  </div>
                </div>

                {item.action && (
                  <div className="ml-7 text-xs bg-sand-50 p-2.5 rounded border border-sand-200 text-ink-800">
                    <strong className="text-green-800">Suggested Action:</strong> {item.action}
                  </div>
                )}

                {/* Grounding Source Record Chips */}
                {item.sourceRecordIds && item.sourceRecordIds.length > 0 && (
                  <div className="ml-7 flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-ink-600 uppercase">Sources:</span>
                    {item.sourceRecordIds.map((recId) => (
                      <button
                        key={recId}
                        type="button"
                        onClick={() =>
                          setSelectedSource({
                            id: recId,
                            type: 'Plot Record',
                            title: `Record #${recId.slice(0, 8)}`,
                            summary: `Referenced in AI grounded synthesis for: "${item.text.slice(0, 80)}..."`,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sand-100 hover:bg-sand-200 border border-sand-300 text-[11px] font-semibold text-ink-800 transition-colors min-h-touch"
                        title={`View referenced record ${recId}`}
                      >
                        <FileText className="w-3 h-3 text-ai-600" aria-hidden="true" />
                        <span>{recId.slice(0, 8)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Recommended Inspections (if present in visit_prep) */}
      {inspectionsRecommended.length > 0 && (
        <div className="flex flex-col gap-2 p-3.5 rounded-card bg-white/80 border border-ai-300/60">
          <h4 className="text-xs font-bold uppercase tracking-wider text-green-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-700" aria-hidden="true" />
            <span>Recommended Inspections</span>
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-ink-900">
            {inspectionsRecommended.map((rec, idx) => (
              <li key={idx} className="leading-relaxed">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 5: Missing Information in Records */}
      {missingInformation.length > 0 && (
        <div className="flex flex-col gap-2 p-3.5 rounded-card bg-white/80 border border-ai-300/60">
          <h4 className="text-xs font-bold uppercase tracking-wider text-status-warning flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
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

      {/* Section 6: Questions for Agricultural Extension Officer */}
      {questions.length > 0 && (
        <div className="flex flex-col gap-2 p-4 rounded-card bg-green-50/80 border border-green-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-green-800 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-green-700" aria-hidden="true" />
            <span>Questions for Your Extension Officer</span>
          </h4>
          <ul className="space-y-2 text-xs md:text-sm text-ink-900 pt-1">
            {questions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-green-200 text-green-900 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="font-semibold text-green-950">{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Referenced Sources List (if explicitly provided) */}
      {sourceRecords.length > 0 && (
        <div className="flex flex-col gap-2 p-3.5 rounded-card bg-white/80 border border-ai-300/60">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ai-800">
            Referenced Source Records ({sourceRecords.length}):
          </h4>
          <div className="flex flex-wrap gap-2">
            {sourceRecords.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setSelectedSource(source)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-white border border-ai-300 text-xs font-semibold text-ai-800 hover:bg-ai-50 hover:border-ai-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 min-h-touch"
              >
                <FileText className="w-3.5 h-3.5 text-ai-600" aria-hidden="true" />
                <span>{source.title || `Record #${source.id}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Source Record Details Modal */}
      {selectedSource && (
        <Modal
          isOpen={!!selectedSource}
          onClose={() => setSelectedSource(null)}
          title={`Source Record: ${selectedSource.title}`}
          description={`Record ID: ${selectedSource.id}`}
        >
          <div className="flex flex-col gap-3 py-2 text-ink-900">
            {selectedSource.date && (
              <div className="text-xs font-medium text-ink-600">
                Recorded Date: <strong className="text-ink-900">{selectedSource.date}</strong>
              </div>
            )}
            <div className="text-sm leading-relaxed bg-sand-50 p-3.5 rounded-card border border-sand-200">
              {selectedSource.summary || 'Referenced in groundings for this AI synthesis.'}
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSource(null)}
                className="min-h-touch"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

AIResultCard.displayName = 'AIResultCard';
