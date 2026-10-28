'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';

interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

const sampleUsers: AdminUserRow[] = [
  {
    id: 'USR-001',
    fullName: 'Sunil Jayawardena',
    email: 'sunil@goviya.lk',
    role: 'farmer',
    isVerified: true,
    createdAt: '2026-10-20',
  },
  {
    id: 'USR-002',
    fullName: 'Kamal Bandara',
    email: 'k.bandara@doa.gov.lk',
    role: 'officer',
    isVerified: true,
    createdAt: '2026-10-21',
  },
  {
    id: 'USR-003',
    fullName: 'Nimali Silva',
    email: 'nimali@doa.gov.lk',
    role: 'officer',
    isVerified: false,
    createdAt: '2026-10-27',
  },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">User Account Administration</h1>
        <p className="text-sm text-ink-600 mt-1">
          Registered farmers, extension officers, and platform operators.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-700" />
            <CardTitle>Accounts Registry</CardTitle>
          </div>
          <CardDescription>
            Admin access is limited to identity management and metadata per AGENTS.md.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            data={sampleUsers}
            keyExtractor={(item) => item.id}
            columns={[
              { key: 'id', header: 'User ID' },
              { key: 'fullName', header: 'Full Name' },
              { key: 'email', header: 'Email Address' },
              {
                key: 'role',
                header: 'Role',
                render: (item) => (
                  <span className="capitalize font-semibold text-ink-900">{item.role}</span>
                ),
              },
              {
                key: 'isVerified',
                header: 'Status',
                render: (item) => (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      item.isVerified
                        ? 'bg-status-success-bg text-status-success'
                        : 'bg-status-warning-bg text-status-warning'
                    }`}
                  >
                    {item.isVerified ? 'Verified' : 'Pending'}
                  </span>
                ),
              },
              { key: 'createdAt', header: 'Registration Date' },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
