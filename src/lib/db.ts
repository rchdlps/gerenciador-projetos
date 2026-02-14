import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../../db/schema';

neonConfig.webSocketConstructor = ws;

const isProd = process.env.USE_PROD_DB === 'true' || (import.meta as any).env?.USE_PROD_DB === 'true';

const connectionString = isProd
    ? (process.env.DATABASE_URL_PROD || (import.meta as any).env?.DATABASE_URL_PROD)
    : (process.env.DATABASE_URL || (import.meta as any).env?.DATABASE_URL);

if (!connectionString) {
    throw new Error(isProd ? "DATABASE_URL_PROD is not set" : "DATABASE_URL is not set");
}

console.log(`🔌 Database connected to: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);

export const client = new Pool({ connectionString });
export const db = drizzle(client, { schema });
