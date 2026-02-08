import "dotenv/config";
import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    // 1. Create a test user directly or via auth
    const testEmail = "inactive-test-" + Date.now() + "@example.com";
    const testPassword = "password123";

    console.log("Creating active user:", testEmail);
    const user = await auth.api.signUpEmail({
        body: {
            email: testEmail,
            password: testPassword,
            name: "Inactive Test User",
        }
    });

    if (!user) {
        console.error("Failed to create user");
        process.exit(1);
    }

    console.log("User created with ID:", user.user.id);

    // 2. Set user to inactive manually
    console.log("Setting user to inactive...");
    await db.update(users).set({ isActive: false }).where(eq(users.id, user.user.id));

    // 3. Try to sign in
    console.log("Attempting to sign in with inactive user...");
    try {
        await auth.api.signInEmail({
            body: {
                email: testEmail,
                password: testPassword
            }
        });
        console.error("Login SUCCEEDED but should have FAILED!");
        process.exit(1);
    } catch (e: any) {
        // console.log("Caught error:", e);
        if (e.body?.message?.includes("Sua conta está inativa")) {
            console.log("SUCCESS: Login failed with expected message:", e.body.message);
        } else if (e.message?.includes("Sua conta está inativa")) {
            console.log("SUCCESS: Login failed with expected message:", e.message);
        } else {
            console.error("FAILED: Different error caught:", e);
            process.exit(1);
        }
    }

    // Cleanup
    await db.delete(users).where(eq(users.id, user.user.id));
    console.log("Cleanup complete.");
}

main().catch(console.error);
