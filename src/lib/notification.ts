import { nanoid } from "nanoid";
import { db } from "./db";
import { notifications, users } from "../../db/schema";
import { eq, and, desc, sql, lt, or, ilike, type SQL } from "drizzle-orm";
import { inngest } from "./inngest/client";
import type {
    NotificationType,
    NotificationData,
    CreateNotificationInput,
    NotificationFilter
} from "./notification-types";
import { pushNotification } from "./pusher";

export type { NotificationType, NotificationData, CreateNotificationInput, NotificationFilter };

/**
 * Emit a notification event to Inngest queue
 * This is the primary way to create notifications - fire and forget
 */
export async function emitNotification(input: CreateNotificationInput) {
    // Store in DB immediately for reliability
    const notificationId = await storeNotification(input);

    // Send to Pusher immediately for real-time feedback (catch errors to not block)
    pushNotification(input.userId, {
        id: notificationId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data,
        createdAt: new Date().toISOString(),
    }).catch(err => console.error("Failed to push notification:", err));

    // Send to Inngest for side-effects (Email, Analytics, etc.)
    await inngest.send({
        name: "notification/activity",
        data: {
            userId: input.userId,
            title: input.title,
            message: input.message,
            data: input.data,
            notificationId, // Pass the ID so handler knows it's already stored
        },
    });
}

/**
 * Emit a system-wide announcement to all users
 */
export async function emitSystemAnnouncement(title: string, message: string, data?: NotificationData) {
    await inngest.send({
        name: "notification/system",
        data: { title, message, data },
    });
}

/**
 * Store a notification directly in the database
 * Called by Inngest handlers, not directly by application code
 */
export async function storeNotification(input: CreateNotificationInput): Promise<string> {
    const id = nanoid();

    await db.insert(notifications).values({
        id,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ? JSON.stringify(input.data) : null,
    });

    return id;
}

/**
 * Get all unread notifications for a user
 */
export async function getUnreadNotifications(userId: string, limit = 20) {
    return db
        .select()
        .from(notifications)
        .where(and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
        ))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
}

/**
 * Get unread count for badge display
 */
export async function getUnreadCount(userId: string): Promise<number> {
    const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
        ));

    return result[0]?.count ?? 0;
}


/**
 * Get all notifications for a user (paginated) with filters
 */
export async function getNotifications(
    userId: string,
    limit = 50,
    offset = 0,
    filters?: NotificationFilter
) {
    const conditions: SQL<unknown>[] = [eq(notifications.userId, userId)];

    if (filters) {
        if (filters.status === "unread") {
            conditions.push(eq(notifications.isRead, false));
        } else if (filters.status === "read") {
            conditions.push(eq(notifications.isRead, true));
        }

        if (filters.type && filters.type !== "all") {
            conditions.push(eq(notifications.type, filters.type));
        }

        if (filters.search) {
            conditions.push(
                or(
                    ilike(notifications.title, `%${filters.search}%`),
                    ilike(notifications.message, `%${filters.search}%`)
                ) as SQL<unknown>
            );
        }

        if (filters.startDate) {
            conditions.push(sql`${notifications.createdAt} >= ${filters.startDate}`);
        }

        if (filters.endDate) {
            conditions.push(sql`${notifications.createdAt} <= ${filters.endDate}`);
        }
    }

    const data = await db
        .select()
        .from(notifications)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

    // Get total count for pagination
    const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
        items: data,
        total: countResult[0]?.count ?? 0
    };
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
    await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
        ));
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
    await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
        ));
}

/**
 * Get notifications for daily digest that haven't been emailed yet
 */
export async function getDigestItems(userId: string, since: Date) {
    return db
        .select()
        .from(notifications)
        .where(and(
            eq(notifications.userId, userId),
            eq(notifications.isEmailSent, false),
            sql`${notifications.createdAt} >= ${since}`
        ))
        .orderBy(desc(notifications.createdAt));
}

/**
 * Mark notifications as emailed after sending digest
 */
export async function markAsEmailed(notificationIds: string[]) {
    if (notificationIds.length === 0) return;

    await db
        .update(notifications)
        .set({ isEmailSent: true })
        .where(sql`${notifications.id} IN (${sql.join(notificationIds.map(id => sql`${id}`), sql`, `)})`);
}

/**
 * Get all active user IDs for system broadcasts
 */
export async function getAllActiveUserIds(): Promise<string[]> {
    const result = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.isActive, true));

    return result.map(u => u.id);
}

/**
 * Delete old notifications (cleanup job)
 */
export async function deleteOldNotifications(olderThanDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    await db
        .delete(notifications)
        .where(lt(notifications.createdAt, cutoff));
}
