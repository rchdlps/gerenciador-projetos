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
}

export function PhaseAccordion({ phase, projectId }: PhaseAccordionProps) {
    const [createOpen, setCreateOpen] = useState(false)
    const taskCount = phase.tasks?.length || 0
    const completedCount = phase.tasks?.filter((t: any) => t.status === 'done').length || 0
    const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0

    // Droppable for empty phase handling
    const { setNodeRef } = useDroppable({
        id: phase.id,
    })

    const taskIds = useMemo(() => phase.tasks?.map((t: any) => t.id) || [], [phase.tasks])

    return (
        <AccordionItem value={phase.id} className="border rounded-md px-4 mb-4 bg-white shadow-sm">
            <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-gray-800">{phase.name}</span>
                        <span className="text-sm text-gray-500 font-normal">{phase.description}</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end min-w-[100px]">
                            <span className="text-sm font-bold text-gray-700">{completedCount}/{taskCount} TAREFAS</span>
                            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-1">
                                <div
                                    className="bg-emerald-600 h-1.5 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{progress}%</span>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-4">
                <div ref={setNodeRef} className="space-y-2 min-h-[50px]">
                    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                        {phase.tasks?.map((task: any) => (
                            <TaskItem key={task.id} task={task} phaseId={phase.id} projectId={projectId} />
                        ))}
                    </SortableContext>

                    {taskCount === 0 && (
                        <div className="text-center py-8 text-gray-400 italic">
                            Nenhuma tarefa nesta fase
                        </div>
                    )}
                </div>

                <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
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
