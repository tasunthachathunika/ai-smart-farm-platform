import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env from backend directory first, then root directory if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GPS_ENCRYPTION_KEY: z
    .string()
    .length(64, 'GPS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: NodeJS.ProcessEnv = process.env): Env {
  const envToParse = {
    ...rawEnv,
    ...(rawEnv.NODE_ENV === 'test'
      ? {
          DATABASE_URL:
            rawEnv.DATABASE_URL ||
            'postgresql://goviya:goviya_password@localhost:5432/goviya_plus_test',
          JWT_SECRET: rawEnv.JWT_SECRET || 'test-jwt-secret-min-32-chars-key-for-jest-testing',
          GPS_ENCRYPTION_KEY:
            rawEnv.GPS_ENCRYPTION_KEY ||
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        }
      : {}),
  };

  const result = envSchema.safeParse(envToParse);
  if (!result.success) {
    const formattedErrors = result.error.errors.map(
      (err) => `${err.path.join('.') || 'env'}: ${err.message}`,
    );
    // Never log raw environment values to adhere to secrets safety rule
    console.error('Invalid environment variables detected:\n' + formattedErrors.join('\n'));
    throw new Error(`Environment validation failed:\n${formattedErrors.join('\n')}`);
  }
  return result.data;
}

export const env: Env = parseEnv();
