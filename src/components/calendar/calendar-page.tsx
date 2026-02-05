import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { CalendarView } from "@/components/calendar/calendar-view"
import { DayTaskList } from "@/components/calendar/day-task-list"
import { AppointmentWidget } from "@/components/calendar/appointment-widget"
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
            return data.flatMap((col: any) => col?.cards || [])
        }
    })

    const { data: appointments = [] } = useQuery({
        queryKey: ['appointments', projectId],
        queryFn: async () => {
            const res = await api.appointments[':projectId'].$get({ param: { projectId } })
            if (!res.ok) return []
            return await res.json()
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
                    appointments={appointments}
                />
            </div>

            {/* Right Panel: Day Details & Appointments */}
            <div className="md:col-span-1 h-full flex flex-col gap-6">
                <div className="flex-1 min-h-0">
                    <DayTaskList
                        date={date}
                        tasks={tasks} // Keep tasks separate for the List
                        projectId={projectId}
                    />
                </div>
                <AppointmentWidget projectId={projectId} />
            </div>
        </div>
    )
}
