'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onSessionExpired } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export const SessionExpiredModal: React.FC = () => {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setIsOpen(true);
    });
    return unsubscribe;
  }, []);

  const handleReLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await login({ email, password });
      setIsOpen(false);
      setPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedirect = () => {
    setIsOpen(false);
    router.push('/login?expired=true');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // User must either re-login or navigate to login
      title="Session Expired"
      description="Your secure session has expired. Please authenticate to continue."
    >
      <form onSubmit={handleReLogin} className="space-y-4 py-2">
        <Alert variant="warning">
          To protect farm records, sessions expire after inactivity. Re-authenticate below to continue without losing your view.
        </Alert>

        {errorMessage && (
          <Alert variant="error" onDismiss={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        <Input
          label="Email Address"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@goviya.lk"
        />

        <Input
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-sand-200">
          <Button
            type="button"
            variant="ghost"
            onClick={handleRedirect}
            className="flex-1 order-2 sm:order-1"
          >
            Go to Login Page
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="flex-1 order-1 sm:order-2"
          >
            Authenticate
          </Button>
        </div>
      </form>
    </Modal>
  );
};
