
import { type Logger } from 'drizzle-orm/logger';

export class LatencyLogger implements Logger {
    logQuery(query: string, params: unknown[]): void {
        // Drizzle doesn't provide timing information in logQuery directly.
        // This logger is useful for seeing WHAT queries are running.
        // For accurate timing, use the `scripts/db-latency.ts` tool or check Sentry.
        console.log(`\n📝 [DB Query]: ${query}`);
        if (params && params.length > 0) {
            console.log(`   Params:`, params);
        }
    }
}
