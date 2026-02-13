import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Calendar,
    Flag,
    Plus,
    Trash2,
    Loader2,
    Link as LinkIcon,
    Zap,
    Timer,
    Calculator,
    Target,
    Folder
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useUserRole } from "@/hooks/use-user-role"

export function ScheduleSection({ projectId }: { projectId: string }) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <MilestoneManager projectId={projectId} />
            <DependencyManager projectId={projectId} />
            <PertCalculator />
        </div>
    )
}

function MilestoneManager({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()
    const [name, setName] = useState("")
    const [date, setDate] = useState("")
    const [phase, setPhase] = useState("Iniciação")
    const { isViewer } = useUserRole()

    const { data: milestones = [], isLoading } = useQuery({
        queryKey: ['milestones', projectId],
        queryFn: async () => {
            const res = await api.schedule[':projectId'].milestones.$get({ param: { projectId } })
            if (!res.ok) throw new Error()
            return res.json()
        },
        staleTime: 1000 * 60 * 2,
    })

    const addMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.schedule[':projectId'].milestones.$post({
                param: { projectId },
                json: data
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['milestones', projectId] })
            setName("")
            setDate("")
            toast.success("Marco adicionado com sucesso!")
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.schedule.milestones[':id'].$delete({ param: { id } })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['milestones', projectId] })
            toast.success("Marco removido!")
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !date) return
        addMutation.mutate({ name, expectedDate: date, phase })
    }

    return (
        <Card className="border-t-4 border-[#1d4e46]">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d4e46]">
                    <Calendar className="w-5 h-5" />
                    Marcos do Projeto (Milestones)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-sky-50 border-l-4 border-sky-400 p-4 rounded-r-md">
                    <p className="text-sm text-slate-700">
                        <span className="font-bold">Marcos (Milestones):</span> Pontos significativos ou eventos no cronograma do projeto. Representam conclusões importantes, entregas-chave ou pontos de decisão.
                    </p>
                </div>

                {!isViewer && (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                <Target className="w-3 h-3 text-red-500" />
                                Nome do Marco
                            </label>
                            <Input
                                placeholder="Ex: Aprovação do Design"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                <Calendar className="w-3 h-3 text-red-500" />
                                Data Prevista
                            </label>
                            <Input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                <Folder className="w-3 h-3 text-yellow-600" />
                                Fase Relacionada
                            </label>
                            <Select value={phase} onValueChange={setPhase}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Iniciação">Iniciação</SelectItem>
                                    <SelectItem value="Planejamento">Planejamento</SelectItem>
                                    <SelectItem value="Execução">Execução</SelectItem>
                                    <SelectItem value="Monitoramento">Monitoramento</SelectItem>
                                    <SelectItem value="Encerramento">Encerramento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-3">
                            <Button
                                className="bg-[#1d4e46] hover:bg-[#256056] text-white"
                                disabled={addMutation.isPending}
                            >
                                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Adicionar Marco
                            </Button>
                        </div>
                    </form>
                )}

                <div className="space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                    ) : milestones.length > 0 ? (
                        milestones.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border group hover:border-[#1d4e46] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white p-2 rounded-full shadow-sm border">
                                        <Flag className="w-4 h-4 text-[#1d4e46]" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{m.name}</h4>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                            <span className="flex items-center gap-1 font-medium text-slate-600 italic">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(m.expectedDate), "dd/MM/yyyy", { locale: ptBR })}
                                            </span>
                                            <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                {m.phase}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {!isViewer && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => deleteMutation.mutate(m.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-400 text-sm italic">
                            Nenhum marco definido
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function DependencyManager({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()
    const [predecessor, setPredecessor] = useState("")
    const [successor, setSuccessor] = useState("")
    const [type, setType] = useState("TI")
    const { isViewer } = useUserRole()

    const { data: dependencies = [], isLoading } = useQuery({
        queryKey: ['dependencies', projectId],
        queryFn: async () => {
            const res = await api.schedule[':projectId'].dependencies.$get({ param: { projectId } })
            if (!res.ok) throw new Error()
            return res.json()
        },
        staleTime: 1000 * 60 * 2,
    })

    const addMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.schedule[':projectId'].dependencies.$post({
                param: { projectId },
                json: data
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] })
            setPredecessor("")
            setSuccessor("")
            toast.success("Dependência adicionada!")
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.schedule.dependencies[':id'].$delete({ param: { id } })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] })
            toast.success("Dependência removida!")
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!predecessor || !successor) return
        addMutation.mutate({ predecessor, successor, type })
    }

    const typeLabels: Record<string, string> = {
        "TI": "Término-Início (TI)",
        "II": "Início-Início (II)",
        "TT": "Término-Término (TT)",
        "IT": "Início-Término (IT)"
    }

    return (
        <Card className="border-t-4 border-[#1d4e46]">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d4e46]">
                    <Zap className="w-5 h-5" />
                    Dependências entre Tarefas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-sky-50 border-l-4 border-sky-400 p-4 rounded-r-md">
                    <p className="text-sm text-slate-700 leading-relaxed">
                        <span className="font-bold">Dependências:</span> Relacionamentos lógicos entre tarefas.<br />
                        • <span className="font-bold text-slate-900">Término-Início (TI):</span> Tarefa B só começa quando A terminar<br />
                        • <span className="font-bold text-slate-900">Início-Início (II):</span> Tarefa B começa quando A começar<br />
                        • <span className="font-bold text-slate-900">Término-Término (TT):</span> Tarefa B termina quando A terminar
                    </p>
                </div>

                {!isViewer && (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                <Folder className="w-3 h-3 text-yellow-600" />
                                Tarefa Predecessora
                            </label>
                            <Input
                                placeholder="Tarefa que vem antes"
                                value={predecessor}
                                onChange={e => setPredecessor(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                <Folder className="w-3 h-3 text-yellow-600" />
                                Tarefa Sucessora
                            </label>
                            <Input
                                placeholder="Tarefa que vem depois"
                                value={successor}
                                onChange={e => setSuccessor(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                                <LinkIcon className="w-3 h-3 text-[#1d4e46]" />
                                Tipo de Dependência
                            </label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TI">{typeLabels["TI"]}</SelectItem>
                                    <SelectItem value="II">{typeLabels["II"]}</SelectItem>
                                    <SelectItem value="TT">{typeLabels["TT"]}</SelectItem>
                                    <SelectItem value="IT">{typeLabels["IT"]}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-3">
                            <Button
                                className="bg-[#1d4e46] hover:bg-[#256056] text-white"
                                disabled={addMutation.isPending}
                            >
                                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Adicionar Dependência
                            </Button>
                        </div>
                    </form>
                )}

                <div className="space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                    ) : dependencies.length > 0 ? (
                        dependencies.map((d: any) => (
                            <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-50/30 border border-orange-100 group hover:border-orange-300 transition-all">
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="font-bold text-slate-700">{d.predecessor}</span>
                                    <Zap className="w-3 h-3 text-yellow-600" />
                                    <span className="font-bold text-slate-700">{d.successor}</span>
                                    <span className="bg-white border text-[10px] px-2 py-0.5 rounded font-bold text-slate-500 uppercase ml-2">
                                        {typeLabels[d.type]}
                                    </span>
                                </div>
                                {!isViewer && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => deleteMutation.mutate(d.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-400 text-sm italic">
                            Nenhuma dependência definida
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function PertCalculator() {
    const [opt, setOpt] = useState<number>(0)
    const [most, setMost] = useState<number>(0)
    const [pess, setPess] = useState<number>(0)
    const [result, setResult] = useState<number | null>(null)

    const calculate = () => {
        const expected = (opt + 4 * most + pess) / 6
        setResult(Number(expected.toFixed(2)))
    }

    return (
        <Card className="border-t-4 border-[#1d4e46]">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg text-[#1d4e46]">
                    <Timer className="w-5 h-5" />
                    Estimativas de Tempo
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-sky-50 border-l-4 border-sky-400 p-4 rounded-r-md">
                    <p className="text-sm text-slate-700 leading-relaxed">
                        <span className="font-bold">Técnica PERT (3 pontos):</span> Estimativa mais realista considerando otimista, pessimista e mais provável.<br />
                        <span className="font-bold text-slate-900">Fórmula:</span> Tempo Esperado = (Otimista + 4×Mais Provável + Pessimista) / 6
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                            <span className="grayscale">😊</span> Tempo Otimista (dias)
                        </label>
                        <Input
                            type="number"
                            placeholder="Melhor cenário"
                            onChange={e => setOpt(Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                            <span className="grayscale">📊</span> Tempo Mais Provável (dias)
                        </label>
                        <Input
                            type="number"
                            placeholder="Cenário realista"
                            onChange={e => setMost(Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase">
                            <span className="grayscale">😨</span> Tempo Pessimista (dias)
                        </label>
                        <Input
                            type="number"
                            placeholder="Pior cenário"
                            onChange={e => setPess(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 gap-4">
                    <Button
                        onClick={calculate}
                        className="bg-[#1d4e46] hover:bg-[#256056] text-white"
                    >
                        <Calculator className="w-4 h-4 mr-2" />
                        Calcular Tempo Esperado (PERT)
                    </Button>

                    {result !== null && (
                        <div className="bg-orange-100 border-2 border-orange-200 px-6 py-2 rounded-lg animate-in zoom-in duration-300">
                            <p className="text-xs text-orange-600 font-bold uppercase">Tempo Esperado:</p>
                            <p className="text-2xl font-black text-orange-700">{result} <span className="text-sm font-normal">dias</span></p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
