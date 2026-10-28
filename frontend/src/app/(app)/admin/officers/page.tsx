'use client';

import React from 'react';
import { UserCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';

interface OfficerApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  isVerified: boolean;
  appliedDate: string;
}

const officerApplications: OfficerApplication[] = [
  {
    id: 'OFF-101',
    fullName: 'Nimali Silva',
    email: 'nimali@doa.gov.lk',
    phone: '+94 77 987 6543',
    isVerified: false,
    appliedDate: '2026-10-27',
  },
  {
    id: 'OFF-042',
    fullName: 'Kamal Bandara',
    email: 'k.bandara@doa.gov.lk',
    phone: '+94 71 555 4321',
    isVerified: true,
    appliedDate: '2026-10-21',
  },
];

export default function AdminOfficersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Officer Verification Management</h1>
        <p className="text-sm text-ink-600 mt-1">
          Approve or revoke extension officer credentials before they may receive farmer shares.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-700" />
            <CardTitle>Extension Officer Verification Roster</CardTitle>
          </div>
          <CardDescription>
            Unverified officers return 404 when attempting to query or receive plot records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            data={officerApplications}
            keyExtractor={(item) => item.id}
            columns={[
              { key: 'id', header: 'Officer ID' },
              { key: 'fullName', header: 'Officer Name' },
              { key: 'email', header: 'Gov Email' },
              { key: 'phone', header: 'Phone' },
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
                    {item.isVerified ? 'Active Verified' : 'Pending Verification'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Admin Actions',
                render: (item) =>
                  item.isVerified ? (
                    <Button variant="danger" size="sm">
                      Suspend Officer
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm">
                      Approve &amp; Verify
                    </Button>
                  ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
