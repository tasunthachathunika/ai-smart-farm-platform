'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/types/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error: authError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('farmer');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!fullName || !email || !password) {
      setLocalError('Please complete all required fields.');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }

    try {
      const user = await register({
        fullName,
        email,
        password,
        role,
        phone: phone || undefined,
      });

      if (user.role === 'officer') {
        router.push('/officer/verification-pending');
      } else {
        router.push('/farmer');
      }
    } catch {
      // Handled via store
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
          <p className="text-sm text-ink-600">Create your smart agriculture account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create Account</CardTitle>
            <CardDescription>
              Register as a farmer to track your crops, or as an extension officer to advise farmers.
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
                label="Full Name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Sunil Perera"
              />

              <Input
                label="Email Address"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sunil@goviya.lk"
              />

              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Must be at least 8 characters"
              />

              <Input
                label="Phone Number (Optional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+94 77 123 4567"
              />

              <Select
                label="Account Role"
                required
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                options={[
                  { value: 'farmer', label: 'Farmer (Manage Plots & Cycles)' },
                  { value: 'officer', label: 'Agricultural Extension Officer' },
                ]}
              />

              {role === 'officer' && (
                <div className="p-3 rounded-card bg-status-warning-bg border border-gold-500/30 text-xs text-ink-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-gold-700 shrink-0 mt-0.5" />
                  <span>
                    Officer accounts require manual administrative verification before receiving shared plot records.
                  </span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full mt-2"
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Complete Registration
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-sand-200 text-center text-sm text-ink-600">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-green-700 hover:text-green-800 underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
