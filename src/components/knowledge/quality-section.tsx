import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Star,
    CheckSquare,
    Plus,
    Trash2,
    Loader2,
    Target,
    BarChart3,
    Activity,
    ClipboardCheck
} from "lucide-react"
import { toast } from "sonner"
import { useUserRole } from "@/hooks/use-user-role"

export function QualitySection({ projectId }: { projectId: string }) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <QualityMetricsManager projectId={projectId} />
            <QualityChecklistManager projectId={projectId} />
        </div>
    )
}

function QualityMetricsManager({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()
    const [name, setName] = useState("")
    const [target, setTarget] = useState("")
    const [currentValue, setCurrentValue] = useState("")
    const { isViewer } = useUserRole()

    const { data: metrics = [], isLoading } = useQuery({
        queryKey: ['quality-metrics', projectId],
        queryFn: async () => {
            const res = await api.quality[':projectId'].metrics.$get({ param: { projectId } })
            if (!res.ok) throw new Error()
            return res.json()
        },
        staleTime: 1000 * 60 * 2,
    })

    const addMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.quality[':projectId'].metrics.$post({
                param: { projectId },
                json: data
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quality-metrics', projectId] })
            setName("")
            setTarget("")
            setCurrentValue("")
            toast.success("Métrica adicionada!")
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.quality.metrics[':id'].$delete({ param: { id } })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quality-metrics', projectId] })
            toast.success("Métrica removida!")
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !target || !currentValue) return
        addMutation.mutate({ name, target, currentValue })
    }

    return (
        <Card className="border-t-4 border-[#1d4e46]">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d4e46]">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    Métricas de Qualidade
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-sky-50 border-l-4 border-sky-400 p-4 rounded-r-md">
                    <p className="text-sm text-slate-700">
                        <span className="font-bold">Métricas:</span> Indicadores mensuráveis para avaliar a qualidade do projeto.
                    </p>
                </div>

                {!isViewer && (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                <BarChart3 className="w-3 h-3 text-red-500" />
                                Nome da Métrica
                            </label>
                            <Input
                                placeholder="Ex: Taxa de Defeitos"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                <Target className="w-3 h-3 text-red-500" />
                                Meta
                            </label>
                            <Input
                                placeholder="Ex: < 2%"
                                value={target}
                                onChange={e => setTarget(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                <Activity className="w-3 h-3 text-red-500" />
                                Valor Atual
                            </label>
                            <Input
                                placeholder="Ex: 1.5%"
                                value={currentValue}
                                onChange={e => setCurrentValue(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-3">
                            <Button
                                className="bg-[#1d4e46] hover:bg-[#256056] text-white"
                                disabled={addMutation.isPending}
                            >
                                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Adicionar Métrica
                            </Button>
                        </div>
                    </form>
                )}

                <div className="space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                    ) : metrics.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {metrics.map((m: any) => (
                                <div key={m.id} className="p-4 rounded-xl bg-slate-50 border relative group hover:border-[#1d4e46] transition-all">
                                    <h4 className="font-bold text-slate-800 pr-8">{m.name}</h4>
                                    <div className="flex justify-between items-end mt-3">
                                        <div>
                                            <p className="text-[10px] uppercase text-slate-500 font-bold">Meta</p>
                                            <p className="text-sm font-medium text-[#1d4e46]">{m.target}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase text-slate-500 font-bold">Atual</p>
                                            <p className="text-xl font-black text-slate-900">{m.currentValue}</p>
                                        </div>
                                    </div>
                                    {!isViewer && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => deleteMutation.mutate(m.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400 text-sm italic">
                            Nenhuma métrica definida
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function QualityChecklistManager({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()
    const [item, setItem] = useState("")
    const { isViewer } = useUserRole()

    const { data: checklist = [], isLoading } = useQuery({
        queryKey: ['quality-checklist', projectId],
        queryFn: async () => {
            const res = await api.quality[':projectId'].checklist.$get({ param: { projectId } })
            if (!res.ok) throw new Error()
            return res.json()
        },
        staleTime: 1000 * 60 * 2,
    })

    const addMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.quality[':projectId'].checklist.$post({
                param: { projectId },
                json: data
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quality-checklist', projectId] })
            setItem("")
            toast.success("Item adicionado!")
        }
    })

    const toggleMutation = useMutation({
        mutationFn: async ({ id, completed }: { id: string, completed: boolean }) => {
            const res = await api.quality.checklist[':id'].$patch({
                param: { id },
                json: { completed }
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quality-checklist', projectId] })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.quality.checklist[':id'].$delete({ param: { id } })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quality-checklist', projectId] })
            toast.success("Item removido!")
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!item) return
        addMutation.mutate({ item })
    }

    return (
        <Card className="border-t-4 border-[#1d4e46]">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d4e46]">
                    <CheckSquare className="w-5 h-5 text-green-600" />
                    Checklist de Qualidade
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {!isViewer && (
                    <form onSubmit={handleSubmit} className="space-y-2 pb-6 border-b">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                            <ClipboardCheck className="w-3 h-3 text-blue-500" />
                            Item do Checklist
                        </label>
                        <div className="flex gap-3">
                            <Input
                                placeholder="Ex: Documentação completa e revisada"
                                value={item}
                                onChange={e => setItem(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                className="bg-[#1d4e46] hover:bg-[#256056] text-white shrink-0"
                                disabled={addMutation.isPending}
                            >
                                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Adicionar Item
                            </Button>
                        </div>
                    </form>
                )}

                <div className="space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                    ) : checklist.length > 0 ? (
                        checklist.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/30 border border-emerald-100 group hover:border-emerald-300 transition-all">
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        checked={c.completed}
                                        onCheckedChange={(checked: boolean) => toggleMutation.mutate({ id: c.id, completed: checked })}
                                        disabled={isViewer}
                                    />
                                    <span className={`text-sm font-medium ${c.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                        {c.item}
                                    </span>
                                </div>
                                {!isViewer && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => deleteMutation.mutate(c.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-400 text-sm italic">
                            Nenhum item no checklist
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
