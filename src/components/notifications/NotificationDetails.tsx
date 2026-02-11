
import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
        if (priority === "urgent") return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
        if (priority === "high") return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300";
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
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
                                <Badge variant={notification.type === "system" ? "default" : "secondary"}>
                                    {notification.type === "system" ? "Sistema" : "Atividade"}
                                </Badge>
                                {parsedData?.priority && (
                                    <Badge variant="outline" className={getPriorityColor()}>
                                        {parsedData.priority === 'urgent' ? 'Urgente' :
                                            parsedData.priority === 'high' ? 'Alta' : 'Normal'}
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
                        <div className="flex items-center p-4 bg-muted/50 rounded-lg border">
                            <div className="flex-1">
                                <p className="font-medium text-sm mb-1">Link Relacionado</p>
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
                                        <div key={key} className="bg-muted/30 p-3 rounded-md border text-sm">
                                            <span className="font-semibold text-muted-foreground block mb-1 capitalize">
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
