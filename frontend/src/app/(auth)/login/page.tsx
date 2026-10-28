'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error: authError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const isExpired = searchParams.get('expired') === 'true';
  const redirectTarget = searchParams.get('redirect');

  useEffect(() => {
    if (isExpired) {
      setLocalError('Your session has expired. Please log in again to continue.');
    }
  }, [isExpired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      const user = await login({ email, password });

      // Determine redirect destination
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
    } catch {
      // Error is set in store and displayed below
    }
  };

  return (
    <main className="min-h-screen bg-sand-50 text-ink-900 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center gap-2 text-3xl font-extrabold text-green-700">
            <span aria-hidden="true">🌾</span>
            <span>Goviya Plus</span>
          </Link>
          <p className="text-sm text-ink-600">Secure Farm Records &amp; Crop Advisory</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access farm records and advisory tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(localError || authError) && (
              <div className="mb-4">
                <Alert variant="error" onDismiss={() => setLocalError(null)}>
                  {localError || authError}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@goviya.lk"
              />

              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full mt-2"
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-sand-200 text-center text-sm text-ink-600">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold text-green-700 hover:text-green-800 underline">
                Register here
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
