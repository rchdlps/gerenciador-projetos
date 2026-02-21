import { useEffect, useRef, useState } from "react";

export type SocketNotification = {
    id: string;
    type: "activity" | "system";
    title: string;
    message: string;
    data?: Record<string, unknown>;
    createdAt: string;
};

type UseSocketOptions = {
    userId: string;
    onNotification?: (notification: SocketNotification) => void;
    onReconnect?: () => void;
};

/**
 * React hook for subscribing to real-time Socket.IO notifications.
 */
export function useSocket({ userId, onNotification, onReconnect }: UseSocketOptions) {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const onNotificationRef = useRef(onNotification);
    const onReconnectRef = useRef(onReconnect);

    useEffect(() => {
        onNotificationRef.current = onNotification;
    }, [onNotification]);

    useEffect(() => {
        onReconnectRef.current = onReconnect;
    }, [onReconnect]);

    useEffect(() => {
        // In dev mode, Astro's Vite server doesn't have Socket.IO attached.
        // Only connect in production where server.mjs runs.
        if (import.meta.env.DEV) {
            return;
        }

        let socket: any = null;

        const initSocket = async () => {
            try {
                const { io } = await import("socket.io-client");

                socket = io({
                    path: "/socket.io",
                    withCredentials: true,
                    reconnection: true,
                    reconnectionAttempts: Infinity,
                    reconnectionDelay: 1_000,
                    reconnectionDelayMax: 30_000,
                });

                socket.on("connect", () => {
                    setIsConnected(true);
                    setError(null);
                });

                socket.on("disconnect", () => {
                    setIsConnected(false);
                });

                socket.io.on("reconnect", () => {
                    setIsConnected(true);
                    onReconnectRef.current?.();
                });

                socket.on("connect_error", (err: Error) => {
                    setError(err);
                    setIsConnected(false);
                });

                socket.on("notification", (data: SocketNotification) => {
                    onNotificationRef.current?.(data);
                });
            } catch (err) {
                setError(err instanceof Error ? err : new Error("Failed to initialize Socket.IO"));
            }
        };

        initSocket();

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [userId]);

    return { isConnected, error };
}
