'use client';

import React from 'react';
import { Camera } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { PhotoUploader } from '@/components/ui/PhotoUploader';

export default function FarmerPhotosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Crop &amp; Field Photos</h1>
        <p className="text-sm text-ink-600 mt-1">
          Upload authentic field photos. All EXIF metadata is sanitized on upload. Max 1280px, &le;1MB.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-green-700" />
            <CardTitle>Upload Inspection Photo</CardTitle>
          </div>
          <CardDescription>
            Images are validated by binary magic bytes (JPEG, PNG, WebP) and compressed client-side.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoUploader
            onFileSelected={(file) => {
              console.log('Selected:', file.name);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
