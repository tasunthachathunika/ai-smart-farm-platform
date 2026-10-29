'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Plus,
  Search,
  Navigation,
  Edit2,
  Trash2,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { farmService } from '@/services/farmService';
import { Plot, Field, CreatePlotInput } from '@/types/farm';
import { ApiError } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackButton } from '@/components/ui/BackButton';

const SRI_LANKA_DISTRICTS = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
];

export default function FarmerPlotsPage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlots, setTotalPlots] = useState(0);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [fieldName, setFieldName] = useState('');
  const [plotFieldId, setPlotFieldId] = useState('');
  const [district, setDistrict] = useState('Anuradhapura');
  const [areaHa, setAreaHa] = useState('1.5');
  const [soilType, setSoilType] = useState('Red-Yellow Podzolic');
  const [irrigationSource, setIrrigationSource] = useState('Canal Irrigation');
  const [latitude, setLatitude] = useState('8.3114');
  const [longitude, setLongitude] = useState('80.4037');
  const [isLocating, setIsLocating] = useState(false);

  // Delete confirmation modal state
  const [deletingPlot, setDeletingPlot] = useState<Plot | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await farmService.getPlots({
        page: currentPage,
        limit: 9,
        q: searchQuery.trim() || undefined,
        district: selectedDistrict || undefined,
      });
      setPlots(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalPlots(res.pagination?.total || 0);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || 'Failed to load farm plots. Please retry.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, selectedDistrict]);

  useEffect(() => {
    fetchPlots();
  }, [fetchPlots]);

  useEffect(() => {
    farmService.getFields().then(setFields).catch(() => setFields([]));
  }, []);

  const openCreateModal = () => {
    setEditingPlot(null);
    setFieldName('');
    setPlotFieldId('');
    setDistrict('Anuradhapura');
    setAreaHa('1.5');
    setSoilType('Red-Yellow Podzolic');
    setIrrigationSource('Canal Irrigation');
    setLatitude('8.3114');
    setLongitude('80.4037');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (plot: Plot) => {
    setEditingPlot(plot);
    setFieldName(plot.name);
    setPlotFieldId(plot.fieldId || '');
    setDistrict(plot.district);
    setAreaHa(plot.areaHa.toString());
    setSoilType(plot.soilType || '');
    setIrrigationSource(plot.irrigationSource || '');
    setLatitude(plot.gps ? plot.gps.latitude.toString() : '8.3114');
    setLongitude(plot.gps ? plot.gps.longitude.toString() : '80.4037');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Browser Geolocation API
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setFormError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      (geoErr) => {
        setIsLocating(false);
        setFormError(`Unable to retrieve GPS: ${geoErr.message}. You can enter coordinates manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedArea = parseFloat(areaHa);
    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);

    if (!fieldName.trim()) {
      setFormError('Plot name is required.');
      return;
    }

    if (isNaN(parsedArea) || parsedArea <= 0) {
      setFormError('Area must be a valid positive number in hectares.');
      return;
    }

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setFormError('Latitude must be between -90 and 90.');
      return;
    }

    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setFormError('Longitude must be between -180 and 180.');
      return;
    }

    setIsSubmitting(true);
    try {
      // GPS strictly in request body, never in URL or logs
      const plotInput: CreatePlotInput = {
        name: fieldName.trim(),
        district,
        areaHa: parsedArea,
        soilType: soilType.trim() || undefined,
        irrigationSource: irrigationSource.trim() || undefined,
        fieldId: plotFieldId || undefined,
        gps: {
          latitude: parsedLat,
          longitude: parsedLng,
        },
      };

      if (editingPlot) {
        await farmService.updatePlot(editingPlot.id, plotInput);
        setSuccessMessage(`Plot "${fieldName}" updated successfully.`);
      } else {
        await farmService.createPlot(plotInput);
        setSuccessMessage(`Plot "${fieldName}" registered with AES-256 encrypted GPS.`);
      }

      setIsModalOpen(false);
      fetchPlots();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setFormError(apiErr?.message || 'Failed to save plot. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPlot) return;
    setIsDeleting(true);
    try {
      await farmService.deletePlot(deletingPlot.id);
      setSuccessMessage(`Plot "${deletingPlot.name}" deleted.`);
      setDeletingPlot(null);
      fetchPlots();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || 'Failed to delete plot.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/farmer" />
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Farm Plots</h1>
          <p className="text-sm text-ink-600 mt-1">
            Maintain your field plots, soil profiles, and hardware-encrypted GPS boundaries.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Register New Plot
        </Button>
      </div>

      {successMessage && (
        <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          <div className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <button type="button" onClick={fetchPlots} className="text-xs font-bold underline">
              Retry
            </button>
          </div>
        </Alert>
      )}

      {/* Search & District Filter Bar */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Search plots by name or soil type..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-card border border-sand-200 bg-white text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 min-h-touch"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by District"
              className="w-full px-3 py-2 text-sm rounded-card border border-sand-200 bg-white text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 min-h-touch"
            >
              <option value="">All 25 Districts</option>
              {SRI_LANKA_DISTRICTS.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton variant="rectangular" width="100%" height={180} />
          <Skeleton variant="rectangular" width="100%" height={180} />
          <Skeleton variant="rectangular" width="100%" height={180} />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && plots.length === 0 && (
        <Card className="p-8">
          <EmptyState
            icon={MapPin}
            title={searchQuery || selectedDistrict ? 'No Matching Plots' : 'No Plots Registered'}
            description={
              searchQuery || selectedDistrict
                ? 'No plots match your active search or district filters. Try adjusting your query.'
                : 'Register your first agricultural plot to track crop cycles, inputs, harvests, and weather telemetry.'
            }
            action={
              !searchQuery && !selectedDistrict
                ? {
                    label: 'Register First Plot',
                    icon: <Plus className="w-4 h-4" />,
                    onClick: openCreateModal,
                  }
                : undefined
            }
          />
        </Card>
      )}

      {/* Plot Grid Cards */}
      {!isLoading && plots.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-ink-600">
            <span>
              Showing {plots.length} of {totalPlots} total plot(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plots.map((plot) => (
              <Card key={plot.id} className="hover:border-green-600 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base text-ink-900 truncate">{plot.name}</h3>
                    {plot.isShared ? (
                      <Badge variant="shared" size="sm" />
                    ) : (
                      <Badge variant="private" size="sm" />
                    )}
                  </div>

                  <p className="text-xs text-ink-600 mb-3">
                    District: <strong>{plot.district}</strong> • {plot.areaHa} ha
                  </p>

                  <div className="p-3 rounded bg-sand-50 border border-sand-200 text-xs text-ink-900 space-y-1.5">
                    {plot.soilType && (
                      <div className="flex justify-between">
                        <span className="text-ink-600">Soil Type:</span>
                        <span className="font-medium">{plot.soilType}</span>
                      </div>
                    )}
                    {plot.irrigationSource && (
                      <div className="flex justify-between">
                        <span className="text-ink-600">Irrigation:</span>
                        <span className="font-medium">{plot.irrigationSource}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-sand-200/60">
                      <span className="text-ink-600">GPS Privacy:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-green-700">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>AES-256 Encrypted</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-sand-200 flex items-center justify-between gap-2">
                  <Link
                    href={`/farmer/plots/${plot.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 min-h-touch py-1"
                  >
                    <span>View Journal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(plot)}
                      aria-label={`Edit ${plot.name}`}
                      className="p-2 rounded-card text-ink-600 hover:text-ink-900 hover:bg-sand-100 min-h-touch min-w-touch flex items-center justify-center transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingPlot(plot)}
                      aria-label={`Delete ${plot.name}`}
                      className="p-2 rounded-card text-status-danger hover:bg-status-danger-bg min-h-touch min-w-touch flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="p-2 rounded-card border border-sand-200 bg-white text-ink-900 hover:bg-sand-100 disabled:opacity-40 min-h-touch min-w-touch flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-xs font-semibold px-3 py-1 bg-white border border-sand-200 rounded-card">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
                className="p-2 rounded-card border border-sand-200 bg-white text-ink-900 hover:bg-sand-100 disabled:opacity-40 min-h-touch min-w-touch flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Plot Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlot ? `Edit Plot: ${editingPlot.name}` : 'Register New Plot'}
        description="Exact GPS coordinates are encrypted on disk with AES-256-GCM. Officers only see district-level centroids."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
          {formError && (
            <Alert variant="error" onDismiss={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          <Input
            label="Plot Name"
            required
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="e.g. Mahaweli North Acre 1"
          />

          {fields.length > 0 && (
            <Select
              label="Associated Farm Field (Optional)"
              value={plotFieldId}
              onChange={(e) => setPlotFieldId(e.target.value)}
              options={[
                { value: '', label: 'None (Standalone Plot)' },
                ...fields.map((f) => ({ value: f.id, label: `${f.name} (${f.district})` })),
              ]}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="District"
              required
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              options={SRI_LANKA_DISTRICTS.map((d) => ({ value: d, label: d }))}
              helperText="Determines weather and extension officer region"
            />

            <Input
              label="Area in Hectares (ha)"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={areaHa}
              onChange={(e) => setAreaHa(e.target.value)}
              placeholder="1.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Soil Type"
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              options={[
                { value: 'Red-Yellow Podzolic', label: 'Red-Yellow Podzolic' },
                { value: 'Reddish Brown Earths', label: 'Reddish Brown Earths' },
                { value: 'Low Humic Gley', label: 'Low Humic Gley' },
                { value: 'Alluvial Soils', label: 'Alluvial Soils' },
                { value: 'Sandy Regosols', label: 'Sandy Regosols' },
                { value: 'Noncalcic Brown', label: 'Noncalcic Brown' },
              ]}
            />

            <Select
              label="Irrigation Source"
              value={irrigationSource}
              onChange={(e) => setIrrigationSource(e.target.value)}
              options={[
                { value: 'Canal Irrigation', label: 'Major Irrigation / Canal' },
                { value: 'Minor Tank', label: 'Minor Village Tank' },
                { value: 'Rainfed', label: 'Rainfed (Seasonal)' },
                { value: 'Agro-well', label: 'Agro-well / Tube-well' },
                { value: 'River Lift', label: 'River Lift' },
              ]}
            />
          </div>

          {/* GPS Coordinates & Privacy Notice */}
          <div className="p-3.5 rounded-card bg-sand-50 border border-sand-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-green-700" />
                <span>GPS Coordinates</span>
              </span>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 disabled:opacity-50"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Acquiring GPS...' : 'Use My Location'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Latitude"
                type="number"
                step="0.000001"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="8.3114"
              />
              <Input
                label="Longitude"
                type="number"
                step="0.000001"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="80.4037"
              />
            </div>

            <p className="text-[11px] text-ink-600 leading-relaxed">
              <strong>GPS Privacy Notice:</strong> Your exact coordinates are encrypted and private. Officers only see your district. Exact GPS coordinates are never placed in URLs, logs, or shared with AI services.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-sand-200">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingPlot ? 'Save Changes' : 'Register Plot'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingPlot && (
        <Modal
          isOpen={!!deletingPlot}
          onClose={() => setDeletingPlot(null)}
          title="Delete Farm Plot"
          description="Are you sure you want to delete this plot?"
        >
          <div className="space-y-4 py-2">
            <Alert variant="warning">
              Deleting plot <strong>{deletingPlot.name}</strong> will also permanently archive associated crop cycles, activity logs, input records, and photos. This action cannot be undone.
            </Alert>
            <div className="flex justify-end gap-3 pt-3 border-t border-sand-200">
              <Button type="button" variant="ghost" onClick={() => setDeletingPlot(null)}>
                Keep Plot
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={isDeleting}
                onClick={handleDelete}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
