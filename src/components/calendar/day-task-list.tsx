import { useState } from "react"
import { format, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ListTodo, CheckCircle2, Circle, Plus, X, Loader2, Trash2 } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface DayTaskListProps {
    date: Date | undefined
    tasks: any[]
    projectId?: string
}

export function DayTaskList({ date, tasks, projectId }: DayTaskListProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState("")
    const [selectedPhaseId, setSelectedPhaseId] = useState("")
    const [priority, setPriority] = useState("medium")

    const queryClient = useQueryClient()

    const { data: phases = [] } = useQuery({
        queryKey: ['phases', projectId],
        queryFn: async () => {
            const res = await api.phases[':projectId'].$get({ param: { projectId: projectId! } })
            if (!res.ok) return []
            return await res.json()
        },
        enabled: isCreating && !!projectId
    })

    const { mutate: createTask, isPending } = useMutation({
        mutationFn: async () => {
            if (!selectedPhaseId) throw new Error("Select a phase")

            const res = await api.tasks.$post({
                json: {
                    phaseId: selectedPhaseId,
                    title: newTaskTitle,
                    startDate: date ? date.toISOString() : undefined,
                    endDate: date ? date.toISOString() : undefined,
                    priority,
                    status: 'todo'
                }
            })
            if (!res.ok) throw new Error("Failed to create task")
            return await res.json()
        },
        onSuccess: () => {
            setIsCreating(false)
            setNewTaskTitle("")
            queryClient.invalidateQueries({ queryKey: [projectId ? 'board' : 'tasks', projectId || 'dated'] })
        }
    })

    const { mutate: deleteTask } = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.tasks[':id'].$delete({ param: { id } })
            if (!res.ok) throw new Error("Failed to delete")
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [projectId ? 'board' : 'tasks', projectId || 'dated'] })
        }
    })

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault()
        createTask()
    }

    if (!date) {
        return (
            <div className="bg-white dark:bg-card rounded-2xl p-8 shadow-sm border border-border h-full flex flex-col items-center justify-center text-muted-foreground text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <ListTodo className="w-6 h-6 opacity-40" />
                </div>
                <p>Selecione uma data para ver as tarefas</p>
            </div>
        )
    }

    const dayTasks = tasks.filter(t => {
        if (!t) return false
        const start = t.startDate ? new Date(t.startDate) : null
        const end = t.endDate ? new Date(t.endDate) : null
        return (start && isSameDay(start, date)) || (end && isSameDay(end, date))
    })

    return (
        <div className="bg-white dark:bg-card rounded-2xl p-8 shadow-sm border border-border flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-[#1d4e46] capitalize">
                        {date ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR }) : ''}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        {dayTasks.length} {dayTasks.length === 1 ? 'tarefa agendada' : 'tarefas agendadas'}
                    </p>
                </div>

                {projectId && (
                    <Dialog open={isCreating} onOpenChange={setIsCreating}>
                        <DialogTrigger asChild>
                            <button className="p-2 hover:bg-[#f0fdfa] rounded-lg transition-colors text-[#1d4e46]">
                                <Plus className="w-5 h-5" />
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nova Tarefa - {format(date, "dd/MM")}</DialogTitle>
                            </DialogHeader>

                            <form className="flex-col flex gap-4 mt-4" onSubmit={handleCreate}>
                                <div>
                                    <label className="text-sm font-medium leading-none mb-2 block">Fase do Projeto</label>
                                    <select
                                        value={selectedPhaseId}
                                        onChange={e => setSelectedPhaseId(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4e46]"
                                        required
                                    >
                                        <option value="">Selecione a fase...</option>
                                        {phases.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium leading-none mb-2 block">Título</label>
                                    <input
                                        autoFocus
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        placeholder="Nome da tarefa"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4e46]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium leading-none mb-2 block">Prioridade</label>
                                    <div className="flex gap-2">
                                        {['low', 'medium', 'high'].map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPriority(p)}
                                                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border capitalize transition-all ${priority === p
                                                    ? 'bg-[#1d4e46] text-white border-[#1d4e46]'
                                                    : 'bg-transparent border-input hover:bg-slate-50'
                                                    }`}
                                            >
                                                {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : 'Alta'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending || !selectedPhaseId}
                                    className="w-full mt-4 py-2.5 bg-[#1d4e46] text-white rounded-xl font-medium text-sm hover:bg-[#153a34] disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Criar Tarefa
                                </button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>



            <div className="flex-1 overflow-auto -mr-2 pr-2">
                {dayTasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/60 dashed border-2 border-slate-100 rounded-xl m-2">
                        <p className="text-sm">Nenhuma tarefa para hoje</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {dayTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between group p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="mt-1">
                                        {task.status === 'done' ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-slate-300 group-hover:text-[#1d4e46] transition-colors" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className={`text-sm font-medium transition-colors ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                {task.title}
                                            </h4>
                                            {!projectId && task.projectName && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold uppercase truncate max-w-[100px]">
                                                    {task.projectName}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'high' ? 'bg-red-500' :
                                                task.priority === 'medium' ? 'bg-yellow-500' :
                                                    'bg-slate-400'
                                                }`} />
                                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${task.priority === 'high' ? 'text-red-700' :
                                                task.priority === 'medium' ? 'text-yellow-700' :
                                                    'text-slate-500'
                                                }`}>
                                                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteTask(task.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
