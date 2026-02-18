import { Inngest, EventSchemas } from "inngest";

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
    "notification/scheduled": {
        data: {
            notificationId: string;
            scheduledFor: string; // ISO 8601 datetime string (JSON-serialized)
        };
    };
    "notification/cancelled": {
        data: {
            notificationId: string;
        };
    };
};

// Initialize Inngest client with strict typing
export const inngest = new Inngest({
    id: "gerenciador-projetos",
    schemas: new EventSchemas().fromRecord<NotificationEvents>(),
});

// Export types for use in other files
export type NotificationEventType = keyof NotificationEvents;
