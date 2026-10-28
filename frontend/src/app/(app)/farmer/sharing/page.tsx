'use client';

import React, { useState } from 'react';
import { Share2, Plus, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConsentToggle } from '@/components/ui/ConsentToggle';

export default function FarmerSharingPage() {
  const [allowGlobalShare, setAllowGlobalShare] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Officer Record Sharing</h1>
          <p className="text-sm text-ink-600 mt-1">
            Grant temporary, revocable access to certified agricultural extension officers.
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          Grant New Officer Share
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-green-700" />
            <CardTitle>Active Officer Shares</CardTitle>
          </div>
          <CardDescription>
            Officers only receive blurred district-level locations. Revocation takes effect on their very next request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ConsentToggle
            title="Active Share with Extension Officer: K. Bandara"
            helperText="Officer is verified by the Department of Agriculture. Scope: View crop logs & leave advisory notes."
            checked={allowGlobalShare}
            onChange={setAllowGlobalShare}
          />

          <div className="flex items-center gap-2 text-xs text-ink-600 pt-2">
            <ShieldCheck className="w-4 h-4 text-green-700" />
            <span>All share grants, revocations, and officer views are logged atomically in your audit journal.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
