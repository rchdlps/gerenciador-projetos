import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Lightbulb, Megaphone, Calendar, Plus, Trash2, StickyNote } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useUserRole } from "@/hooks/use-user-role"

export default function CommunicationView({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()
    const { isViewer } = useUserRole()

    // Query Data
    const { data, isLoading } = useQuery({
        queryKey: ['communication', projectId],
        queryFn: async () => {
            const res = await api.communication[":projectId"].$get({ param: { projectId } })
            if (!res.ok) throw new Error("Failed to fetch communication data")
            return res.json()
        },
        staleTime: 1000 * 60 * 2,
    })

    // Mutations
    const updateNotes = useMutation({
        mutationFn: async (content: string) => {
            const res = await api.communication[":projectId"].notes.$put({
                param: { projectId },
                json: { content }
            })
            if (!res.ok) throw new Error("Failed to update notes")
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communication', projectId] })
    })

    const addPlanItem = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.communication[":projectId"].plan.$post({
                param: { projectId },
                json: data
            })
            if (!res.ok) throw new Error("Failed to add plan item")
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['communication', projectId] })
            toast.success("Item adicionado ao plano!")
        }
    })

    const deletePlanItem = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.communication.plan[":id"].$delete({ param: { id } })
            if (!res.ok) throw new Error("Failed to delete item")
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communication', projectId] })
    })

    const addMeeting = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.communication[":projectId"].meeting.$post({
                param: { projectId },
                json: data
            })
            if (!res.ok) throw new Error("Failed to add meeting")
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['communication', projectId] })
            toast.success("Reunião registrada!")
        }
    })

    const deleteMeeting = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.communication.meeting[":id"].$delete({ param: { id } })
            if (!res.ok) throw new Error("Failed to delete meeting")
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communication', projectId] })
    })

    // Local State for forms
    const [notes, setNotes] = useState("")
    const [planForm, setPlanForm] = useState({ info: "", stakeholders: "", frequency: "Diário", medium: "E-mail" })
    const [meetingForm, setMeetingForm] = useState({ subject: "", date: "", decisions: "" })

    // Sync notes when data loads
    if (data?.notes && notes === "") setNotes(data.notes)

    const handleSaveNotes = () => {
        updateNotes.mutate(notes)
        toast.success("Notas salvas!")
    }

    if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}</div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* 1. PLANO DE COMUNICAÇÃO */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg text-[#1d4e46]">
                        <Megaphone className="w-5 h-5 text-pink-600" />
                        Plano de Comunicação
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-4 rounded-r-md">
                        <p className="text-sm text-slate-700">
                            <span className="font-bold">Plano de Comunicação:</span> Define o que comunicar, para quem, quando e como.
                        </p>
                    </div>

                    {/* Form */}
                    {!isViewer && (
                        <div className="space-y-4 pb-6 border-b">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        📋 Informação
                                    </Label>
                                    <Input
                                        placeholder="O que será comunicado"
                                        value={planForm.info}
                                        onChange={e => setPlanForm({ ...planForm, info: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        👥 Para Quem
                                    </Label>
                                    <Input
                                        placeholder="Destinatários"
                                        value={planForm.stakeholders}
                                        onChange={e => setPlanForm({ ...planForm, stakeholders: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        🗓️ Quando
                                    </Label>
                                    <Select
                                        value={planForm.frequency}
                                        onValueChange={v => setPlanForm({ ...planForm, frequency: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Diário">Diário</SelectItem>
                                            <SelectItem value="Semanal">Semanal</SelectItem>
                                            <SelectItem value="Mensal">Mensal</SelectItem>
                                            <SelectItem value="Sob Demanda">Sob Demanda</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        📱 Meio
                                    </Label>
                                    <Select
                                        value={planForm.medium}
                                        onValueChange={v => setPlanForm({ ...planForm, medium: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="E-mail">E-mail</SelectItem>
                                            <SelectItem value="Reunião">Reunião</SelectItem>
                                            <SelectItem value="Relatório">Relatório</SelectItem>
                                            <SelectItem value="Mensagem">Mensagem</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button
                                className="bg-[#1d4e46] hover:bg-[#256056] text-white"
                                disabled={!planForm.info || !planForm.stakeholders || addPlanItem.isPending}
                                onClick={() => {
                                    addPlanItem.mutate(planForm)
                                    setPlanForm({ info: "", stakeholders: "", frequency: "Diário", medium: "E-mail" })
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Adicionar ao Plano
                            </Button>
                        </div>
                    )}

                    {/* List */}
                    <div className="space-y-2">
                        {data?.plan?.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm italic">
                                Nenhum item no plano
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {data?.plan?.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg group hover:border-[#1d4e46] transition-all">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Informação</div>
                                                <div className="font-medium text-sm text-slate-800">{item.info}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Para Quem</div>
                                                <div className="text-sm text-slate-700">{item.stakeholders}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Quando</div>
                                                <div className="text-sm text-slate-700">{item.frequency}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] uppercase text-slate-500 font-bold">Meio</div>
                                                <div className="text-sm text-slate-700">{item.medium}</div>
                                            </div>
                                        </div>
                                        {!isViewer && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => deletePlanItem.mutate(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 2. REGISTRO DE REUNIÕES */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg text-[#1d4e46]">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Registro de Reuniões
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Form */}
                    {!isViewer && (
                        <div className="space-y-4 pb-6 border-b">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        📋 Assunto
                                    </Label>
                                    <Input
                                        value={meetingForm.subject}
                                        onChange={e => setMeetingForm({ ...meetingForm, subject: e.target.value })}
                                        placeholder="Tema da reunião"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                        🗓️ Data
                                    </Label>
                                    <Input
                                        type="date"
                                        value={meetingForm.date}
                                        onChange={e => setMeetingForm({ ...meetingForm, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                    📝 Principais Decisões
                                </Label>
                                <Textarea
                                    className="resize-none h-20"
                                    value={meetingForm.decisions}
                                    onChange={e => setMeetingForm({ ...meetingForm, decisions: e.target.value })}
                                    placeholder="Registre aqui as decisões tomadas..."
                                />
                            </div>
                            <Button
                                className="bg-[#1d4e46] hover:bg-[#256056] text-white"
                                disabled={!meetingForm.subject || !meetingForm.date || addMeeting.isPending}
                                onClick={() => {
                                    addMeeting.mutate(meetingForm)
                                    setMeetingForm({ subject: "", date: "", decisions: "" })
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" /> Registrar Reunião
                            </Button>
                        </div>
                    )}

                    {/* List */}
                    <div className="space-y-2">
                        {data?.meetings?.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm italic">
                                Nenhuma reunião registrada
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {data?.meetings?.map((meeting: any) => (
                                    <div key={meeting.id} className="p-4 bg-slate-50 border rounded-lg group hover:border-[#1d4e46] transition-all space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800">{meeting.subject}</h4>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(meeting.date), "dd/MM/yyyy")}
                                                </div>
                                            </div>
                                            {!isViewer && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => deleteMeeting.mutate(meeting.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                        {meeting.decisions && (
                                            <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded border border-slate-100">
                                                <strong className="text-[#1d4e46] block mb-1 text-xs uppercase">Decisões:</strong>
                                                {meeting.decisions}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 3. NOTAS GERAIS */}
            <Card className="border-t-4 border-yellow-400">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-yellow-400 p-2 rounded">
                            <StickyNote className="w-5 h-5 text-yellow-900" />
                        </div>
                        <CardTitle className="text-lg font-bold text-yellow-900">Notas Gerais</CardTitle>
                    </div>
                    {!isViewer && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSaveNotes}
                            disabled={updateNotes.isPending}
                            className="border-yellow-400 text-yellow-900 h-8 hover:bg-yellow-50"
                        >
                            <Plus className="w-3 h-3 mr-2 hidden" />
                            Salvar Notas
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-3 text-sm text-amber-900 flex gap-2">
                        <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            <span className="font-bold">Espaço para anotações livres:</span> Use este campo para documentar informações importantes, observações, decisões, lições aprendidas ou qualquer outra informação relevante sobre esta área de conhecimento.
                        </p>
                    </div>

                    <div className="relative">
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="min-h-[150px] resize-y bg-white border-slate-200 focus:border-yellow-400 focus:ring-yellow-400"
                            placeholder="Adicione anotações gerais, observações importantes, decisões tomadas, lições aprendidas..."
                            disabled={isViewer}
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                            {updateNotes.isPending && "Salvando..."}
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
