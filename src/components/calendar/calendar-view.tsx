import { useState, useMemo } from "react"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
    format,
    isSameDay,
    isSameMonth,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isToday
} from "date-fns"
import { cn } from "@/lib/utils"

interface CalendarViewProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    tasks: any[]
    appointments: any[]
    showProjectNames?: boolean
}

export function CalendarView({ date, setDate, currentMonth, setCurrentMonth, tasks, appointments, showProjectNames }: CalendarViewProps & { currentMonth: Date, setCurrentMonth: (date: Date) => void }) {

    const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

    // Calculate calendar grid
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart, { locale: ptBR }) // Standard localized week start
        const endDate = endOfWeek(monthEnd, { locale: ptBR })

        return eachDayOfInterval({
            start: startDate,
            end: endDate
        })
    }, [currentMonth])

    const weekDays = useMemo(() => {
        const start = startOfWeek(new Date(), { locale: ptBR })
        return Array.from({ length: 7 }).map((_, i) => {
            const day = new Date(start)
            day.setDate(day.getDate() + i)
            return format(day, 'eee', { locale: ptBR })
        })
    }, [])

    const hasTask = (day: Date) => tasks.some(t => {
        if (!t) return false
        const start = t.startDate ? new Date(t.startDate) : null
        const end = t.endDate ? new Date(t.endDate) : null

        if (start && end) {
            return day >= start && day <= end || isSameDay(day, start) || isSameDay(day, end)
        }

        const targetDate = start || end
        return targetDate && isSameDay(targetDate, day)
    })

    const hasAppointment = (day: Date) => appointments.some(a => a && a.date && isSameDay(new Date(a.date), day))

    return (
        <div className="h-full flex flex-col p-8 w-full">
            {/* Custom Header */}
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-bold text-[#1d4e46] capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePreviousMonth}
                        className="p-2 hover:bg-[#f0fdfa] rounded-lg text-[#1d4e46] transition-colors"
                        aria-label="Mês anterior"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-[#f0fdfa] rounded-lg text-[#1d4e46] transition-colors"
                        aria-label="Próximo mês"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col justify-center">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-4">
                    {weekDays.map((day) => (
                        <div key={day} className="text-center text-[#64748b] font-semibold text-lg capitalize py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-2 flex-1">
                    {calendarDays.map((day, idx) => {
                        const isSelected = date && isSameDay(day, date)
                        const isCurrentMonth = isSameMonth(day, currentMonth)
                        const isTodayDate = isToday(day)
                        const dayHasTask = hasTask(day)

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => setDate(day)}
                                className={cn(
                                    "relative flex items-center justify-center rounded-2xl transition-all duration-200 aspect-square text-xl",
                                    !isCurrentMonth && "text-gray-300 opacity-50 bg-transparent hover:bg-transparent cursor-default", // Dim outside days
                                    isCurrentMonth && "text-gray-700 hover:bg-[#f0fdfa] hover:scale-105",
                                    isSelected && "bg-[#1d4e46] text-white hover:bg-[#1d4e46] hover:scale-100 shadow-[0_10px_15px_-3px_rgba(29,78,70,0.3)]",
                                    isTodayDate && !isSelected && "text-[#1d4e46] font-extrabold"
                                )}
                                disabled={!isCurrentMonth} // Disable interaction for outside days if desired
                            >
                                {format(day, 'd')}

                                {/* Today Dot Indicator (if not selected) */}
                                {isTodayDate && !isSelected && !dayHasTask && (
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#1d4e46] rounded-full opacity-60" />
                                )}

                                {/* Task Indicator */}
                                {/* Task Indicator - Green for Tasks */}
                                {dayHasTask && (
                                    <div className={cn(
                                        "absolute top-2 right-2 w-2 h-2 rounded-full",
                                        isSelected ? "bg-white" : "bg-[#1d4e46] ring-2 ring-white dark:ring-card"
                                    )} />
                                )}

                                {/* Appointment Indicator - Orange/Red for Appointments */}
                                {hasAppointment(day) && (
                                    <div className={cn(
                                        "absolute top-2 right-5 w-2 h-2 rounded-full", // Shifted left to avoid overlap if both exist
                                        isSelected ? "bg-white/80" : "bg-orange-500 ring-2 ring-white dark:ring-card"
                                    )} />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
