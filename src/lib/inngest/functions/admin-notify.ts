import { inngest } from "../client";
import { processPendingScheduledNotifications } from "@/lib/admin-notifications";

/**
 * Process scheduled notifications cron job
 * Runs every 5 minutes to check for notifications that should be sent
 */
export const processScheduledNotifications = inngest.createFunction(
    { id: "process-scheduled-notifications" },
    { cron: "*/5 * * * *" }, // Every 5 minutes
    async ({ step }) => {
        console.log("[Inngest] Starting scheduled notification sweep...");

        const result = await step.run("process-batch", async () => {
            return await processPendingScheduledNotifications(50);
        });

        console.log(
            `[Inngest] Cycle complete. Processed: ${result.processed}, Failed: ${result.failed}, Remaining: ${result.remaining}`
        );

        if (result.remaining > 0) {
            console.log(`[Inngest] More notifications are pending (${result.remaining}). They will be picked up in the next cycle.`);
        }

        return result;
    }
);

// Export all admin notification functions
export const adminNotificationFunctions = [processScheduledNotifications];
