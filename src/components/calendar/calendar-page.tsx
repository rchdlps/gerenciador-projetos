import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { CalendarView } from "@/components/calendar/calendar-view"
import { DayTaskList } from "@/components/calendar/day-task-list"
import { Providers } from "@/components/providers"


export function CalendarPage({ projectId }: { projectId: string }) {
    return (
        <Providers>
            <CalendarPageContent projectId={projectId} />
        </Providers>
    )
}

function CalendarPageContent({ projectId }: { projectId: string }) {
    const [date, setDate] = useState<Date | undefined>(new Date())

    const { data: tasks = [] } = useQuery({
        queryKey: ['board', projectId],
        queryFn: async () => {
            const res = await api.board[':projectId'].$get({ param: { projectId } })
            if (!res.ok) throw new Error()
            const data = await res.json()
            // Flatten columns to get all tasks
            return data.flatMap((col: any) => col?.tasks || [])
        }
    })

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Left Panel: Calendar */}
            <div className="md:col-span-2 bg-white dark:bg-card rounded-2xl shadow-sm border p-8 flex flex-col">
                <CalendarView
                    date={date}
                    setDate={setDate}
                    tasks={tasks}
                />
            </div>

            {/* Right Panel: Day Details */}
            <div className="md:col-span-1 h-full">
                <DayTaskList
                    date={date}
                    tasks={tasks}
                    projectId={projectId}
                />
            </div>
        </div>
    )
}
