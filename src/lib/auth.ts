import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "../../db/schema";
import { sendRecoveryEmail, sendVerificationEmail } from "./email/client";
import { APIError } from "better-auth";
import { eq } from "drizzle-orm";

const baseURL = process.env.BETTER_AUTH_URL || (import.meta.env as any).BETTER_AUTH_URL || "http://localhost:4321";
console.log("[Better Auth] Using Base URL:", baseURL);

// Normalize base URL to remove trailing slash for origin check
const normalizedBaseURL = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;

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
    emailVerification: {
        sendOnSignUp: false,
        autoSignInAfterVerification: true,
        async sendVerificationEmail(data, request) {
            const { user, url } = data;
            // Send email verification link
            await sendVerificationEmail(user.email, url);
        }
    },
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
        changeEmail: {
            enabled: true,
        },
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
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    return {
                        data: {
                            ...user,
                            isActive: true, // Default to true
                            globalRole: "user" // Default role
                        }
                    }
                }
            }
        },
        session: {
            create: {
                before: async (session) => {
                    // Lightweight check — only fetch isActive, not the full user row
                    const [result] = await db
                        .select({ isActive: schema.users.isActive })
                        .from(schema.users)
                        .where(eq(schema.users.id, session.userId))
                        .limit(1);

                    if (result && !result.isActive) {
                        throw new APIError("BAD_REQUEST", {
                            message: "Sua conta está inativa. Entre em contato com o administrador."
                        });
                    }

                    return {
                        data: session
                    }
                }
            }
        }
    },
    trustedOrigins: [
        normalizedBaseURL,
        // Add the domain without protocol just in case (some deployments might need it)
        normalizedBaseURL.replace(/^https?:\/\//, ""),
        "http://localhost:4321",
        "http://127.0.0.1:4321",
        "https://inngest.datagov.tec.br"
    ],
    // Add other providers here
});
