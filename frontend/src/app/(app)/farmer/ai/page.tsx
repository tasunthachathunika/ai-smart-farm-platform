'use client';

import React from 'react';
import { AIResultCard } from '@/components/ui/AIResultCard';

export default function FarmerAIAssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Responsible AI Assistant</h1>
        <p className="text-sm text-ink-600 mt-1">
          Synthesizes your recent crop activity records and suggests talking points for your extension officer.
        </p>
      </div>

      <AIResultCard
        title="Field Activity &amp; Growth Observations"
        summary={`Review of your activity records indicates consistent irrigation over the past two weeks during early tillering.

Recent leaf color observations noted mild yellowing following heavy rainfall on October 24th. In waterlogged plots, temporary nitrogen uptake slowdown is common, but field inspection is recommended.`}
        sourceRecords={[
          {
            id: 'LOG-001',
            type: 'Activity Log',
            title: 'Canal Irrigation & Sluice Gate Opening',
            date: '2026-10-22',
            summary: 'Field flooded to 5 cm depth as per seasonal schedule.',
          },
          {
            id: 'LOG-002',
            type: 'Activity Log',
            title: 'Leaf Visual Inspection Post-Rainfall',
            date: '2026-10-25',
            summary: 'Mild chlorosis observed on lower leaf tips along the northern border.',
          },
        ]}
        missingInformation={[
          'Recent soil pH or salinity readings',
          'Lateral ditch drainage rate after the rain event',
        ]}
        suggestedQuestions={[
          'Could excess standing water from the recent rainfall be causing temporary nutrient uptake delays?',
          'Would establishing additional drainage trenches along the northern boundary protect the tillers?',
        ]}
      />
    </div>
  );
}
