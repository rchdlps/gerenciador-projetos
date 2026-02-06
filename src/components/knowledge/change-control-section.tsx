import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Loader2, Plus, Trash2, Calendar, FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export function ChangeControlSection({
    projectId,
    area,
    kaId,
    changes = [],
    onDelete
}: {
    projectId: string,
    area: string,
    kaId: string,
    changes?: any[],
    onDelete: (id: string) => Promise<void>
}) {
    const queryClient = useQueryClient()
    const [description, setDescription] = useState("")
    const [type, setType] = useState("Escopo")
    const [status, setStatus] = useState("Solicitado")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])


    const addMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api['knowledge-areas'][':areaId'].changes.$post({
                param: { areaId: kaId },
                json: data
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ka-detail', projectId, area] })
            setDescription("")
            toast.success("Mudança registrada!")
        }
    })


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!description) return
        addMutation.mutate({ description, type, status, date })
    }

    return (
        <Card className="border-t-4 border-[#1d4e46]">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <div className="bg-[#1d4e46] p-2 rounded">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-[#1d4e46]">Controle de Mudanças</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-sky-50 border-l-4 border-sky-400 p-3 text-sm text-sky-800">
                    <p className="font-bold">Registro de Mudanças: <span className="font-normal">Documente todas as mudanças no escopo, cronograma ou orçamento.</span></p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Descrição da Mudança
                        </label>
                        <Input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Ex: Novo requisito X"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Tipo
                        </label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Escopo">Escopo</SelectItem>
                                <SelectItem value="Cronograma">Cronograma</SelectItem>
                                <SelectItem value="Custos">Custos</SelectItem>
                                <SelectItem value="Qualidade">Qualidade</SelectItem>
                                <SelectItem value="Recursos">Recursos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Status
                        </label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Solicitado">Solicitado</SelectItem>
                                <SelectItem value="Em Análise">Em Análise</SelectItem>
                                <SelectItem value="Aprovado">Aprovado</SelectItem>
                                <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Data
                        </label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <Button
                        type="submit"
                        className="bg-[#1d4e46] hover:bg-[#256056] col-span-1"
                        disabled={addMutation.isPending}
                    >
                        {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Registrar Mudança
                    </Button>
                </form>

                <div className="pt-4 border-t">
                    <div className="space-y-3">
                        {changes.length > 0 ? (
                            changes.map((change: any) => (
                                <div key={change.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border group hover:border-[#1d4e46] transition-all">
                                    <div className="flex gap-4 items-center">
                                        <div className="bg-[#1d4e46]/10 p-2 rounded text-[#1d4e46]">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-sm">{change.description}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1d4e46]/10 uppercase font-bold text-[#1d4e46]">
                                                    {change.type}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {new Date(change.date).toLocaleDateString()}
                                                </span>
                                                <span className={`flex items-center gap-1 font-semibold ${change.status === 'Aprovado' ? 'text-green-600' :
                                                        change.status === 'Rejeitado' ? 'text-red-600' :
                                                            'text-blue-600'
                                                    }`}>
                                                    {change.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => onDelete(change.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-slate-400 text-sm italic">
                                Nenhuma mudança registrada
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
