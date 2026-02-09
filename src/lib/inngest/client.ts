import { Inngest } from "inngest";

// Initialize Inngest client
export const inngest = new Inngest({
    id: "gerenciador-projetos",
});

// Event type definitions for type safety
export type NotificationEvents = {
    "notification/activity": {
        data: {
            userId: string;
            title: string;
            message: string;
            data?: Record<string, unknown>;
        };
    };
    "notification/system": {
        data: {
            title: string;
            message: string;
            data?: Record<string, unknown>;
        };
    };
    "notification/digest.send": {
        data: {
            // Triggered daily by cron, no payload needed
        };
    };
};
