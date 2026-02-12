import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell } from "lucide-react";

type SelectedItem = { id: string; name: string; email?: string };

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
        selectedItems: SelectedItem[];
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
                    {(data.targetType === "all" || data.targetType === "role" || data.selectedItems.length > 10) && (
                        <div className="border-2 border-secondary bg-secondary/10 dark:bg-secondary/20 p-3 rounded-md flex items-start gap-3 text-sm shadow-sm">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-secondary-foreground" />
                            <p className="text-foreground font-medium">
                                Você está prestes a enviar para{" "}
                                <strong className="text-primary px-1 underline underline-offset-2">
                                    {data.targetType === "all"
                                        ? "todos os usuários do sistema"
                                        : data.targetType === "role"
                                            ? "todos os gestores da organização"
                                            : `${data.selectedItems.length} destinatários`}
                                </strong>
                                . Esta ação não pode ser desfeita.
                            </p>
                        </div>
                    )}

                    {/* Preview Card */}
                    <div className="border rounded-lg p-4 space-y-3 bg-card">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm flex items-center gap-2">
                                    {data.type === "system" && (
                                        <Badge variant="default" className="text-[10px] h-5 border-0 shadow-sm">
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
                                <Badge variant="destructive" className="flex-shrink-0 bg-red-600 text-white font-bold shadow-sm">
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

                    {/* Recipients */}
                    <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Destinatários:</span>
                        {data.targetType === "all" && (
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                Todos os usuários do sistema
                            </p>
                        )}
                        {data.targetType === "role" && (
                            <p className="text-sm font-medium">
                                Todos os gestores da organização
                            </p>
                        )}
                        {(data.targetType === "user" || data.targetType === "organization" || data.targetType === "multi-org") && (
                            data.selectedItems.length === 0 ? (
                                <p className="text-sm text-destructive">Nenhum destinatário selecionado</p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                                    {data.selectedItems.map((item) => (
                                        <Badge key={item.id} variant="secondary" className="text-xs gap-1">
                                            {item.name}
                                            {item.email && (
                                                <span className="text-muted-foreground font-normal">
                                                    {item.email}
                                                </span>
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            )
                        )}
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
