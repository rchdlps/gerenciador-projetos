import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, Search, X, ChevronLeft, ChevronRight, Calendar, Filter } from "lucide-react"
import { format } from "date-fns"

type AuditLog = {
    id: string
    action: string
    resource: string
    resourceId: string
    createdAt: string
    metadata: string | null
    userName: string | null
    userEmail: string | null
    organizationId: string | null
}

type PaginationInfo = {
    page: number
    limit: number
    total: number
    totalPages: number
}

type FilterState = {
    action: string
    resource: string
    search: string
    dateFrom: string
    dateTo: string
    page: number
    limit: number
}

export function AuditLogsViewer() {
    const [filters, setFilters] = useState<FilterState>({
        action: 'all',
        resource: '',
        search: '',
        dateFrom: '',
        dateTo: '',
        page: 1,
        limit: 20
    })

    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (filters.action && filters.action !== 'all') params.append('action', filters.action)
            if (filters.resource) params.append('resource', filters.resource)
            if (filters.search) params.append('search', filters.search)
            if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
            if (filters.dateTo) params.append('dateTo', filters.dateTo)
            params.append('page', filters.page.toString())
            params.append('limit', filters.limit.toString())

            const res = await api.admin['audit-logs'].$get({
                query: Object.fromEntries(params) as any
            })
            if (!res.ok) throw new Error("Failed to fetch logs")
            return res.json() as Promise<{ logs: AuditLog[], pagination: PaginationInfo }>
        }
    })

    const handleFilterChange = (key: keyof FilterState, value: string | number) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value }
            // Reset page to 1 when changing filters (but not when changing page or limit directly)
            if (key !== 'page' && key !== 'limit') {
                newFilters.page = 1
            }
            return newFilters
        })
    }

    const clearFilters = () => {
        setFilters({
            action: 'all',
            resource: '',
            search: '',
            dateFrom: '',
            dateTo: '',
            page: 1,
            limit: 20
        })
    }

    const hasActiveFilters = !!(filters.action !== 'all' || filters.resource || filters.search || filters.dateFrom || filters.dateTo)

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <CardTitle>Logs de Auditoria</CardTitle>
                </div>
                {data && (
                    <div className="text-sm text-muted-foreground">
                        {data.pagination.total} {data.pagination.total === 1 ? 'registro' : 'registros'}
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filter Bar */}
                <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Filter className="w-4 h-4" />
                        Filtros
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        {/* Action Filter */}
                        <Select value={filters.action} onValueChange={(v) => handleFilterChange('action', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Ação" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as ações</SelectItem>
                                <SelectItem value="CREATE">CREATE</SelectItem>
                                <SelectItem value="UPDATE">UPDATE</SelectItem>
                                <SelectItem value="DELETE">DELETE</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Resource Filter */}
                        <Input
                            placeholder="Recurso..."
                            value={filters.resource}
                            onChange={(e) => handleFilterChange('resource', e.target.value)}
                        />

                        {/* Search */}
                        <Input
                            placeholder="Buscar usuário..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />

                        {/* Date From */}
                        <div className="relative">
                            <Input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                placeholder="Data início"
                            />
                        </div>

                        {/* Date To */}
                        <div className="relative">
                            <Input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                placeholder="Data fim"
                            />
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                            className="w-fit"
                        >
                            <X className="w-3 h-3 mr-2" />
                            Limpar Filtros
                        </Button>
                    )}
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && data?.logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Activity className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700">Nenhum registro encontrado</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            {hasActiveFilters
                                ? 'Tente ajustar os filtros para encontrar registros.'
                                : 'Não há logs de auditoria disponíveis no momento.'}
                        </p>
                    </div>
                )}

                {/* Table */}
                {!isLoading && data && data.logs.length > 0 && (
                    <>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-[180px]">Data/Hora</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead className="w-[120px]">Ação</TableHead>
                                        <TableHead>Recurso</TableHead>
                                        <TableHead className="w-[250px]">Detalhes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.logs.map((log) => (
                                        <TableRow key={log.id} className="text-xs hover:bg-slate-50">
                                            <TableCell className="font-mono text-[11px]">
                                                {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-900">{log.userName || 'Sistema'}</div>
                                                <div className="text-muted-foreground text-[10px]">{log.userEmail || '-'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                                                    log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                                                    {log.resource}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-[250px]">
                                                {log.metadata ? (
                                                    <details className="cursor-pointer group">
                                                        <summary className="text-[10px] text-slate-600 hover:text-slate-900 group-open:mb-2">
                                                            Ver detalhes...
                                                        </summary>
                                                        <pre className="text-[10px] p-2 bg-slate-50 rounded border overflow-x-auto">
                                                            {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                                        </pre>
                                                    </details>
                                                ) : (
                                                    <span className="text-slate-400 text-[10px]">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    Mostrando {((data.pagination.page - 1) * data.pagination.limit) + 1} até {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} de {data.pagination.total}
                                </span>
                                <Select
                                    value={filters.limit.toString()}
                                    onValueChange={(v) => handleFilterChange('limit', parseInt(v))}
                                >
                                    <SelectTrigger className="w-[100px] h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10 / pág</SelectItem>
                                        <SelectItem value="20">20 / pág</SelectItem>
                                        <SelectItem value="50">50 / pág</SelectItem>
                                        <SelectItem value="100">100 / pág</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFilterChange('page', filters.page - 1)}
                                    disabled={filters.page === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Anterior
                                </Button>
                                <span className="text-sm text-muted-foreground px-2">
                                    Página {data.pagination.page} de {data.pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFilterChange('page', filters.page + 1)}
                                    disabled={filters.page >= data.pagination.totalPages}
                                >
                                    Próxima
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
