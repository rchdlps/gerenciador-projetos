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
import { users, organizations, memberships } from "../../../db/schema";
import { eq, or, and, ilike, inArray } from "drizzle-orm";

type NotificationContext = {
    role: string;
    orgId: string | null;
};

type AdminNotificationVariables = AuthVariables & {
    notificationContext: NotificationContext;
};

const adminNotificationsRouter = new Hono<{ Variables: AdminNotificationVariables }>();

adminNotificationsRouter.use("*", requireAuth);

/**
 * Middleware: Check permission and store context in c.set()
 * Eliminates redundant getUserContext() queries in handlers
 */
adminNotificationsRouter.use("*", async (c, next) => {
    const user = c.get("user");
    const isSuperAdmin = user.globalRole === "super_admin";
    const orgId = c.req.query("orgId") || null;

    if (isSuperAdmin) {
        c.set("notificationContext" as any, { role: "super_admin", orgId });
        return next();
    }

    if (!orgId) {
        return c.json({ error: "Organization context required" }, 403);
    }

    // Single membership query — shared across all handlers
    const [membership] = await db
        .select({ role: memberships.role })
        .from(memberships)
        .where(
            and(
                eq(memberships.userId, user.id),
                eq(memberships.organizationId, orgId),
                eq(memberships.role, "secretario")
            )
        )
        .limit(1);

    if (!membership) {
        return c.json({ error: "Forbidden: Insufficient permissions" }, 403);
    }

    c.set("notificationContext" as any, { role: membership.role, orgId });
    await next();
});

/**
 * Shared: validate target permissions for send/schedule
 */
async function validateTargetPermissions(
    context: NotificationContext,
    targetType: string,
    targetIds: string[]
): Promise<string | null> {
    if (context.role === "super_admin") return null;

    if (targetType === "all" || targetType === "multi-org") {
        return "Forbidden: Only super admins can send to all users or multiple orgs";
    }

    if (targetType === "organization" && targetIds[0] !== context.orgId) {
        return "Forbidden: Can only send to your organization";
    }

    if (targetType === "user" && context.orgId && targetIds.length > 0) {
        const orgMembers = await db
            .select({ userId: memberships.userId })
            .from(memberships)
            .where(
                and(
                    eq(memberships.organizationId, context.orgId),
                    inArray(memberships.userId, targetIds)
                )
            );
        const validUserIds = new Set(orgMembers.map((m) => m.userId));
        const invalidIds = targetIds.filter((id) => !validUserIds.has(id));
        if (invalidIds.length > 0) {
            return "Forbidden: Some target users are not members of your organization";
        }
    }

    return null;
}

/**
 * POST /admin/notifications/send
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
    const context = c.get("notificationContext" as any) as NotificationContext;
    const body = c.req.valid("json");

    const permError = await validateTargetPermissions(context, body.targetType, body.targetIds);
    if (permError) return c.json({ error: permError }, 403);

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
 */
const scheduleSchema = sendSchema.extend({
    scheduledFor: z.string().datetime(),
});

adminNotificationsRouter.post("/schedule", zValidator("json", scheduleSchema), async (c) => {
    const user = c.get("user");
    const context = c.get("notificationContext" as any) as NotificationContext;
    const body = c.req.valid("json");

    const permError = await validateTargetPermissions(context, body.targetType, body.targetIds);
    if (permError) return c.json({ error: permError }, 403);

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
 * Super admin only — manually trigger scheduled notification processing
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

    const context = c.get("notificationContext" as any) as NotificationContext;

    if (context.role !== "super_admin" && !context.orgId) {
        return c.json({ error: "Organization context required" }, 403);
    }

    if (type === "user") {
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

        const results = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`)))
            .limit(limit);

        return c.json({ users: results });

    } else if (type === "organization") {
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
