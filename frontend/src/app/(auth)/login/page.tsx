'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, Eye, EyeOff, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { ApiError } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { BackButton } from '@/components/ui/BackButton';
import { LanguageSwitcher } from '@/components/shell/LanguageSwitcher';
import { useI18n } from '@/i18n';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuthStore();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Discrete error state handling
  const [genericError, setGenericError] = useState<string | null>(null);
  const [lockoutError, setLockoutError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);

  const isExpired = searchParams.get('expired') === 'true';
  const redirectTarget = searchParams.get('redirect');

  // Autofocus on email field on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Display session expiration notification
  useEffect(() => {
    if (isExpired) {
      setGenericError(t('auth.sessionExpiredDescription'));
    }
  }, [isExpired, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenericError(null);
    setLockoutError(null);
    setRateLimitError(null);

    if (!email.trim() || !password) {
      setGenericError('Invalid email or password.');
      return;
    }

    try {
      const user = await login({ email: email.trim(), password });

      // Preserve ?redirect= query param or route to appropriate dashboard
      if (redirectTarget) {
        router.push(redirectTarget);
        return;
      }

      switch (user.role) {
        case 'farmer':
          router.push('/farmer');
          break;
        case 'officer':
          router.push(user.isVerified ? '/officer' : '/officer/verification-pending');
          break;
        case 'admin':
          router.push('/admin');
          break;
        default:
          router.push('/');
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const code = apiErr?.code;

      if (code === 'ACCOUNT_LOCKED') {
        setLockoutError(
          'Your account is temporarily locked due to repeated failed login attempts. Please try again in 15 minutes.'
        );
      } else if (code === 'RATE_LIMITED' || apiErr?.status === 429) {
        const retryAfter = (apiErr?.details as { retryAfter?: string | number })?.retryAfter;
        setRateLimitError(
          retryAfter
            ? `Too many login attempts. Please wait ${retryAfter} second(s) before trying again.`
            : 'Too many requests. Please wait a few moments before trying again.'
        );
      } else if (code === 'ACCOUNT_DEACTIVATED') {
        setGenericError('Account has been deactivated. Please contact an administrator.');
      } else {
        // Generic error on bad credentials (constant time defense per AGENTS.md)
        setGenericError('Invalid email or password.');
      }
    }
  };

  return (
    <main className="min-h-screen bg-sand-50 text-ink-900 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Top bar with back button & language switcher */}
        <div className="flex items-center justify-between">
          <BackButton href="/" variant="ghost" />
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
            <CardTitle className="text-xl">{t('auth.signIn')}</CardTitle>
            <CardDescription>{t('auth.signInSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Account Lockout Alert */}
            {lockoutError && (
              <div className="mb-4">
                <Alert variant="error" title="Account Temporarily Locked" onDismiss={() => setLockoutError(null)}>
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{lockoutError}</span>
                  </div>
                </Alert>
              </div>
            )}

            {/* Rate Limiting 429 Alert */}
            {rateLimitError && (
              <div className="mb-4">
                <Alert variant="warning" title="Rate Limit Exceeded" onDismiss={() => setRateLimitError(null)}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{rateLimitError}</span>
                  </div>
                </Alert>
              </div>
            )}

            {/* Generic Credential Error */}
            {genericError && (
              <div className="mb-4">
                <Alert variant="error" onDismiss={() => setGenericError(null)}>
                  {genericError}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email with AutoFocus */}
              <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="login-email" className="text-sm font-semibold text-ink-900">
                  {t('auth.email')} <span className="text-status-danger" aria-hidden="true">*</span>
                </label>
                <input
                  ref={emailInputRef}
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@goviya.lk"
                  className="w-full min-h-touch px-3.5 py-2.5 rounded-card text-ink-900 bg-white border border-sand-200 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 transition-colors placeholder:text-ink-600/60"
                />
              </div>

              {/* Password with Visibility Toggle */}
              <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="login-password" className="text-sm font-semibold text-ink-900">
                  {t('auth.password')} <span className="text-status-danger" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
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
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full mt-2 font-bold"
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                {t('auth.signIn')}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-sand-200 text-center text-sm text-ink-600">
              <Link href="/register" className="font-bold text-green-700 hover:text-green-800 underline">
                {t('auth.dontHaveAccount')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-sand-50 flex items-center justify-center">
          <div className="text-ink-600 font-semibold">Loading...</div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
