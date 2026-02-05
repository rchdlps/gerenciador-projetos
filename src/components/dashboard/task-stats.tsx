import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface BoardColumn {
    id: string
    name: string
    cards: any[]
}

interface TaskStatsProps {
    columns: BoardColumn[]
    isLoading: boolean
}

export function TaskStats({ columns, isLoading }: TaskStatsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded-lg" />
                ))}
            </div>
        )
    }

    // Calculate Stats
    let total = 0
    let completed = 0
    let inProgress = 0
    let overdue = 0
    const now = new Date()

    columns.forEach(col => {
        total += col.cards.length

        if (col.id === 'done') {
            completed += col.cards.length
        } else if (col.id === 'in_progress') {
            inProgress += col.cards.length
        }

        // Check for overdue in non-completed columns
        if (col.id !== 'done') {
            col.cards.forEach(card => {
                if (card.endDate) {
                    const end = new Date(card.endDate)
                    // Set to end of day to consider tasks due today as not overdue
                    end.setHours(23, 59, 59, 999)

                    if (end < now) {
                        overdue++
                    }
                }
            })
        }
    })

    const stats = [
        {
            label: "TOTAL DE TAREFAS",
            value: total,
            color: "text-green-600",
            borderColor: "border-green-100" // Not used in design but consistent
        },
        {
            label: "CONCLUÍDAS",
            value: completed,
            color: "text-green-600",
            total: total
        },
        {
            label: "EM ANDAMENTO",
            value: inProgress,
            color: "text-blue-600"
        },
        {
            label: "ATRASADAS",
            value: overdue,
            color: "text-red-500"
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
                <Card key={idx} className="shadow-none border rounded-lg">
                    <CardContent className="p-4 pt-4">
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                            {stat.label}
                        </div>
                        <div className={`text-2xl font-bold ${stat.color}`}>
                            {stat.value}
                        </div>
                        {/* Progress Bar for Completed */}
                        {stat.label === 'CONCLUÍDAS' && stat.total !== undefined && stat.total > 0 && (
                            <div className="w-full h-1.5 bg-muted rounded-full mt-2">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(stat.value / stat.total) * 100}%` }}
                                />
                            </div>
                        )}
                        {/* Placeholder line for others to align height if needed, OR nothing */}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
