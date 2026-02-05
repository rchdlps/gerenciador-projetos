import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { PhaseAccordion } from "./phase-accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Accordion } from "@/components/ui/accordion"
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragStartEvent,
    type DragOverEvent,
    type DragEndEvent
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates, SortableContext } from "@dnd-kit/sortable"
import { TaskItem } from "./task-item"

interface PhaseListProps {
    projectId: string
}

export function PhaseList({ projectId }: PhaseListProps) {
    const queryClient = useQueryClient()
    const [newPhaseOpen, setNewPhaseOpen] = useState(false)
    const [newPhaseName, setNewPhaseName] = useState("")
    const [creating, setCreating] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeTask, setActiveTask] = useState<any>(null)
    const [expandedPhases, setExpandedPhases] = useState<string[]>([])

    // Fetch Phases
    const { data: phases, isLoading } = useQuery({
        queryKey: ["phases", projectId],
        queryFn: async () => {
            const res = await api.phases[":projectId"].$get({ param: { projectId } })
            if (!res.ok) throw new Error("Failed to fetch phases")
            return await res.json()
        }
    })

    const toggleAll = () => {
        if (!phases) return
        if (expandedPhases.length > 0) {
            setExpandedPhases([])
        } else {
            setExpandedPhases(phases.map((p: any) => p.id))
        }
    }

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const findPhase = (id: string) => {
        if (!phases) return null
        return phases.find((p: any) => p.tasks.some((t: any) => t.id === id) || p.id === id)
    }

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        setActiveId(active.id as string)

        // Find the active task for overlay
        for (const phase of phases || []) {
            const task = phase.tasks.find((t: any) => t.id === active.id)
            if (task) {
                setActiveTask(task)
                break
            }
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const overId = over.id

        // Find phases
        const activePhase = findPhase(activeId as string)
        const overPhase = findPhase(overId as string)

        if (!activePhase || !overPhase) return

        // If moving between phases
        if (activePhase.id !== overPhase.id) {
            // We generally handle visual updates in DragEnd for simplicity with React Query
            // But for real-time visual feedback we would mutate the cache here
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        // Reset state
        setActiveId(null)
        setActiveTask(null)

        if (!over) return

        const activeData = active.data.current

        // PHASE REORDERING
        if (activeData?.type === "phase") {
            if (active.id !== over.id) {
                queryClient.setQueryData(["phases", projectId], (old: any) => {
                    const oldIndex = old.findIndex((p: any) => p.id === active.id)
                    const newIndex = old.findIndex((p: any) => p.id === over.id)

                    const newPhases = arrayMove(old, oldIndex, newIndex)

                    // Optimistic update done, now API
                    const updates = newPhases.map((p: any, index: number) => ({
                        id: p.id,
                        order: index
                    }))

                    api.phases[":projectId"].reorder.$patch({
                        param: { projectId },
                        json: { items: updates }
                    })

                    return newPhases
                })
            }
            return
        }

        // TASK REORDERING (Existing Logic)
        const activePhase = findPhase(active.id as string)
        const overPhase = findPhase(over.id as string)

        if (activePhase && overPhase) {
            queryClient.setQueryData(["phases", projectId], (old: any) => {
                const newPhases = JSON.parse(JSON.stringify(old))

                const activePhaseIndex = newPhases.findIndex((p: any) => p.id === activePhase.id)
                const overPhaseIndex = newPhases.findIndex((p: any) => p.id === overPhase.id)

                const activeTaskIndex = newPhases[activePhaseIndex].tasks.findIndex((t: any) => t.id === active.id)
                let overTaskIndex = newPhases[overPhaseIndex].tasks.findIndex((t: any) => t.id === over.id)

                // Moving specific task
                const movedTask = newPhases[activePhaseIndex].tasks[activeTaskIndex]

                // Remove from old
                newPhases[activePhaseIndex].tasks.splice(activeTaskIndex, 1)

                if (activePhase.id === overPhase.id) {
                    // Same container sorting
                    if (overTaskIndex === -1) {
                        // Dropped on container itself?
                        overTaskIndex = newPhases[overPhaseIndex].tasks.length
                    }
                    // Correct index adjustment if moving down
                    newPhases[overPhaseIndex].tasks.splice(overTaskIndex, 0, movedTask)
                } else {
                    // Different container
                    let newIndex = overTaskIndex
                    if (overTaskIndex === -1) {
                        // Dropped on empty phase or phase container
                        newIndex = newPhases[overPhaseIndex].tasks.length
                    }
                    movedTask.phaseId = overPhase.id
                    newPhases[overPhaseIndex].tasks.splice(newIndex, 0, movedTask)
                }

                // Prepare API Update payload
                const updates: any[] = []

                // Active Phase (if different)
                if (activePhase.id !== overPhase.id) {
                    newPhases[activePhaseIndex].tasks.forEach((t: any, i: number) => {
                        t.order = i
                        updates.push({ id: t.id, phaseId: t.phaseId, order: i })
                    })
                }

                // Over Phase (always updated)
                newPhases[overPhaseIndex].tasks.forEach((t: any, i: number) => {
                    t.order = i
                    updates.push({ id: t.id, phaseId: t.phaseId, order: i })
                })

                // Fire and forget API call
                api.tasks.reorder.$patch({ json: { items: updates } })

                return newPhases
            })
        }
    }

    // Create Phase Mutation
    const createPhase = async () => {
        if (!newPhaseName.trim()) return
        setCreating(true)

        try {
            const res = await api.phases[":projectId"].$post({
                param: { projectId },
                json: { name: newPhaseName }
            })

            if (!res.ok) throw new Error("Failed to create phase")

            toast.success("Fase criada com sucesso!")
            setNewPhaseName("")
            setNewPhaseOpen(false)
            queryClient.invalidateQueries({ queryKey: ["phases", projectId] })
        } catch (error) {
            toast.error("Erro ao criar fase")
            console.error(error)
        } finally {
            setCreating(false)
        }
    }

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                        Fases do Projeto
                    </h2>

                    <div className="flex items-center gap-2">
                        {phases && phases.length > 0 && (
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={toggleAll}
                            >
                                {expandedPhases.length > 0 ? "Recolher Tudo" : "Expandir Tudo"}
                            </Button>
                        )}
                        <Dialog open={newPhaseOpen} onOpenChange={setNewPhaseOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nova Fase
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Adicionar Nova Fase</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome da Fase</Label>
                                        <Input
                                            id="name"
                                            value={newPhaseName}
                                            onChange={(e) => setNewPhaseName(e.target.value)}
                                            placeholder="Ex: Pós-Implementação"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setNewPhaseOpen(false)}>Cancelar</Button>
                                    <Button onClick={createPhase} disabled={creating || !newPhaseName}>
                                        {creating ? "Criando..." : "Criar Fase"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <SortableContext items={phases?.map((p: any) => p.id) || []}>
                    <Accordion
                        type="multiple"
                        value={expandedPhases}
                        onValueChange={setExpandedPhases}
                        className="w-full space-y-4"
                    >
                        {phases?.map((phase: any, index: number) => (
                            <SortablePhaseWrapper key={phase.id} phase={phase} projectId={projectId} index={index}>
                                <PhaseAccordion
                                    phase={phase}
                                    projectId={projectId}
                                    index={index}
                                />
                            </SortablePhaseWrapper>
                        ))}
                    </Accordion>
                </SortableContext>

                {phases?.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                        <p className="text-gray-500 mb-4">Nenhuma fase definida para este projeto.</p>
                        <Button variant="outline" onClick={() => setNewPhaseOpen(true)}>
                            Começar definindo as fases
                        </Button>
                    </div>
                )}

                <DragOverlay>
                    {activeId ? (
                        activeTask ? (
                            <div className="opacity-80 rotate-2 cursor-grabbing">
                                <TaskItem task={activeTask} phaseId={activeTask.phaseId} projectId={projectId} />
                            </div>
                        ) : (
                            // Overlay for Phase
                            <div className="bg-white rounded-lg shadow-xl p-4 border-l-4 border-l-emerald-500 opacity-90 cursor-grabbing">
                                <h3 className="font-semibold text-lg">{phases?.find((p: any) => p.id === activeId)?.name}</h3>
                            </div>
                        )

                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    )
}

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

function SortablePhaseWrapper({ children, phase }: { children: React.ReactNode, phase: any, projectId: string, index: number }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: phase.id,
        data: {
            type: "phase",
            phase
        }
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as const
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <div className="flex items-center gap-2">
                <div {...listeners} className="cursor-grab hover:text-emerald-600 px-2 py-4">
                    <span className="sr-only">Move</span>
                    <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400"><path d="M5.5 2.5C5.5 2.22386 5.27614 2 5 2C4.72386 2 4.5 2.22386 4.5 2.5V12.5C4.5 12.7761 4.72386 13 5 13C5.27614 13 5.5 12.7761 5.5 12.5V2.5ZM10.5 2.5C10.5 2.22386 10.2761 2 10 2C9.72386 2 9.5 2.22386 9.5 2.5V12.5C9.5 12.7761 9.72386 13 10 13C10.2761 13 10.5 12.7761 10.5 12.5V2.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </div>
                <div className="flex-1">
                    {children}
                </div>
            </div>
        </div>
    )
}
