import type { Server } from "socket.io";

export type NotificationPayload = {
    id: string;
    type: "activity" | "system";
    title: string;
    message: string;
    data?: Record<string, unknown>;
    createdAt: string;
};

// Alias for backward compatibility with existing imports
export type PusherNotificationPayload = NotificationPayload;

function getIO(): Server | null {
    return (globalThis as any).__socketIO || null;
}

/**
 * Push a notification to a specific user via Socket.IO.
 * Same signature as the old Pusher version — drop-in replacement.
 */
export async function pushNotification(userId: string, payload: NotificationPayload) {
    const io = getIO();

    if (!io) {
        console.log("--- MOCK SOCKET NOTIFICATION ---");
        console.log(`User: ${userId}`);
        console.log(`Payload:`, JSON.stringify(payload, null, 2));
        console.log("--------------------------------");
        return { success: true };
    }

    try {
        io.to(`user:${userId}`).emit("notification", payload);
        return { success: true };
    } catch (error) {
        console.error("Failed to push notification via Socket.IO:", error);
        return { success: false, error };
    }
}
