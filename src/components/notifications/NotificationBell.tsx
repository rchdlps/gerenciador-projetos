import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Providers } from "@/components/providers";
import { Bell, Check, CheckCheck, Eye } from "lucide-react";
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
    return (
        <Providers>
            <NotificationBellInner userId={userId} />
        </Providers>
    );
}

function NotificationBellInner({ userId }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch unread count (once on mount, then event-driven)
    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            const res = await fetch("/api/notifications/unread-count");
            if (!res.ok) return 0;
            const data = await res.json();
            return data.count || 0;
        },
    });

    // Fetch notification list (only when dropdown is open)
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', 'recent'],
        queryFn: async () => {
            const res = await fetch("/api/notifications?limit=10");
            if (!res.ok) return [];
            const data = await res.json();
            return (data.notifications || []) as Notification[];
        },
        enabled: isOpen,
    });

    // Mark single as read
    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to mark as read");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mark all as read
    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/notifications/read-all", { method: "POST" });
            if (!res.ok) throw new Error("Failed to mark all as read");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Handle real-time Pusher notifications
    const handleNewNotification = useCallback((notification: PusherNotification) => {
        queryClient.setQueryData<number>(['notifications', 'unread-count'], (old) => (old ?? 0) + 1);
        queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
    }, [queryClient]);

    // Re-fetch unread count when Pusher reconnects after a disconnect
    const handleReconnect = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
    }, [queryClient]);

    usePusher({ userId, onNotification: handleNewNotification, onReconnect: handleReconnect });

    // Wrapper functions to match existing JSX onClick handlers
    const markAsRead = (id: string) => markReadMutation.mutate(id);
    const markAllAsRead = () => markAllReadMutation.mutate();

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
            <DropdownMenuContent className="w-[400px]" align="end" forceMount>
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
                            <div
                                key={notification.id}
                                className={`p-3 transition-colors border-b last:border-0 ${!notification.isRead
                                    ? "bg-primary/5 hover:bg-primary/10"
                                    : "hover:bg-muted/50"
                                    } cursor-pointer`}
                                onClick={() => {
                                    if (!notification.isRead) {
                                        markAsRead(notification.id);
                                    }
                                    if (notification.data?.link) {
                                        window.location.href = notification.data.link as string;
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <p className="text-sm font-semibold truncate text-foreground flex-1 min-w-0">
                                        {notification.title}
                                    </p>
                                    {!notification.isRead && (
                                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 animate-pulse" title="Não lida" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 break-all">
                                    {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-tight">
                                        {formatTime(notification.createdAt)}
                                    </span>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded bg-[#367962] text-white hover:bg-[#2d6552] transition-colors shadow-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `/notifications/${notification.id}`;
                                            }}
                                            title="Ver detalhes"
                                        >
                                            <Eye className="h-3 w-3" />
                                            Ver
                                        </button>
                                        {!notification.isRead && (
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded bg-[#F5C745] text-[#1a1a1a] hover:bg-[#e0b53d] transition-colors shadow-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                                title="Marcar como lida"
                                            >
                                                <Check className="h-3 w-3" />
                                                Lida
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
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
