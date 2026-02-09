import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePusher, type PusherNotification } from "@/hooks/usePusher";
import { ScrollArea } from "@/components/ui/scroll-area";

type Notification = {
    id: string;
    type: "activity" | "system";
    title: string;
    message: string;
    data?: Record<string, unknown>;
    isRead: boolean;
    createdAt: string;
};

type NotificationBellProps = {
    userId: string;
};

export function NotificationBell({ userId }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // Fetch initial notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const [notifRes, countRes] = await Promise.all([
                    fetch("/api/notifications?limit=10"),
                    fetch("/api/notifications/unread-count"),
                ]);

                if (notifRes.ok) {
                    const data = await notifRes.json();
                    setNotifications(data.notifications || []);
                }

                if (countRes.ok) {
                    const data = await countRes.json();
                    setUnreadCount(data.count || 0);
                }
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    // Handle real-time notifications
    const handleNewNotification = useCallback((notification: PusherNotification) => {
        const newNotif: Notification = {
            ...notification,
            isRead: false,
        };

        setNotifications((prev) => [newNotif, ...prev.slice(0, 9)]);
        setUnreadCount((prev) => prev + 1);
    }, []);

    // Subscribe to real-time updates
    usePusher({ userId, onNotification: handleNewNotification });

    // Mark single notification as read
    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: "POST" });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await fetch("/api/notifications/read-all", { method: "POST" });
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    // Format relative time
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "agora";
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}d`;
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 hover:bg-white/10 rounded-full"
                    aria-label="Notificações"
                >
                    <Bell className="h-5 w-5 text-white" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span className="font-semibold">Notificações</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                                e.preventDefault();
                                markAllAsRead();
                            }}
                        >
                            <CheckCheck className="h-3.5 w-3.5 mr-1" />
                            Marcar todas
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <ScrollArea className="h-[300px]">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Carregando...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Nenhuma notificação
                            </p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex items-start gap-3 p-3 cursor-pointer ${!notification.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                                    }`}
                                onClick={() => {
                                    if (!notification.isRead) {
                                        markAsRead(notification.id);
                                    }
                                    // Navigate if link provided
                                    if (notification.data?.link) {
                                        window.location.href = notification.data.link as string;
                                    }
                                }}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate">
                                            {notification.title}
                                        </p>
                                        {!notification.isRead && (
                                            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                        {notification.message}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                                        {formatTime(notification.createdAt)}
                                    </p>
                                </div>
                                {!notification.isRead && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markAsRead(notification.id);
                                        }}
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>

                {notifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="justify-center">
                            <a
                                href="/notifications"
                                className="text-sm text-center text-primary hover:text-primary/80"
                            >
                                Ver todas as notificações
                            </a>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
