import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, GripVertical, Trash2 } from "lucide-react"

interface BoardCard {
    id: string
    content: string
}

interface BoardColumn {
    id: string
    name: string
    cards: BoardCard[]
}

export function ScrumbanBoard({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const { data: columns = [], isLoading } = useQuery<BoardColumn[]>({
        queryKey: ['board', projectId],
        queryFn: async () => {
            const res = await api.board[':projectId'].$get({ param: { projectId } })
            if (!res.ok) throw new Error()
            return res.json()
        }
    })

    const createColumn = useMutation({
        mutationFn: async () => {
            // Demo: Add default columns if empty, or generic one
            const res = await api.board[':projectId'].columns.$post({
                param: { projectId },
                json: { name: "Nova Coluna" }
            })
            if (!res.ok) throw new Error()
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board', projectId] })
    })

    const createCard = useMutation({
        mutationFn: async ({ columnId, content }: { columnId: string, content: string }) => {
            const res = await api.board.columns[':columnId'].cards.$post({
                param: { columnId },
                json: { content }
            })
            if (!res.ok) throw new Error()
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board', projectId] })
    })

    const moveCard = useMutation({
        mutationFn: async ({ cardId, columnId }: { cardId: string, columnId: string }) => {
            await api.board.cards[':id'].move.$patch({
                param: { id: cardId },
                json: { columnId }
            })
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board', projectId] })
    })

    // Setup Drag End
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null)

        if (!over) return;

        const activeCardId = String(active.id);
        const overId = over.id;

        // Find source and dest columns
        // This logic simplifies assuming we drag cards to columns directly or other cards in columns
        // For MVP, simply assume dropping onto a Column Container changes the column.

        // Detailed implementation would require finding the container of the overId
        // Keeping it simple: If dropping on a Column, move to that column.

        // Check if overId is a column
        const overColumn = columns.find(c => c.id === overId)
        if (overColumn) {
            await moveCard.mutateAsync({ cardId: activeCardId, columnId: overColumn.id })
            return
        }

        // If dropping on another card, find that card's column
        let foundColumnId = null
        for (const col of columns) {
            if (col.cards.find(c => c.id === overId)) {
                foundColumnId = col.id
                break
            }
        }

        if (foundColumnId) {
            await moveCard.mutateAsync({ cardId: activeCardId, columnId: foundColumnId })
        }
    }

    if (isLoading) return <div>Loading Board...</div>

    return (
        <div className="space-y-4 py-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">Quadro Scrumban</h3>
                <Button onClick={() => createColumn.mutate()} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Coluna
                </Button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={(e) => setActiveId(e.active.id)}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 overflow-x-auto pb-6 min-h-[500px]">
                    {columns.map(col => (
                        <BoardColumn key={col.id} column={col} onCreateCard={createCard.mutate} />
                    ))}
                    {columns.length === 0 && (
                        <div className="border-2 border-dashed rounded-lg flex items-center justify-center w-64 h-32 text-muted-foreground bg-muted/20">
                            Sem colunas
                        </div>
                    )}
                </div>
                <DragOverlay>
                    {activeId ? <div className="bg-white p-4 rounded shadow-xl border-2 border-primary rotate-2 w-full h-20">Dragging...</div> : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}

interface BoardColumnProps {
    column: BoardColumn
    onCreateCard: (args: { columnId: string; content: string }) => void
}

function BoardColumn({ column, onCreateCard }: BoardColumnProps) {
    const [newCardText, setNewCardText] = useState("")

    return (
        <div className="w-80 flex-shrink-0 bg-muted/30 rounded-xl border flex flex-col max-h-[700px]">
            {/* Header */}
            <div className={`p-4 font-bold border-b rounded-t-xl bg-muted/50 sticky top-0 flex justify-between items-center ${column.name === 'Done' ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                {column.name}
                <span className="text-xs bg-background border px-2 py-0.5 rounded-full text-muted-foreground">{column.cards.length}</span>
            </div>

            {/* Cards Area */}
            <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className="p-3 flex-1 overflow-y-auto space-y-3" id={column.id}>
                    {column.cards.map(card => (
                        <SortableCard key={card.id} card={card} />
                    ))}
                </div>
            </SortableContext>

            {/* Footer Add */}
            <div className="p-3 border-t bg-muted/50 rounded-b-xl">
                <div className="flex gap-2">
                    <Input
                        placeholder="+ add card"
                        value={newCardText}
                        onChange={e => setNewCardText(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && newCardText) {
                                onCreateCard({ columnId: column.id, content: newCardText })
                                setNewCardText("")
                            }
                        }}
                        className="bg-transparent border-none shadow-none focus-visible:ring-0 px-2 text-sm"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                        if (newCardText) {
                            onCreateCard({ columnId: column.id, content: newCardText })
                            setNewCardText("")
                        }
                    }}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function SortableCard({ card }: { card: BoardCard }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-card p-3 rounded-lg shadow-sm border hover:border-primary cursor-grab group relative transition-colors">
            <p className="text-sm font-medium text-foreground">{card.content}</p>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3 h-3 text-muted-foreground" />
            </div>
        </div>
    )
}
