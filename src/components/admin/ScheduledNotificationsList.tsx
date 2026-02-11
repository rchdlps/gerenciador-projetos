import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Calendar, XCircle, Pencil } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ScheduledNotification = {
    id: string;
    title: string;
    targetType: string;
    scheduledFor: string;
    status: "pending" | "sent" | "cancelled" | "failed";
    priority: "normal" | "high" | "urgent";
};

export function ScheduledNotificationsList() {
    const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cancelId, setCancelId] = useState<string | null>(null);

    const fetchScheduled = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/notifications/scheduled?status=pending");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.scheduled);
            }
        } catch (error) {
            console.error("Failed to fetch scheduled notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchScheduled();

        // Listen for updates
        const handleUpdate = () => fetchScheduled();
        window.addEventListener("notification:updated", handleUpdate);

        return () => {
            window.removeEventListener("notification:updated", handleUpdate);
        };
    }, []);

    const handleCancel = async () => {
        if (!cancelId) return;

        try {
            const res = await fetch(`/api/admin/notifications/scheduled/${cancelId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setNotifications((prev) => prev.filter((n) => n.id !== cancelId));
            }
        } catch (error) {
            console.error("Failed to cancel notification:", error);
        } finally {
            setCancelId(null);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
            case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
            default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Carregando agendamentos...</div>;
    }

    if (notifications.length === 0) {
        return (
            <div className="p-8 text-center border rounded-lg bg-muted/10">
                <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-medium">Nenhum agendamento pendente</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Novas notificações agendadas aparecerão aqui.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Agendado para</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {notifications.map((notification) => (
                        <TableRow key={notification.id}>
                            <TableCell className="font-medium">{notification.title}</TableCell>
                            <TableCell className="capitalize">
                                {notification.targetType.replace("-", " ")}
                            </TableCell>
                            <TableCell>
                                {format(new Date(notification.scheduledFor), "PPp", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className={getPriorityColor(notification.priority)}>
                                    {notification.priority}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Abrir menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => setCancelId(notification.id)}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Cancelar Envio
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta notificação não será enviada. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90">
                            Sim, cancelar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
