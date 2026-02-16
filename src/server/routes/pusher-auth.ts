import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import { authenticatePusherChannel } from "@/lib/pusher";

const app = new Hono<{ Variables: AuthVariables }>();

app.use("*", requireAuth);

app.post("/", async (c) => {
    const user = c.get("user");

    // Pusher sends as application/x-www-form-urlencoded
    const body = await c.req.parseBody();
    const socketId = body["socket_id"] as string;
    const channelName = body["channel_name"] as string;

    if (!socketId || !channelName) {
        return c.json({ error: "Missing socket_id or channel_name" }, 400);
    }

    try {
        const authResponse = authenticatePusherChannel(socketId, channelName, user.id);
        return c.json(authResponse);
    } catch (error) {
        console.error("[Pusher Auth] Channel mismatch:", {
            channelName,
            expectedChannel: `private-notifications-${user.id}`,
        });
        return c.json({ error: "Forbidden" }, 403);
    }
});

export default app;
