import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TaskDialog } from "./task-dialog"
import { Calendar, User, GripVertical } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface TaskItemProps {
    task: any // TODO: add type
    phaseId: string
    projectId: string
}

export function TaskItem({ task, phaseId, projectId }: TaskItemProps) {
    const [open, setOpen] = useState(false)

    // Sortable Hook
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    }

    const priorityColors = {
        low: "bg-blue-100 text-blue-800",
        medium: "bg-yellow-100 text-yellow-800",
        high: "bg-orange-100 text-orange-800",
        urgent: "bg-red-100 text-red-800",
    }

    const statusLabels = {
        todo: "A Fazer",
        in_progress: "Em Andamento",
        review: "Em Revisão",
        done: "Concluído"
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card
                className="mb-2 hover:shadow-md transition-shadow border-l-4 group"
                style={{ borderLeftColor: task.status === 'done' ? '#10b981' : '#e5e7eb' }}
            >
                <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                        {/* Drag Handle */}
                        <div
                            {...listeners}
                            className="mr-3 mt-1 cursor-grab text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>

                        <div
                            className="space-y-1 flex-1 cursor-pointer"
                            onClick={() => setOpen(true)}
                        >
                            <h4 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-500' : ''}`}>
                                {task.title}
                            </h4>
                            <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>

                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                {(task.startDate || task.endDate) && (
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                            {task.startDate ? new Date(task.startDate).toISOString().split('T')[0].split('-').reverse().join('/') : '...'}
                                            {' - '}
                                            {task.endDate ? new Date(task.endDate).toISOString().split('T')[0].split('-').reverse().join('/') : '...'}
                                        </span>
                                    </div>
                                )}
                                {task.assignee && (
                                    <div className="flex items-center gap-1" title={task.assignee.name}>
                                        <Avatar className="h-5 w-5">
                                            <AvatarImage src={task.assignee.image} />
                                            <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                                                {task.assignee.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] hidden sm:inline-block">{task.assignee.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 items-end ml-2">
                            <Badge variant="outline">{statusLabels[task.status as keyof typeof statusLabels] || task.status}</Badge>
                            <div className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${priorityColors[task.priority as keyof typeof priorityColors] || 'bg-gray-100'}`}>
                                {task.priority}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <TaskDialog
                open={open}
                onOpenChange={setOpen}
                task={task}
                phaseId={phaseId}
                projectId={projectId}
            />
        </div>
    )
}
