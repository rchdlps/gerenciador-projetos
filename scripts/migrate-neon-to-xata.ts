import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { getTableName, sql } from 'drizzle-orm';

// Source: NEON (DATABASE_URL_PROD)
// Dest: XATA (DATABASE_URL)

const sourceUrl = process.env.DATABASE_URL_PROD;
const destUrl = process.env.DATABASE_URL;

if (!sourceUrl || !destUrl) {
    throw new Error("Missing DATABASE_URL or DATABASE_URL_PROD");
}

console.log("🚀 Starting migration from Neon to Xata...");
console.log(`📤 Source (Neon): ${new URL(sourceUrl).host}`);
console.log(`📥 Dest   (Xata): ${new URL(destUrl).host}`);

const sourceClient = postgres(sourceUrl, { max: 1 });
const destClient = postgres(destUrl, { max: 1 });

const dbSource = drizzle(sourceClient, { schema });
const dbDest = drizzle(destClient, { schema });

// Helper to copy table data
async function copyTable(tableName: string, tableSchema: any) {
    console.log(`\n📦 Migrating table: ${tableName}...`);
    try {
        // 1. Fetch from Source
        const rows = await dbSource.select().from(tableSchema);
        if (rows.length === 0) {
            console.log(`   ⚠️ No data found in source. Skipping.`);
            return;
        }
        console.log(`   ✅ Found ${rows.length} rows.`);

        // 2. Insert into Dest
        // Chunk inserts to avoid limits
        const chunkSize = 50;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            await dbDest.insert(tableSchema).values(chunk).onConflictDoNothing().execute();
            process.stdout.write('.');
        }
        console.log(`\n   ✅ Inserted ${rows.length} rows.`);
    } catch (e) {
        console.error(`   ❌ Error migrating ${tableName}:`, e);
        // Don't exit, try next table? Or should we strict exit?
        // strict exit for safety
        process.exit(1);
    }
}

async function main() {
    // Determine order - CRITICAL for FKs
    const tables = [
        { name: 'users', schema: schema.users },
        { name: 'organizations', schema: schema.organizations },
        { name: 'memberships', schema: schema.memberships },
        { name: 'sessions', schema: schema.sessions },
        { name: 'accounts', schema: schema.accounts },
        { name: 'verifications', schema: schema.verifications }, // Auth stuff

        { name: 'projects', schema: schema.projects },
        { name: 'project_charters', schema: schema.projectCharters },
        { name: 'project_phases', schema: schema.projectPhases },
        { name: 'stakeholders', schema: schema.stakeholders },

        { name: 'board_columns', schema: schema.boardColumns },
        { name: 'board_cards', schema: schema.boardCards },

        { name: 'knowledge_areas', schema: schema.knowledgeAreas },
        { name: 'knowledge_area_changes', schema: schema.knowledgeAreaChanges },

        { name: 'project_milestones', schema: schema.projectMilestones },
        { name: 'project_dependencies', schema: schema.projectDependencies },
        { name: 'project_quality_metrics', schema: schema.projectQualityMetrics },
        { name: 'project_quality_checklists', schema: schema.projectQualityChecklists },
        { name: 'project_communication_plans', schema: schema.projectCommunicationPlans },
        { name: 'project_meetings', schema: schema.projectMeetings },
        { name: 'procurement_suppliers', schema: schema.procurementSuppliers },
        { name: 'procurement_contracts', schema: schema.procurementContracts },
        { name: 'appointments', schema: schema.appointments },

        { name: 'tasks', schema: schema.tasks },
        { name: 'attachments', schema: schema.attachments },

        { name: 'invitations', schema: schema.invitations },
        { name: 'audit_logs', schema: schema.auditLogs },

        { name: 'notifications', schema: schema.notifications },
        { name: 'scheduled_notifications', schema: schema.scheduledNotifications },
        { name: 'notification_deliveries', schema: schema.notificationDeliveries },
        { name: 'notification_send_logs', schema: schema.notificationSendLogs },
    ];

    try {
        for (const t of tables) {
            await copyTable(t.name, t.schema);
        }
        console.log("\n✨ Migration completed successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await sourceClient.end();
        await destClient.end();
    }
}

main();
