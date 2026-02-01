import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';

const connectionString = process.env.DATABASE_URL || (import.meta as any).env?.DATABASE_URL;

// Disable prefetch as it is not supported for "Transaction" pool mode
if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
