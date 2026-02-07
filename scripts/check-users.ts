
import 'dotenv/config';
import { db } from "../src/lib/db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

async function checkUsers() {
    console.log("Checking users...");
    try {
        const allUsers = await db.select().from(users);
        console.table(allUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.globalRole })));
    } catch (error) {
        console.error("Error checking users:", error);
    }
}

checkUsers();
