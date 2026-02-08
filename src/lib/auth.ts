import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "../../db/schema";
import { sendRecoveryEmail } from "./email/client";

const baseURL = process.env.BETTER_AUTH_URL || (import.meta.env as any).BETTER_AUTH_URL || "http://localhost:4321";
console.log("[Better Auth] Using Base URL:", baseURL);

export const auth = betterAuth({
    baseURL,
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
        async sendResetPassword(data, request) {
            const { user, url } = data;
            await sendRecoveryEmail(user.email, url);
        },
        password: {
            hash: async (password) => {
                const { hash } = await import("argon2");
                return hash(password);
            },
            verify: async ({ hash, password }) => {
                const { verify } = await import("argon2");
                return verify(hash, password);
            },
        },
    },

    user: {
        additionalFields: {
            globalRole: {
                type: "string",
                required: false,
                defaultValue: "user"
            },
            isActive: {
                type: "boolean",
                required: false,
                defaultValue: true
            }
        }
    },
    trustedOrigins: ["http://localhost:4321", "http://127.0.0.1:4321", "http://localhost:4322", "http://127.0.0.1:4322"],
    // Add other providers here
});
