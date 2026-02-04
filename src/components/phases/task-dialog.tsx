import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api-client"
import { toast } from "sonner"
import { useQueryClient, useQuery } from "@tanstack/react-query"

interface TaskDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    task?: any // TODO: add proper type
    phaseId: string
    projectId: string
}

export function TaskDialog({ open, onOpenChange, task, phaseId, projectId }: TaskDialogProps) {
    const [loading, setLoading] = useState(false)
    const queryClient = useQueryClient()

    const { data: members } = useQuery({
        queryKey: ['project-members', projectId],
        queryFn: async () => {
            const res = await api.projects[':id'].members.$get({ param: { id: projectId } })
            if (!res.ok) return []
            return res.json()
        },
        enabled: open // Only fetch when dialog opens
    })

    // Form State
    const [title, setTitle] = useState(task?.title || "")
    const [description, setDescription] = useState(task?.description || "")
    const [startDate, setStartDate] = useState(task?.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "")
    const [endDate, setEndDate] = useState(task?.endDate ? new Date(task.endDate).toISOString().split('T')[0] : "")
    const [status, setStatus] = useState(task?.status || "todo")
    const [priority, setPriority] = useState(task?.priority || "medium")
    const [assigneeId, setAssigneeId] = useState(task?.assigneeId || "unassigned")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (task) {
                // Update
                const res = await api.tasks[":id"].$patch({
                    param: { id: task.id },
                    json: {
                        title,
                        description,
                        startDate: startDate || null,
                        endDate: endDate || null,
                        assigneeId: assigneeId === "unassigned" ? null : assigneeId,
                        status,
                        priority
                    }
                })
                if (!res.ok) throw new Error("Failed to update task")
                toast.success("Tarefa atualizada!")
            } else {
                // Create
                const res = await api.tasks.$post({
                    json: {
                        phaseId,
                        title,
                        description,
                        startDate: startDate || undefined,
                        endDate: endDate || undefined,
                        assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
                        status,
                        priority
                    }
                })
                if (!res.ok) throw new Error("Failed to create task")
                toast.success("Tarefa criada!")
            }

            queryClient.invalidateQueries({ queryKey: ["phases", projectId] })
            onOpenChange(false)
        } catch (error) {
            toast.error("Erro ao salvar tarefa")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{task ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Responsável</Label>
                        <Select value={assigneeId} onValueChange={setAssigneeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um responsável" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Sem responsável</SelectItem>
                                {members?.map((member: any) => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Início</Label>
                            <Input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">Término</Label>
                            <Input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Prioridade</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Baixa</SelectItem>
                                    <SelectItem value="medium">Média</SelectItem>
                                    <SelectItem value="high">Alta</SelectItem>
                                    <SelectItem value="urgent">Urgente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todo">Não Iniciada</SelectItem>
                                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                                    <SelectItem value="review">Em Revisão</SelectItem>
                                    <SelectItem value="done">Concluída</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
