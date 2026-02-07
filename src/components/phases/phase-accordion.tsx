import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { TaskItem } from "./task-item"
import { Plus, MoreVertical, Trash, AlertTriangle, Pencil } from "lucide-react"
import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TaskDialog } from "./task-dialog"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

interface PhaseAccordionProps {
    phase: any // TODO: Type
    projectId: string
    index: number
}

const PHASE_COLORS = [
    { border: 'border-l-emerald-500', bar: 'bg-emerald-500' },
    { border: 'border-l-blue-500', bar: 'bg-blue-500' },
    { border: 'border-l-indigo-500', bar: 'bg-indigo-500' },
    { border: 'border-l-teal-500', bar: 'bg-teal-500' },
    { border: 'border-l-rose-500', bar: 'bg-rose-500' },
    { border: 'border-l-amber-500', bar: 'bg-amber-500' },
]

export function PhaseAccordion({ phase, projectId, index }: PhaseAccordionProps) {
    const queryClient = useQueryClient()
    const [createOpen, setCreateOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const taskCount = phase.tasks?.length || 0
    const completedCount = phase.tasks?.filter((t: any) => t.status === 'done').length || 0
    const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0

    const color = PHASE_COLORS[index % PHASE_COLORS.length]

    // Droppable for empty phase handling
    const { setNodeRef } = useDroppable({
        id: phase.id,
    })

    const taskIds = useMemo(() => phase.tasks?.map((t: any) => t.id) || [], [phase.tasks])

    const getPhaseSubtitle = (name: string) => {
        if (phase.description) return phase.description

        const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

        if (normalized.includes("iniciacao")) return "Definição e autorização do projeto"
        if (normalized.includes("planejamento")) return "Definição do escopo, cronograma e recursos"
        if (normalized.includes("execucao")) return "Acompanhamento e ajustes do projeto"
        if (normalized.includes("encerramento")) return "Entrega final e lições aprendidas"

        return phase.description || ""
    }



    // Edit Phase State and Handler
    const [editOpen, setEditOpen] = useState(false)
    const [editName, setEditName] = useState(phase.name)
    const [editDescription, setEditDescription] = useState(phase.description || "")
    const [isEditing, setIsEditing] = useState(false)

    const handleEdit = async () => {
        setIsEditing(true)
        try {
            const res = await api.phases[':id'].$patch({
                param: { id: phase.id },
                json: { name: editName, description: editDescription }
            })
            if (!res.ok) throw new Error("Erro ao editar fase")

            toast.success("Fase atualizada com sucesso")
            queryClient.invalidateQueries({ queryKey: ["phases", projectId] })
            setEditOpen(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsEditing(false)
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await api.phases[':id'].$delete({ param: { id: phase.id } })
            if (!res.ok) {
                if (res.status === 403) throw new Error("Sem permissão. Apenas o Dono ou Super Admin podem excluir.")
                throw new Error("Erro ao excluir fase")
            }
            toast.success("Fase excluída com sucesso")
            queryClient.invalidateQueries({ queryKey: ["phases", projectId] })
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsDeleting(false)
            setDeleteOpen(false)
        }
    }

    return (
        <>
            <AccordionItem
                value={phase.id}
                className={`border rounded-xl px-4 mb-4 bg-white shadow-sm border-l-4 transition-all duration-300 ${color.border}`}
            >
                <AccordionTrigger
                    className="hover:no-underline py-6"
                    extraActions={
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                        setEditName(phase.name)
                                        setEditDescription(phase.description || getPhaseSubtitle(phase.name))
                                        setEditOpen(true)
                                    }}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                                    onClick={() => setDeleteOpen(true)}
                                >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Excluir Fase
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                >
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex flex-col items-start gap-0.5">
                            <span className="text-lg font-bold text-gray-800">{phase.name}</span>
                            <span className="text-sm text-gray-500 font-normal">{getPhaseSubtitle(phase.name)}</span>
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

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Fase</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Nome da Fase</Label>
                            <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-desc">Subtítulo (Descrição)</Label>
                            <Input id="edit-desc" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                        <Button onClick={handleEdit} disabled={isEditing || !editName}>
                            {isEditing ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Excluir Fase
                        </DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir a fase <strong>{phase.name}</strong>?
                            <br />
                            Todas as tarefas vinculadas a esta fase também serão excluídas permanentemente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
