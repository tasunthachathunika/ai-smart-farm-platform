'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';

interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  status: string;
}

const auditData: AuditEvent[] = [
  {
    id: 'AUD-901',
    action: 'plot_viewed_by_officer',
    actor: 'Officer K. Bandara (ID #42)',
    timestamp: '2026-10-28 09:14:22',
    status: 'AUTHORIZED',
  },
  {
    id: 'AUD-892',
    action: 'share_granted',
    actor: 'You (Owner)',
    timestamp: '2026-10-26 14:02:11',
    status: 'COMPLETED',
  },
];

export default function FarmerAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">My Privacy &amp; Access Audit Journal</h1>
        <p className="text-sm text-ink-600 mt-1">
          Immutable audit record of every access, grant, and view performed on your farm data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-green-700" />
            <CardTitle>Security Events Log</CardTitle>
          </div>
          <CardDescription>
            You see exclusively your own audit records. Admins never receive private log contents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            data={auditData}
            keyExtractor={(item) => item.id}
            columns={[
              { key: 'id', header: 'Audit ID' },
              { key: 'action', header: 'Action Code' },
              { key: 'actor', header: 'Actor' },
              { key: 'timestamp', header: 'Timestamp (UTC+5:30)' },
              {
                key: 'status',
                header: 'Status',
                render: (item) => (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                    {item.status}
                  </span>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
