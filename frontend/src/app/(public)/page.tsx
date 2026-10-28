'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  ClipboardList,
  FlaskConical,
  Wheat,
  Camera,
  CloudSun,
  ShieldCheck,
  Smartphone,
  Wifi,
  Languages,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCheck,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AIResultCard } from '@/components/ui/AIResultCard';
import { LanguageSwitcher } from '@/components/shell/LanguageSwitcher';

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [mockShareRevoked, setMockShareRevoked] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: 'Who owns my farm records and yield data?',
      a: 'You own 100% of your data. Goviya Plus never sells, monetizes, or transfers farmer records to third-party commercial entities.',
    },
    {
      q: 'Can I revoke an extension officer\'s access to my plot?',
      a: 'Yes, at any moment with a single click. Revocation is atomic in the database, immediately returning 404 on the officer\'s very next request.',
    },
    {
      q: 'Does Goviya Plus work on low-end smartphones and slow networks?',
      a: 'Yes. The application is mobile-first (optimized for 360px viewports), enforces aggressive client-side image compression, and operates on low-bandwidth connections.',
    },
    {
      q: 'Who can see my exact GPS plot coordinates?',
      a: 'Only you, the plot owner. Exact GPS coordinates are encrypted with AES-256-GCM. Extension officers see only district-level blurred centroids, and administrators never see farm records.',
    },
    {
      q: 'Can the AI diagnose crop pests or recommend pesticide dosages?',
      a: 'No. Goviya Plus strictly adheres to Responsible AI standards: the AI organizes your notes and suggests questions for an extension officer, but will never prescribe chemical products, calculate dosages, or make autonomous agronomic decisions.',
    },
  ];

  return (
    <div className="min-h-screen bg-sand-50 text-ink-900 flex flex-col font-sans">
      {/* 1. HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sand-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Trilingual Tagline */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl" aria-hidden="true">
              🌾
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-green-700 tracking-tight leading-tight">
                Goviya Plus
              </span>
              <span className="text-[10px] text-ink-600 font-medium">
                ගොවියා ප්ලස් • கோவியா பிளஸ்
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-semibold text-ink-600"
          >
            <a href="#features" className="hover:text-green-700 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-green-700 transition-colors">
              How It Works
            </a>
            <a href="#ai-safety" className="hover:text-green-700 transition-colors">
              Responsible AI
            </a>
            <a href="#privacy" className="hover:text-green-700 transition-colors">
              Privacy &amp; Consent
            </a>
            <a href="#faq" className="hover:text-green-700 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Language Switcher Stub + Auth CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher className="hidden sm:inline-flex" />

            <Link href="/login">
              <Button variant="secondary" size="sm">
                Log in
              </Button>
            </Link>

            <Link href="/register">
              <Button variant="primary" size="sm">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden bg-green-900 text-white py-16 sm:py-24 lg:py-28">
        {/* Soft decorative pale green blobs */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -left-24 w-96 h-96 bg-green-500/20 rounded-full blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -right-24 w-96 h-96 bg-green-400/15 rounded-full blur-3xl pointer-events-none"
        />

        {/* Pattern overlay simulation */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-950/80 via-green-900/90 to-green-950/95" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-800/80 border border-green-700/60 text-xs font-semibold text-green-100">
            <span>🛡️ Hardware-Encrypted GPS Privacy &amp; Verified Extension Advisory</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Keep your farm records. <br className="hidden sm:inline" />
            <span className="text-gold-500">Stay in control.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-green-100 leading-relaxed font-normal">
            Sri Lanka&apos;s smart farm records platform. Maintain crop cycles, field activities, and input journals with AES-256 GPS protection. Share securely with certified extension officers.
          </p>

          {/* Dual Hero CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto font-bold shadow-lg"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Register your farm
              </Button>
            </Link>

            <Link href="/login" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto min-h-touch px-6 py-3.5 rounded-card border-2 border-white/70 text-white font-semibold hover:bg-white/10 active:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <UserCheck className="w-5 h-5 text-green-200" />
                <span>Officer portal</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. TRUST STRIP */}
      <section className="bg-sand-50 border-b border-sand-200 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-2">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-ink-900">Low-end phones ready</h3>
              <p className="text-[11px] sm:text-xs text-ink-600 mt-0.5">Works smoothly on basic smartphones</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-2">
                <Wifi className="w-5 h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-ink-900">Uses less data</h3>
              <p className="text-[11px] sm:text-xs text-ink-600 mt-0.5">Under 100KB initial payload</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-2">
                <Languages className="w-5 h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-ink-900">Sinhala • Tamil • English</h3>
              <p className="text-[11px] sm:text-xs text-ink-600 mt-0.5">Trilingual interface readiness</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-2">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-ink-900">You control your data</h3>
              <p className="text-[11px] sm:text-xs text-ink-600 mt-0.5">Zero advertising, zero data brokers</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURE GRID */}
      <section id="features" className="bg-white py-16 sm:py-20 border-b border-sand-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-700">
              Field-Tested Features
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-ink-900">
              Everything Your Farm Needs, Nothing You Don&apos;t
            </h2>
            <p className="text-sm sm:text-base text-ink-600">
              Clean, reliable records designed for Sri Lankan agricultural realities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-card border border-sand-200 bg-sand-50/50 hover:bg-white hover:border-green-600 transition-all shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-card bg-green-100 text-green-700 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-900 mb-2">Plots &amp; Fields</h3>
                <p className="text-sm text-ink-600 leading-relaxed">
                  AES-256-GCM encrypted GPS coordinates. Exact coordinates are returned only to you. Officers receive blurred district centroids.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-card border border-sand-200 bg-sand-50/50 hover:bg-white hover:border-green-600 transition-all shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-card bg-earth-100 text-earth-800 flex items-center justify-center mb-4">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-900 mb-2">Activity Logs</h3>
                <p className="text-sm text-ink-600 leading-relaxed">
                  Log tilling, sowing, weeding, and canal irrigation with time stamps and crop stages. Fully exportable timeline.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-card border border-sand-200 bg-sand-50/50 hover:bg-white hover:border-green-600 transition-all shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-card bg-sand-200 text-ink-900 flex items-center justify-center mb-4">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-900 mb-2">Fertilizer &amp; Input Records</h3>
                <p className="text-sm text-ink-600 leading-relaxed">
                  Keep a factual record of inputs applied to your fields. Strictly an accounting record book — never automated prescriptions.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-card border border-sand-200 bg-sand-50/50 hover:bg-white hover:border-green-600 transition-all shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-card bg-gold-100 text-gold-700 flex items-center justify-center mb-4">
                  <Wheat className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-900 mb-2">Harvests &amp; Yields</h3>
                <p className="text-sm text-ink-600 leading-relaxed">
                  Track harvest dates, bag counts, weight yields, and crop moisture levels across seasonal Yala and Maha cycles.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-card border border-sand-200 bg-sand-50/50 hover:bg-white hover:border-green-600 transition-all shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-card bg-status-info-bg text-status-info flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-900 mb-2">Sanitized Field Photos</h3>
                <p className="text-sm text-ink-600 leading-relaxed">
                  Upload crop inspection photos. Automatic binary magic-byte validation, client-side compression (&le;1MB), and complete EXIF removal.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-card border border-sand-200 bg-sand-50/50 hover:bg-white hover:border-green-600 transition-all shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-card bg-green-100 text-green-700 flex items-center justify-center mb-4">
                  <CloudSun className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-ink-900 mb-2">District Weather</h3>
                <p className="text-sm text-ink-600 leading-relaxed">
                  Weather forecasts calculated via district centroid telemetry so your exact plot location is never shared with third-party weather APIs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section id="how-it-works" className="bg-sand-50 py-16 sm:py-20 border-b border-sand-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-700">
              Simple 4-Step Flow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-ink-900">
              How Goviya Plus Works
            </h2>
            <p className="text-sm sm:text-base text-ink-600">
              Start in under 3 minutes with no technical knowledge required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="bg-white p-6 rounded-card border border-sand-200 shadow-card flex flex-col">
              <span className="w-8 h-8 rounded-full bg-green-700 text-white font-bold flex items-center justify-center text-sm mb-4">
                1
              </span>
              <h3 className="font-bold text-base text-ink-900 mb-2">Register Plot</h3>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Add your field name, acreage, and crop variety. GPS is encrypted immediately.
              </p>
            </div>

            <div className="bg-white p-6 rounded-card border border-sand-200 shadow-card flex flex-col">
              <span className="w-8 h-8 rounded-full bg-green-700 text-white font-bold flex items-center justify-center text-sm mb-4">
                2
              </span>
              <h3 className="font-bold text-base text-ink-900 mb-2">Log Daily Work</h3>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Record irrigation, fertilization dates, pest scouting, and field photos as you work.
              </p>
            </div>

            <div className="bg-white p-6 rounded-card border border-sand-200 shadow-card flex flex-col">
              <span className="w-8 h-8 rounded-full bg-green-700 text-white font-bold flex items-center justify-center text-sm mb-4">
                3
              </span>
              <h3 className="font-bold text-base text-ink-900 mb-2">Share with Officer</h3>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Grant temporary view access to your certified extension officer for expert advisory.
              </p>
            </div>

            <div className="bg-white p-6 rounded-card border border-sand-200 shadow-card flex flex-col">
              <span className="w-8 h-8 rounded-full bg-green-700 text-white font-bold flex items-center justify-center text-sm mb-4">
                4
              </span>
              <h3 className="font-bold text-base text-ink-900 mb-2">Review AI Insights</h3>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Get synthesized timelines and discussion questions prepared for your officer visit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. RESPONSIBLE AI SECTION */}
      <section id="ai-safety" className="bg-white py-16 sm:py-20 border-b border-sand-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ai-50 border border-ai-300 text-ai-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-ai-600" />
              <span>Strict AI Agronomic Safety Guardrails</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-ink-900">
              Responsible AI Advisory
            </h2>
            <p className="text-sm sm:text-base text-ink-600">
              AI should organize your records, not guess chemical treatments.
            </p>
          </div>

          {/* Sample AI Result Card Component in Purple Theme */}
          <div className="max-w-3xl mx-auto">
            <AIResultCard
              title="Responsible AI Summary: Samba Rice Cycle"
              summary={`Based on your 4 logged entries over the last 14 days, the plot received deep irrigation on Oct 22nd. 

Mild leaf tip yellowing was recorded following heavy seasonal rain on Oct 25th. This pattern commonly correlates with temporary soil waterlogging or drainage delay, rather than active pest infestation.`}
              sourceRecords={[
                {
                  id: 'REC-01',
                  type: 'Irrigation Log',
                  title: 'Canal sluice gates opened',
                  date: '2026-10-22',
                  summary: 'Soaked plot to 5cm depth.',
                },
                {
                  id: 'REC-02',
                  type: 'Visual Scouting',
                  title: 'North perimeter leaf inspection',
                  date: '2026-10-25',
                  summary: 'Mild lower leaf chlorosis observed after 3 days of rain.',
                },
              ]}
              missingInformation={[
                'Recent soil pH testing data',
                'Perimeter ditch drainage flow rate',
              ]}
              suggestedQuestions={[
                'Could temporary standing water after the rain be restricting root aeration in Block A?',
                'Should we deepen the perimeter drainage trench before the next rainfall cycle?',
              ]}
            />
          </div>

          {/* Three AI Safety Commitments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-5 rounded-card bg-ai-50 border border-ai-300 text-ai-800">
              <h4 className="font-bold text-base mb-2">1. Summarizes &amp; Organizes</h4>
              <p className="text-xs leading-relaxed">
                Connects disparate activity logs into a coherent chronological timeline for rapid review.
              </p>
            </div>

            <div className="p-5 rounded-card bg-ai-50 border border-ai-300 text-ai-800">
              <h4 className="font-bold text-base mb-2">2. Prepares Questions</h4>
              <p className="text-xs leading-relaxed">
                Suggests focused agronomic questions for you to discuss with your certified extension officer.
              </p>
            </div>

            <div className="p-5 rounded-card bg-ai-50 border border-ai-300 text-ai-800">
              <h4 className="font-bold text-base mb-2 text-status-danger">3. NEVER Prescribes Doses</h4>
              <p className="text-xs leading-relaxed">
                Strict refusal guardrails: will never prescribe chemical products, calculate dosages, or definitively diagnose diseases.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRIVACY & CONSENT SECTION */}
      <section id="privacy" className="bg-green-800 text-white py-16 sm:py-20 border-b border-sand-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-200">
              Your Farm, Your Decision
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Instant, One-Click Consent Revocation
            </h2>
            <p className="text-sm sm:text-base text-green-100">
              Sharing is always under your control. Revoke access instantly on the officer&apos;s very next request.
            </p>
          </div>

          {/* Mock Consent Card */}
          <div className="max-w-xl mx-auto bg-white text-ink-900 rounded-card p-6 shadow-xl border border-sand-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sand-200">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-700" />
                <h3 className="font-bold text-base text-ink-900">Active Share with Extension Officer</h3>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  mockShareRevoked
                    ? 'bg-status-danger-bg text-status-danger'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {mockShareRevoked ? 'Revoked (404)' : 'Active (View-Only)'}
              </span>
            </div>

            <p className="text-xs text-ink-600 leading-relaxed">
              Officer: <strong>K. Bandara (ID #42)</strong> • Scope: View crop logs &amp; leave notes. Exact GPS coordinates are blurred to district level.
            </p>

            <div className="pt-2 flex items-center justify-between gap-4">
              <span className="text-xs text-ink-600">
                {mockShareRevoked
                  ? 'Access blocked immediately in database.'
                  : 'Click to test instant revocation:'}
              </span>
              <button
                type="button"
                onClick={() => setMockShareRevoked(!mockShareRevoked)}
                className={`min-h-touch px-4 py-2 rounded-card text-xs font-bold transition-colors ${
                  mockShareRevoked
                    ? 'bg-sand-200 text-ink-900 hover:bg-sand-300'
                    : 'bg-status-danger hover:bg-red-700 text-white'
                }`}
              >
                {mockShareRevoked ? 'Restore Access Demo' : 'Stop Sharing Now'}
              </button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto text-center text-xs text-green-100 space-y-1">
            <p>
              🔒 <strong>Tamper-evident audit:</strong> Every revocation and view creates an atomic record in your journal.
            </p>
            <p>
              Admins never receive or read private farm logs or yields.
            </p>
          </div>
        </div>
      </section>

      {/* 8. EXTENSION OFFICERS SECTION */}
      <section className="bg-white py-16 sm:py-20 border-b border-sand-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-700">
              Department of Agriculture Collaboration
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-ink-900">
              Built for Agricultural Extension Officers
            </h2>
            <p className="text-sm sm:text-base text-ink-600">
              Verified officers get structured farmer records without invasive GPS tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-card border border-sand-200 bg-sand-50/50">
              <UserCheck className="w-8 h-8 text-green-700 mb-3" />
              <h3 className="font-bold text-base text-ink-900 mb-1">Administrative Verification</h3>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Only verified officers approved by platform administrators can receive shared farm records.
              </p>
            </div>

            <div className="p-6 rounded-card border border-sand-200 bg-sand-50/50">
              <ClipboardList className="w-8 h-8 text-green-700 mb-3" />
              <h3 className="font-bold text-base text-ink-900 mb-1">Pre-Visit Field Intel</h3>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Review crop stages, previous fertilizer dates, and photos before arriving at the field.
              </p>
            </div>

            <div className="p-6 rounded-card border border-sand-200 bg-sand-50/50">
              <ShieldCheck className="w-8 h-8 text-green-700 mb-3" />
              <h3 className="font-bold text-base text-ink-900 mb-1">Advisory Notes</h3>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Leave verified agronomic advice directly in the farmer&apos;s portal without altering their primary logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <section id="faq" className="bg-sand-50 py-16 sm:py-20 border-b border-sand-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-green-700">
              Got Questions?
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-ink-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-card border border-sand-200 shadow-sm overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-sm sm:text-base text-ink-900 hover:text-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 min-h-touch"
                  >
                    <span className="pr-4">{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-green-700 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-ink-600 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-ink-600 leading-relaxed border-t border-sand-200/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <section className="bg-green-800 text-white py-16 px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold">
            Ready to Take Control of Your Farm Records?
          </h2>
          <p className="text-sm sm:text-base text-green-100 leading-relaxed">
            Join Goviya Plus today. Free registration for farmers and certified agricultural extension officers across Sri Lanka.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto font-bold shadow-lg">
                Create Free Farmer Account
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto min-h-touch px-6 py-3.5 rounded-card border-2 border-white text-white font-semibold hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                Sign In to Existing Account
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="bg-white border-t border-sand-200 py-10 px-4 sm:px-6 lg:px-8 text-ink-600 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              🌾
            </span>
            <span className="font-extrabold text-sm text-green-700">Goviya Plus</span>
            <span className="text-ink-600">• Keep your farm records. Stay in control.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-green-700 underline font-medium">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-green-700 underline font-medium">
              Terms of Service
            </Link>
          </div>

          <p className="text-ink-600">
            © 2026 Goviya Plus. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
