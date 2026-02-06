import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema';

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) throw new Error("No DATABASE_URL");

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function check() {
    try {
        const apps = await db.select().from(schema.appointments);
        console.log("Total Appointments in DB:", apps.length);
        if (apps.length > 0) {
            console.log("Sample Appointment:", apps[0]);
        } else {
            console.log("No appointments found.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

check();
