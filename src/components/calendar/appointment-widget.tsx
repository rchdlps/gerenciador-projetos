import { useState } from "react"
import { Pin, Calendar as CalendarIcon, Plus, Loader2, Trash2, Clock } from "lucide-react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useUserRole } from "@/hooks/use-user-role"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface AppointmentWidgetProps {
    projectId?: string
}

export function AppointmentWidget({ projectId }: AppointmentWidgetProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [date, setDate] = useState("")
    const [description, setDescription] = useState("")
    const { isViewer } = useUserRole()
    const queryClient = useQueryClient()

    // Fetch Appointments
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

    const { mutate: createAppointment, isPending } = useMutation({
        mutationFn: async () => {
            const res = await api.appointments.$post({
                json: {
                    projectId,
                    description,
                    date: new Date(date).toISOString(),
                }
            })

            if (!res.ok) throw new Error("Failed to create appointment")
            return await res.json()
        },
        onSuccess: () => {
            setIsCreating(false)
            setDate("")
            setDescription("")
            queryClient.invalidateQueries({ queryKey: ['appointments', projectId] })
        }
    })

    const { mutate: deleteAppointment } = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.appointments[':id'].$delete({ param: { id } })
            if (!res.ok) throw new Error("Failed to delete")
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments', projectId] })
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!date || !description) return
        createAppointment()
    }

    // Get immediate next appointments (up to 3)
    const nextAppointments = appointments.slice(0, 3)

    return (
        <div className="bg-white dark:bg-card rounded-2xl p-8 shadow-sm border border-border flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Pin className="w-5 h-5 text-[#1d4e46] fill-[#1d4e46] rotate-12" />
                    <h3 className="text-xl font-bold text-[#1d4e46]">
                        Compromissos
                    </h3>
                </div>

                {!isViewer && (
                    <Dialog open={isCreating} onOpenChange={setIsCreating}>
                        <DialogTrigger asChild>
                            <button className="p-2 hover:bg-[#f0fdfa] rounded-lg transition-colors text-[#1d4e46]">
                                <Plus className="w-5 h-5" />
                            </button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Novo Compromisso</DialogTitle>
                            </DialogHeader>

                            <form className="space-y-4 mt-4" onSubmit={handleSubmit}>
                                <div className="relative">
                                    <label className="text-sm font-medium leading-none mb-2 block">Data e Hora</label>
                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e46]/20 transition-all text-foreground"
                                            required
                                        />
                                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium leading-none mb-2 block">Descrição</label>
                                    <input
                                        type="text"
                                        placeholder="Nome do compromisso"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e46]/20 transition-all text-foreground placeholder:text-muted-foreground"
                                        required
                                    />
                                </div>

                                <button
                                    disabled={isPending}
                                    type="submit"
                                    className="w-full py-2.5 bg-[#1d4e46] text-white rounded-xl font-medium text-sm hover:bg-[#153a34] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                                >
                                    {isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    {isPending ? "Adicionando..." : "Adicionar Compromisso"}
                                </button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <p className="text-sm text-muted-foreground mb-4 -mt-4 ml-7">
                Próximos eventos agendados
            </p>

            <div className="space-y-2">
                {nextAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground/60 dashed border-2 border-slate-100 rounded-xl m-2 p-8">
                        <p className="text-sm">Nenhum compromisso próximo</p>
                    </div>
                ) : (
                    nextAppointments.map((apt: any) => (
                        <div key={apt.id} className="flex items-center justify-between group p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                            <div className="text-sm">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-foreground">{apt.description}</p>
                                    {!projectId && apt.projectName && (
                                        <span className="text-[8px] px-1 py-0.5 rounded bg-blue-50 text-blue-600 font-bold uppercase truncate max-w-[80px]">
                                            {apt.projectName}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-[#1d4e46]/40 font-medium capitalize mt-1 flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(apt.date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                            {!isViewer && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteAppointment(apt.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
