
import type { APIRoute } from "astro";
import { storage } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";

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
        const { filename, fileType } = body;

        if (!filename || !fileType) {
            return new Response(JSON.stringify({ error: "Missing filename or fileType" }), { status: 400 });
        }

        const key = `avatars/${session.user.id}/${nanoid()}-${filename}`;
        const url = await storage.getUploadUrl(key, fileType);

        return new Response(JSON.stringify({ url, key }), { status: 200 });
    } catch (error) {
        console.error("Error initiating upload:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
};
