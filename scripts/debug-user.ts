
import "dotenv/config";
import { db } from "../src/lib/db";
import { users, accounts } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    // Broken User ID from previous logs
    const targetId = "AruGR1Vlqt7vyIoO2p4Qa8m3WIEphWuU";

    const targetUser = await db.select().from(users).where(eq(users.id, targetId));
    console.log("Found User:", JSON.stringify(targetUser, null, 2));

    if (targetUser.length > 0) {
        const targetAccounts = await db.select().from(accounts).where(eq(accounts.userId, targetId));
        console.log("Found Accounts:", JSON.stringify(targetAccounts, null, 2));
    }
}

main().catch(console.error).finally(() => process.exit(0));
