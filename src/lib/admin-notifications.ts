import { nanoid } from "nanoid";
import { db } from "./db";
import {
    scheduledNotifications,
    notificationDeliveries,
    notificationSendLogs,
    users,
    organizations,
    memberships,
} from "../../db/schema";
import { eq, and, sql, inArray, gte, lt, desc } from "drizzle-orm";
import { emitNotification, storeNotification } from "./notification";

export type TargetType = "user" | "organization" | "role" | "multi-org" | "all";
export type NotificationPriority = "normal" | "high" | "urgent";
export type ScheduledStatus = "pending" | "sent" | "cancelled" | "failed";

export type ScheduleNotificationInput = {
    creatorId: string;
    organizationId?: string | null;
    targetType: TargetType;
    targetIds: string[];
    title: string;
    message: string;
    type: "activity" | "system";
    priority?: NotificationPriority;
    link?: string;
    scheduledFor: Date;
};

export type SendNotificationInput = Omit<ScheduleNotificationInput, "scheduledFor">;

/**
 * Get all user IDs based on target type and IDs
 */
export async function getTargetUsers(
    targetType: TargetType,
    targetIds: string[],
    organizationId?: string | null
): Promise<string[]> {
    switch (targetType) {
        case "user":
            // Direct user IDs
            return targetIds;

        case "organization":
            // All users in the organization
            if (targetIds.length === 0) return [];
            const orgMembers = await db
                .select({ userId: memberships.userId })
                .from(memberships)
                .where(
                    and(
                        eq(memberships.organizationId, targetIds[0]),
                        eq(users.isActive, true)
                    )
                )
                .innerJoin(users, eq(memberships.userId, users.id));
            return orgMembers.map((m) => m.userId);

        case "role":
            // All users with any of the roles specified in targetIds within the org
            if (!organizationId || targetIds.length === 0) return [];
            const roleMembers = await db
                .select({ userId: memberships.userId })
                .from(memberships)
                .innerJoin(users, eq(memberships.userId, users.id))
                .where(
                    and(
                        eq(memberships.organizationId, organizationId),
                        inArray(memberships.role, targetIds as ("secretario" | "gestor" | "viewer")[]),
                        eq(users.isActive, true)
                    )
                );
            return roleMembers.map((m) => m.userId);

        case "multi-org":
            // All users from multiple organizations
            if (targetIds.length === 0) return [];
            const multiOrgMembers = await db
                .select({ userId: memberships.userId })
                .from(memberships)
                .where(
                    and(
                        inArray(memberships.organizationId, targetIds),
                        eq(users.isActive, true)
                    )
                )
                .innerJoin(users, eq(memberships.userId, users.id));
            return [...new Set(multiOrgMembers.map((m) => m.userId))]; // Deduplicate

        case "all":
            // All active users in the system
            const allUsers = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.isActive, true));
            return allUsers.map((u) => u.id);

        default:
            return [];
    }
}

/**
 * Schedule a notification to be sent later
 */
export async function scheduleNotification(input: ScheduleNotificationInput): Promise<string> {
    const id = nanoid();

    await db.insert(scheduledNotifications).values({
        id,
        creatorId: input.creatorId,
        organizationId: input.organizationId,
        targetType: input.targetType,
        targetIds: input.targetIds,
        title: input.title,
        message: input.message,
        type: input.type,
        priority: input.priority || "normal",
        link: input.link,
        scheduledFor: input.scheduledFor,
        status: "pending",
    });

    return id;
}

/**
 * Send notification immediately (no queue)
 */
export async function sendImmediateNotification(input: SendNotificationInput): Promise<{
    sendLogId: string;
    targetCount: number;
    sentCount: number;
}> {
    // Get target user IDs
    const userIds = await getTargetUsers(input.targetType, input.targetIds, input.organizationId);

    if (userIds.length === 0) {
        console.warn("[Notification] No users found for target");
        throw new Error("No users found for the specified target");
    }

    // Create send log
    const sendLogId = nanoid();

    // Send notifications in parallel
    const results = await Promise.allSettled(
        userIds.map(userId =>
            emitNotification({
                userId,
                type: input.type,
                title: input.title,
                message: input.message,
                data: {
                    link: input.link || undefined,
                    priority: input.priority || "normal"
                },
            })
        )
    );

    const sentCount = results.filter(r => r.status === "fulfilled").length;
    const failedCount = results.filter(r => r.status === "rejected").length;

    if (failedCount > 0) {
        console.error(`[Notification] ${failedCount}/${userIds.length} sends failed`);
    }

    // Log the send
    await db.insert(notificationSendLogs).values({
        id: sendLogId,
        creatorId: input.creatorId,
        organizationId: input.organizationId,
        title: input.title,
        message: input.message,
        type: input.type,
        priority: input.priority || "normal",
        link: input.link,
        targetType: input.targetType,
        targetCount: userIds.length,
        sentCount,
        failedCount,
    });

    return { sendLogId, targetCount: userIds.length, sentCount };
}

/**
 * Get scheduled notifications for a creator
 */
export async function getScheduledNotifications(
    creatorId: string,
    status: ScheduledStatus = "pending",
    limit = 50,
    offset = 0
) {
    return db
        .select()
        .from(scheduledNotifications)
        .where(and(eq(scheduledNotifications.creatorId, creatorId), eq(scheduledNotifications.status, status)))
        .orderBy(desc(scheduledNotifications.scheduledFor))
        .limit(limit)
        .offset(offset);
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(id: string, creatorId: string): Promise<void> {
    await db
        .update(scheduledNotifications)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
            and(
                eq(scheduledNotifications.id, id),
                eq(scheduledNotifications.creatorId, creatorId),
                eq(scheduledNotifications.status, "pending")
            )
        );
}

/**
 * Update a scheduled notification (only if pending)
 */
export async function updateScheduledNotification(
    id: string,
    creatorId: string,
    updates: Partial<Omit<ScheduleNotificationInput, "creatorId">>
): Promise<void> {
    await db
        .update(scheduledNotifications)
        .set({ ...updates, updatedAt: new Date() })
        .where(
            and(
                eq(scheduledNotifications.id, id),
                eq(scheduledNotifications.creatorId, creatorId),
                eq(scheduledNotifications.status, "pending")
            )
        );
}

/**
 * Get send history for a creator
 */
export async function getSendHistory(creatorId: string, limit = 50, offset = 0) {
    return db
        .select()
        .from(notificationSendLogs)
        .where(eq(notificationSendLogs.creatorId, creatorId))
        .orderBy(desc(notificationSendLogs.sentAt))
        .limit(limit)
        .offset(offset);
}

/**
 * Get delivery statistics for a send log
 */
export async function getDeliveryStats(sendLogId: string) {
    const log = await db
        .select()
        .from(notificationSendLogs)
        .where(eq(notificationSendLogs.id, sendLogId))
        .limit(1);

    if (log.length === 0) {
        throw new Error("Send log not found");
    }

    // TODO: Calculate read count from notification_deliveries
    // For now, return basic stats from the log
    return {
        id: log[0].id,
        sentCount: log[0].sentCount,
        failedCount: log[0].failedCount,
        targetCount: log[0].targetCount,
        readCount: 0, // Will implement tracking later
        readRate: 0,
    };
}

/**
 * Process pending scheduled notifications (called by cron)
 */
export async function processPendingScheduledNotifications(limit = 50): Promise<{
    processed: number;
    failed: number;
    remaining: number;
}> {
    const now = new Date();

    // Get all pending notifications that should have been sent already
    // We don't use a lookback window anymore to ensure we never skip a notification
    // if the cron job fails or is delayed.
    const pending = await db
        .select()
        .from(scheduledNotifications)
        .where(
            and(
                eq(scheduledNotifications.status, "pending"),
                sql`${scheduledNotifications.scheduledFor} <= ${now}`
            )
        )
        .limit(limit);

    let processed = 0;
    let failed = 0;

    console.log(`[ScheduledNotifications] Found ${pending.length} notifications to process`);

    for (const scheduled of pending) {
        try {
            console.log(`[ScheduledNotifications] Processing ${scheduled.id}: "${scheduled.title}"`);

            await sendImmediateNotification({
                creatorId: scheduled.creatorId,
                organizationId: scheduled.organizationId,
                targetType: scheduled.targetType as TargetType,
                targetIds: scheduled.targetIds || [],
                title: scheduled.title,
                message: scheduled.message,
                type: scheduled.type as "activity" | "system",
                priority: scheduled.priority as NotificationPriority,
                link: scheduled.link || undefined,
            });

            // Mark as sent
            await db
                .update(scheduledNotifications)
                .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
                .where(eq(scheduledNotifications.id, scheduled.id));

            processed++;
        } catch (error) {
            // Mark as failed
            const failureReason = error instanceof Error ? error.message : "Unknown error";
            await db
                .update(scheduledNotifications)
                .set({
                    status: "failed",
                    failureReason,
                    updatedAt: new Date(),
                })
                .where(eq(scheduledNotifications.id, scheduled.id));

            failed++;
            console.error(`[ScheduledNotifications] Failed to process ${scheduled.id}:`, failureReason);
        }
    }

    // Check if there are more
    const remainingCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(scheduledNotifications)
        .where(
            and(
                eq(scheduledNotifications.status, "pending"),
                sql`${scheduledNotifications.scheduledFor} <= ${now}`
            )
        );

    return {
        processed,
        failed,
        remaining: Number(remainingCount[0]?.count || 0)
    };
}
