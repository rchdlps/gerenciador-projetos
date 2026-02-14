
import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/lib/notification-types";

type NotificationDetailsProps = {
    notification: {
        id: string;
        title: string;
        message: string;
        type: NotificationType;
        isRead: boolean;
        createdAt: string | Date;
        data?: any;
    };
};

export function NotificationDetails({ notification }: NotificationDetailsProps) {
    const handleBack = () => {
        window.history.back();
    };

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

    const getPriorityColor = () => {
        const priority = parsedData?.priority;
        if (priority === "urgent") return "bg-destructive text-destructive-foreground border-destructive/20 shadow-sm";
        if (priority === "high") return "bg-secondary text-secondary-foreground border-secondary/20 shadow-sm";
        if (priority === "normal") return "bg-slate-200 text-slate-900 border-slate-300 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 font-bold";
        return "bg-primary text-primary-foreground border-primary/20 shadow-sm";
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                </Button>
            </div>

            <Card className="w-full">
                <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge variant={notification.type === "system" ? "default" : "secondary"} className="font-bold border-0 shadow-sm text-slate-950 dark:text-secondary-foreground">
                                    {notification.type === "system" ? "SISTEMA" : "ATIVIDADE"}
                                </Badge>
                                {parsedData?.priority && (
                                    <Badge variant="default" className={cn("font-bold border-0", getPriorityColor())}>
                                        {parsedData.priority === 'urgent' ? 'URGENTE' :
                                            parsedData.priority === 'high' ? 'ALTA' : 'NORMAL'}
                                    </Badge>
                                )}
                            </div>
                            <CardTitle className="text-2xl font-bold">{notification.title}</CardTitle>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(notification.createdAt), "PPP 'às' HH:mm", { locale: ptBR })}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="prose dark:prose-invert max-w-none">
                        <p className="text-lg leading-relaxed whitespace-pre-wrap">
                            {notification.message}
                        </p>
                    </div>

                    {parsedData?.link && (
                        <div className="flex items-center p-4 bg-muted border-2 border-muted-foreground/10 rounded-lg">
                            <div className="flex-1">
                                <p className="font-bold text-sm mb-1 text-foreground">Link Relacionado</p>
                                <p className="text-sm text-muted-foreground truncate font-mono">
                                    {parsedData.link}
                                </p>
                            </div>
                            <Button asChild className="gap-2 ml-4">
                                <a href={parsedData.link} target="_blank" rel="noopener noreferrer">
                                    Acessar Link <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                    )}

                    {/* Display extra data if any */}
                    {parsedData && Object.keys(parsedData).filter(k => k !== 'link' && k !== 'priority').length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                            <p className="text-sm font-medium text-muted-foreground mb-4">Dados Adicionais</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(parsedData)
                                    .filter(([key]) => key !== 'link' && key !== 'priority')
                                    .map(([key, value]) => (
                                        <div key={key} className="bg-muted p-4 rounded-md border-2 border-muted-foreground/10 text-sm shadow-sm">
                                            <span className="font-bold text-muted-foreground block mb-1.5 capitalize tracking-tight">
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                            <span className="font-mono text-foreground break-all">
                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-end border-t pt-6" />
            </Card>
        </div>
    );
}
