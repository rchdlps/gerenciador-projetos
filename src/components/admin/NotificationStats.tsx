import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, CheckCircle2, XCircle, Users } from "lucide-react";

type Stats = {
    totalSent: number;
    successRate: number;
    totalScheduled: number;
    activeUsers: number;
};

export function NotificationStats({ organizationId }: { organizationId?: string }) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // In a real app, fetch these from an aggregate endpoint
        // For now, mocking or fetching individual endpoints
        const fetchStats = async () => {
            try {
                const orgParam = organizationId ? `&orgId=${organizationId}` : '';
                const [historyRes, scheduledRes] = await Promise.all([
                    fetch(`/api/admin/notifications/history?limit=100${orgParam}`),
                    fetch(`/api/admin/notifications/scheduled?status=pending${orgParam}`),
                ]);

                if (historyRes.ok && scheduledRes.ok) {
                    const historyData = await historyRes.json();
                    const scheduledData = await scheduledRes.json();

                    // Calculate stats from history
                    const history = historyData.history || [];
                    const totalSent = history.reduce((acc: number, item: any) => acc + item.sentCount, 0);
                    const totalFailed = history.reduce((acc: number, item: any) => acc + item.failedCount, 0);
                    const totalTarget = history.reduce((acc: number, item: any) => acc + item.targetCount, 0);

                    const successRate = totalTarget > 0
                        ? Math.round(((totalSent) / totalTarget) * 100)
                        : 100;

                    setStats({
                        totalSent,
                        successRate,
                        totalScheduled: scheduledData.scheduled?.length || 0,
                        activeUsers: 0, // Would need another endpoint
                    });
                }
            } catch (error) {
                console.error("Failed to fetch stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();

        // Listen for updates
        const handleUpdate = () => fetchStats();
        window.addEventListener("notification:updated", handleUpdate);

        return () => {
            window.removeEventListener("notification:updated", handleUpdate);
        };
    }, [organizationId]);

    if (isLoading) {
        return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
        </div>;
    }

    if (!stats) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Enviado
                    </CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalSent}</div>
                    <p className="text-xs text-muted-foreground">
                        notificações entregues
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Taxa de Sucesso
                    </CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.successRate}%</div>
                    <p className="text-xs text-muted-foreground">
                        de entrega imediata
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Agendados
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalScheduled}</div>
                    <p className="text-xs text-muted-foreground">
                        pendentes de envio
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
