import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';


// --- ENVIRONMENT SWITCHING ---
const args = process.argv.slice(2);
const isProd = args.includes('--prod');

const connectionString = isProd
    ? process.env.DATABASE_URL_PROD
    : process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error(isProd
        ? "No DATABASE_URL_PROD found in .env"
        : "No DATABASE_URL found in .env"
    );
}

console.log(`🔌 Connecting to ${isProd ? "PRODUCTION" : "DEVELOPMENT"} database...`);

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
    console.log("🚀 Starting Notification System Seeding...");

    try {
        // 1. Get all users
        const users = await db.select().from(schema.users);
        console.log(`👥 Found ${users.length} users.`);

        if (users.length === 0) {
            console.log("⚠️ No users found. Skipping welcome notifications.");
        } else {
            // 2. Send Welcome Notification to all users
            console.log("📨 Sending welcome notifications...");

            const welcomeNotifications = users.map(user => ({
                id: nanoid(),
                userId: user.id,
                type: "system" as const,
                title: "Welcome to the new Notification System!",
                message: "We've updated our notification system to help you stay on top of your projects. Check your settings to customize what you receive.",
                isRead: false,
                createdAt: new Date()
            }));

            // Batch insert to avoid huge queries if many users
            if (welcomeNotifications.length > 0) {
                await db.insert(schema.notifications).values(welcomeNotifications);
            }
            console.log(`✅ Sent ${welcomeNotifications.length} welcome notifications.`);
        }

        // 3. Create Sample Scheduled Notification (System Maintenance)
        // Find a super_admin or admin to be the creator. If none, pick first user.
        // In real app, you'd want a specific admin.
        const creator = users.find(u => u.globalRole === 'super_admin') || users[0];

        if (creator) {
            console.log("📅 Scheduling sample maintenance notification...");

            await db.insert(schema.scheduledNotifications).values({
                id: nanoid(),
                creatorId: creator.id,
                targetType: 'all', // Target everyone
                title: "Scheduled System Maintenance",
                message: "The system will undergo brief maintenance on Sunday at 2 AM UTC. Expected downtime is 15 minutes.",
                type: 'system',
                priority: 'normal',
                status: 'pending',
                scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
            });
            console.log("✅ Scheduled maintenance notification created.");
        } else {
            console.log("⚠️ No user found to create scheduled notification.");
        }

        console.log("\n✨ Notification seeding completed successfully!");

    } catch (e) {
        console.error("❌ Error seeding notifications:", e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

seed();
