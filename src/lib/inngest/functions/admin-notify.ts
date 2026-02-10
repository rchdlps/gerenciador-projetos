import { inngest } from "../client";
import { processPendingScheduledNotifications } from "@/lib/admin-notifications";

/**
 * Process scheduled notifications cron job
 * Runs every 5 minutes to check for notifications that should be sent
 */
export const processScheduledNotifications = inngest.createFunction(
    { id: "process-scheduled-notifications" },
    { cron: "*/5 * * * *" }, // Every 5 minutes
    async () => {
        console.log("[Inngest] Processing scheduled notifications...");

        const result = await processPendingScheduledNotifications();

        console.log(
            `[Inngest] Processed ${result.processed} scheduled notifications, ${result.failed} failed`
        );

        return {
            success: true,
            processed: result.processed,
            failed: result.failed,
        };
    }
);

// Export all admin notification functions
export const adminNotificationFunctions = [processScheduledNotifications];
