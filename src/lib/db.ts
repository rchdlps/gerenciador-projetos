import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../../db/schema';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL || (import.meta as any).env?.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}

export const client = new Pool({ connectionString });
export const db = drizzle(client, { schema });
