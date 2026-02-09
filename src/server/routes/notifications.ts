import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, AuthVariables } from "../middleware/auth";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    emitSystemAnnouncement,
} from "../../lib/notification";

const notificationsRouter = new Hono<{ Variables: AuthVariables }>();

// Require authentication for all routes
notificationsRouter.use("*", requireAuth);

/**
 * GET /notifications
 * List user's notifications (paginated)
 */
notificationsRouter.get("/", async (c) => {
    const user = c.get("user");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const items = await getNotifications(user.id, limit, offset);

    // Parse JSON data field for each notification
    const parsed = items.map((n) => ({
        ...n,
        data: n.data ? JSON.parse(n.data) : null,
    }));

    return c.json({ notifications: parsed });
});

/**
 * GET /notifications/unread-count
 * Get unread count for badge display
 */
notificationsRouter.get("/unread-count", async (c) => {
    const user = c.get("user");
    const count = await getUnreadCount(user.id);
    return c.json({ count });
});

/**
 * POST /notifications/:id/read
 * Mark single notification as read
 */
notificationsRouter.post("/:id/read", async (c) => {
    const user = c.get("user");
    const notificationId = c.req.param("id");

    await markAsRead(notificationId, user.id);

    return c.json({ success: true });
});

/**
 * POST /notifications/read-all
 * Mark all notifications as read
 */
notificationsRouter.post("/read-all", async (c) => {
    const user = c.get("user");

    await markAllAsRead(user.id);

    return c.json({ success: true });
});

/**
 * POST /notifications/system
 * Admin: create system announcement (super_admin only)
 */
const systemAnnouncementSchema = z.object({
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(1000),
    data: z.record(z.unknown()).optional(),
});

notificationsRouter.post(
    "/system",
    zValidator("json", systemAnnouncementSchema, (result, c) => {
        if (!result.success) {
            return c.json({ error: "Invalid request body", issues: result.error.issues }, 400);
        }
    }),
    async (c) => {
        const user = c.get("user");

        // Only super_admin can send system announcements
        if (user.globalRole !== "super_admin") {
            return c.json({ error: "Forbidden" }, 403);
        }

        const { title, message, data } = c.req.valid("json");

        await emitSystemAnnouncement(title, message, data);

        return c.json({ success: true, message: "System announcement queued" });
    }
);

export default notificationsRouter;
