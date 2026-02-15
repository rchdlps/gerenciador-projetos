import { useActiveOrg } from "@/contexts/org-context";
import { NotificationComposer } from "./NotificationComposer";
import { NotificationStats } from "./NotificationStats";
import { ScheduledNotificationsList } from "./ScheduledNotificationsList";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AdminNotificationsDashboard() {
    const { activeOrg, organizations, isSuperAdmin, isLoading } = useActiveOrg();

    // Determine if user can send: secretario in active org, or secretario in any org (aggregate view)
    const canSendNotifications = isSuperAdmin || (
        activeOrg
            ? activeOrg.role === 'secretario'
            : organizations.some(o => o.role === 'secretario')
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Verificando permissões...</p>
            </div>
        );
    }

    if (!canSendNotifications) {
        return (
            <div className="container mx-auto py-12">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Acesso Negado</AlertTitle>
                    <AlertDescription>
                        Você não tem permissão para gerenciar notificações nesta organização.
                        Apenas administradores (Secretários) podem acessar esta página.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const organizationId = isSuperAdmin ? undefined : activeOrg?.id;
    const organizationName = isSuperAdmin ? undefined : activeOrg?.name;

    return (
        <div className="container mx-auto py-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gerenciar Notificações</h1>
                    <p className="text-muted-foreground">
                        {isSuperAdmin
                            ? "Painel Global de Notificações (Super Admin)"
                            : `Gestão de Notificações - ${activeOrg?.name}`
                        }
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">Enviar Nova Notificação</h2>
                        <NotificationComposer
                            isSuperAdmin={isSuperAdmin}
                            organizationId={organizationId}
                            organizationName={organizationName}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">Estatísticas de Envio</h2>
                        <NotificationStats organizationId={organizationId} />
                    </div>

                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">Notificações Agendadas</h2>
                        <ScheduledNotificationsList
                            isSuperAdmin={isSuperAdmin}
                            organizationId={organizationId}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
