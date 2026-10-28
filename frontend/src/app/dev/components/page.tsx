'use client';

import React, { useState } from 'react';
import { notFound } from 'next/navigation';
import {
  Sprout,
  Trash2,
  Share2,
  FileQuestion,
  Droplets,
  Activity,
} from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  Select,
  DatePicker,
  ConsentToggle,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Modal,
  Alert,
  Skeleton,
  EmptyState,
  Badge,
  Table,
  TimelineItem,
  PhotoUploader,
  AIResultCard,
  SourceRecord,
} from '@/components/ui';

export default function DevComponentsShowcasePage() {
  // Exclude from production build
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  // Interactive state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [formInput, setFormInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-10-28');
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Table dummy data
  interface CropLog {
    id: string;
    crop: string;
    stage: string;
    status: string;
    date: string;
  }

  const sampleLogs: CropLog[] = [
    { id: 'LOG-001', crop: 'Samba Rice', stage: 'Tillering', status: 'Healthy', date: '2026-10-25' },
    { id: 'LOG-002', crop: 'Red Onion', stage: 'Bulb Formation', status: 'Monitored', date: '2026-10-26' },
    { id: 'LOG-003', crop: 'Green Chilli', stage: 'Flowering', status: 'Needs Review', date: '2026-10-27' },
  ];

  const sampleSources: SourceRecord[] = [
    {
      id: 'REC-101',
      type: 'Activity Log',
      title: 'Field Irrigation & Leaf Inspection',
      date: '2026-10-24',
      summary: 'Farmer observed slight yellowing on lower leaves in Plot B after 3 days of heavy rain.',
    },
    {
      id: 'REC-102',
      type: 'Input Application',
      title: 'Organic Compost Application',
      date: '2026-10-15',
      summary: 'Applied standard compost mix uniformly across 2 acres prior to seasonal rains.',
    },
  ];

  return (
    <div className="min-h-screen bg-sand-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Page Header */}
        <header className="border-b border-sand-200 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-status-warning-bg text-status-warning text-xs font-bold mb-3 border border-gold-500/30">
            Dev Showcase Only (Excluded from Production)
          </div>
          <h1 className="text-3xl font-extrabold text-ink-900 tracking-tight">
            Goviya Plus UI Component Library
          </h1>
          <p className="mt-2 text-base text-ink-600">
            Accessible, WCAG 2.1 AA compliant components adhering to the Goviya Plus design system.
          </p>
        </header>

        {/* 1. BUTTONS */}
        <section aria-labelledby="section-buttons" className="space-y-4">
          <h2 id="section-buttons" className="text-xl font-bold text-ink-900">
            1. Buttons
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Button Variants &amp; Sizes</CardTitle>
              <CardDescription>
                Touch-target optimized (min 48px), high-contrast accessible states.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-ink-600 mb-3 uppercase tracking-wider">
                  Variants (Amber CTA, White Secondary, Danger, Ghost)
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" leftIcon={<Sprout className="w-4 h-4" />}>
                    Primary Action
                  </Button>
                  <Button variant="secondary" leftIcon={<Share2 className="w-4 h-4" />}>
                    Secondary
                  </Button>
                  <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />}>
                    Danger Action
                  </Button>
                  <Button variant="ghost">Ghost Button</Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-ink-600 mb-3 uppercase tracking-wider">
                  Sizes (sm, md, lg) &amp; Loading State
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small (Min 48px Touch)</Button>
                  <Button size="md">Medium (Default)</Button>
                  <Button size="lg">Large Touch</Button>
                  <Button isLoading>Processing</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 2. FORM CONTROLS */}
        <section aria-labelledby="section-forms" className="space-y-4">
          <h2 id="section-forms" className="text-xl font-bold text-ink-900">
            2. Form Inputs &amp; Consent Controls
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Accessible Form Fields</CardTitle>
              <CardDescription>
                Visible labels, aria-describedby linked errors, and touch-ready inputs.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Plot Name"
                placeholder="e.g. Mahaweli North Acre 1"
                required
                value={formInput}
                onChange={(e) => {
                  setFormInput(e.target.value);
                  if (e.target.value.length < 3 && e.target.value.length > 0) {
                    setInputError('Plot name must be at least 3 characters.');
                  } else {
                    setInputError('');
                  }
                }}
                error={inputError}
                helperText="Enter a descriptive label for your plot"
              />

              <Select
                label="Primary Crop"
                placeholder="Choose a crop..."
                required
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                options={[
                  { value: 'paddy', label: 'Paddy / Rice (Samba/Nadu)' },
                  { value: 'onion', label: 'Big Onion (Lankan Red)' },
                  { value: 'maize', label: 'Maize' },
                  { value: 'chilli', label: 'Green Chilli' },
                ]}
              />

              <DatePicker
                label="Sowing Date"
                min="2026-01-01"
                max="2026-12-31"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                helperText="Native date picker ensuring YYYY-MM-DD format"
              />

              <Textarea
                label="Observations &amp; Soil Notes"
                placeholder="Describe current soil moisture, color, and recent field work..."
                rows={3}
                helperText="Never include passwords, API keys, or exact GPS here."
              />

              <div className="md:col-span-2">
                <ConsentToggle
                  title="Share plot records with Agricultural Extension Officer"
                  helperText="Enables your assigned officer to view crop logs and advisory notes. Exact GPS coordinates are never disclosed. You may revoke consent anytime."
                  checked={consentGiven}
                  onChange={setConsentGiven}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. FEEDBACK COMPONENTS */}
        <section aria-labelledby="section-feedback" className="space-y-4">
          <h2 id="section-feedback" className="text-xl font-bold text-ink-900">
            3. Feedback: Alerts, Modal, Skeletons &amp; Empty State
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Alerts &amp; Dialogs</CardTitle>
              <CardDescription>
                Responsive modal (bottom-sheet on mobile) and semantic role=&quot;alert&quot; feedback boxes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Alert variant="info" title="Seasonal Advisory">
                  Intermittent monsoon rains predicted this week. Ensure field drainage channels are cleared.
                </Alert>

                <Alert variant="success" title="Share Granted Atomic Audit">
                  Officer share granted successfully. Plot access logged in tamper-evident audit journal.
                </Alert>

                <Alert variant="warning" title="Share Revocation Warning">
                  Revoking this share immediately blocks officer access on their very next request.
                </Alert>

                {!alertDismissed && (
                  <Alert
                    variant="error"
                    title="Unauthorized Action (404 Policy)"
                    onDismiss={() => setAlertDismissed(true)}
                  >
                    Plot resource was not found or your officer credentials do not have an active share.
                  </Alert>
                )}
              </div>

              <div className="pt-4 border-t border-sand-200 flex flex-wrap items-center gap-4">
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  Open Modal / Bottom Sheet
                </Button>
                <span className="text-xs text-ink-600">
                  (Opens centered dialog on desktop, bottom sheet on mobile screens)
                </span>
              </div>

              {/* Skeletons */}
              <div className="pt-4 border-t border-sand-200 space-y-3">
                <p className="text-xs font-semibold text-ink-600 uppercase tracking-wider">
                  Skeleton Loading Placeholders
                </p>
                <div className="space-y-2">
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="85%" height={16} />
                  <Skeleton variant="rectangular" width="100%" height={64} />
                </div>
              </div>

              {/* Empty State */}
              <div className="pt-4 border-t border-sand-200">
                <EmptyState
                  icon={FileQuestion}
                  title="No Harvest Records Found"
                  description="You have not logged any harvest yields for this crop cycle yet. Record your first harvest once gathering begins."
                  action={{
                    label: 'Add First Harvest',
                    icon: <Sprout className="w-4 h-4" />,
                    onClick: () => alert('Action triggered!'),
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 4. DATA DISPLAY: BADGES, TABLE & TIMELINE */}
        <section aria-labelledby="section-data" className="space-y-4">
          <h2 id="section-data" className="text-xl font-bold text-ink-900">
            4. Data Display: Badges, Collapsing Table &amp; Timeline
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Security Badges &amp; Responsive Records</CardTitle>
              <CardDescription>
                Responsive table collapses into card layout on mobile viewports (&lt;768px).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-ink-600 mb-3 uppercase tracking-wider">
                  Status Badges
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="shared" />
                  <Badge variant="private" />
                  <Badge variant="ai-suggestion" />
                  <Badge variant="officer-confirmed" />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-ink-600 mb-3 uppercase tracking-wider">
                  Crop Cycle Activity Table (Desktop Table / Mobile Cards)
                </p>
                <Table
                  data={sampleLogs}
                  keyExtractor={(item) => item.id}
                  columns={[
                    { key: 'id', header: 'Record ID' },
                    { key: 'crop', header: 'Crop Variety' },
                    { key: 'stage', header: 'Growth Stage' },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (item) => (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                          {item.status}
                        </span>
                      ),
                    },
                    { key: 'date', header: 'Log Date' },
                  ]}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-ink-600 mb-3 uppercase tracking-wider">
                  Timeline with Collapsible Notes
                </p>
                <div className="mt-4">
                  <TimelineItem
                    icon={Droplets}
                    title="Deep Irrigation &amp; Water Level Check"
                    date="2026-10-26"
                    badge={<Badge variant="officer-confirmed" size="sm" />}
                    metadata={[
                      { label: 'Plot', value: 'Block A' },
                      { label: 'Water Level', value: '5 cm' },
                    ]}
                    notes="Canal sluice gates opened for 4 hours. Field soaked adequately before anticipated dry spell."
                  />
                  <TimelineItem
                    icon={Activity}
                    title="Pest Scouting &amp; Leaf Inspection"
                    date="2026-10-24"
                    badge={<Badge variant="shared" size="sm" />}
                    metadata={[{ label: 'Observed Area', value: 'South Perimeter' }]}
                    notes="No brown planthopper infestation detected. Healthy leaf color throughout southern border."
                    isLast
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 5. PHOTO UPLOADER & RESPONSIBLE AI RESULT */}
        <section aria-labelledby="section-photo-ai" className="space-y-4">
          <h2 id="section-photo-ai" className="text-xl font-bold text-ink-900">
            5. Photo Uploader &amp; Responsible AI Result Card
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Client-Side Validated Photo Upload &amp; Responsible AI</CardTitle>
              <CardDescription>
                Magic-byte checking + browser compression to &le;1MB, and strict AI safety boundaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <p className="text-xs font-semibold text-ink-600 mb-3 uppercase tracking-wider">
                  Accessible Photo Uploader (JPEG, PNG, WebP)
                </p>
                <PhotoUploader
                  onFileSelected={(file) => {
                    console.log('Selected file ready:', file.name, file.size);
                  }}
                  onUpload={async (file) => {
                    await new Promise((r) => setTimeout(r, 1200));
                    alert(`Demo upload successful for: ${file.name}`);
                  }}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-ink-600 mb-3 uppercase tracking-wider">
                  Purple AI Advisory Card (Strictly Non-Prescriptive)
                </p>
                <AIResultCard
                  title="Agronomic Observations for Plot #2"
                  summary={`Based on the activity logs submitted over the last 14 days, the paddy field has undergone regular irrigation during the tillering stage.

Lower leaf yellowing was recorded following the high precipitation on October 24th. This pattern commonly correlates with temporary soil saturation or drainage delays, rather than active fungal infection.`}
                  sourceRecords={sampleSources}
                  missingInformation={[
                    'Soil pH reading from the recent seasonal test',
                    'Specific drainage ditch flow rate after heavy rainfall',
                  ]}
                  suggestedQuestions={[
                    'Would improving lateral drainage trenches reduce temporary root waterlogging during this week\'s rains?',
                    'Should organic compost re-application wait until the tillering phase is fully consolidated?',
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Modal Component Demo */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Grant Officer Access"
          description="Granting temporary view-only access to an authorized agricultural officer."
        >
          <div className="space-y-4 py-2">
            <p className="text-sm text-ink-900 leading-relaxed">
              When granted, the officer will be able to view your crop cycle logs, input applications,
              and advisory notes.
            </p>
            <Alert variant="info">
              Exact GPS coordinates are always blurred to district-level for officer privacy.
            </Alert>
            <div className="flex justify-end gap-3 pt-4 border-t border-sand-200">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  alert('Share granted!');
                  setIsModalOpen(false);
                }}
              >
                Confirm Grant
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
