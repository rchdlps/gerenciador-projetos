
import type { APIRoute } from "astro";
import { storage } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request }) => {
    try {
        // Only pass cookie header — passing Origin triggers better-auth's CSRF check
        const authHeaders = new Headers();
        const cookie = request.headers.get('cookie');
        if (cookie) authHeaders.set('cookie', cookie);
        const session = await auth.api.getSession({ headers: authHeaders });
        if (!session) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const body = await request.json();
        const { key, entityId, entityType } = body;

        if (!key) {
            return new Response(JSON.stringify({ error: "Missing key" }), { status: 400 });
        }

        // Validate entityId matches session user if updating own avatar
        if (entityType === 'user_avatar' && entityId !== session.user.id) {
            return new Response(JSON.stringify({ error: "Unauthorized entity update" }), { status: 403 });
        }

        const publicUrl = storage.getPublicUrl(key);

        // Update user profile with new image URL in the database
        if (entityType === 'user_avatar') {
            await db.update(users)
                .set({ image: publicUrl })
                .where(eq(users.id, session.user.id));
        }

        return new Response(JSON.stringify({ publicUrl }), { status: 200 });

    } catch (error) {
        console.error("Error confirming upload:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
};
