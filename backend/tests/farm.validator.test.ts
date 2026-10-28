import {
  createFieldSchema,
  updateFieldSchema,
  fieldQuerySchema,
  createPlotSchema,
  updatePlotSchema,
  plotQuerySchema,
  createCropCycleSchema,
  updateCropCycleSchema,
  cropCycleQuerySchema,
  createActivityLogSchema,
  updateActivityLogSchema,
  activityLogQuerySchema,
  createInputApplicationSchema,
  updateInputApplicationSchema,
  inputApplicationQuerySchema,
  createHarvestSchema,
  updateHarvestSchema,
  harvestQuerySchema,
} from '../src/validators/farm.validator';

describe('Farm Zod Validators Suite', () => {
  describe('Field Schemas', () => {
    it('validates a valid create field payload', () => {
      const valid = {
        name: 'North Paddy Sector',
        district: 'Polonnaruwa',
        description: 'Irrigated paddy field',
      };
      const parsed = createFieldSchema.parse(valid);
      expect(parsed.name).toBe('North Paddy Sector');
      expect(parsed.district).toBe('Polonnaruwa');
    });

    it('rejects field name shorter than 2 characters', () => {
      expect(() =>
        createFieldSchema.parse({
          name: 'N',
          district: 'Polonnaruwa',
        }),
      ).toThrow();
    });

    it('allows partial update of field', () => {
      const parsed = updateFieldSchema.parse({ description: 'Updated notes' });
      expect(parsed.description).toBe('Updated notes');
      expect(parsed.name).toBeUndefined();
    });

    it('parses valid field query params', () => {
      const query = fieldQuerySchema.parse({ page: '2', limit: '20', district: 'Kandy' });
      expect(query.page).toBe(2);
      expect(query.limit).toBe(20);
      expect(query.district).toBe('Kandy');
    });
  });

  describe('Plot Schemas', () => {
    const validPlot = {
      name: 'Plot A1',
      district: 'Anuradhapura',
      areaHa: 2.5,
      gps: { latitude: 8.3114, longitude: 80.4037 },
      soilType: 'Reddish Brown Earth',
      irrigationSource: 'Canal',
    };

    it('validates a valid create plot payload with GPS', () => {
      const parsed = createPlotSchema.parse(validPlot);
      expect(parsed.name).toBe('Plot A1');
      expect(parsed.areaHa).toBe(2.5);
      expect(parsed.gps.latitude).toBe(8.3114);
    });

    it('rejects areaHa <= 0', () => {
      expect(() => createPlotSchema.parse({ ...validPlot, areaHa: 0 })).toThrow();
      expect(() => createPlotSchema.parse({ ...validPlot, areaHa: -1.5 })).toThrow();
    });

    it('rejects out of bounds latitude or longitude', () => {
      expect(() =>
        createPlotSchema.parse({
          ...validPlot,
          gps: { latitude: 95.0, longitude: 80.4 },
        }),
      ).toThrow();

      expect(() =>
        createPlotSchema.parse({
          ...validPlot,
          gps: { latitude: 8.3, longitude: 185.0 },
        }),
      ).toThrow();
    });

    it('validates partial updates on plot', () => {
      const parsed = updatePlotSchema.parse({ areaHa: 3.2 });
      expect(parsed.areaHa).toBe(3.2);
    });

    it('validates plot query filters', () => {
      const query = plotQuerySchema.parse({ district: 'Anuradhapura', page: '1' });
      expect(query.district).toBe('Anuradhapura');
    });
  });

  describe('Crop Cycle Schemas', () => {
    const validCycle = {
      plotId: '123e4567-e89b-12d3-a456-426614174000',
      cropName: 'BG 352 Paddy',
      variety: 'BG 352',
      startDate: '2026-05-01',
      endDate: '2026-08-30',
      status: 'planned' as const,
      estimatedYieldKg: 4500,
    };

    it('validates valid crop cycle with endDate >= startDate', () => {
      const parsed = createCropCycleSchema.parse(validCycle);
      expect(parsed.cropName).toBe('BG 352 Paddy');
      expect(parsed.status).toBe('planned');
    });

    it('rejects endDate earlier than startDate', () => {
      expect(() =>
        createCropCycleSchema.parse({
          ...validCycle,
          startDate: '2026-06-01',
          endDate: '2026-05-01',
        }),
      ).toThrow();
    });

    it('accepts cycle without endDate', () => {
      const cycleWithoutEnd = { ...validCycle };
      delete (cycleWithoutEnd as Partial<typeof validCycle>).endDate;
      const parsed = createCropCycleSchema.parse(cycleWithoutEnd);
      expect(parsed.endDate).toBeUndefined();
    });

    it('rejects invalid date format', () => {
      expect(() =>
        createCropCycleSchema.parse({
          ...validCycle,
          startDate: '01-05-2026',
        }),
      ).toThrow();
    });

    it('validates update crop cycle schema with date refinement', () => {
      expect(() =>
        updateCropCycleSchema.parse({
          startDate: '2026-07-01',
          endDate: '2026-06-01',
        }),
      ).toThrow();

      const validUpdate = updateCropCycleSchema.parse({ status: 'completed' });
      expect(validUpdate.status).toBe('completed');
    });

    it('validates crop cycle query filters', () => {
      const query = cropCycleQuerySchema.parse({ status: 'active', cropName: 'Paddy' });
      expect(query.status).toBe('active');
      expect(query.cropName).toBe('Paddy');
    });
  });

  describe('Activity Log Schemas', () => {
    const validLog = {
      cycleId: '123e4567-e89b-12d3-a456-426614174000',
      logType: 'fertilizer' as const,
      logDate: '2026-05-15',
      notes: 'Applied organic compost evenly across ridges',
    };

    it('validates activity log creation', () => {
      const parsed = createActivityLogSchema.parse(validLog);
      expect(parsed.logType).toBe('fertilizer');
      expect(parsed.notes).toContain('organic compost');
    });

    it('validates partial update of activity log', () => {
      const parsed = updateActivityLogSchema.parse({ notes: 'Updated notes' });
      expect(parsed.notes).toBe('Updated notes');
    });

    it('rejects unknown log type', () => {
      expect(() =>
        createActivityLogSchema.parse({
          ...validLog,
          logType: 'space_travel' as unknown as 'general',
        }),
      ).toThrow();
    });

    it('rejects short notes less than 2 chars', () => {
      expect(() =>
        createActivityLogSchema.parse({
          ...validLog,
          notes: 'x',
        }),
      ).toThrow();
    });

    it('parses activity log query filters with type, date, date range, and q', () => {
      const query = activityLogQuerySchema.parse({
        type: 'irrigation',
        date: '2026-05-15',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
        q: 'compost',
      });
      expect(query.type).toBe('irrigation');
      expect(query.date).toBe('2026-05-15');
      expect(query.startDate).toBe('2026-05-01');
      expect(query.endDate).toBe('2026-05-31');
      expect(query.q).toBe('compost');
    });
  });

  describe('Input Application Schemas (free-text product, no AI recommendations)', () => {
    const validInput = {
      cycleId: '123e4567-e89b-12d3-a456-426614174000',
      inputType: 'fertilizer' as const,
      name: 'Locally Sourced Organic Vermicompost',
      quantity: 50.0,
      unit: 'kg',
      applicationDate: '2026-05-20',
      cost: 4500.0,
    };

    it('validates input application with free-text product name', () => {
      const parsed = createInputApplicationSchema.parse(validInput);
      expect(parsed.name).toBe('Locally Sourced Organic Vermicompost');
      expect(parsed.quantity).toBe(50.0);
    });

    it('rejects non-positive quantity', () => {
      expect(() =>
        createInputApplicationSchema.parse({
          ...validInput,
          quantity: 0,
        }),
      ).toThrow();

      expect(() =>
        createInputApplicationSchema.parse({
          ...validInput,
          quantity: -5,
        }),
      ).toThrow();
    });

    it('allows partial update of input application', () => {
      const parsed = updateInputApplicationSchema.parse({ cost: 5000 });
      expect(parsed.cost).toBe(5000);
    });

    it('validates input application query filters', () => {
      const query = inputApplicationQuerySchema.parse({ type: 'seed', q: 'vermi' });
      expect(query.type).toBe('seed');
      expect(query.q).toBe('vermi');
    });
  });

  describe('Harvest Schemas', () => {
    const validHarvest = {
      cycleId: '123e4567-e89b-12d3-a456-426614174000',
      harvestDate: '2026-08-25',
      quantity: 4200.5,
      unit: 'kg',
      qualityGrade: 'Grade A',
      revenue: 520000.0,
      notes: 'Bumper crop, dry grains stored safely',
    };

    it('validates harvest creation with quantity > 0', () => {
      const parsed = createHarvestSchema.parse(validHarvest);
      expect(parsed.quantity).toBe(4200.5);
      expect(parsed.qualityGrade).toBe('Grade A');
    });

    it('validates partial update of harvest', () => {
      const parsed = updateHarvestSchema.parse({ quantity: 4500, qualityGrade: 'Grade A+' });
      expect(parsed.quantity).toBe(4500);
      expect(parsed.qualityGrade).toBe('Grade A+');
    });

    it('rejects non-positive quantity on harvest', () => {
      expect(() =>
        createHarvestSchema.parse({
          ...validHarvest,
          quantity: 0,
        }),
      ).toThrow();
    });

    it('rejects negative revenue', () => {
      expect(() =>
        createHarvestSchema.parse({
          ...validHarvest,
          revenue: -100,
        }),
      ).toThrow();
    });

    it('validates harvest query filters', () => {
      const query = harvestQuerySchema.parse({ qualityGrade: 'Grade A', q: 'Bumper' });
      expect(query.qualityGrade).toBe('Grade A');
      expect(query.q).toBe('Bumper');
    });
  });
});
