'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { BackButton } from '@/components/ui/BackButton';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-sand-50 text-ink-900 px-4 py-8 max-w-2xl mx-auto space-y-6">
      <BackButton fallbackHref="/" label="Back to Home" />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-700" aria-hidden="true" />
            <CardTitle>Goviya Plus Privacy Policy</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-ink-900 leading-relaxed">
          <section className="space-y-2">
            <h4 className="font-bold text-base text-ink-900">1. GPS Coordinate Protection</h4>
            <p className="text-ink-600">
              Exact agricultural plot GPS coordinates are encrypted in our database using
              authenticated AES-256-GCM encryption. Exact coordinates are returned exclusively to
              the plot owner.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-base text-ink-900">2. Officer Access &amp; Consent</h4>
            <p className="text-ink-600">
              Agricultural extension officers receive only blurred district-level locations.
              Officers cannot view your records unless you have granted an active, unexpired share.
              Revoking a share immediately removes officer access on their very next request.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-base text-ink-900">3. Admin Privacy Boundary</h4>
            <p className="text-ink-600">
              System administrators have zero access to private farm logs, yields, or photos. Admin
              access is strictly confined to user account management and security audit logs.
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-base text-ink-900">4. Responsible AI Boundaries</h4>
            <p className="text-ink-600">
              AI analysis operates only over authorized farm records explicitly selected by the
              farmer. Exact GPS, passwords, and unnecessary personal data are never sent to AI
              models.
            </p>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
