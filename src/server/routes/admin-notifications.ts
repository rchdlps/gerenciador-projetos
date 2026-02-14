import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, type AuthVariables } from "../middleware/auth";
import {
    scheduleNotification,
    sendImmediateNotification,
    getScheduledNotifications,
    cancelScheduledNotification,
    updateScheduledNotification,
    getSendHistory,
    getDeliveryStats,
    processPendingScheduledNotifications,
} from "@/lib/admin-notifications";
import { db } from "@/lib/db";
import { users, organizations, memberships } from "../../../db/schema"; // organizations used in /targets org search
import { eq, or, and, ilike, inArray } from "drizzle-orm";

const adminNotificationsRouter = new Hono<{ Variables: AuthVariables }>();

// Require authentication for all routes
adminNotificationsRouter.use("*", requireAuth);

/**
 * Middleware: Check if user has permission to send notifications
 * Allowed: super_admin, org secretario
 */
const requireNotificationPermission = async (c: any, next: any) => {
    const user = c.get("user");
    const isSuperAdmin = user.globalRole === "super_admin";

    // Get query param for org context (for secretario/gestor)
    const orgId = c.req.query("orgId");

    if (!isSuperAdmin && !orgId) {
        return c.json({ error: "Organization context required" }, 403);
    }

    // Check if user is secretario or gestor in the org
    if (!isSuperAdmin && orgId) {
        const membership = await db
            .select()
            .from(memberships)
            .where(
                and(
                    eq(memberships.userId, user.id),
                    eq(memberships.organizationId, orgId),
                    eq(memberships.role, "secretario")
                )
            )
            .limit(1);

        if (membership.length === 0) {
            return c.json({ error: "Forbidden: Insufficient permissions" }, 403);
        }
    }

    await next();
};

adminNotificationsRouter.use("*", requireNotificationPermission);

/**
 * Helper to get user context and validate permissions
 */
async function getUserContext(user: any, orgId?: string | null) {
    // If no orgId, check if they are actually a super admin globally
    if (!orgId) {
        if (user.globalRole === "super_admin") {
            return { role: "super_admin", orgId: null };
        }
        return { role: "viewer", orgId: null };
    }

    const membership = await db
        .select()
        .from(memberships)
        .where(and(eq(memberships.userId, user.id), eq(memberships.organizationId, orgId)))
        .limit(1);

    return {
        role: membership[0]?.role || "viewer",
        orgId,
    };
}

/**
 * POST /admin/notifications/send
 * Send immediate notification
 */
const sendSchema = z.object({
    targetType: z.enum(["user", "organization", "role", "multi-org", "all"]),
    targetIds: z.array(z.string()),
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(1000),
    type: z.enum(["activity", "system"]),
    priority: z.enum(["normal", "high", "urgent"]).optional(),
    link: z.string().url().optional(),
});

adminNotificationsRouter.post("/send", zValidator("json", sendSchema), async (c) => {
    const user = c.get("user");
    const orgId = c.req.query("orgId");
    const context = await getUserContext(user, orgId);
    const body = c.req.valid("json");

    // Validate permissions for target type
    if (context.role !== "super_admin") {
        // Non-super admins can only send to their org or users within their org
        if (body.targetType === "all" || body.targetType === "multi-org") {
            return c.json({ error: "Forbidden: Only super admins can send to all users or multiple orgs" }, 403);
        }

        if (body.targetType === "organization" && body.targetIds[0] !== context.orgId) {
            return c.json({ error: "Forbidden: Can only send to your organization" }, 403);
        }

        // For user targeting, validate all target users belong to the secretario's org
        if (body.targetType === "user" && context.orgId && body.targetIds.length > 0) {
            const orgMembers = await db
                .select({ userId: memberships.userId })
                .from(memberships)
                .where(
                    and(
                        eq(memberships.organizationId, context.orgId),
                        inArray(memberships.userId, body.targetIds)
                    )
                );
            const validUserIds = new Set(orgMembers.map((m) => m.userId));
            const invalidIds = body.targetIds.filter((id) => !validUserIds.has(id));
            if (invalidIds.length > 0) {
                return c.json({
                    error: "Forbidden: Some target users are not members of your organization",
                }, 403);
            }
        }
    }

    try {
        const result = await sendImmediateNotification({
            creatorId: user.id,
            organizationId: context.orgId,
            targetType: body.targetType,
            targetIds: body.targetIds,
            title: body.title,
            message: body.message,
            type: body.type,
            priority: body.priority,
            link: body.link,
        });

        return c.json({
            success: true,
            sendLogId: result.sendLogId,
            sentCount: result.sentCount,
            targetCount: result.targetCount,
        });
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Failed to send notification" }, 500);
    }
});

/**
 * POST /admin/notifications/schedule
 * Schedule notification for later
 */
const scheduleSchema = sendSchema.extend({
    scheduledFor: z.string().datetime(),
});

adminNotificationsRouter.post("/schedule", zValidator("json", scheduleSchema), async (c) => {
    const user = c.get("user");
    const orgId = c.req.query("orgId");
    const context = await getUserContext(user, orgId);
    const body = c.req.valid("json");

    // Same permission checks as /send
    if (context.role !== "super_admin") {
        if (body.targetType === "all" || body.targetType === "multi-org") {
            return c.json({ error: "Forbidden: Only super admins can send to all users or multiple orgs" }, 403);
        }

        if (body.targetType === "organization" && body.targetIds[0] !== context.orgId) {
            return c.json({ error: "Forbidden: Can only send to your organization" }, 403);
        }

        // For user targeting, validate all target users belong to the secretario's org
        if (body.targetType === "user" && context.orgId && body.targetIds.length > 0) {
            const orgMembers = await db
                .select({ userId: memberships.userId })
                .from(memberships)
                .where(
                    and(
                        eq(memberships.organizationId, context.orgId),
                        inArray(memberships.userId, body.targetIds)
                    )
                );
            const validUserIds = new Set(orgMembers.map((m) => m.userId));
            const invalidIds = body.targetIds.filter((id) => !validUserIds.has(id));
            if (invalidIds.length > 0) {
                return c.json({
                    error: "Forbidden: Some target users are not members of your organization",
                }, 403);
            }
        }
    }

    try {
        const scheduledId = await scheduleNotification({
            creatorId: user.id,
            organizationId: context.orgId,
            targetType: body.targetType,
            targetIds: body.targetIds,
            title: body.title,
            message: body.message,
            type: body.type,
            priority: body.priority,
            link: body.link,
            scheduledFor: new Date(body.scheduledFor),
        });

        return c.json({ success: true, scheduledId });
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Failed to schedule notification" }, 500);
    }
});

/**
 * GET /admin/notifications/scheduled
 * List scheduled notifications
 */
adminNotificationsRouter.get("/scheduled", async (c) => {
    const user = c.get("user");
    const status = (c.req.query("status") || "pending") as any;
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const scheduled = await getScheduledNotifications(user.id, status, limit, offset);

    return c.json({ scheduled });
});

/**
 * PATCH /admin/notifications/scheduled/:id
 * Update scheduled notification
 */
const updateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    message: z.string().min(1).max(1000).optional(),
    scheduledFor: z.string().datetime().optional(),
    priority: z.enum(["normal", "high", "urgent"]).optional(),
    link: z.string().url().optional(),
});

adminNotificationsRouter.patch("/scheduled/:id", zValidator("json", updateSchema), async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json");

    try {
        await updateScheduledNotification(id, user.id, {
            ...body,
            scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        });

        return c.json({ success: true });
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Failed to update" }, 500);
    }
});

/**
 * DELETE /admin/notifications/scheduled/:id
 * Cancel scheduled notification
 */
adminNotificationsRouter.delete("/scheduled/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    try {
        await cancelScheduledNotification(id, user.id);
        return c.json({ success: true });
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Failed to cancel" }, 500);
    }
});

/**
 * GET /admin/notifications/history
 * Get send history
 */
adminNotificationsRouter.get("/history", async (c) => {
    const user = c.get("user");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const history = await getSendHistory(user.id, limit, offset);

    return c.json({ history });
});

/**
 * POST /admin/notifications/process-now
 * Manually trigger processing of all pending scheduled notifications.
 * Bypasses the Inngest cron — useful when the cron is unavailable (local dev,
 * first deploy, or Inngest cloud not yet synced with the app URL).
 * Restricted to super_admin only.
 */
adminNotificationsRouter.post("/process-now", async (c) => {
    const user = c.get("user");

    if (user.globalRole !== "super_admin") {
        return c.json({ error: "Forbidden: super_admin only" }, 403);
    }

    try {
        const result = await processPendingScheduledNotifications(100);
        return c.json({ success: true, ...result });
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Processing failed" }, 500);
    }
});

/**
 * GET /admin/notifications/stats/:id
 * Get delivery stats for a send log
 */
adminNotificationsRouter.get("/stats/:id", async (c) => {
    const id = c.req.param("id");

    try {
        const stats = await getDeliveryStats(id);
        return c.json(stats);
    } catch (error) {
        return c.json({ error: error instanceof Error ? error.message : "Failed to get stats" }, 500);
    }
});

/**
 * GET /admin/notifications/targets
 * Search users or organizations for targeting
 */
adminNotificationsRouter.get("/targets", async (c) => {
    const type = c.req.query("type") || "user";
    const query = c.req.query("q") || "";
    const limit = parseInt(c.req.query("limit") || "20");

    const user = c.get("user");
    const orgId = c.req.query("orgId");

    // Validate permission and get context
    const context = await getUserContext(user, orgId);

    if (context.role !== "super_admin" && !context.orgId) {
        return c.json({ error: "Organization context required" }, 403);
    }

    if (type === "user") {
        // If not super admin, filter users by organization membership via join
        if (context.role !== "super_admin") {
            const results = await db
                .select({ id: users.id, name: users.name, email: users.email })
                .from(users)
                .innerJoin(memberships, eq(users.id, memberships.userId))
                .where(
                    and(
                        eq(memberships.organizationId, context.orgId!),
                        or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`))
                    )
                )
                .limit(limit);

            return c.json({ users: results });
        }

        // Super admin: search all users
        const results = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`)))
            .limit(limit);

        return c.json({ users: results });

    } else if (type === "organization") {
        // Only super admin can search organizations
        if (context.role !== "super_admin") {
            return c.json({ organizations: [] });
        }

        const results = await db
            .select({ id: organizations.id, name: organizations.name })
            .from(organizations)
            .where(ilike(organizations.name, `%${query}%`))
            .limit(limit);

        return c.json({ organizations: results });
    }

    return c.json({ error: "Invalid type" }, 400);
});

export default adminNotificationsRouter;
