import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { TaskItem } from "./task-item"
import { Plus } from "lucide-react"
import { useState, useMemo } from "react"
import { TaskDialog } from "./task-dialog"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"

interface PhaseAccordionProps {
    phase: any // TODO: Type
    projectId: string
    index: number
}

const PHASE_COLORS = [
    { border: 'border-l-emerald-500', bar: 'bg-emerald-500' },
    { border: 'border-l-blue-500', bar: 'bg-blue-500' },
    { border: 'border-l-indigo-500', bar: 'bg-indigo-500' },
    { border: 'border-l-violet-500', bar: 'bg-violet-500' },
    { border: 'border-l-rose-500', bar: 'bg-rose-500' },
    { border: 'border-l-amber-500', bar: 'bg-amber-500' },
]

export function PhaseAccordion({ phase, projectId, index }: PhaseAccordionProps) {
    const [createOpen, setCreateOpen] = useState(false)
    const taskCount = phase.tasks?.length || 0
    const completedCount = phase.tasks?.filter((t: any) => t.status === 'done').length || 0
    const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0

    const color = PHASE_COLORS[index % PHASE_COLORS.length]

    // Droppable for empty phase handling
    const { setNodeRef } = useDroppable({
        id: phase.id,
    })

    const taskIds = useMemo(() => phase.tasks?.map((t: any) => t.id) || [], [phase.tasks])

    return (
        <AccordionItem
            value={phase.id}
            className={`border rounded-xl px-4 mb-4 bg-white shadow-sm border-l-4 transition-all duration-300 ${color.border}`}
        >
            <AccordionTrigger className="hover:no-underline py-6">
                <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-gray-800">{phase.name}</span>
                        <span className="text-sm text-gray-500 font-normal">{phase.description}</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end min-w-[120px]">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Progresso</span>
                            <div className="flex items-center gap-3 w-full">
                                <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`${color.bar} h-2 rounded-full transition-all duration-500`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-gray-700 min-w-[35px] text-right">{progress}%</span>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-gray-100" />
                        <div className="flex flex-col items-center min-w-[60px]">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tarefas</span>
                            <span className="text-sm font-bold text-gray-700">{completedCount}/{taskCount}</span>
                        </div>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6 border-t border-gray-50">
                <div ref={setNodeRef} className="space-y-3 min-h-[50px] pt-4">
                    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                        {phase.tasks?.map((task: any) => (
                            <TaskItem key={task.id} task={task} phaseId={phase.id} projectId={projectId} />
                        ))}
                    </SortableContext>

                    {taskCount === 0 && (
                        <div className="text-center py-10 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                            <p className="text-sm text-slate-400 italic font-medium">Nenhuma tarefa nesta fase</p>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCreateOpen(true)}
                        className="rounded-full px-6 border-[#1d4e46] text-[#1d4e46] hover:bg-[#1d4e46] hover:text-white transition-all font-semibold"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Tarefa
                    </Button>
                </div>

                <TaskDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    phaseId={phase.id}
                    projectId={projectId}
                />
            </AccordionContent>
        </AccordionItem>
    )
}
