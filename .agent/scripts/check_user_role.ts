
import 'dotenv/config';
import { db } from '@/lib/db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

async function check() {
    const allUsers = await db.select().from(users);
    console.log('Users:', allUsers.map(u => ({ email: u.email, role: u.globalRole })));
    process.exit(0);
}

check();
