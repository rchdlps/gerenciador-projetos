import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { CalendarView } from "@/components/calendar/calendar-view"
import { CalendarRightPanel } from "@/components/calendar/calendar-right-panel"
import { Providers } from "@/components/providers"


export function CalendarPage({ projectId }: { projectId?: string }) {
    return (
        <Providers>
            <CalendarPageContent projectId={projectId} />
        </Providers>
    )
}


function CalendarPageContent({ projectId }: { projectId?: string }) {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())

    const handleSetCurrentMonth = (newMonth: Date) => {
        setCurrentMonth(newMonth)
        setDate(undefined) // Clear selected date to show month view
    }


    const { data: tasks = [] } = useQuery({
        queryKey: projectId ? ['board', projectId] : ['tasks', 'dated'],
        queryFn: async () => {
            if (projectId) {
                const res = await api.board[':projectId'].$get({ param: { projectId } })
                if (!res.ok) throw new Error()
                const data = await res.json()
                // Flatten columns to get all tasks
                return data.flatMap((col: any) => col?.cards || [])
            } else {
                const res = await api.tasks.dated.$get()
                if (!res.ok) return []
                return await res.json()
            }
        }
    })

    const { data: appointments = [] } = useQuery({
        queryKey: projectId ? ['appointments', projectId] : ['appointments', 'global'],
        queryFn: async () => {
            if (projectId) {
                const res = await api.appointments[':projectId'].$get({ param: { projectId } })
                if (!res.ok) return []
                return await res.json()
            } else {
                const res = await api.appointments.$get()
                if (!res.ok) return []
                return await res.json()
            }
        }
    })

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Left Panel: Calendar */}
            <div className="md:col-span-2 bg-white dark:bg-card rounded-2xl shadow-sm border p-8 flex flex-col">
                <CalendarView
                    date={date}
                    setDate={setDate}
                    currentMonth={currentMonth}
                    setCurrentMonth={handleSetCurrentMonth}
                    tasks={tasks}
                    appointments={appointments}
                    showProjectNames={!projectId}
                />
            </div>

            {/* Right Panel: Day Details & Appointments */}
            <div className="md:col-span-1 h-full flex flex-col gap-6">
                <div className="flex-1 min-h-0 h-full">
                    <CalendarRightPanel
                        date={date}
                        currentMonth={currentMonth}
                        tasks={tasks}
                        appointments={appointments}
                        projectId={projectId}
                        onClearDate={() => setDate(undefined)}
                    />
                </div>
            </div>
        </div>
    )
}
