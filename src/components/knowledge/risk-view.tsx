import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, LayoutGrid, Paperclip, Plus, Trash2, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { NotesSection } from "./notes-section"
import { FileUpload } from "@/components/ui/file-upload"
import { AttachmentList, type Attachment } from "@/components/attachments/attachment-list"
import { useUserRole } from "@/hooks/use-user-role"

interface RiskViewProps {
    projectId: string
}

interface Risk {
    id: string
    description: string
    category: string
    probability: number
    impact: number
    response: string
    owner: string
}

const PROBABILITY_LABELS = ['Muito Baixa', 'Baixa', 'Média', 'Alta', 'Muito Alta']
const IMPACT_LABELS = ['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto']

export default function RiskView({ projectId }: RiskViewProps) {
    const queryClient = useQueryClient()
    const [isDeletingAttachment, setIsDeletingAttachment] = useState<string | null>(null)
    const { isViewer } = useUserRole()

    // Risk State
    const [risks, setRisks] = useState<Risk[]>([])
    const [newRiskDescription, setNewRiskDescription] = useState("")
    const [newRiskCategory, setNewRiskCategory] = useState("Técnico")
    const [newRiskProbability, setNewRiskProbability] = useState(3)
    const [newRiskImpact, setNewRiskImpact] = useState(3)
    const [newRiskResponse, setNewRiskResponse] = useState("")
    const [newRiskOwner, setNewRiskOwner] = useState("")

    // Fetch risk data
    const { data: ka, isLoading } = useQuery({
        queryKey: ['ka-detail', projectId, 'riscos'],
        queryFn: async () => {
            const res = await api['knowledge-areas'][':projectId'][':area'].$get({
                param: { projectId, area: 'riscos' }
            })
            if (!res.ok) throw new Error()
            const data = await res.json()

            // Parse stored content
            if (data.content) {
                try {
                    const parsed = JSON.parse(data.content)
                    setRisks(parsed.risks || [])
                } catch { }
            }
            return data
        }
    })

    // Attachments Query
    const { data: attachments = [], refetch: refetchAttachments } = useQuery({
        queryKey: ['attachments', ka?.id],
        queryFn: async () => {
            if (!ka?.id) return []
            const res = await api.storage[':entityId'].$get({ param: { entityId: ka.id } })
            if (!res.ok) return []
            return res.json() as Promise<Attachment[]>
        },
        enabled: !!ka?.id
    })

    // Save risk data
    const saveRiskMutation = useMutation({
        mutationFn: async () => {
            const content = JSON.stringify({ risks })
            const res = await api['knowledge-areas'][':projectId'][':area'].$patch({
                param: { projectId, area: 'riscos' },
                json: { content }
            })
            if (!res.ok) throw new Error()
        },
        onSuccess: () => {
            toast.success("Dados salvos com sucesso!")
            queryClient.invalidateQueries({ queryKey: ['ka-detail', projectId, 'riscos'] })
        },
        onError: () => toast.error("Erro ao salvar")
    })

    // Add Risk
    const addRisk = () => {
        if (!newRiskDescription.trim()) {
            toast.error("Descrição do risco é obrigatória")
            return
        }
        const newRisk: Risk = {
            id: crypto.randomUUID(),
            description: newRiskDescription,
            category: newRiskCategory,
            probability: newRiskProbability,
            impact: newRiskImpact,
            response: newRiskResponse,
            owner: newRiskOwner
        }
        setRisks([...risks, newRisk])
        setNewRiskDescription("")
        setNewRiskResponse("")
        setNewRiskOwner("")
    }

    const handleUpload = async (files: File[]) => {
        if (!ka?.id) return
        for (const file of files) {
            try {
                const initRes = await api.storage['presigned-url'].$post({
                    json: {
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        entityId: ka.id,
                        entityType: 'knowledge_area'
                    }
                })
                if (!initRes.ok) {
                    const data = await initRes.json().catch(() => ({ error: 'Erro ao obter URL de upload' }))
                    throw new Error((data as any).error || 'Erro ao obter URL de upload')
                }
                const { url, key } = await initRes.json()
                await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

                const confirmRes = await api.storage.confirm.$post({
                    json: { fileName: file.name, fileType: file.type, fileSize: file.size, key, entityId: ka.id, entityType: 'knowledge_area' }
                })
                if (!confirmRes.ok) {
                    const data = await confirmRes.json().catch(() => ({ error: 'Erro ao confirmar upload' }))
                    throw new Error((data as any).error || 'Erro ao confirmar upload')
                }

                toast.success(`Upload de ${file.name} concluído!`)
            } catch (error) {
                toast.error((error as Error).message || `Erro ao enviar ${file.name}`)
            }
        }
        refetchAttachments()
    }

    const handleDeleteAttachment = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este anexo?")) return
        setIsDeletingAttachment(id)
        try {
            const res = await api.storage[':id'].$delete({ param: { id } })
            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: 'Erro ao excluir anexo' }))
                throw new Error((data as any).error || 'Erro ao excluir anexo')
            }
            toast.success("Anexo excluído")
            refetchAttachments()
        } catch (error) {
            toast.error((error as Error).message || "Erro ao excluir anexo")
        } finally {
            setIsDeletingAttachment(null)
        }
    }

    const getRiskScore = (probability: number, impact: number) => probability * impact

    const getRiskColor = (score: number) => {
        if (score <= 4) return 'bg-emerald-100 text-emerald-700 border-emerald-300'
        if (score <= 9) return 'bg-yellow-100 text-yellow-700 border-yellow-300'
        if (score <= 16) return 'bg-orange-100 text-orange-700 border-orange-300'
        return 'bg-red-100 text-red-700 border-red-300'
    }

    const getMatrixCellColor = (prob: number, impact: number) => {
        const score = prob * impact
        if (score <= 4) return 'bg-emerald-100 text-emerald-700'
        if (score <= 9) return 'bg-yellow-100 text-yellow-700'
        if (score <= 16) return 'bg-orange-100 text-orange-700'
        return 'bg-red-100 text-red-700'
    }

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Identificação de Riscos */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-[#1d4e46] p-2 rounded">
                        <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#1d4e46]">Identificação de Riscos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-3 text-sm text-slate-800">
                        <p><span className="font-bold">Gerenciamento de Riscos:</span> Identifique, avalie e planeje respostas para os riscos do projeto.</p>
                    </div>

                    {/* Add Risk Form */}
                    {!isViewer && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Descrição do Risco</Label>
                                <Textarea
                                    value={newRiskDescription}
                                    onChange={e => setNewRiskDescription(e.target.value)}
                                    placeholder="Descreva o risco identificado..."
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Categoria</Label>
                                <Select value={newRiskCategory} onValueChange={setNewRiskCategory}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Técnico">Técnico</SelectItem>
                                        <SelectItem value="Externo">Externo</SelectItem>
                                        <SelectItem value="Organizacional">Organizacional</SelectItem>
                                        <SelectItem value="Gerencial">Gerencial</SelectItem>
                                        <SelectItem value="Comercial">Comercial</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Responsável</Label>
                                <Input value={newRiskOwner} onChange={e => setNewRiskOwner(e.target.value)} placeholder="Nome do responsável" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Probabilidade (1-5)</Label>
                                <Select value={String(newRiskProbability)} onValueChange={v => setNewRiskProbability(Number(v))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 - Muito Baixa</SelectItem>
                                        <SelectItem value="2">2 - Baixa</SelectItem>
                                        <SelectItem value="3">3 - Média</SelectItem>
                                        <SelectItem value="4">4 - Alta</SelectItem>
                                        <SelectItem value="5">5 - Muito Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Impacto (1-5)</Label>
                                <Select value={String(newRiskImpact)} onValueChange={v => setNewRiskImpact(Number(v))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 - Muito Baixo</SelectItem>
                                        <SelectItem value="2">2 - Baixo</SelectItem>
                                        <SelectItem value="3">3 - Médio</SelectItem>
                                        <SelectItem value="4">4 - Alto</SelectItem>
                                        <SelectItem value="5">5 - Muito Alto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Resposta ao Risco</Label>
                                <Textarea
                                    value={newRiskResponse}
                                    onChange={e => setNewRiskResponse(e.target.value)}
                                    placeholder="Descreva a estratégia de resposta ao risco..."
                                    className="min-h-[60px]"
                                />
                            </div>
                        </div>
                    )}

                    {!isViewer && (
                        <Button onClick={addRisk} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Risco
                        </Button>
                    )}

                    {risks.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum risco identificado</p>
                    ) : (
                        <div className="space-y-3">
                            {risks.map(risk => (
                                <div key={risk.id} className="p-4 rounded border bg-slate-50 group hover:border-[#1d4e46] transition-all">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-600">{risk.category}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded border ${getRiskColor(getRiskScore(risk.probability, risk.impact))}`}>
                                                    Score: {getRiskScore(risk.probability, risk.impact)} (P{risk.probability} × I{risk.impact})
                                                </span>
                                                {risk.owner && <span className="text-xs text-slate-500">👤 {risk.owner}</span>}
                                            </div>
                                            <p className="font-medium text-sm">{risk.description}</p>
                                            {risk.response && (
                                                <p className="text-sm text-slate-600"><span className="font-medium">Resposta:</span> {risk.response}</p>
                                            )}
                                        </div>
                                        {!isViewer && (
                                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setRisks(risks.filter(r => r.id !== risk.id))}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {risks.length > 0 && !isViewer && (
                        <Button onClick={() => saveRiskMutation.mutate()} disabled={saveRiskMutation.isPending} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Save className="w-4 h-4 mr-2" /> Salvar Riscos
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* 2. Matriz de Probabilidade x Impacto */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-[#1d4e46] p-2 rounded">
                        <LayoutGrid className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#1d4e46]">Matriz de Probabilidade x Impacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-3 text-sm text-slate-800">
                        <p><span className="font-bold">Como usar:</span> Clique em uma célula para classificar o risco. Probabilidade (vertical) × Impacto (horizontal) = Nível de Risco</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="p-2 border bg-white"></th>
                                    {IMPACT_LABELS.map((label, i) => (
                                        <th key={i} className="p-2 border bg-[#1d4e46] text-white text-center font-medium min-w-[100px]">
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[...PROBABILITY_LABELS].reverse().map((probLabel, probIdx) => {
                                    const prob = 5 - probIdx // 5, 4, 3, 2, 1
                                    return (
                                        <tr key={probIdx}>
                                            <td className="p-2 border bg-[#1d4e46]/10 text-slate-700 font-medium text-center min-w-[80px]">
                                                {probLabel}
                                            </td>
                                            {IMPACT_LABELS.map((_, impIdx) => {
                                                const impact = impIdx + 1
                                                const score = prob * impact
                                                const risksInCell = risks.filter(r => r.probability === prob && r.impact === impact)
                                                return (
                                                    <td
                                                        key={impIdx}
                                                        className={`p-3 border text-center ${getMatrixCellColor(prob, impact)} relative`}
                                                    >
                                                        <div className="font-bold text-lg">{score}</div>
                                                        {risksInCell.length > 0 && (
                                                            <div className="absolute top-1 right-1 bg-slate-800 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                                                                {risksInCell.length}
                                                            </div>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 justify-center text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300"></div>
                            <span>Baixo (1-4)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                            <span>Moderado (5-9)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
                            <span>Alto (10-16)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                            <span>Crítico (17-25)</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Notas Gerais */}
            <NotesSection projectId={projectId} area="riscos" initialContent={""} />

            {/* 4. Documentos Anexados */}
            <Card className="border-t-4 border-slate-600">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-slate-600 p-2 rounded">
                        <Paperclip className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-800">Documentos Anexados ({attachments.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-slate-50 border-l-4 border-slate-400 p-3 text-sm text-slate-800 flex gap-2">
                        <Paperclip className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            <span className="font-bold">Anexe documentos relevantes:</span> Análises de risco, planos de contingência, ou qualquer documento relacionado à gestão de riscos.
                        </p>
                    </div>
                    {!isViewer && <FileUpload onUpload={handleUpload} />}
                    <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment} isDeleting={isDeletingAttachment} readonly={isViewer} />
                </CardContent>
            </Card>
        </div>
    )
}
