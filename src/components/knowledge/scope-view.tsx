import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, TreePine, CheckSquare, StickyNote, Paperclip, Plus, Trash2, Save, Target, Ban, Package, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { NotesSection } from "./notes-section"
import { FileUpload } from "@/components/ui/file-upload"
import { AttachmentList, type Attachment } from "@/components/attachments/attachment-list"

interface ScopeViewProps {
    projectId: string
}

interface WBSItem {
    id: string
    name: string
    level: string
    responsible: string
}

interface Requirement {
    id: string
    description: string
    type: string
    priority: string
}

interface ScopeData {
    id: string
    objective: string
    deliverables: string
    exclusions: string
    wbsItems: WBSItem[]
    requirements: Requirement[]
}

export default function ScopeView({ projectId }: ScopeViewProps) {
    const queryClient = useQueryClient()
    const [isDeletingAttachment, setIsDeletingAttachment] = useState<string | null>(null)

    // Scope Declaration State
    const [objective, setObjective] = useState("")
    const [deliverables, setDeliverables] = useState("")
    const [exclusions, setExclusions] = useState("")

    // WBS State
    const [wbsItems, setWbsItems] = useState<WBSItem[]>([])
    const [newWbsName, setNewWbsName] = useState("")
    const [newWbsLevel, setNewWbsLevel] = useState("1")
    const [newWbsResponsible, setNewWbsResponsible] = useState("")

    // Requirements State
    const [requirements, setRequirements] = useState<Requirement[]>([])
    const [newReqDesc, setNewReqDesc] = useState("")
    const [newReqType, setNewReqType] = useState("Funcional")
    const [newReqPriority, setNewReqPriority] = useState("Alta")

    // Fetch scope data
    const { data: ka, isLoading } = useQuery({
        queryKey: ['ka-detail', projectId, 'escopo'],
        queryFn: async () => {
            const res = await api['knowledge-areas'][':projectId'][':area'].$get({
                param: { projectId, area: 'escopo' }
            })
            if (!res.ok) throw new Error()
            const data = await res.json()

            // Parse stored content
            if (data.content) {
                try {
                    const parsed = JSON.parse(data.content)
                    setObjective(parsed.objective || "")
                    setDeliverables(parsed.deliverables || "")
                    setExclusions(parsed.exclusions || "")
                    setWbsItems(parsed.wbsItems || [])
                    setRequirements(parsed.requirements || [])
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

    // Save scope declaration
    const saveScopeMutation = useMutation({
        mutationFn: async () => {
            const content = JSON.stringify({
                objective,
                deliverables,
                exclusions,
                wbsItems,
                requirements
            })
            const res = await api['knowledge-areas'][':projectId'][':area'].$patch({
                param: { projectId, area: 'escopo' },
                json: { content }
            })
            if (!res.ok) throw new Error()
        },
        onSuccess: () => {
            toast.success("Dados salvos com sucesso!")
            queryClient.invalidateQueries({ queryKey: ['ka-detail', projectId, 'escopo'] })
        },
        onError: () => toast.error("Erro ao salvar")
    })

    // Add WBS Item
    const addWbsItem = () => {
        if (!newWbsName.trim()) {
            toast.error("Nome do item é obrigatório")
            return
        }
        const newItem: WBSItem = {
            id: crypto.randomUUID(),
            name: newWbsName,
            level: newWbsLevel,
            responsible: newWbsResponsible
        }
        setWbsItems([...wbsItems, newItem])
        setNewWbsName("")
        setNewWbsResponsible("")
    }

    // Add Requirement
    const addRequirement = () => {
        if (!newReqDesc.trim()) {
            toast.error("Descrição do requisito é obrigatória")
            return
        }
        const newReq: Requirement = {
            id: crypto.randomUUID(),
            description: newReqDesc,
            type: newReqType,
            priority: newReqPriority
        }
        setRequirements([...requirements, newReq])
        setNewReqDesc("")
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
                if (!initRes.ok) throw new Error()
                const { url, key } = await initRes.json()
                await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
                await api.storage.confirm.$post({
                    json: { fileName: file.name, fileType: file.type, fileSize: file.size, key, entityId: ka.id, entityType: 'knowledge_area' }
                })
                toast.success(`Upload de ${file.name} concluído!`)
            } catch {
                toast.error(`Erro ao enviar ${file.name}`)
            }
        }
        refetchAttachments()
    }

    const handleDeleteAttachment = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este anexo?")) return
        setIsDeletingAttachment(id)
        try {
            const res = await api.storage[':id'].$delete({ param: { id } })
            if (!res.ok) throw new Error()
            toast.success("Anexo excluído")
            refetchAttachments()
        } catch {
            toast.error("Erro ao excluir anexo")
        } finally {
            setIsDeletingAttachment(null)
        }
    }

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Declaração de Escopo */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-[#1d4e46] p-2 rounded">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#1d4e46]">Declaração de Escopo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-3 text-sm text-slate-800">
                        <p><span className="font-bold">Escopo do Projeto:</span> Define claramente o que está incluído e excluído do projeto. Documente objetivos, entregas principais, limites e critérios de aceitação.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Target className="w-4 h-4 text-emerald-600" /> Objetivo do Projeto</Label>
                            <Textarea
                                value={objective}
                                onChange={e => setObjective(e.target.value)}
                                placeholder="Descreva o objetivo principal do projeto..."
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Package className="w-4 h-4 text-amber-600" /> Entregas Principais</Label>
                            <Textarea
                                value={deliverables}
                                onChange={e => setDeliverables(e.target.value)}
                                placeholder="Liste as principais entregas do projeto..."
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Ban className="w-4 h-4 text-rose-600" /> Exclusões (Fora do Escopo)</Label>
                            <Textarea
                                value={exclusions}
                                onChange={e => setExclusions(e.target.value)}
                                placeholder="O que NÃO está incluído no projeto..."
                                rows={4}
                            />
                        </div>
                    </div>

                    <Button onClick={() => saveScopeMutation.mutate()} disabled={saveScopeMutation.isPending} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                        <Save className="w-4 h-4 mr-2" />
                        {saveScopeMutation.isPending ? "Salvando..." : "Salvar Declaração de Escopo"}
                    </Button>
                </CardContent>
            </Card>

            {/* 2. EAP - Estrutura Analítica do Projeto */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-[#1d4e46] p-2 rounded">
                        <TreePine className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#1d4e46]">EAP - Estrutura Analítica do Projeto (WBS)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-3 text-sm text-slate-800">
                        <p className="font-bold">WBS (Work Breakdown Structure): <span className="font-normal">Decomposição hierárquica do trabalho.</span></p>
                        <ul className="mt-1 ml-4 list-disc">
                            <li>Nível 1: Grandes pacotes de trabalho</li>
                            <li>Nível 2: Subpacotes</li>
                            <li>Nível 3: Atividades específicas</li>
                        </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><FileText className="w-4 h-4 text-amber-600" /> Nome do Item</Label>
                            <Input value={newWbsName} onChange={e => setNewWbsName(e.target.value)} placeholder="Ex: Infraestrutura de TI" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><TreePine className="w-4 h-4 text-emerald-600" /> Nível Hierárquico</Label>
                            <Select value={newWbsLevel} onValueChange={setNewWbsLevel}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Nível 1 - Pacote Principal</SelectItem>
                                    <SelectItem value="2">Nível 2 - Subpacote</SelectItem>
                                    <SelectItem value="3">Nível 3 - Atividade</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">👤 Responsável</Label>
                            <Input value={newWbsResponsible} onChange={e => setNewWbsResponsible(e.target.value)} placeholder="Nome do responsável" />
                        </div>
                    </div>

                    <Button onClick={addWbsItem} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Item à EAP
                    </Button>

                    {wbsItems.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum item na EAP ainda</p>
                    ) : (
                        <div className="space-y-2">
                            {wbsItems.map((item, idx) => (
                                <div key={item.id} className={`flex items-center justify-between p-3 rounded border ${item.level === "1" ? "bg-emerald-50 border-emerald-200 ml-0" :
                                    item.level === "2" ? "bg-sky-50 border-sky-200 ml-6" :
                                        "bg-slate-50 border-slate-200 ml-12"
                                    }`}>
                                    <div>
                                        <span className="font-medium">{item.name}</span>
                                        {item.responsible && <span className="ml-2 text-sm text-muted-foreground">({item.responsible})</span>}
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600" onClick={() => setWbsItems(wbsItems.filter(w => w.id !== item.id))}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {wbsItems.length > 0 && (
                        <Button onClick={() => saveScopeMutation.mutate()} disabled={saveScopeMutation.isPending} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Save className="w-4 h-4 mr-2" /> Salvar EAP
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* 3. Requisitos do Projeto */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-[#1d4e46] p-2 rounded">
                        <CheckSquare className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#1d4e46]">Requisitos do Projeto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-3 text-sm text-slate-800">
                        <p><span className="font-bold">Requisitos:</span> Condições ou capacidades que o projeto deve atender.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><FileText className="w-4 h-4 text-amber-600" /> Requisito</Label>
                            <Input value={newReqDesc} onChange={e => setNewReqDesc(e.target.value)} placeholder="Descreva o requisito" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Package className="w-4 h-4 text-amber-600" /> Tipo</Label>
                            <Select value={newReqType} onValueChange={setNewReqType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Funcional">Funcional</SelectItem>
                                    <SelectItem value="Não-Funcional">Não-Funcional</SelectItem>
                                    <SelectItem value="Técnico">Técnico</SelectItem>
                                    <SelectItem value="Negócio">Negócio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">⚡ Prioridade</Label>
                            <Select value={newReqPriority} onValueChange={setNewReqPriority}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Alta">Alta</SelectItem>
                                    <SelectItem value="Média">Média</SelectItem>
                                    <SelectItem value="Baixa">Baixa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button onClick={addRequirement} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Requisito
                    </Button>

                    {requirements.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum requisito cadastrado</p>
                    ) : (
                        <div className="space-y-2">
                            {requirements.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-3 rounded border bg-slate-50">
                                    <div>
                                        <span className="font-medium">{req.description}</span>
                                        <div className="flex gap-2 mt-1">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${req.type === 'Funcional' ? 'bg-sky-100 text-sky-700' : req.type === 'Técnico' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>{req.type}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${req.priority === 'Alta' ? 'bg-rose-100 text-rose-700' : req.priority === 'Média' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{req.priority}</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600" onClick={() => setRequirements(requirements.filter(r => r.id !== req.id))}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {requirements.length > 0 && (
                        <Button onClick={() => saveScopeMutation.mutate()} disabled={saveScopeMutation.isPending} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Save className="w-4 h-4 mr-2" /> Salvar Requisitos
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* 4. Notas Gerais */}
            <NotesSection projectId={projectId} area="escopo" initialContent={""} />

            {/* 5. Documentos Anexados */}
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
                            <span className="font-bold">Anexe documentos relevantes:</span> Contratos, planilhas, apresentações, imagens, PDFs, ou qualquer arquivo que complemente as informações desta área.
                        </p>
                    </div>
                    <FileUpload onUpload={handleUpload} />
                    <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment} isDeleting={isDeletingAttachment} />
                </CardContent>
            </Card>
        </div>
    )
}
