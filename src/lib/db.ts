import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';

const isProd = process.env.USE_PROD_DB === 'true' || (import.meta as any).env?.USE_PROD_DB === 'true';

const connectionString = isProd
    ? (process.env.DATABASE_URL_PROD || (import.meta as any).env?.DATABASE_URL_PROD)
    : (process.env.DATABASE_URL || (import.meta as any).env?.DATABASE_URL);

if (!connectionString) {
    throw new Error(isProd ? "DATABASE_URL_PROD is not set" : "DATABASE_URL is not set");
}

import { LatencyLogger } from './latency-logger';

console.log(`🔌 Database connected to: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);

export const client = postgres(connectionString);
export const db = drizzle(client, {
    schema,
    logger: process.env.DB_LOGGING === 'true' ? new LatencyLogger() : undefined
});
