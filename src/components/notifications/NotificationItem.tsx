import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Bell,
    Info,
    AlertTriangle,
    Check,
    Eye,
    MoreHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/lib/notification-types";

export type NotificationItemProps = {
    notification: {
        id: string;
        title: string;
        message: string;
        type: NotificationType;
        isRead: boolean;
        createdAt: string | Date; // API might return string
        data?: any;
    };
    onMarkAsRead: (id: string) => void;
    selected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
};

export function NotificationItem({
    notification,
    onMarkAsRead,
    selected = false,
    onSelectedChange,
}: NotificationItemProps) {
    const isUnread = !notification.isRead;

    const parsedData = React.useMemo(() => {
        if (!notification.data) return null;
        if (typeof notification.data === 'string') {
            try {
                return JSON.parse(notification.data);
            } catch (e) {
                console.error("Failed to parse notification data", e);
                return null;
            }
        }
        return notification.data;
    }, [notification.data]);

    const getIcon = () => {
        if (notification.type === "system") return <Info className="h-5 w-5 text-primary" />;
        // Default activity icon
        return <Bell className="h-5 w-5 text-primary" />;
    };

    const getPriorityColor = () => {
        const priority = parsedData?.priority;
        if (priority === "urgent") return "bg-destructive text-destructive-foreground border-destructive/20 shadow-sm";
        if (priority === "high") return "bg-secondary text-secondary-foreground border-secondary/20 shadow-sm";
        if (priority === "normal") return "bg-slate-200 text-slate-900 border-slate-300 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 font-bold";
        return "";
    };

    return (
        <div
            className={cn(
                "flex items-start gap-4 p-4 border-b transition-colors hover:bg-muted/50 group relative",
                isUnread && "bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary",
                selected && "bg-muted shadow-[inset_4px_0_0_0_theme(colors.primary.DEFAULT)]"
            )}
        >
            {onSelectedChange && (
                <div className={cn(
                    "mt-1 flex-shrink-0 transition-opacity",
                    selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => onSelectedChange(!!checked)}
                    />
                </div>
            )}
            <div className="mt-1 flex-shrink-0">{getIcon()}</div>

            <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <a href={`/notifications/${notification.id}`} className={cn("text-sm font-semibold hover:underline decoration-1 underline-offset-2", isUnread && "text-foreground")}>
                            {notification.title}
                        </a>
                        {isUnread && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold border-0 shadow-sm text-slate-950">
                                NOVA
                            </Badge>
                        )}
                        {parsedData?.priority && (
                            <Badge variant="default" className={cn("h-5 px-1.5 text-[10px] font-bold border-0 shadow-sm", getPriorityColor())}>
                                {parsedData.priority === 'urgent' ? 'URGENTE' :
                                    parsedData.priority === 'high' ? 'ALTA' : 'NORMAL'}
                            </Badge>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                        })}
                    </span>
                </div>

                <a href={`/notifications/${notification.id}`} className="block text-sm text-muted-foreground line-clamp-2 hover:text-foreground transition-colors">
                    {notification.message}
                </a>

                {parsedData?.link && (
                    <div className="pt-2">
                        <Button variant="link" className="h-auto p-0 text-xs" asChild>
                            <a href={parsedData.link}>Acessar link externo →</a>
                        </Button>
                    </div>
                )}
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                        window.location.href = `/notifications/${notification.id}`;
                    }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalhes
                    </DropdownMenuItem>
                    {isUnread && (
                        <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                            <Check className="mr-2 h-4 w-4" />
                            Marcar como lida
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
