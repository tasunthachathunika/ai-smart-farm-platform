import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function PublicLandingPage() {
  return (
    <main className="min-h-screen bg-sand-50 text-ink-900 px-4 py-8 sm:px-6 sm:py-12 max-w-2xl mx-auto">
      {/* Header & Trilingual Branding */}
      <header className="mb-8 flex items-center justify-between border-b border-sand-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-green-700 tracking-tight flex items-center gap-2">
            <span aria-hidden="true">🌾</span>
            <span>Goviya Plus</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-600 mt-0.5">
            ගොවියා ප්ලස් • கோவியා பிளஸ்
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">
              Register
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Welcome Card */}
      <section className="bg-white rounded-card shadow-card border border-sand-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-ink-900 mb-2">
          AI Smart Farm Records &amp; Crop Advisory
        </h2>
        <p className="text-sm text-ink-600 mb-6 leading-relaxed">
          Secure farm record-keeping, verified extension officer collaboration with privacy-preserved GPS, and responsible AI-powered record insights.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/login" className="flex-1">
            <Button variant="primary" className="w-full">
              Access My Farm Records
            </Button>
          </Link>
          <Link href="/register" className="flex-1">
            <Button variant="secondary" className="w-full">
              Join as Farmer or Officer
            </Button>
          </Link>
        </div>
      </section>

      {/* Privacy & Responsible AI Guarantees */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-card shadow-card border border-sand-200 p-4">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-2 font-bold">
            🛡️
          </div>
          <h3 className="font-bold text-sm text-ink-900">Encrypted GPS Privacy</h3>
          <p className="text-xs text-ink-600 mt-1">
            Exact field coordinates are encrypted with AES-256-GCM. Extension officers see only district-level blurred regions.
          </p>
        </div>

        <div className="bg-white rounded-card shadow-card border border-sand-200 p-4">
          <div className="w-10 h-10 rounded-full bg-ai-50 text-ai-600 flex items-center justify-center mb-2 font-bold">
            ✨
          </div>
          <h3 className="font-bold text-sm text-ink-900">Responsible AI</h3>
          <p className="text-xs text-ink-600 mt-1">
            AI only organizes your recorded notes and suggests discussion questions for your officer. No autonomous dosage prescriptions.
          </p>
        </div>
      </section>

      {/* Footer with Privacy and Terms Links */}
      <footer className="pt-6 border-t border-sand-200 text-center text-xs text-ink-600 space-y-2">
        <div className="flex justify-center gap-6">
          <Link href="/privacy" className="hover:text-green-700 underline font-medium">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-green-700 underline font-medium">
            Terms of Service
          </Link>
        </div>
        <p>© 2026 Goviya Plus Platform. All rights reserved.</p>
      </footer>
    </main>
  );
}
