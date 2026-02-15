import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';

// ── Configuration ────────────────────────────────────────────────────
// Source: NEON (DATABASE_URL_PROD)
// Dest:   XATA (DATABASE_URL)

const sourceUrl = process.env.DATABASE_URL_PROD;
const destUrl = process.env.DATABASE_URL;
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_ERRORS = process.argv.includes('--skip-errors');
const CHUNK_SIZE = 50;

if (!sourceUrl || !destUrl) {
    throw new Error("Missing DATABASE_URL (dest) or DATABASE_URL_PROD (source)");
}

console.log(`\n${'='.repeat(60)}`);
console.log(`  Neon -> Xata Migration${DRY_RUN ? ' (DRY RUN)' : ''}`);
console.log(`${'='.repeat(60)}`);
console.log(`  Source (Neon): ${new URL(sourceUrl).host}`);
console.log(`  Dest   (Xata): ${new URL(destUrl).host}`);
if (SKIP_ERRORS) console.log(`  Mode: Skip errors (non-strict)`);
console.log(`${'='.repeat(60)}\n`);

const sourceClient = postgres(sourceUrl, { max: 3 });
const destClient = postgres(destUrl, { max: 3 });

const dbSource = drizzle(sourceClient, { schema });
const dbDest = drizzle(destClient, { schema });

// ── Table definitions (FK-safe order) ────────────────────────────────
// Tables MUST be ordered so that parent tables come before children.
// This ensures FK constraints are satisfied during inserts.

type TableEntry = {
    name: string;
    schema: any;
    critical?: boolean; // If true, stop migration on error
};

const tables: TableEntry[] = [
    // ── Tier 0: No FK dependencies ──
    { name: 'users', schema: schema.users, critical: true },
    { name: 'organizations', schema: schema.organizations, critical: true },
    { name: 'verifications', schema: schema.verifications },

    // ── Tier 1: Depends on users and/or organizations ──
    { name: 'memberships', schema: schema.memberships, critical: true },
    { name: 'sessions', schema: schema.sessions },
    { name: 'accounts', schema: schema.accounts },
    { name: 'projects', schema: schema.projects, critical: true },
    { name: 'invitations', schema: schema.invitations },
    { name: 'audit_logs', schema: schema.auditLogs },
    { name: 'notifications', schema: schema.notifications },
    { name: 'scheduled_notifications', schema: schema.scheduledNotifications },
    { name: 'notification_send_logs', schema: schema.notificationSendLogs },

    // ── Tier 2: Depends on projects ──
    { name: 'project_charters', schema: schema.projectCharters },
    { name: 'project_phases', schema: schema.projectPhases },
    { name: 'stakeholders', schema: schema.stakeholders },
    { name: 'board_columns', schema: schema.boardColumns },
    { name: 'knowledge_areas', schema: schema.knowledgeAreas },
    { name: 'project_milestones', schema: schema.projectMilestones },
    { name: 'project_dependencies', schema: schema.projectDependencies },
    { name: 'project_quality_metrics', schema: schema.projectQualityMetrics },
    { name: 'project_quality_checklists', schema: schema.projectQualityChecklists },
    { name: 'project_communication_plans', schema: schema.projectCommunicationPlans },
    { name: 'project_meetings', schema: schema.projectMeetings },
    { name: 'procurement_suppliers', schema: schema.procurementSuppliers },
    { name: 'procurement_contracts', schema: schema.procurementContracts },
    { name: 'appointments', schema: schema.appointments },
    { name: 'attachments', schema: schema.attachments },

    // ── Tier 3: Depends on tier 2 tables ──
    { name: 'board_cards', schema: schema.boardCards },          // depends on board_columns
    { name: 'knowledge_area_changes', schema: schema.knowledgeAreaChanges }, // depends on knowledge_areas
    { name: 'tasks', schema: schema.tasks },                     // depends on project_phases, stakeholders
    { name: 'notification_deliveries', schema: schema.notificationDeliveries }, // depends on notifications
];

// ── Tables with serial/sequence columns that need resetting ──────────
const tablesWithSerials: { table: string; column: string }[] = [
    { table: 'board_columns', column: 'order' },
    { table: 'board_cards', column: 'order' },
    { table: 'project_phases', column: 'order' },
    { table: 'tasks', column: 'order' },
];

// ── Helpers ──────────────────────────────────────────────────────────

async function copyTable(entry: TableEntry): Promise<{ name: string; source: number; dest: number; skipped: boolean }> {
    const { name, schema: tableSchema } = entry;
    console.log(`\n  ${name}`);

    try {
        // Fetch from source
        const rows = await dbSource.select().from(tableSchema);

        if (rows.length === 0) {
            console.log(`    Source: 0 rows (skipping)`);
            return { name, source: 0, dest: 0, skipped: true };
        }

        console.log(`    Source: ${rows.length} rows`);

        if (DRY_RUN) {
            return { name, source: rows.length, dest: 0, skipped: true };
        }

        // Insert into dest in chunks
        let insertedTotal = 0;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            await dbDest.insert(tableSchema).values(chunk).onConflictDoNothing().execute();
            insertedTotal += chunk.length;
            process.stdout.write(`    Inserting: ${insertedTotal}/${rows.length}\r`);
        }

        // Verify count in dest
        const destCount = await dbDest.select({ count: sql<number>`count(*)::int` }).from(tableSchema);
        const destTotal = destCount[0]?.count ?? 0;

        console.log(`    Dest:   ${destTotal} rows (inserted ${rows.length})`);
        return { name, source: rows.length, dest: destTotal, skipped: false };
    } catch (e: any) {
        console.error(`    ERROR: ${e.message}`);
        if (entry.critical && !SKIP_ERRORS) {
            throw new Error(`Critical table "${name}" failed. Aborting migration.`);
        }
        return { name, source: -1, dest: -1, skipped: true };
    }
}

async function resetSequences() {
    console.log(`\n  Resetting serial sequences...`);
    for (const { table, column } of tablesWithSerials) {
        try {
            // PostgreSQL sequence naming convention: {table}_{column}_seq
            const seqName = `${table}_${column}_seq`;
            await destClient`SELECT setval(${seqName}, COALESCE((SELECT MAX(${destClient(column)}) FROM ${destClient(table)}), 0) + 1, false)`;
            console.log(`    ${seqName}: reset`);
        } catch (e: any) {
            console.log(`    ${table}.${column}: skip (${e.message.slice(0, 60)})`);
        }
    }
}

async function verifyMigration(results: { name: string; source: number; dest: number; skipped: boolean }[]) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Migration Summary${DRY_RUN ? ' (DRY RUN)' : ''}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  ${'Table'.padEnd(35)} ${'Source'.padStart(8)} ${'Dest'.padStart(8)}  Status`);
    console.log(`  ${'-'.repeat(56)}`);

    let hasErrors = false;
    for (const r of results) {
        const status = r.skipped
            ? (r.source === -1 ? 'ERROR' : (r.source === 0 ? 'EMPTY' : 'DRY'))
            : (r.source === r.dest ? 'OK' : (r.dest >= r.source ? 'OK*' : 'MISMATCH'));

        if (status === 'ERROR' || status === 'MISMATCH') hasErrors = true;

        const sourceStr = r.source >= 0 ? String(r.source) : '?';
        const destStr = r.dest >= 0 ? String(r.dest) : '?';
        console.log(`  ${r.name.padEnd(35)} ${sourceStr.padStart(8)} ${destStr.padStart(8)}  ${status}`);
    }

    console.log(`  ${'-'.repeat(56)}`);
    console.log(`  * OK* = dest has more rows (pre-existing data + new inserts)\n`);

    if (hasErrors) {
        console.log(`  WARNING: Some tables had errors or mismatches.`);
    }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
    const results: { name: string; source: number; dest: number; skipped: boolean }[] = [];

    try {
        // Disable FK checks during migration for safety
        if (!DRY_RUN) {
            console.log(`  Disabling FK constraints on dest...`);
            await destClient`SET session_replication_role = 'replica'`;
        }

        console.log(`\n--- Migrating Tables ---`);

        for (const entry of tables) {
            const result = await copyTable(entry);
            results.push(result);
        }

        // Re-enable FK checks
        if (!DRY_RUN) {
            console.log(`\n  Re-enabling FK constraints...`);
            await destClient`SET session_replication_role = 'origin'`;

            // Reset serial sequences so new inserts get correct IDs
            await resetSequences();
        }

        // Print summary
        await verifyMigration(results);

        if (DRY_RUN) {
            console.log(`  This was a DRY RUN. No data was written.`);
            console.log(`  Run without --dry-run to perform the actual migration.\n`);
        } else {
            console.log(`  Migration completed.\n`);
        }
    } catch (e: any) {
        // Re-enable FK checks even on error
        try {
            await destClient`SET session_replication_role = 'origin'`;
        } catch { /* ignore */ }

        console.error(`\n  FATAL: ${e.message}`);
        await verifyMigration(results);
        process.exit(1);
    } finally {
        await sourceClient.end();
        await destClient.end();
    }
}

main();
