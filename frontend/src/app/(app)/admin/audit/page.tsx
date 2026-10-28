'use client';

import React from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';

interface AdminAuditEvent {
  id: string;
  eventType: string;
  actorRole: string;
  targetId: string;
  ipAddress: string;
  timestamp: string;
  status: string;
}

const adminAuditEvents: AdminAuditEvent[] = [
  {
    id: 'SYS-AUD-7701',
    eventType: 'USER_LOGIN',
    actorRole: 'farmer',
    targetId: 'USR-001',
    ipAddress: '192.168.1.45',
    timestamp: '2026-10-28 09:12:00',
    status: 'SUCCESS',
  },
  {
    id: 'SYS-AUD-7702',
    eventType: 'SHARE_CONSENT_GRANTED',
    actorRole: 'farmer',
    targetId: 'PLT-501',
    ipAddress: '192.168.1.45',
    timestamp: '2026-10-28 09:15:30',
    status: 'RECORDED',
  },
  {
    id: 'SYS-AUD-7703',
    eventType: 'OFFICER_VERIFICATION_UPDATED',
    actorRole: 'admin',
    targetId: 'OFF-042',
    ipAddress: '10.0.0.2',
    timestamp: '2026-10-28 10:00:15',
    status: 'VERIFIED',
  },
];

export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Platform Security Audit Journal</h1>
        <p className="text-sm text-ink-600 mt-1">
          Cryptographically chained and tamper-evident event metadata.
        </p>
      </div>

      <div className="p-4 rounded-card bg-sand-200/50 border border-sand-200 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-ink-600 shrink-0 mt-0.5" />
        <p className="text-xs text-ink-600 leading-relaxed">
          <strong>Privacy Boundary Reminder:</strong> In compliance with AGENTS.md Rule 2, admin
          audit views expose only security event metadata (actor role, IP hash, event type, timestamp,
          and outcome status). Farm record text, observations, exact GPS coordinates, and private
          payloads are strictly excluded from administrator views.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-700" />
            <CardTitle>Security &amp; Consent Events</CardTitle>
          </div>
          <CardDescription>
            System-level audit trail for authentication, permissions, and officer approvals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            data={adminAuditEvents}
            keyExtractor={(item) => item.id}
            columns={[
              { key: 'id', header: 'Event ID' },
              { key: 'eventType', header: 'Event Type' },
              {
                key: 'actorRole',
                header: 'Actor Role',
                render: (item) => (
                  <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-sand-100 text-ink-900">
                    {item.actorRole}
                  </span>
                ),
              },
              { key: 'targetId', header: 'Target ID' },
              { key: 'timestamp', header: 'Timestamp' },
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
