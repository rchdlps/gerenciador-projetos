import { format, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock, CheckCircle2, Circle, ChevronRight } from "lucide-react"

interface DayTaskListProps {
    date: Date | undefined
    tasks: any[]
    projectId: string
}

export function DayTaskList({ date, tasks, projectId }: DayTaskListProps) {
    if (!date) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>Selecione uma data para ver as tarefas</p>
            </div>
        )
    }

    const dayTasks = tasks.filter(t => t && t.dueDate && isSameDay(new Date(t.dueDate), date))

    return (
        <div className="flex flex-col h-full bg-white dark:bg-card rounded-2xl p-8 shadow-sm border">
            <div className="mb-8 border-b pb-6">
                <h3 className="text-xl font-bold text-[#1d4e46]">
                    Tarefas do Dia
                </h3>
                <p className="text-3xl font-light text-foreground capitalize mt-2">
                    {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
            </div>

            <div className="flex-1 overflow-auto space-y-3 pr-2">
                {dayTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground animate-in fade-in duration-500">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <CalendarIcon className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="font-medium text-foreground text-lg">Nenhuma tarefa agendada</p>
                        <p className="text-base mt-2 text-muted-foreground">Aproveite para organizar seus próximos dias.</p>
                        <button className="mt-8 px-6 py-3 bg-[#1d4e46] text-white rounded-xl text-base font-medium hover:bg-[#153a34] transition-colors shadow-sm shadow-[#1d4e46]/20">
                            + Adicionar Tarefa
                        </button>
                    </div>
                ) : (
                    dayTasks.map(task => (
                        <div key={task.id} className="group relative flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-[#1d4e46]/30 transition-all duration-200 cursor-pointer">
                            <div className="mt-1">
                                {task.status === 'done' ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Circle className="w-5 h-5 text-slate-300 group-hover:text-[#1d4e46] transition-colors" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-foreground group-hover:text-[#1d4e46] transition-colors truncate">
                                    {task.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${task.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-100' :
                                        task.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                                            'bg-slate-50 text-slate-700 border border-slate-100'
                                        }`}>
                                        {task.priority}
                                    </span>
                                    {task.status !== 'done' && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            Pendente
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
