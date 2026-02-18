import { inngest } from "../client";
import { processPendingScheduledNotifications } from "@/lib/admin-notifications";
import { sendScheduledNotification } from "./send-scheduled";

/**
 * Safety net cron job
 * Runs once a day to check for any notifications that might have been missed by the event-driven system
 */
export const processMissedNotifications = inngest.createFunction(
    { id: "process-missed-notifications" },
    { cron: "0 9 * * *" }, // Every day at 9 AM
    async ({ step }) => {
        console.log("[Inngest] Starting daily missed notification sweep...");

        const result = await step.run("process-batch", async () => {
            return await processPendingScheduledNotifications(50);
        });

        console.log(
            `[Inngest] Cycle complete. Processed: ${result.processed}, Failed: ${result.failed}, Remaining: ${result.remaining}`
        );

        if (result.processed > 0) {
            console.warn(`[Inngest] Found ${result.processed} missed notifications! Event-driven system might have failed for these.`);
        }

        return result;
    }
);

// Export all admin notification functions
export const adminNotificationFunctions = [
    processMissedNotifications,
    sendScheduledNotification
];
