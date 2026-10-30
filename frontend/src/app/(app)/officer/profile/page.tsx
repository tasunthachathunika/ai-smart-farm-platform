'use client';

import React, { useState, useEffect } from 'react';
import { User, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { BackButton } from '@/components/ui/BackButton';
import { useAuthStore } from '@/store/useAuthStore';

export default function OfficerProfilePage() {
  const { user, updateProfile } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [fullNameError, setFullNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFullName(val);
    if (val.trim().length > 0 && val.trim().length < 2) {
      setFullNameError('Full name must be at least 2 characters');
    } else {
      setFullNameError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setFullNameError('Full name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        fullName: trimmedName,
        phone: phone.trim() || null,
      });
      setSuccessMessage('Profile updated successfully!');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg =
        axiosError?.response?.data?.error?.message ||
        axiosError?.message ||
        'Failed to update profile. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <BackButton fallbackHref="/officer" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Officer Profile</h1>
          <p className="text-sm text-ink-600 mt-0.5">
            View and manage your personal and contact details.
          </p>
        </div>
      </div>

      {successMessage && (
        <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="error" onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-green-700" />
            <CardTitle>Personal Details</CardTitle>
          </div>
          <CardDescription>
            Update your display name and contact phone number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                required
                value={fullName}
                onChange={handleFullNameChange}
                error={fullNameError}
                placeholder="e.g. Ruwan Perera"
                helperText="Minimum 2 characters."
              />

              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +94 77 123 4567"
                helperText="Optional contact number for farmers and colleagues."
              />

              <div className="pt-2 border-t border-sand-200 space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  disabled
                  value={user?.email || ''}
                  helperText="Email cannot be changed directly. Contact support if you need to update it."
                />

                <Input
                  label="Account Role"
                  type="text"
                  disabled
                  value="Agricultural Extension Officer"
                  helperText="Assigned system role."
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

