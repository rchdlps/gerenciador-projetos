import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { authenticatePusherChannel } from "@/lib/pusher";

export const POST: APIRoute = async ({ request }) => {
    // Get user session
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Parse form data (Pusher sends as application/x-www-form-urlencoded)
    const formData = await request.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;

    if (!socketId || !channelName) {
        return new Response(JSON.stringify({ error: "Missing socket_id or channel_name" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const authResponse = authenticatePusherChannel(socketId, channelName, session.user.id);
        return new Response(JSON.stringify(authResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        });
    }
};
