import { useEffect, useState, useCallback } from "react";

export type PusherNotification = {
    id: string;
    type: "activity" | "system";
    title: string;
    message: string;
    data?: Record<string, unknown>;
    createdAt: string;
};

type UsePusherOptions = {
    userId: string;
    onNotification?: (notification: PusherNotification) => void;
};

/**
 * React hook for subscribing to real-time Pusher notifications
 */
export function usePusher({ userId, onNotification }: UsePusherOptions) {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // Check if Pusher is configured
        const pusherKey = (import.meta.env as any).PUBLIC_PUSHER_KEY;
        const pusherCluster = (import.meta.env as any).PUBLIC_PUSHER_CLUSTER || "us2";

        if (!pusherKey) {
            console.log("[Pusher] No key configured, running in dev mode without real-time");
            return;
        }

        let pusherInstance: any = null;
        let channel: any = null;

        const initPusher = async () => {
            try {
                // Dynamically import pusher-js only when needed
                const { default: Pusher } = await import("pusher-js");

                pusherInstance = new Pusher(pusherKey, {
                    cluster: pusherCluster,
                    authEndpoint: "/api/pusher/auth",
                });

                const channelName = `private-notifications-${userId}`;
                channel = pusherInstance.subscribe(channelName);

                channel.bind("pusher:subscription_succeeded", () => {
                    setIsConnected(true);
                    setError(null);
                });

                channel.bind("pusher:subscription_error", (err: any) => {
                    setError(new Error(err?.message || "Subscription failed"));
                    setIsConnected(false);
                });

                channel.bind("new-notification", (data: PusherNotification) => {
                    onNotification?.(data);
                });
            } catch (err) {
                setError(err instanceof Error ? err : new Error("Failed to initialize Pusher"));
            }
        };

        initPusher();

        return () => {
            if (channel) {
                channel.unsubscribe();
            }
            if (pusherInstance) {
                pusherInstance.disconnect();
            }
        };
    }, [userId, onNotification]);

    return { isConnected, error };
}
