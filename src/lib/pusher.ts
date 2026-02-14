import Pusher from "pusher";

const pusherAppId = process.env.PUSHER_APP_ID || (import.meta.env as any).PUSHER_APP_ID;
const pusherKey = process.env.PUSHER_KEY || (import.meta.env as any).PUSHER_KEY;
const pusherSecret = process.env.PUSHER_SECRET || (import.meta.env as any).PUSHER_SECRET;
const pusherCluster = process.env.PUSHER_CLUSTER || (import.meta.env as any).PUSHER_CLUSTER || "us2";

// Dev mode fallback - log instead of pushing
const isDev = !pusherAppId || !pusherKey || !pusherSecret;

const pusher = isDev ? null : new Pusher({
    appId: pusherAppId!,
    key: pusherKey!,
    secret: pusherSecret!,
    cluster: pusherCluster,
    useTLS: true,
});

export type PusherNotificationPayload = {
    id: string;
    type: "activity" | "system";
    title: string;
    message: string;
    data?: Record<string, unknown>;
    createdAt: string;
};

/**
 * Push a notification to a specific user's channel
 * Channel name format: private-notifications-{userId}
 */
export async function pushNotification(userId: string, payload: PusherNotificationPayload) {
    const channelName = `private-notifications-${userId}`;

    if (isDev || !pusher) {
        console.log('--- MOCK PUSHER NOTIFICATION ---');
        console.log(`Channel: ${channelName}`);
        console.log(`Payload:`, JSON.stringify(payload, null, 2));
        console.log('--------------------------------');
        return { success: true };
    }

    try {
        await pusher.trigger(channelName, "new-notification", payload);
        return { success: true };
    } catch (error) {
        console.error("Failed to push notification via Pusher:", error);
        return { success: false, error };
    }
}

/**
 * Authenticate a user for a private Pusher channel
 * Used by the /api/pusher/auth endpoint
 */
export function authenticatePusherChannel(socketId: string, channelName: string, userId: string) {
    // Verify user is allowed to subscribe to this channel
    const expectedChannel = `private-notifications-${userId}`;

    if (channelName !== expectedChannel) {
        throw new Error("Unauthorized channel access");
    }

    if (isDev || !pusher) {
        return { auth: "mock-auth-token" };
    }

    return pusher.authorizeChannel(socketId, channelName);
}

export { pusher };
