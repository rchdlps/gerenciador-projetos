import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "../../db/schema";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg", // or "mysql", "sqlite"
        schema: {
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications
        }
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: ["http://localhost:4321", "http://127.0.0.1:4321", "http://localhost:4322", "http://127.0.0.1:4322"],
    // Add other providers here
});
