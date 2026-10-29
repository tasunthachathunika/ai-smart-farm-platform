import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env';

const router = Router();

let cachedSpec: Record<string, unknown> | null = null;

export function getOpenApiSpec(): Record<string, unknown> {
  if (cachedSpec) {
    return cachedSpec;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), 'docs/api/openapi.yaml'),
    path.resolve(process.cwd(), '../docs/api/openapi.yaml'),
    path.resolve(process.cwd(), 'backend/docs/api/openapi.yaml'),
    path.resolve(__dirname, '../../docs/api/openapi.yaml'),
    path.resolve(__dirname, '../../../docs/api/openapi.yaml'),
    path.resolve(__dirname, '../docs/api/openapi.yaml'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      const fileContent = fs.readFileSync(candidate, 'utf8');
      cachedSpec = YAML.parse(fileContent);
      return cachedSpec!;
    }
  }

  throw new Error('Unable to locate openapi.yaml in any candidate location');
}

// Environment gating middleware
const swaggerGating = (req: Request, res: Response, next: NextFunction): void => {
  if (!env.SWAGGER_ENABLED) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'API documentation is disabled in this environment',
      },
    });
    return;
  }
  // Remove CSP and restrictive headers for Swagger UI static and inline assets
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');
  next();
};

router.use(swaggerGating);

// Serve raw spec as JSON or YAML
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(getOpenApiSpec());
});

router.get('/openapi.yaml', (_req: Request, res: Response) => {
  const candidatePaths = [
    path.resolve(process.cwd(), 'docs/api/openapi.yaml'),
    path.resolve(process.cwd(), '../docs/api/openapi.yaml'),
    path.resolve(process.cwd(), 'backend/docs/api/openapi.yaml'),
    path.resolve(__dirname, '../../docs/api/openapi.yaml'),
    path.resolve(__dirname, '../../../docs/api/openapi.yaml'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      res.setHeader('Content-Type', 'text/yaml');
      res.sendFile(candidate);
      return;
    }
  }

  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'OpenAPI specification file not found',
    },
  });
});

// Setup Swagger UI
router.use(
  '/',
  swaggerUi.serve,
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const spec = getOpenApiSpec();
      return swaggerUi.setup(spec, {
        customSiteTitle: 'Goviya Plus API Documentation',
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'none',
          filter: true,
        },
      })(req, res, next);
    } catch (err) {
      next(err);
    }
  },
);

export const docsRoutes = router;

