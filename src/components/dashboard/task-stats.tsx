import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Circle, Clock, Eye, Check, Calendar, Pencil } from "lucide-react"
import { TaskDialog } from "@/components/phases/task-dialog"

interface BoardColumn {
    id: string
    name: string
    cards: any[]
}

interface TaskStatsProps {
    columns: BoardColumn[]
    isLoading: boolean
    projectId: string
}

export function TaskStats({ columns, isLoading, projectId }: TaskStatsProps) {
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingTask, setEditingTask] = useState<any>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)

    // Flatten all tasks from columns
    const allTasks = useMemo(() => {
        return columns.flatMap(col =>
            col.cards.map(card => ({ ...card, columnId: col.id, columnName: col.name }))
        )
    }, [columns])

    // Filter tasks by search query
    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return allTasks
        const query = searchQuery.toLowerCase()
        return allTasks.filter(task =>
            task.title?.toLowerCase().includes(query) ||
            task.description?.toLowerCase().includes(query)
        )
    }, [allTasks, searchQuery])

    const statusConfig: Record<string, { label: string; icon: typeof Circle; color: string }> = {
        todo: { label: "Não Iniciada", icon: Circle, color: "bg-slate-100 text-slate-700" },
        in_progress: { label: "Em Andamento", icon: Clock, color: "bg-blue-100 text-blue-700" },
        review: { label: "Em Revisão", icon: Eye, color: "bg-amber-100 text-amber-700" },
        done: { label: "Concluído", icon: Check, color: "bg-emerald-100 text-emerald-700" }
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded-lg" />
                ))}
            </div>
        )
    }

    // Calculate Stats
    let total = 0
    let completed = 0
    let inProgress = 0
    let overdue = 0
    const now = new Date()

    columns.forEach(col => {
        total += col.cards.length

        if (col.id === 'done') {
            completed += col.cards.length
        } else if (col.id === 'in_progress') {
            inProgress += col.cards.length
        }

        // Check for overdue in non-completed columns
        if (col.id !== 'done') {
            col.cards.forEach(card => {
                if (card.endDate) {
                    const end = new Date(card.endDate)
                    end.setHours(23, 59, 59, 999)

                    if (end < now) {
                        overdue++
                    }
                }
            })
        }
    })

    const stats = [
        {
            label: "TOTAL DE TAREFAS",
            value: total,
            color: "text-green-600",
            clickable: true
        },
        {
            label: "CONCLUÍDAS",
            value: completed,
            color: "text-green-600",
            total: total
        },
        {
            label: "EM ANDAMENTO",
            value: inProgress,
            color: "text-blue-600"
        },
        {
            label: "ATRASADAS",
            value: overdue,
            color: "text-red-500"
        }
    ]

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <Card
                        key={idx}
                        className={`shadow-none border rounded-lg ${stat.clickable ? 'cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all' : ''}`}
                        onClick={stat.clickable ? () => setSearchOpen(true) : undefined}
                    >
                        <CardContent className="p-4 pt-4">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                                    {stat.label}
                                </div>
                                {stat.clickable && (
                                    <Search className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                            <div className={`text-2xl font-bold ${stat.color}`}>
                                {stat.value}
                            </div>
                            {/* Progress Bar for Completed */}
                            {stat.label === 'CONCLUÍDAS' && stat.total !== undefined && stat.total > 0 && (
                                <div className="w-full h-1.5 bg-muted rounded-full mt-2">
                                    <div
                                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                                        style={{ width: `${(stat.value / stat.total) * 100}%` }}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Task Search Modal */}
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Buscar Tarefas ({allTasks.length} total)
                        </DialogTitle>
                    </DialogHeader>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Digite para buscar tarefas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px] max-h-[50vh]">
                        {filteredTasks.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                {searchQuery ? `Nenhuma tarefa encontrada para "${searchQuery}"` : "Nenhuma tarefa cadastrada"}
                            </div>
                        ) : (
                            filteredTasks.map(task => {
                                const status = statusConfig[task.columnId] || statusConfig.todo
                                const StatusIcon = status.icon
                                return (
                                    <div
                                        key={task.id}
                                        className="p-3 border rounded-lg hover:bg-slate-50 hover:border-emerald-300 transition-colors cursor-pointer group"
                                        onClick={() => {
                                            setEditingTask(task)
                                            setEditDialogOpen(true)
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`font-medium truncate ${task.columnId === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                                                        {task.title}
                                                    </h4>
                                                    <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                {task.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                                        {task.description}
                                                    </p>
                                                )}
                                                {task.endDate && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(task.endDate).toLocaleDateString('pt-BR')}
                                                    </div>
                                                )}
                                            </div>
                                            <Badge variant="outline" className={`shrink-0 ${status.color}`}>
                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                {status.label}
                                            </Badge>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            {/* Task Edit Dialog */}
            <TaskDialog
                open={editDialogOpen}
                onOpenChange={(open) => {
                    setEditDialogOpen(open)
                    if (!open) setEditingTask(null)
                }}
                task={editingTask}
                phaseId={editingTask?.phaseId || ""}
                projectId={projectId}
            />
        </>
    )
}
