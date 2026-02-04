import { useState } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, GripVertical, Calendar, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface BoardCard {
    id: string
    title: string
    content: string // Fallback
    priority: string
    status: string
    assignee?: {
        name: string
        image: string
    }
}

interface BoardColumn {
    id: string
    name: string
    cards: BoardCard[]
}

export function ScrumbanBoard({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
    const [activeCard, setActiveCard] = useState<BoardCard | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const { data: serverColumns = [], isLoading } = useQuery<BoardColumn[]>({
        queryKey: ['board', projectId],
        queryFn: async () => {
            const res = await api.board[':projectId'].$get({ param: { projectId } })
            if (!res.ok) throw new Error()
            return res.json()
        }
    })

    const reorderTasks = useMutation({
        mutationFn: async (items: { id: string, status: string, order: number }[]) => {
            await api.board.reorder.$patch({
                json: { items }
            })
        },
        onMutate: async (newItems) => {
            await queryClient.cancelQueries({ queryKey: ['board', projectId] })
            const previousBoard = queryClient.getQueryData(['board', projectId])

            // Optimistically update
            queryClient.setQueryData(['board', projectId], (old: BoardColumn[] = []) => {
                const newColumns = old.map(col => ({
                    ...col,
                    cards: [...col.cards] // shallow copy
                }));

                newItems.forEach(item => {
                    // Remove from old location
                    newColumns.forEach(c => {
                        c.cards = c.cards.filter(card => card.id !== item.id)
                    })
                })

                // Add to new location with correct order
                newItems.forEach(item => {
                    const col = newColumns.find(c => c.id === item.status)
                    if (col) {
                        // Insert at correct index if possible, or push
                        // Since we are iterating items which might be ordered by index, let's just push? 
                        // No, we need to respect the order property.
                        // But for simplicity in optimistic update, we can trust the re-fetch or reconstruct based on order.
                        // Let's reconstruct the target column cards array.

                        // BUT: newItems only contains modified items.
                        // If we move card A to pos 0, card B becomes pos 1. B is also in newItems.
                        // So we should just rebuild the target column cards from newItems if they belong there? No.
                        // Valid Strategy: 
                        // 1. Remove all items present in newItems from the columns.
                        // 2. Insert items back into their target columns at correct index (order).

                        // But we don't have the full objects in newItems, only IDs.
                        // We need the card objects.
                        // This is getting complex for optimistic update without full object.

                        // Alternative: Rely on the local state calculation done in handleDragEnd.
                        // In handleDragEnd we calculate newColumns.
                        // We can pass THAT to the mutation or use it to setQueryData instantly.
                    }
                })

                return newColumns
            })

            return { previousBoard }
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['board', projectId], context?.previousBoard)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['board', projectId] })
        }
    })

    // Drag-And-Drop Handlers
    const handleDragStart = (event: any) => {
        const { active } = event;
        setActiveId(active.id);

        // Find card
        for (const col of serverColumns) {
            const card = col.cards.find(c => c.id === active.id);
            if (card) {
                setActiveCard(card);
                return;
            }
        }
    };

    const handleDragOver = (event: any) => {
        // Could implement real-time column switching here for smoother visual
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveCard(null);

        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        // Find source and destination columns
        const sourceColumn = serverColumns.find(col => col.cards.some(c => c.id === activeId));
        const destColumn = serverColumns.find(col => col.id === overId) ||
            serverColumns.find(col => col.cards.some(c => c.id === overId));

        if (!sourceColumn || !destColumn) return;

        // Clone deeply
        const newColumns = JSON.parse(JSON.stringify(serverColumns)) as BoardColumn[];
        const sourceColIdx = newColumns.findIndex(c => c.id === sourceColumn.id);
        const destColIdx = newColumns.findIndex(c => c.id === destColumn.id);

        const sourceCards = newColumns[sourceColIdx].cards;
        const destCards = newColumns[destColIdx].cards;

        const oldIndex = sourceCards.findIndex(c => c.id === activeId);
        const cardToMove = sourceCards[oldIndex];

        // Remove from source
        sourceCards.splice(oldIndex, 1);

        // Add to destination
        let newIndex;
        if (destColumn.id === overId) {
            // Dropped on column container -> append
            newIndex = destCards.length;
        } else {
            // Dropped on a card
            const overIndex = destCards.findIndex(c => c.id === overId);
            const isBelow = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
            // Simplified: just insert at index
            newIndex = overIndex >= 0 ? overIndex : destCards.length;
        }

        // Insert
        cardToMove.status = destColumn.id; // Update status
        destCards.splice(newIndex, 0, cardToMove);

        // Calculate updates
        const updates: { id: string, status: string, order: number }[] = [];

        // Update dest column orders
        destCards.forEach((card, index) => {
            updates.push({
                id: card.id,
                status: destColumn.id,
                order: index
            });
        });

        // Update source column orders if different
        if (sourceColumn.id !== destColumn.id) {
            sourceCards.forEach((card, index) => {
                updates.push({
                    id: card.id,
                    status: sourceColumn.id,
                    order: index
                });
            });
        }

        // Optimistic UI update
        queryClient.setQueryData(['board', projectId], newColumns);

        await reorderTasks.mutateAsync(updates);
    };

    if (isLoading) return <div>Carregando Quadro...</div>

    return (
        <div className="space-y-4 py-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">Quadro Scrumban</h3>
                {/* Removed Add Column as columns are fixed */}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 overflow-x-auto pb-6 min-h-[500px]">
                    {serverColumns.map(col => (
                        <BoardColumn key={col.id} column={col} />
                    ))}
                </div>
                {typeof document !== 'undefined' && createPortal(
                    <DragOverlay>
                        {activeCard ? (
                            <div className="bg-card p-3 rounded-lg shadow-xl border-2 border-primary rotate-2 w-80 opacity-90 cursor-grabbing z-[9999]">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-medium text-foreground">{activeCard.title || activeCard.content}</span>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
        </div>
    )
}

interface BoardColumnProps {
    column: BoardColumn
}

function BoardColumn({ column }: BoardColumnProps) {
    const { setNodeRef } = useDroppable({ id: column.id });

    return (
        <div
            ref={setNodeRef}
            className="w-80 flex-shrink-0 bg-muted/30 rounded-xl border flex flex-col max-h-[700px]"
        >
            {/* Header */}
            <div className={`p-4 font-bold border-b rounded-t-xl bg-muted/50 sticky top-0 flex justify-between items-center ${column.id === 'done' ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                {column.name}
                <span className="text-xs bg-background border px-2 py-0.5 rounded-full text-muted-foreground">{column.cards.length}</span>
            </div>

            {/* Cards Area */}
            <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className="p-3 flex-1 overflow-y-auto space-y-3" id={column.id}>
                    {column.cards.map(card => (
                        <SortableCard key={card.id} card={card} />
                    ))}
                    {column.cards.length === 0 && (
                        <div className="h-20 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed rounded opacity-50">
                            Arraste tarefas aqui
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    )
}

function SortableCard({ card }: { card: BoardCard }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1
    };

    const priorityColors: Record<string, string> = {
        low: "bg-blue-100 text-blue-800",
        medium: "bg-yellow-100 text-yellow-800",
        high: "bg-orange-100 text-orange-800",
        urgent: "bg-red-100 text-red-800",
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-card p-3 rounded-lg shadow-sm border hover:border-primary cursor-grab group relative transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-foreground line-clamp-2">{card.title || card.content}</p>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                </div>
            </div>

            <div className="flex items-center justify-between mt-3">
                <div className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${priorityColors[card.priority] || 'bg-gray-100'}`}>
                    {card.priority}
                </div>
                {card.assignee && (
                    <div className="flex items-center gap-1" title={card.assignee.name}>
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={card.assignee.image} />
                            <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
                                {card.assignee.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                )}
            </div>
        </div>
    )
}
