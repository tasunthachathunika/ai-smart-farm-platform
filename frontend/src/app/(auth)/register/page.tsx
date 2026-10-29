'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/types/auth';
import { ApiError } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { BackButton } from '@/components/ui/BackButton';
import { LanguageSwitcher } from '@/components/shell/LanguageSwitcher';
import { useI18n } from '@/i18n';

function calculatePasswordStrength(pwd: string): {
  score: number;
  label: string;
  barColor: string;
} {
  if (!pwd) return { score: 0, label: '', barColor: 'bg-sand-200' };

  let points = 0;
  if (pwd.length >= 8) points += 1;
  if (pwd.length >= 12) points += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) points += 1;
  if (/[0-9]/.test(pwd)) points += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) points += 1;

  if (points <= 2) {
    return { score: 33, label: 'Weak (min 8 characters)', barColor: 'bg-status-danger' };
  }
  if (points <= 3) {
    return { score: 66, label: 'Moderate', barColor: 'bg-gold-500' };
  }
  return { score: 100, label: 'Strong password', barColor: 'bg-green-600' };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const { t } = useI18n();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('farmer');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const passwordStrength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setFormError('Please complete all required fields.');
      return;
    }

    if (trimmedName.length < 2) {
      setFormError('Full name must be at least 2 characters.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (!agreePrivacy) {
      setFormError('You must review and agree to the Goviya Plus Privacy Policy to continue.');
      return;
    }

    try {
      // Send strictly only fields accepted by the backend validator:
      // email, password, fullName, phone (optional), role ('farmer' | 'officer')
      const payload = {
        email: trimmedEmail,
        password,
        fullName: trimmedName,
        role,
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      };

      const user = await register(payload);

      if (user.role === 'officer') {
        router.push('/officer/verification-pending');
      } else {
        router.push('/farmer');
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setFormError(apiErr?.message || 'Registration failed. Please check your inputs.');
    }
  };

  return (
    <main className="min-h-screen bg-sand-50 text-ink-900 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Top bar with back to home button and language switcher */}
        <div className="flex items-center justify-between">
          <BackButton fallbackHref="/" label={t('common.backToHome')} />
          <LanguageSwitcher />
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center gap-2 text-3xl font-extrabold text-green-700">
            <span aria-hidden="true">🌾</span>
            <span>{t('common.appName')}</span>
          </Link>
          <p className="text-sm text-ink-600">{t('common.tagline')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t('auth.register')}</CardTitle>
            <CardDescription>{t('auth.registerSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4">
                <Alert variant="error" onDismiss={() => setFormError(null)}>
                  {formError}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Choice (Farmer / Officer) */}
              <Select
                label={t('auth.role')}
                required
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                options={[
                  { value: 'farmer', label: t('auth.farmerRole') },
                  { value: 'officer', label: t('auth.officerRole') },
                ]}
              />

              {/* Officer Admin-Verification Notice */}
              {role === 'officer' && (
                <div
                  role="note"
                  className="p-3.5 rounded-card bg-status-warning-bg border border-gold-500/40 text-ink-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
                >
                  <ShieldAlert className="w-5 h-5 text-gold-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="leading-relaxed">
                    <strong>Administrative Notice:</strong> Your account needs admin verification before you can receive shares. Unverified officers cannot receive or query farm records.
                  </p>
                </div>
              )}

              {/* Full Name */}
              <Input
                label={t('auth.fullName')}
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sunil Jayawardena"
                maxLength={255}
              />

              {/* Email Address */}
              <Input
                label={t('auth.email')}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sunil@goviya.lk"
                maxLength={255}
              />

              {/* Phone (Optional) */}
              <Input
                label={`${t('auth.phone')} (Optional)`}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+94 77 123 4567"
                maxLength={50}
              />

              {/* Password with Visibility Toggle & Strength Meter */}
              <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="reg-password" className="text-sm font-semibold text-ink-900">
                  {t('auth.password')} <span className="text-status-danger" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-touch pl-3.5 pr-12 py-2.5 rounded-card text-ink-900 bg-white border border-sand-200 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-ink-600 hover:text-ink-900 rounded-card min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-1.5 space-y-1" aria-live="polite">
                    <div className="w-full h-1.5 rounded-full bg-sand-200 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${passwordStrength.barColor}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-ink-600">Password strength:</span>
                      <span className="font-semibold text-ink-900">{passwordStrength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mandatory Privacy Policy Checkbox & Modal Trigger */}
              <div className="pt-2">
                <div className="flex items-start gap-3 p-3 rounded-card bg-sand-50 border border-sand-200">
                  <input
                    id="privacy-consent-checkbox"
                    type="checkbox"
                    required
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-sand-400 text-green-600 focus:ring-green-600 shrink-0 cursor-pointer"
                  />
                  <label htmlFor="privacy-consent-checkbox" className="text-xs text-ink-900 leading-relaxed cursor-pointer select-none">
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsPrivacyModalOpen(true);
                      }}
                      className="font-bold text-green-700 hover:text-green-800 underline inline-flex items-center gap-0.5"
                    >
                      <span>Goviya Plus Privacy Notice</span>
                      <ExternalLink className="w-3 h-3 inline" aria-hidden="true" />
                    </button>
                    . I understand my exact GPS coordinates are encrypted, and admins cannot read farm records.
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full mt-2 font-bold"
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                {t('auth.register')}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-sand-200 text-center text-sm text-ink-600">
              <Link href="/login" className="font-bold text-green-700 hover:text-green-800 underline">
                {t('auth.alreadyHaveAccount')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mandatory Privacy Notice Modal */}
      <Modal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        title="Goviya Plus Privacy & Data Governance"
        description="Our non-negotiable architectural commitments to Sri Lankan farmers."
      >
        <div className="space-y-4 py-2 text-sm text-ink-900 leading-relaxed">
          <div className="flex items-start gap-3 p-3 rounded-card bg-green-50 border border-green-200">
            <Lock className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-green-900">AES-256-GCM GPS Encryption</h4>
              <p className="text-xs text-green-800 mt-0.5">
                Exact field coordinates are encrypted with hardware-grade AES-256-GCM. Exact GPS is never logged, placed in URLs, or shown to anyone except you.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-card bg-status-info-bg border border-status-info/30">
            <ShieldCheck className="w-5 h-5 text-status-info shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-status-info">District-Level Officer Blurring</h4>
              <p className="text-xs text-ink-900 mt-0.5">
                Extension officers only ever receive blurred district-level locations. Revoking a share takes effect immediately on their very next request.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-card bg-status-warning-bg border border-gold-500/40">
            <ShieldAlert className="w-5 h-5 text-gold-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-ink-900">Admin Privacy Boundary</h4>
              <p className="text-xs text-ink-900 mt-0.5">
                Administrators must never read farm records, yields, or photo contents. Admin tools are restricted strictly to user account management and audit metadata.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sand-200">
            <Button
              variant="primary"
              onClick={() => {
                setAgreePrivacy(true);
                setIsPrivacyModalOpen(false);
              }}
            >
              I Understand &amp; Agree
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
