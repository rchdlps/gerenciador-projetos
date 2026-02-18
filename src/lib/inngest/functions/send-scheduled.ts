import { inngest } from "../client";
import { processSingleNotification } from "@/lib/admin-notifications";

/**
 * Handle scheduled notifications
 * This function is triggered when a notification is scheduled and sleeps until the scheduled time.
 * If the notification is cancelled or rescheduled (which emits a cancel event), this function will be cancelled.
 */
export const sendScheduledNotification = inngest.createFunction(
    {
        id: "send-scheduled-notification",
        cancelOn: [
            {
                event: "notification/cancelled",
                match: "data.notificationId",
            },
        ],
    },
    { event: "notification/scheduled" },
    async ({ event, step }) => {
        const { notificationId, scheduledFor } = event.data;

        // Wait until the scheduled time
        await step.sleepUntil("wait-for-schedule", new Date(scheduledFor));

        // Process the notification
        const result = await step.run("process-notification", async () => {
            return await processSingleNotification(notificationId);
        });

        return result;
    }
);
