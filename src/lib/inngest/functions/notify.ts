import { inngest } from "../client";
import {
    storeNotification,
    getAllActiveUserIds,
    getDigestItems,
    markAsEmailed
} from "@/lib/notification";
import { pushNotification } from "@/lib/pusher";
import { sendDailyDigestEmail } from "@/lib/email/client";
import { db } from "@/lib/db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";

/**
 * Handle activity notifications (comments, task updates, assignments)
 * Stores in DB and pushes real-time via Pusher
 */
export const handleActivityNotification = inngest.createFunction(
    { id: "notification-activity" },
    { event: "notification/activity" },
    async ({ event }) => {
        const { userId, title, message, data, notificationId: existingId } = event.data;

        let notificationId = existingId;

        // If no ID provided (legacy event or direct call), store in DB
        if (!notificationId) {
            notificationId = await storeNotification({
                userId,
                type: "activity",
                title,
                message,
                data: data as Record<string, unknown> | undefined,
            });
        }

        // Push real-time notification via Pusher
        await pushNotification(userId, {
            id: notificationId,
            type: "activity",
            title,
            message,
            data,
            createdAt: new Date().toISOString(),
        });

        return { success: true, notificationId };
    }
);

/**
 * Handle system-wide announcements
 * Broadcasts to all active users
 */
export const handleSystemNotification = inngest.createFunction(
    { id: "notification-system" },
    { event: "notification/system" },
    async ({ event }) => {
        const { title, message, data } = event.data;

        // Get all active users
        const userIds = await getAllActiveUserIds();

        // Store notification for each user and push real-time
        const results = await Promise.allSettled(
            userIds.map(async (userId) => {
                const notificationId = await storeNotification({
                    userId,
                    type: "system",
                    title,
                    message,
                    data: data as Record<string, unknown> | undefined,
                });

                await pushNotification(userId, {
                    id: notificationId,
                    type: "system",
                    title,
                    message,
                    data,
                    createdAt: new Date().toISOString(),
                });

                return notificationId;
            })
        );

        const successful = results.filter(r => r.status === "fulfilled").length;
        return { success: true, sentTo: successful, total: userIds.length };
    }
);

/**
 * Daily digest cron job - runs at 8:00 AM UTC
 * Sends email summary of unread notifications
 */
export const handleDailyDigest = inngest.createFunction(
    { id: "notification-daily-digest" },
    { cron: "0 8 * * *" }, // 8:00 AM UTC daily
    async () => {
        // Get all active users
        const activeUsers = await db
            .select({ id: users.id, email: users.email, name: users.name })
            .from(users)
            .where(eq(users.isActive, true));

        // Calculate "since" as 24 hours ago
        const since = new Date();
        since.setHours(since.getHours() - 24);

        let emailsSent = 0;

        for (const user of activeUsers) {
            // Get notifications from last 24 hours that haven't been emailed
            const items = await getDigestItems(user.id, since);

            if (items.length === 0) continue;

            // Send digest email
            const result = await sendDailyDigestEmail(
                user.email,
                user.name,
                items.map(n => ({
                    title: n.title,
                    message: n.message,
                    createdAt: n.createdAt,
                }))
            );

            if (result.success) {
                // Mark notifications as emailed
                await markAsEmailed(items.map(n => n.id));
                emailsSent++;
            }
        }

        return { success: true, emailsSent, totalUsers: activeUsers.length };
    }
);

// Export all functions for Inngest serve
export const notificationFunctions = [
    handleActivityNotification,
    handleSystemNotification,
    handleDailyDigest,
];
