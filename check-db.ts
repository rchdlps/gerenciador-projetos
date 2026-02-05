
import { db } from './src/lib/db';
import { users, tasks, appointments, memberships, organizations } from './db/schema';
import { count } from 'drizzle-orm';

async function checkRows() {
    try {
        const [uCount] = await db.select({ value: count() }).from(users);
        const [tCount] = await db.select({ value: count() }).from(tasks);
        const [aCount] = await db.select({ value: count() }).from(appointments);
        const [mCount] = await db.select({ value: count() }).from(memberships);
        const [oCount] = await db.select({ value: count() }).from(organizations);

        console.log({
            users: uCount.value,
            tasks: tCount.value,
            appointments: aCount.value,
            memberships: mCount.value,
            organizations: oCount.value
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkRows();
