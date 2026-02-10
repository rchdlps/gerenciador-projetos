import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Bell,
    Info,
    AlertTriangle,
    Trash2,
    Check,
    MoreHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    onDelete: (id: string) => void;
};

export function NotificationItem({
    notification,
    onMarkAsRead,
    onDelete,
}: NotificationItemProps) {
    const isUnread = !notification.isRead;

    const getIcon = () => {
        if (notification.type === "system") return <Info className="h-5 w-5 text-blue-500" />;
        // Default activity icon
        return <Bell className="h-5 w-5 text-gray-500" />;
    };

    const getPriorityColor = () => {
        // Assuming data.priority exists if it's a scheduled notification or similar
        const priority = notification.data?.priority;
        if (priority === "urgent") return "bg-red-100 text-red-800 border-red-200";
        if (priority === "high") return "bg-orange-100 text-orange-800 border-orange-200";
        return "";
    };

    return (
        <div
            className={cn(
                "flex items-start gap-4 p-4 border-b transition-colors hover:bg-muted/50",
                isUnread && "bg-blue-50/50 dark:bg-blue-950/10"
            )}
        >
            <div className="mt-1 flex-shrink-0">{getIcon()}</div>

            <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h4 className={cn("text-sm font-semibold", isUnread && "text-foreground")}>
                            {notification.title}
                        </h4>
                        {isUnread && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                Nova
                            </Badge>
                        )}
                        {notification.data?.priority && (
                            <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", getPriorityColor())}>
                                {notification.data.priority === 'urgent' ? 'Urgente' : 'Alta'}
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

                <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.message}
                </p>

                {notification.data?.link && (
                    <div className="pt-2">
                        <Button variant="link" className="h-auto p-0 text-xs" asChild>
                            <a href={notification.data.link}>Ver detalhes →</a>
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
                    {isUnread && (
                        <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                            <Check className="mr-2 h-4 w-4" />
                            Marcar como lida
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        onClick={() => onDelete(notification.id)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
