import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Bell, Info } from "lucide-react";

type NotificationPreviewProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    data: {
        title: string;
        message: string;
        type: "activity" | "system";
        priority: "normal" | "high" | "urgent";
        targetType: string;
        targetCount: number;
        scheduledFor?: Date;
    };
};

export function NotificationPreview({
    open,
    onOpenChange,
    onConfirm,
    isSubmitting,
    data,
}: NotificationPreviewProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Revisar Notificação</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Warning for large broadcasts */}
                    {(data.targetType === "all" || data.targetCount > 50) && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md flex items-start gap-3 text-yellow-800 dark:text-yellow-200 text-sm">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                            <p>
                                Você está prestes a enviar esta notificação para{" "}
                                <strong>
                                    {data.targetType === "all"
                                        ? "todos os usuários"
                                        : `${data.targetCount} usuários`}
                                </strong>
                                . Esta ação não pode ser desfeita.
                            </p>
                        </div>
                    )}

                    {/* Preview Card */}
                    <div className="border rounded-lg p-4 space-y-3 bg-card">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    {data.type === "system" && (
                                        <Badge variant="outline" className="text-[10px] h-5">
                                            Sistema
                                        </Badge>
                                    )}
                                    {data.title}
                                </h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {data.message}
                                </p>
                            </div>
                            {data.priority === "urgent" && (
                                <Badge variant="destructive" className="flex-shrink-0">
                                    Urgente
                                </Badge>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground pt-2 border-t flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            <span>
                                {data.scheduledFor
                                    ? `Agendado para ${data.scheduledFor.toLocaleString()}`
                                    : "Envio imediato via In-app & Push"}
                            </span>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <span className="text-muted-foreground">Destinatário:</span>
                            <p className="font-medium capitalize">
                                {data.targetType.replace("-", " ")}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-muted-foreground">Estimativa:</span>
                            <p className="font-medium">
                                ~{data.targetCount} usuários
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button onClick={onConfirm} disabled={isSubmitting}>
                        {isSubmitting
                            ? "Processando..."
                            : data.scheduledFor
                                ? "Confirmar Agendamento"
                                : "Enviar Agora"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
