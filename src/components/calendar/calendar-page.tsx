import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { CalendarView } from "@/components/calendar/calendar-view"
import { CalendarRightPanel } from "@/components/calendar/calendar-right-panel"
import { Providers } from "@/components/providers"
import { OrgProvider } from "@/contexts/org-context"
import { ProjectReadOnlyBanner } from "@/components/dashboard/project-read-only-banner"


export function CalendarPage({ projectId, initialData, orgSessionData }: { projectId?: string; initialData?: any; orgSessionData?: any }) {
    return (
        <Providers>
            <OrgProvider initialData={orgSessionData}>
                <CalendarPageContent projectId={projectId} initialData={initialData} />
            </OrgProvider>
        </Providers>
    )
}


function CalendarPageContent({ projectId, initialData }: { projectId?: string; initialData?: any }) {
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
        },
        initialData: initialData?.tasks
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
        },
        initialData: initialData?.appointments
    })

    return (
        <div className="space-y-4">
            {projectId && <ProjectReadOnlyBanner projectId={projectId} />}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
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
                {/* Wrapper to ensure height matches Left Panel in grid */}
                <div className="md:col-span-1 relative md:h-full min-h-[500px]">
                    <div className="md:absolute md:inset-0">
                        <CalendarRightPanel
                            date={date}
                            currentMonth={currentMonth}
                            tasks={tasks}
                            appointments={appointments}
                            projectId={projectId}
                            onClearDate={() => setDate(undefined)}
                            className="h-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
