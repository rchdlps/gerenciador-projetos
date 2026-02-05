import { useState } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { DndContext, DragOverlay, closestCorners, pointerWithin, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core';
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
        const { active, over } = event;
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        // Find sortable container ids
        const sourceColumn = serverColumns.find(col => col.cards.some(c => c.id === activeId));
        const destColumn = serverColumns.find(col => col.id === overId) ||
            serverColumns.find(col => col.cards.some(c => c.id === overId));

        if (!sourceColumn || !destColumn) return;
        if (sourceColumn.id === destColumn.id) return;

        // Moving to different column
        // We need to optimistically update the query cache to reflect the move
        queryClient.setQueryData(['board', projectId], (old: BoardColumn[] = []) => {
            const newColumns = JSON.parse(JSON.stringify(old)) as BoardColumn[];
            const sourceColIdx = newColumns.findIndex(c => c.id === sourceColumn.id);
            const destColIdx = newColumns.findIndex(c => c.id === destColumn.id);

            const sourceCards = newColumns[sourceColIdx].cards;
            const destCards = newColumns[destColIdx].cards;

            const oldIndex = sourceCards.findIndex(c => c.id === activeId);
            const cardToMove = sourceCards[oldIndex];

            // Remove from source
            sourceCards.splice(oldIndex, 1);

            // Add to dest
            let newIndex;
            if (destColumn.id === overId) {
                newIndex = destCards.length;
            } else {
                const overIndex = destCards.findIndex(c => c.id === overId);
                const isBelow = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
                const modifier = isBelow ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : destCards.length;
            }

            // Update status temporarily (will be fixed in DragEnd)
            cardToMove.status = destColumn.id;
            destCards.splice(newIndex, 0, cardToMove);

            return newColumns;
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveCard(null);

        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        // At this point, thanks to handleDragOver, the item might already be in the dest column in local state?
        // Actually, dnd-kit resets state on drag end if we don't commit it?
        // No, we updated queryClient data, so the UI is already showing it in the new place.
        // We just need to persist the FINAL state and order.

        // However, handleDragOver doesn't run on the very last drop frame sometimes.
        // We should recalculate the final move to be safe and persist it.

        const currentColumns = queryClient.getQueryData<BoardColumn[]>(['board', projectId]) || [];

        // Find where the item IS now (should be in dest column if DragOver ran)
        const sourceColumn = currentColumns.find(col => col.cards.some(c => c.id === activeId));

        // If we dropped on a container or item, find that column
        const destColumn = currentColumns.find(col => col.id === overId) ||
            currentColumns.find(col => col.cards.some(c => c.id === overId));

        if (!sourceColumn || !destColumn) return;

        // Perform the final reorder in memory to get clean payload
        const newColumns = JSON.parse(JSON.stringify(currentColumns)) as BoardColumn[];
        const sourceColIdx = newColumns.findIndex(c => c.id === sourceColumn.id);
        const destColIdx = newColumns.findIndex(c => c.id === destColumn.id);

        const sourceCards = newColumns[sourceColIdx].cards;
        const destCards = newColumns[destColIdx].cards;

        const oldIndex = sourceCards.findIndex(c => c.id === activeId);
        const cardToMove = sourceCards[oldIndex];

        // If simple reorder in same column
        if (sourceColumn.id === destColumn.id) {
            const overIndex = destCards.findIndex(c => c.id === overId);
            // Use arrayMove equivalent logic
            if (oldIndex !== overIndex && overIndex !== -1) {
                const [removed] = destCards.splice(oldIndex, 1);
                destCards.splice(overIndex, 0, removed);
                queryClient.setQueryData(['board', projectId], newColumns);
            }
        } else {
            // Should have been handled by DragOver, but handle edge case if DragOver didn't fire?
            // If DragOver fired, sourceColumn === destColumn (the new one).
            // So we likely fall into the block above.
            // If DragOver didn't fire (fast drop?), we handle cross-column here.

            // Remove from source
            sourceCards.splice(oldIndex, 1);

            // Add to dest
            let newIndex;
            if (destColumn.id === overId) {
                newIndex = destCards.length;
            } else {
                const overIndex = destCards.findIndex(c => c.id === overId);
                newIndex = overIndex >= 0 ? overIndex : destCards.length;
            }

            cardToMove.status = destColumn.id;
            destCards.splice(newIndex, 0, cardToMove);
            queryClient.setQueryData(['board', projectId], newColumns);
        }

        // --- Persist to Backend ---
        // We calculate updates based on the FINAL state of newColumns
        const updates: { id: string, status: string, order: number }[] = [];

        // We only really need to send updates for the modified columns
        // For simplicity, let's send updates for all cards in modified columns (source and dest)
        const columnsToUpdate = new Set([sourceColumn.id, destColumn.id]);

        newColumns.forEach(col => {
            if (columnsToUpdate.has(col.id)) {
                col.cards.forEach((card, index) => {
                    updates.push({
                        id: card.id,
                        status: col.id,
                        order: index
                    });
                });
            }
        });

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
                collisionDetection={pointerWithin}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-6 min-h-[500px]">
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
            className="flex flex-col h-full bg-muted/30 rounded-xl border max-h-[700px]"
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
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                            {card.assignee.name}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
