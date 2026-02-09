
import { useState } from "react"
import { format, isSameDay, isSameMonth, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ListTodo, CheckCircle2, Circle, Plus, Loader2, Trash2, Pin, Calendar as CalendarIcon, Clock } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useUserRole } from "@/hooks/use-user-role"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface CalendarRightPanelProps {
    date: Date | undefined
    currentMonth: Date
    tasks: any[]
    appointments: any[]
    projectId?: string
    onClearDate: () => void
    className?: string
}

export function CalendarRightPanel({ date, currentMonth, tasks, appointments, projectId, onClearDate, className }: CalendarRightPanelProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [activeTab, setActiveTab] = useState<"task" | "appointment">("task")
    const { isViewer } = useUserRole()
    const queryClient = useQueryClient()

    // --- Task State ---
    const [newTaskTitle, setNewTaskTitle] = useState("")
    const [selectedPhaseId, setSelectedPhaseId] = useState("")
    const [priority, setPriority] = useState("medium")

    // --- Appointment State ---
    const [appointmentDate, setAppointmentDate] = useState("")
    const [appointmentDescription, setAppointmentDescription] = useState("")

    // --- Data Fetching (Phases for Tasks) ---
    const { data: phases = [] } = useQuery({
        queryKey: ['phases', projectId],
        queryFn: async () => {
            if (!projectId) return []
            const res = await api.phases[':projectId'].$get({ param: { projectId } })
            if (!res.ok) return []
            return await res.json()
        },
        enabled: isCreating && activeTab === 'task' && !!projectId
    })

    // --- Mutations ---

    const { mutate: createTask, isPending: isCreatingTask } = useMutation({
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

    const { mutate: createAppointment, isPending: isCreatingAppointment } = useMutation({
        mutationFn: async () => {
            const res = await api.appointments.$post({
                json: {
                    projectId,
                    description: appointmentDescription,
                    date: new Date(appointmentDate).toISOString(),
                }
            })

            if (!res.ok) throw new Error("Failed to create appointment")
            return await res.json()
        },
        onSuccess: () => {
            setIsCreating(false)
            setAppointmentDate("")
            setAppointmentDescription("")
            queryClient.invalidateQueries({ queryKey: projectId ? ['appointments', projectId] : ['appointments', 'global'] })
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

    const { mutate: deleteAppointment } = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.appointments[':id'].$delete({ param: { id } })
            if (!res.ok) throw new Error("Failed to delete")
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectId ? ['appointments', projectId] : ['appointments', 'global'] })
        }
    })


    // --- Handlers ---

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault()
        createTask()
    }

    const handleCreateAppointment = (e: React.FormEvent) => {
        e.preventDefault()
        if (!appointmentDate || !appointmentDescription) return
        createAppointment()
    }

    // --- Derived Data ---

    // Filter tasks for the current month AND sort by date/time
    const monthTasks = tasks.filter(t => {
        if (!t) return false
        const start = t.startDate ? new Date(t.startDate) : null
        const end = t.endDate ? new Date(t.endDate) : null

        // Check if task interacts with current month
        if (start && isSameMonth(start, currentMonth)) return true
        if (end && isSameMonth(end, currentMonth)) return true
        if (start && end && start < currentMonth && end > currentMonth) return true // Spans across

        return false
    }).sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
        return dateA - dateB
    })

    // Filter appointments for the current month, but only future ones
    const monthAppointments = appointments.filter(a => {
        if (!a || !a.date) return false
        const aptDate = new Date(a.date)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Normalize today to start of day

        return isSameMonth(aptDate, currentMonth) && aptDate >= today
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())


    const dayTasks = tasks.filter(t => {
        if (!t) return false
        const start = t.startDate ? new Date(t.startDate) : null
        const end = t.endDate ? new Date(t.endDate) : null

        if (date && start && end) {
            return date >= start && date <= end || isSameDay(date, start) || isSameDay(date, end)
        }

        const targetDate = start || end
        return (date && targetDate && isSameDay(targetDate, date))
    }).sort((a, b) => {
        // For day view, maybe sort by priority or creation? Let's stick to date for consistency if times differ
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
        return dateA - dateB
    })


    // --- Render ---

    return (
        <div className={cn("bg-white dark:bg-card rounded-2xl p-8 shadow-sm border border-border flex flex-col h-full gap-6", className)}>

            {/* Header & Add Button */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    {date && (
                        <button
                            onClick={onClearDate}
                            className="p-1 -ml-2 rounded-full hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-colors"
                            title="Voltar para visão do mês"
                        >
                            <CalendarIcon className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h3 className="text-xl font-bold text-[#1d4e46] capitalize">
                            {date ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR }) : format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            {date ? 'Visão geral do dia' : 'Visão geral do mês'}
                        </p>
                    </div>
                </div>

                {!isViewer && (projectId || !projectId) && (
                    <Dialog open={isCreating} onOpenChange={setIsCreating}>
                        <DialogTrigger asChild>
                            <button className="p-2 hover:bg-[#f0fdfa] rounded-lg transition-colors text-[#1d4e46]">
                                <Plus className="w-5 h-5" />
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Novo Item</DialogTitle>
                            </DialogHeader>

                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full mt-4">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="task">Nova Tarefa</TabsTrigger>
                                    <TabsTrigger value="appointment">Novo Compromisso</TabsTrigger>
                                </TabsList>

                                {/* TASKS FORM */}
                                <TabsContent value="task">
                                    <form className="flex-col flex gap-4 mt-4" onSubmit={handleCreateTask}>
                                        {projectId ? (
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
                                        ) : (
                                            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                                                Selecione um projeto específico para criar tarefas.
                                            </div>
                                        )}


                                        <div>
                                            <label className="text-sm font-medium leading-none mb-2 block">Título</label>
                                            <input
                                                autoFocus
                                                value={newTaskTitle}
                                                onChange={e => setNewTaskTitle(e.target.value)}
                                                placeholder="Nome da tarefa"
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4e46]"
                                                required
                                                disabled={!projectId}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium leading-none mb-2 block">Prioridade</label>
                                            <div className="flex gap-2">
                                                {['low', 'medium', 'high'].map(p => (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        disabled={!projectId}
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
                                            disabled={isCreatingTask || !selectedPhaseId || !projectId}
                                            className="w-full mt-4 py-2.5 bg-[#1d4e46] text-white rounded-xl font-medium text-sm hover:bg-[#153a34] disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                                        >
                                            {isCreatingTask && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Criar Tarefa
                                        </button>
                                    </form>
                                </TabsContent>

                                {/* APPOINTMENTS FORM */}
                                <TabsContent value="appointment">
                                    <form className="space-y-4 mt-4" onSubmit={handleCreateAppointment}>
                                        <div className="relative">
                                            <label className="text-sm font-medium leading-none mb-2 block">Data e Hora</label>
                                            <div className="relative">
                                                <input
                                                    type="datetime-local"
                                                    value={appointmentDate}
                                                    onChange={(e) => setAppointmentDate(e.target.value)}
                                                    className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e46]/20 transition-all text-foreground"
                                                    required
                                                />
                                                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium leading-none mb-2 block">Descrição</label>
                                            <input
                                                type="text"
                                                placeholder="Nome do compromisso"
                                                value={appointmentDescription}
                                                onChange={(e) => setAppointmentDescription(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e46]/20 transition-all text-foreground placeholder:text-muted-foreground"
                                                required
                                            />
                                        </div>

                                        <button
                                            disabled={isCreatingAppointment}
                                            type="submit"
                                            className="w-full py-2.5 bg-[#1d4e46] text-white rounded-xl font-medium text-sm hover:bg-[#153a34] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                                        >
                                            {isCreatingAppointment ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Plus className="w-4 h-4" />
                                            )}
                                            {isCreatingAppointment ? "Adicionando..." : "Adicionar Compromisso"}
                                        </button>
                                    </form>
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="flex-1 flex flex-col gap-6 min-h-0 -mr-2 pr-2">
                {/* Tasks Section */}
                <div className="flex flex-col min-h-0 shrink-0 max-h-[280px] overflow-y-auto">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider shrink-0 sticky top-0 bg-white dark:bg-card z-10 py-2">
                        <ListTodo className="w-4 h-4" />
                        {date ? 'Tarefas do Dia' : 'Tarefas do Mês'}
                    </h4>

                    <div className="space-y-1 pr-1">
                        {(date ? dayTasks : monthTasks).length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground/60 dashed border-2 border-slate-100 rounded-xl p-6 min-h-[100px]">
                                <p className="text-sm">Nenhuma tarefa encontrada</p>
                            </div>
                        ) : (
                            (date ? dayTasks : monthTasks).map(task => (
                                <div key={task.id} className="flex items-center justify-between group p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 shrink-0">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="mt-0.5">
                                            {task.status === 'done' ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-slate-300 group-hover:text-[#1d4e46] transition-colors" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {/* Row 1: Title + Project Badge */}
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className={`text-sm font-medium truncate transition-colors ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                    {task.title}
                                                </h4>
                                                {!projectId && task.projectName && (
                                                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold uppercase truncate max-w-[80px]">
                                                        {task.projectName}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Row 2: Date + Priority */}
                                            <div className="flex items-center gap-3 mt-1">
                                                {/* Show date for monthly view tasks */}
                                                {(!date || task.startDate) && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <CalendarIcon className="w-3 h-3" />
                                                        {task.startDate ? format(new Date(task.startDate), "dd/MM", { locale: ptBR }) : '-'}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-1.5">
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
                                    </div>

                                    {!isViewer && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTask(task.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all ml-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Appointments Section */}
                <div className="flex flex-col min-h-0 overflow-y-auto flex-1">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider shrink-0 sticky top-0 bg-white dark:bg-card z-10 py-2">
                        <Pin className="w-4 h-4 rotate-12" />
                        {date ? 'Próximos Compromissos' : 'Compromissos do Mês'}
                    </h4>

                    <div className="space-y-2 pr-1">
                        {monthAppointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground/60 dashed border-2 border-slate-100 rounded-xl p-6 h-full min-h-[100px]">
                                <p className="text-sm">Nenhum compromisso para este mês</p>
                            </div>
                        ) : (
                            monthAppointments.map((apt: any) => (
                                <div key={apt.id} className="flex items-center justify-between group p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 shrink-0">
                                    <div className="text-sm">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-foreground">{apt.description}</p>
                                            {!projectId && apt.projectName && (
                                                <span className="text-[8px] px-1 py-0.5 rounded bg-blue-50 text-blue-600 font-bold uppercase truncate max-w-[80px]">
                                                    {apt.projectName}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[#1d4e46]/40 font-medium capitalize mt-1 flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(apt.date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                    </div>
                                    {!isViewer && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteAppointment(apt.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

