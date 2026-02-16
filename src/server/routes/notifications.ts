import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    markSelectedAsRead,
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

    const items = await getNotifications(user.id, limit, offset, {
        status: (c.req.query("status") as any) || "all",
        type: (c.req.query("type") as any) || "all",
        search: c.req.query("search"),
        startDate: c.req.query("from") ? new Date(c.req.query("from")!) : undefined,
        endDate: c.req.query("to") ? new Date(c.req.query("to")!) : undefined,
    });

    // Parse JSON data field for each notification
    const parsed = items.items.map((n) => ({
        ...n,
        data: n.data ? JSON.parse(n.data) : null,
    }));

    return c.json({
        notifications: parsed,
        total: items.total,
        limit,
        offset
    });
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
 * POST /notifications/read-all
 * Mark all notifications as read
 * NOTE: registered before /:id/read to avoid route collision
 */
notificationsRouter.post("/read-all", async (c) => {
    const user = c.get("user");
    console.log("[Notification API] Processing read-all for user:", user.id);

    try {
        const count = await markAllAsRead(user.id);
        console.log("[Notification API] read-all success, count (dummy):", count);
        return c.json({ success: true, count });
    } catch (error) {
        console.error("[Notification API] read-all failed:", error);
        return c.json({ error: "Failed to mark all as read" }, 500);
    }
});

/**
 * POST /notifications/:id/read
 * Mark single notification as read
 */
notificationsRouter.post("/:id/read", async (c) => {
    const user = c.get("user");
    const notificationId = c.req.param("id");

    const updated = await markAsRead(notificationId, user.id);

    if (!updated) {
        return c.json({ error: "Notification not found or already read" }, 404);
    }

    return c.json({ success: true });
});

/**
 * POST /notifications/bulk-read
 * Mark selected notifications as read
 */
const bulkReadSchema = z.object({
    ids: z.array(z.string()).min(1),
});

notificationsRouter.post(
    "/bulk-read",
    zValidator("json", bulkReadSchema),
    async (c) => {
        const user = c.get("user");
        const { ids } = c.req.valid("json");

        await markSelectedAsRead(ids, user.id);

        return c.json({ success: true });
    }
);

/**
 * POST /notifications/system
 * Admin: create system announcement (super_admin only)
 */
const systemAnnouncementSchema = z.object({
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(1000),
    data: z.record(z.string(), z.unknown()).optional(),
});

notificationsRouter.post(
    "/system",
    zValidator("json", systemAnnouncementSchema),
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

/**
 * POST /notifications/test (DEV ONLY)
 * Create a test notification directly without Inngest queue
 * This bypasses the event system for quick testing
 */
if (process.env.NODE_ENV !== "production") {
    notificationsRouter.post("/test", async (c) => {
        const user = c.get("user");

        // Import here to avoid circular deps
        const { storeNotification } = await import("@/lib/notification");
        const { pushNotification } = await import("@/lib/pusher");

        // Create notification directly
        const notificationId = await storeNotification({
            userId: user.id,
            type: "activity",
            title: "🧪 Test Notification",
            message: "This is a test notification created directly (dev mode)",
            data: { test: true, timestamp: new Date().toISOString() },
        });

        // Try to push real-time (will fail gracefully if Pusher not configured)
        try {
            await pushNotification(user.id, {
                id: notificationId,
                type: "activity",
                title: "🧪 Test Notification",
                message: "This is a test notification created directly (dev mode)",
                data: { test: true, timestamp: new Date().toISOString() },
                createdAt: new Date().toISOString(),
            });
        } catch (error) {
            console.log("[Dev Test] Real-time push skipped:", error);
        }

        return c.json({
            success: true,
            notificationId,
            message: "Test notification created (refresh to see it)"
        });
    });
}

export default notificationsRouter;
