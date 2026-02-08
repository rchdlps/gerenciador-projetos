import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Paperclip, Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { NotesSection } from "./notes-section"
import { FileUpload } from "@/components/ui/file-upload"
import { AttachmentList, type Attachment } from "@/components/attachments/attachment-list"
import { useUserRole } from "@/hooks/use-user-role"

interface StakeholderViewProps {
    projectId: string
}

interface Stakeholder {
    id: string
    name: string
    role: string
    type: string
}

const STAKEHOLDER_TYPES = [
    'Patrocinador',
    'Cliente',
    'Usuário Final',
    'Gerente de Projeto',
    'Equipe Técnica',
    'Fornecedor',
    'Regulador',
    'Consultor',
    'Outro'
]

export default function StakeholderView({ projectId }: StakeholderViewProps) {
    const queryClient = useQueryClient()
    const [isDeletingAttachment, setIsDeletingAttachment] = useState<string | null>(null)
    const { isViewer } = useUserRole()

    // Stakeholder State
    const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])

    // Fetch stakeholder data
    const { data: ka, isLoading } = useQuery({
        queryKey: ['ka-detail', projectId, 'partes'],
        queryFn: async () => {
            const res = await api['knowledge-areas'][':projectId'][':area'].$get({
                param: { projectId, area: 'partes' }
            })
            if (!res.ok) throw new Error()
            const data = await res.json()

            // Parse stored content
            if (data.content) {
                try {
                    const parsed = JSON.parse(data.content)
                    setStakeholders(parsed.stakeholders || [])
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

    // Save stakeholder data
    const saveStakeholderMutation = useMutation({
        mutationFn: async () => {
            const content = JSON.stringify({ stakeholders })
            const res = await api['knowledge-areas'][':projectId'][':area'].$patch({
                param: { projectId, area: 'partes' },
                json: { content }
            })
            if (!res.ok) throw new Error()
        },
        onSuccess: () => {
            toast.success("Dados salvos com sucesso!")
            queryClient.invalidateQueries({ queryKey: ['ka-detail', projectId, 'partes'] })
        },
        onError: () => toast.error("Erro ao salvar")
    })

    // Add Stakeholder
    const addStakeholder = () => {
        const newStakeholder: Stakeholder = {
            id: crypto.randomUUID(),
            name: "",
            role: "",
            type: "Patrocinador"
        }
        setStakeholders([...stakeholders, newStakeholder])
    }

    // Update Stakeholder
    const updateStakeholder = (id: string, field: keyof Stakeholder, value: string) => {
        setStakeholders(stakeholders.map(s =>
            s.id === id ? { ...s, [field]: value } : s
        ))
    }

    // Delete Stakeholder
    const deleteStakeholder = (id: string) => {
        setStakeholders(stakeholders.filter(s => s.id !== id))
        saveStakeholderMutation.mutate()
    }

    const getInitials = (name: string) => {
        if (!name.trim()) return "??"
        const parts = name.trim().split(' ')
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Patrocinador': return 'bg-emerald-500'
            case 'Cliente': return 'bg-blue-500'
            case 'Usuário Final': return 'bg-purple-500'
            case 'Gerente de Projeto': return 'bg-amber-500'
            case 'Equipe Técnica': return 'bg-cyan-500'
            case 'Fornecedor': return 'bg-orange-500'
            case 'Regulador': return 'bg-red-500'
            case 'Consultor': return 'bg-indigo-500'
            default: return 'bg-slate-500'
        }
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

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Gerenciamento de Stakeholders */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-[#1d4e46] p-2 rounded">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#1d4e46]">Gerenciamento de Stakeholders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-3 text-sm text-slate-800">
                        <p><span className="font-bold">Stakeholders</span> são indivíduos ou organizações que podem afetar ou serem afetados pelo projeto.</p>
                    </div>

                    {!isViewer && (
                        <Button onClick={addStakeholder} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Stakeholder
                        </Button>
                    )}

                    {stakeholders.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum stakeholder cadastrado</p>
                    ) : (
                        <div className="space-y-4">
                            {stakeholders.map(stakeholder => (
                                <div key={stakeholder.id} className="p-4 rounded-lg border bg-slate-50/50 hover:border-[#1d4e46] transition-all">
                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${getTypeColor(stakeholder.type)}`}>
                                            {getInitials(stakeholder.name)}
                                        </div>

                                        {/* Fields */}
                                        <div className="flex-1 space-y-3">
                                            <Input
                                                value={stakeholder.name}
                                                onChange={e => updateStakeholder(stakeholder.id, 'name', e.target.value)}
                                                onBlur={() => saveStakeholderMutation.mutate()}
                                                placeholder="Nome do stakeholder"
                                                className="bg-white"
                                                disabled={isViewer}
                                            />
                                            <Input
                                                value={stakeholder.role}
                                                onChange={e => updateStakeholder(stakeholder.id, 'role', e.target.value)}
                                                onBlur={() => saveStakeholderMutation.mutate()}
                                                placeholder="Cargo / Função"
                                                className="bg-white"
                                                disabled={isViewer}
                                            />
                                        </div>

                                        {/* Type Selector */}
                                        <Select
                                            value={stakeholder.type}
                                            onValueChange={v => {
                                                updateStakeholder(stakeholder.id, 'type', v)
                                                setTimeout(() => saveStakeholderMutation.mutate(), 100)
                                            }}
                                            disabled={isViewer}
                                        >
                                            <SelectTrigger className="w-[160px] bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STAKEHOLDER_TYPES.map(type => (
                                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Delete Button */}
                                    <div className="mt-3">
                                        {!isViewer && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => deleteStakeholder(stakeholder.id)}
                                                className="h-8"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. Notas Gerais */}
            <NotesSection projectId={projectId} area="partes" initialContent={""} />

            {/* 3. Documentos Anexados */}
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
                            <span className="font-bold">Anexe documentos relevantes:</span> Registros de stakeholders, análises de poder/interesse, planos de engajamento.
                        </p>
                    </div>
                    {!isViewer && <FileUpload onUpload={handleUpload} />}
                    <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment} isDeleting={isDeletingAttachment} readonly={isViewer} />
                </CardContent>
            </Card>
        </div>
    )
}
