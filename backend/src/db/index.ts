import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
});

/**
 * Execute parameterized SQL query adhering to AGENTS.md Rule 3.
 * Parameterizing prevents SQL injection vulnerabilities.
 */
export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<R>> {
  const start = Date.now();
  const res = await pool.query<R>(text, params);
  const duration = Date.now() - start;
  logger.info({ duration, rows: res.rowCount }, 'Executed query');
  return res;
}

export async function closePool(): Promise<void> {
  await pool.end();
}
