'use client';

import React, { useState, useRef, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { UploadCloud, Camera, X, Image as ImageIcon, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface PhotoUploaderProps {
  onFileSelected?: (file: File) => void;
  onUpload?: (file: File) => Promise<void>;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  className?: string;
  disabled?: boolean;
}

export type UploadStatus = 'idle' | 'validating' | 'compressing' | 'ready' | 'uploading' | 'success' | 'error';

/**
 * Validates file magic bytes to verify genuine JPEG, PNG, or WebP binary content.
 */
async function validateMagicBytes(file: File): Promise<'jpeg' | 'png' | 'webp' | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (!reader.result || typeof reader.result === 'string') {
        return resolve(null);
      }
      const arr = new Uint8Array(reader.result).subarray(0, 12);
      // JPEG: FF D8 FF
      if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
        return resolve('jpeg');
      }
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (
        arr[0] === 0x89 &&
        arr[1] === 0x50 &&
        arr[2] === 0x4e &&
        arr[3] === 0x47 &&
        arr[4] === 0x0d &&
        arr[5] === 0x0a &&
        arr[6] === 0x1a &&
        arr[7] === 0x0a
      ) {
        return resolve('png');
      }
      // WebP: RIFF ... WEBP
      if (
        arr[0] === 0x52 &&
        arr[1] === 0x49 &&
        arr[2] === 0x46 &&
        arr[3] === 0x46 &&
        arr[8] === 0x57 &&
        arr[9] === 0x45 &&
        arr[10] === 0x42 &&
        arr[11] === 0x50
      ) {
        return resolve('webp');
      }
      return resolve(null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onFileSelected,
  onUpload,
  maxSizeMB = 1,
  maxWidthOrHeight = 1280,
  className,
  disabled = false,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cancelRequestedRef = useRef<boolean>(false);

  const resetState = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setProgress(0);
    setErrorMessage(null);
    cancelRequestedRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, [previewUrl]);

  const handleProcessFile = async (rawFile: File) => {
    cancelRequestedRef.current = false;
    setErrorMessage(null);
    setStatus('validating');
    setProgress(10);

    // 1. Verify genuine magic bytes
    const format = await validateMagicBytes(rawFile);
    if (!format) {
      setStatus('error');
      setErrorMessage(
        'Invalid image format. Only authentic JPEG, PNG, and WebP files are supported.'
      );
      return;
    }

    if (cancelRequestedRef.current) {
      resetState();
      return;
    }

    // 2. Client-side compression
    setStatus('compressing');
    setProgress(30);

    try {
      const options = {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
        onProgress: (p: number) => {
          if (!cancelRequestedRef.current) {
            // scale 30% to 80%
            setProgress(Math.round(30 + p * 0.5));
          }
        },
      };

      const compressed = await imageCompression(rawFile, options);

      if (cancelRequestedRef.current) {
        resetState();
        return;
      }

      // Final size check: must be <= maxSizeMB (1MB)
      if (compressed.size > maxSizeMB * 1024 * 1024) {
        setStatus('error');
        setErrorMessage(
          `Compressed image size (${(compressed.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of ${maxSizeMB} MB.`
        );
        return;
      }

      const preview = URL.createObjectURL(compressed);
      setFile(compressed);
      setPreviewUrl(preview);
      setProgress(100);
      setStatus('ready');

      if (onFileSelected) {
        onFileSelected(compressed);
      }
    } catch (err) {
      if (cancelRequestedRef.current) {
        resetState();
        return;
      }
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to compress and process the image.'
      );
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (disabled || !files || files.length === 0) return;
    const selected = files[0];
    handleProcessFile(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleUploadClick = async () => {
    if (!file || !onUpload || disabled) return;
    setStatus('uploading');
    try {
      await onUpload(file);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Upload failed. Please check your connection and retry.'
      );
    }
  };

  const handleCancel = () => {
    cancelRequestedRef.current = true;
    resetState();
  };

  return (
    <div className={cn('w-full flex flex-col gap-3', className)}>
      {/* Hidden native inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || status === 'compressing' || status === 'uploading'}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || status === 'compressing' || status === 'uploading'}
      />

      {/* Main Drag-Drop Area */}
      {!previewUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center p-6 md:p-8 rounded-card border-2 border-dashed transition-all duration-200 text-center',
            isDragOver
              ? 'border-green-600 bg-green-50'
              : 'border-sand-200 bg-white hover:border-green-600 hover:bg-sand-50/50',
            disabled && 'opacity-60 cursor-not-allowed pointer-events-none'
          )}
        >
          <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center text-green-700 mb-3" aria-hidden="true">
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-base font-bold text-ink-900 mb-1">
            Drag and drop your photo here, or browse
          </p>
          <p className="text-xs text-ink-600 mb-4">
            Supports JPEG, PNG, and WebP (Max 1280px, auto-compressed to &le; 1 MB)
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-xs">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<ImageIcon className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex-1 min-w-[120px]"
            >
              Browse File
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Camera className="w-4 h-4" />}
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled}
              className="flex-1 min-w-[120px]"
            >
              Take Photo
            </Button>
          </div>
        </div>
      ) : (
        /* Preview Card */
        <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-card border border-sand-200 bg-white shadow-card">
          <div className="relative w-28 h-28 shrink-0 rounded-card overflow-hidden bg-sand-100 border border-sand-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Uploaded farm preview"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="text-sm font-bold text-ink-900 truncate">
                {file?.name || 'Photo ready'}
              </h4>
              <button
                type="button"
                onClick={handleCancel}
                aria-label="Remove photo"
                className="p-1 rounded-card text-ink-600 hover:text-ink-900 hover:bg-sand-200 min-h-touch min-w-touch flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-ink-600 mb-3">
              Size: {file ? (file.size / 1024).toFixed(1) : 0} KB
            </p>

            {status === 'ready' && onUpload && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleUploadClick}
                disabled={disabled}
              >
                Upload Photo
              </Button>
            )}

            {status === 'success' && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-status-success">
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                <span>Uploaded successfully</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar & Status */}
      {(status === 'validating' || status === 'compressing' || status === 'uploading') && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-1.5 p-3 rounded-card bg-sand-50 border border-sand-200"
        >
          <div className="flex items-center justify-between text-xs text-ink-900 font-semibold">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-green-600" aria-hidden="true" />
              {status === 'validating' && 'Verifying image authenticity...'}
              {status === 'compressing' && 'Compressing photo (max 1280px, &le;1MB)...'}
              {status === 'uploading' && 'Uploading photo to server...'}
            </span>
            <span>{progress}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-sand-200 overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs font-medium text-ink-600 hover:text-status-danger underline min-h-[32px] px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {status === 'error' && errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 rounded-card bg-status-danger-bg border border-status-danger/30 text-status-danger text-xs font-medium"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">{errorMessage}</div>
          <button
            type="button"
            onClick={resetState}
            className="text-xs font-bold underline shrink-0 hover:text-red-900 ml-1 min-h-[32px]"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

PhotoUploader.displayName = 'PhotoUploader';
