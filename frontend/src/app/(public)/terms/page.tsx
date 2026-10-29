'use client';

import React from 'react';
import { FileCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { BackButton } from '@/components/ui/BackButton';

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-sand-50 text-ink-900 px-4 py-8 max-w-2xl mx-auto space-y-6">
      <BackButton fallbackHref="/" label="Back to Home" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-green-700" aria-hidden="true" />
            <CardTitle>Goviya Plus Terms of Service</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-ink-900 leading-relaxed">
          <section className="space-y-2">
            <h4 className="font-bold text-base text-ink-900">1. Agricultural Advisory Notice</h4>
            <p className="text-ink-600">
              Goviya Plus provides crop record-keeping and informational summaries. AI-assisted
              insights do NOT constitute formal fertilizer prescriptions, chemical pesticide
              dosages, or certified disease diagnoses.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-base text-ink-900">2. Officer Verification</h4>
            <p className="text-ink-600">
              Only verified agricultural extension officers approved by platform administrators may
              receive shared farm records. Officers must not attempt to modify farmer primary records.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-base text-ink-900">3. Tamper-Evident Auditability</h4>
            <p className="text-ink-600">
              All share creations, revocations, and officer record views are recorded in an immutable
              audit log to ensure transparent consent accounting.
            </p>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
