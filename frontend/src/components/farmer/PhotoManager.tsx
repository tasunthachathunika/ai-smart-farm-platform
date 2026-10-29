'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Camera,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Image as ImageIcon,
  CheckCircle,
  FileX,
  UploadCloud,
  Maximize2,
} from 'lucide-react';
import { farmService } from '@/services/farmService';
import { Photo } from '@/types/farm';
import { api, ApiError, normalizeError } from '@/lib/api';
// Dynamically import heavy PhotoUploader component (canvas compression & EXIF stripping)
const PhotoUploader = dynamic(
  () => import('@/components/ui/PhotoUploader').then((mod) => mod.PhotoUploader),
  {
    loading: () => <Skeleton className="h-48 w-full rounded-card" />,
    ssr: false,
  }
);
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export interface PhotoManagerProps {
  plotId: string;
  isPlotShared?: boolean;
  className?: string;
  onPhotoUploaded?: (photo: Photo) => void;
}

/**
 * AuthenticatedImage fetches images via the authorized backend endpoint
 * using httpOnly cookie credentials (withCredentials: true).
 * Converts the secured binary stream to an Object URL and revokes it on unmount.
 */
interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'relative w-full h-full',
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let currentObjectUrl: string | null = null;
    setLoading(true);
    setHasError(false);

    api
      .get(src, {
        responseType: 'blob',
      })
      .then((res) => {
        if (!isMounted) return;
        const contentType = typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : 'image/webp';
        const blob = new Blob([res.data], { type: contentType });
        currentObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(currentObjectUrl);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setHasError(true);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={containerClassName}>
        <Skeleton variant="rectangular" className="w-full h-full rounded-inherit" />
      </div>
    );
  }

  if (hasError || !objectUrl) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 bg-sand-100 text-ink-600 ${containerClassName}`}>
        <FileX className="w-8 h-8 text-sand-400 mb-1" />
        <span className="text-[11px] text-center font-medium">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={objectUrl} alt={alt} className={className} loading="lazy" />
    </div>
  );
};

export const PhotoManager: React.FC<PhotoManagerProps> = ({
  plotId,
  isPlotShared = false,
  className,
  onPhotoUploaded,
}) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Upload state
  const [isUploaderOpen, setIsUploaderOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Active abort controller for upload cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Fetch photos for this plot
  const loadPhotos = useCallback(async () => {
    setIsLoadingPhotos(true);
    setFetchError(null);
    try {
      const res = await farmService.getPlotPhotos(plotId);
      setPhotos(res.data || []);
    } catch (err: unknown) {
      const apiErr = normalizeError(err);
      setFetchError(apiErr.message || 'Failed to load inspection photos.');
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [plotId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Handle Cancel Upload
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    setUploadError('Upload cancelled by user.');
  };

  // Perform the multipart photo upload
  const handleExecuteUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select or capture a photo first.');
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);
    setUploadProgress(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const newPhoto = await farmService.uploadPlotPhoto(plotId, selectedFile, caption, {
        signal: controller.signal,
        onProgress: (percent) => {
          setUploadProgress(percent);
        },
      });

      setUploadSuccess('Inspection photo uploaded and securely processed.');
      setSelectedFile(null);
      setCaption('');
      setUploadProgress(0);
      setIsUploaderOpen(false);

      if (onPhotoUploaded) {
        onPhotoUploaded(newPhoto);
      }

      // Refresh photo gallery
      await loadPhotos();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const status = apiErr?.status;
      const code = apiErr?.code;

      if (controller.signal.aborted) {
        setUploadError('Photo upload was cancelled.');
      } else if (status === 400) {
        setUploadError(
          apiErr.message || 'Invalid photo request. Please verify the photo format and caption.'
        );
      } else if (status === 413 || code === 'FILE_TOO_LARGE' || code === 'PAYLOAD_TOO_LARGE') {
        setUploadError(
          'Photo file size is too large (maximum allowed is 5MB). The image could not be processed.'
        );
      } else if (status === 415 || code === 'UNSUPPORTED_MEDIA_TYPE') {
        setUploadError(
          'Unsupported media format. Only genuine JPEG, PNG, and WebP images are permitted.'
        );
      } else {
        setUploadError(
          apiErr.message || 'Failed to upload photo. Please check your network connection and retry.'
        );
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight' && photos.length > 1) {
        setLightboxIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft' && photos.length > 1) {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : photos.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos.length]);

  const activeLightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Feedback Alerts */}
      {uploadSuccess && (
        <Alert variant="success" onDismiss={() => setUploadSuccess(null)}>
          {uploadSuccess}
        </Alert>
      )}

      {fetchError && (
        <Alert variant="error" onDismiss={() => setFetchError(null)}>
          <div className="flex items-center justify-between gap-4">
            <span>{fetchError}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadPhotos}
              leftIcon={<RotateCw className="w-3.5 h-3.5" />}
              className="min-h-touch text-xs"
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Header with Upload Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-green-700" />
            <span>Inspection Photos</span>
          </h2>
          <p className="text-xs text-ink-600 mt-0.5">
            Sanitized inspection photos (&le;1MB, max 1280px, EXIF stripped). Loaded securely with authorization.
          </p>
        </div>

        <Button
          variant={isUploaderOpen ? 'secondary' : 'primary'}
          onClick={() => {
            setIsUploaderOpen((prev) => !prev);
            setUploadError(null);
          }}
          leftIcon={isUploaderOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          className="min-h-touch"
        >
          {isUploaderOpen ? 'Close Uploader' : 'Add Inspection Photo'}
        </Button>
      </div>

      {/* Upload Form Card */}
      {isUploaderOpen && (
        <Card className="border-2 border-green-200 bg-sand-50/40 p-5 space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base text-green-800 flex items-center gap-2">
              <UploadCloud className="w-5 h-5" />
              <span>Select &amp; Upload Photo</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Client-side compression automatically reduces photos to &le;1MB and 1280px.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 space-y-4">
            {uploadError && (
              <Alert variant="error" onDismiss={() => setUploadError(null)}>
                {uploadError}
              </Alert>
            )}

            {/* Photo Uploader Component */}
            <PhotoUploader
              maxSizeMB={1}
              maxWidthOrHeight={1280}
              disabled={isUploading}
              onFileSelected={(file) => {
                setSelectedFile(file);
                setUploadError(null);
              }}
            />

            {/* Optional Caption Field */}
            {selectedFile && (
              <div className="space-y-3 pt-2 border-t border-sand-200">
                <Input
                  label="Photo Caption (Optional)"
                  placeholder="e.g. Yellowing observed on upper leaves, Sector 3..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={500}
                  helperText={`${caption.length}/500 characters. Max 500 characters.`}
                  disabled={isUploading}
                />

                {/* Upload Progress Bar */}
                {isUploading && (
                  <div className="space-y-1.5" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="flex justify-between text-xs font-semibold text-ink-700">
                      <span>Uploading to secure storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-sand-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-green-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    onClick={handleExecuteUpload}
                    isLoading={isUploading}
                    disabled={isUploading}
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                    className="min-h-touch flex-1"
                  >
                    {isUploading ? `Uploading (${uploadProgress}%)` : 'Confirm & Save Photo'}
                  </Button>

                  {isUploading && (
                    <Button
                      variant="danger"
                      onClick={handleCancelUpload}
                      leftIcon={<X className="w-4 h-4" />}
                      className="min-h-touch"
                    >
                      Cancel Upload
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gallery Section */}
      {isLoadingPhotos ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-card border border-sand-200 bg-white p-3 space-y-3">
              <Skeleton variant="rectangular" className="aspect-video w-full rounded-card" />
              <Skeleton variant="text" width="60%" height={16} />
              <div className="flex justify-between items-center">
                <Skeleton variant="text" width="30%" height={12} />
                <Skeleton variant="rectangular" width={60} height={20} />
              </div>
            </div>
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={ImageIcon}
            title="No Inspection Photos Yet"
            description="Take or upload photos of your plot to visually track crop progress, soil conditions, and pest symptoms."
            action={{
              label: 'Upload First Photo',
              onClick: () => setIsUploaderOpen(true),
              icon: <Plus className="w-4 h-4" />,
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" role="region" aria-label="Photo gallery">
          {photos.map((photo, index) => {
            const formattedDate = new Date(photo.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            const secureThumbnailUrl = `/plots/${plotId}/photos/${photo.id}/file?size=thumb`;

            return (
              <div
                key={photo.id}
                className="group relative rounded-card border border-sand-200 bg-white p-3 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Container with Touch Action */}
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="relative aspect-video w-full rounded-card overflow-hidden bg-sand-200 mb-2.5 focus:outline-none focus:ring-2 focus:ring-green-600 cursor-pointer block min-h-touch"
                    aria-label={`View photo: ${photo.caption || 'Field inspection'}`}
                  >
                    <AuthenticatedImage
                      src={secureThumbnailUrl}
                      alt={photo.caption || 'Plot inspection photo'}
                    />
                    <div className="absolute inset-0 bg-ink-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-2 rounded-full bg-white/90 text-ink-900 shadow-sm">
                        <Maximize2 className="w-4 h-4" />
                      </span>
                    </div>
                  </button>

                  {/* Caption */}
                  <h4
                    className="text-sm font-bold text-ink-900 line-clamp-2"
                    title={photo.caption || 'Untitled Inspection Photo'}
                  >
                    {photo.caption || 'Untitled Inspection Photo'}
                  </h4>
                </div>

                {/* Footer Metadata */}
                <div className="mt-3 pt-2.5 border-t border-sand-100 flex items-center justify-between text-xs text-ink-600">
                  <span>{formattedDate}</span>
                  <Badge
                    variant={isPlotShared ? 'shared' : 'private'}
                    label={isPlotShared ? 'Shared' : 'Private'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightboxPhoto && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo Lightbox"
          className="fixed inset-0 z-50 bg-ink-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6"
        >
          {/* Top Bar with Controls */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                Photo {lightboxIndex + 1} of {photos.length}
              </span>
              <Badge
                variant={isPlotShared ? 'shared' : 'private'}
                label={isPlotShared ? 'Shared with Officer' : 'Private'}
              />
            </div>

            <Button
              variant="secondary"
              onClick={() => setLightboxIndex(null)}
              className="bg-ink-900/60 text-white border-white/20 hover:bg-ink-800 min-h-touch min-w-[48px] p-2"
              aria-label="Close photo preview"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Main Photo Display Area */}
          <div className="relative w-full max-w-4xl max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl bg-ink-900/40">
            {/* Prev Photo Button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null && prev > 0 ? prev - 1 : photos.length - 1
                  )
                }
                className="absolute left-3 z-10 p-3 rounded-full bg-ink-900/70 text-white hover:bg-ink-900 transition-colors min-h-touch min-w-[48px] flex items-center justify-center focus:ring-2 focus:ring-white"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Secure Full Photo Fetcher */}
            <div className="max-w-full max-h-[70vh] flex items-center justify-center p-2">
              <AuthenticatedImage
                src={`/plots/${plotId}/photos/${activeLightboxPhoto.id}/file`}
                alt={activeLightboxPhoto.caption || 'Field inspection full photo'}
                className="max-h-[68vh] max-w-full object-contain rounded-lg"
                containerClassName="relative max-h-[68vh] max-w-full flex items-center justify-center min-w-[280px] min-h-[200px]"
              />
            </div>

            {/* Next Photo Button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null && prev < photos.length - 1 ? prev + 1 : 0
                  )
                }
                className="absolute right-3 z-10 p-3 rounded-full bg-ink-900/70 text-white hover:bg-ink-900 transition-colors min-h-touch min-w-[48px] flex items-center justify-center focus:ring-2 focus:ring-white"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Caption & Metadata Footer */}
          <div className="w-full max-w-4xl text-white mt-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-white">
                {activeLightboxPhoto.caption || 'Untitled Inspection Photo'}
              </p>
              <p className="text-xs text-sand-300">
                Uploaded: {new Date(activeLightboxPhoto.createdAt).toLocaleString()}
                {activeLightboxPhoto.fileSize && (
                  <span> • {(activeLightboxPhoto.fileSize / 1024).toFixed(0)} KB</span>
                )}
                {activeLightboxPhoto.width && activeLightboxPhoto.height && (
                  <span> • {activeLightboxPhoto.width}×{activeLightboxPhoto.height} px</span>
                )}
              </p>
            </div>

            <p className="text-[11px] text-sand-400">
              Use arrow keys <kbd className="px-1 py-0.5 bg-ink-800 rounded">←</kbd>{' '}
              <kbd className="px-1 py-0.5 bg-ink-800 rounded">→</kbd> to navigate,{' '}
              <kbd className="px-1 py-0.5 bg-ink-800 rounded">ESC</kbd> to exit.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
