import { db } from './lib/db'; import { projects } from '../db/schema'; const p = await db.select().from(projects).limit(1); console.log(JSON.stringify(p)); process.exit(0);
