import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Activity } from "lucide-react"

type AuditLog = {
    id: string
    action: string
    resource: string
    resourceId: string
    createdAt: string
    metadata: string | null
    userName: string | null
    userEmail: string | null
}

export function AuditLogsViewer() {
    const { data: logs, isLoading } = useQuery<AuditLog[]>({
        queryKey: ['audit-logs'],
        queryFn: async () => {
            const res = await api.admin['audit-logs'].$get()
            if (!res.ok) throw new Error("Failed to fetch logs")
            return res.json()
        }
    })

    if (isLoading) return <div className="p-4 text-center">Carregando auditoria...</div>

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle>Logs de Auditoria</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Recurso</TableHead>
                            <TableHead>Detalhes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs?.map((log) => (
                            <TableRow key={log.id} className="text-xs">
                                <TableCell>{new Date(log.createdAt).toLocaleString('pt-BR')}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{log.userName}</div>
                                    <div className="text-muted-foreground">{log.userEmail}</div>
                                </TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                            log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                        }`}>
                                        {log.action}
                                    </span>
                                </TableCell>
                                <TableCell>{log.resource}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={log.metadata || ''}>
                                    {log.metadata ? JSON.stringify(JSON.parse(log.metadata), null, 0) : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
