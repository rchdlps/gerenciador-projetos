import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, LayoutGrid, Paperclip, Plus, Trash2, Save, Loader2, User, Briefcase, Clock, FileText } from "lucide-react"
import { toast } from "sonner"
import { NotesSection } from "./notes-section"
import { FileUpload } from "@/components/ui/file-upload"
import { AttachmentList, type Attachment } from "@/components/attachments/attachment-list"
import { useUserRole } from "@/hooks/use-user-role"

interface ResourceViewProps {
    projectId: string
}

interface TeamMember {
    id: string
    name: string
    role: string
    dedication: string
}

interface RACIItem {
    id: string
    activity: string
    person: string
    raciRole: string
}

export default function ResourceView({ projectId }: ResourceViewProps) {
    const queryClient = useQueryClient()
    const [isDeletingAttachment, setIsDeletingAttachment] = useState<string | null>(null)
    const { isViewer } = useUserRole()

    // Team State
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [newMemberName, setNewMemberName] = useState("")
    const [newMemberRole, setNewMemberRole] = useState("")
    const [newMemberDedication, setNewMemberDedication] = useState("100% (Integral)")

    // RACI State
    const [raciItems, setRaciItems] = useState<RACIItem[]>([])
    const [newRaciActivity, setNewRaciActivity] = useState("")
    const [newRaciPerson, setNewRaciPerson] = useState("")
    const [newRaciRole, setNewRaciRole] = useState("R - Responsável")

    // Fetch resource data
    const { data: ka, isLoading } = useQuery({
        queryKey: ['ka-detail', projectId, 'recursos'],
        queryFn: async () => {
            const res = await api['knowledge-areas'][':projectId'][':area'].$get({
                param: { projectId, area: 'recursos' }
            })
            if (!res.ok) throw new Error()
            const data = await res.json()

            // Parse stored content
            if (data.content) {
                try {
                    const parsed = JSON.parse(data.content)
                    setTeamMembers(parsed.teamMembers || [])
                    setRaciItems(parsed.raciItems || [])
                } catch { }
            }
            return data
        },
        staleTime: 1000 * 60 * 2,
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
        enabled: !!ka?.id,
        staleTime: 1000 * 60 * 2,
    })

    // Save resource data
    const saveResourceMutation = useMutation({
        mutationFn: async () => {
            const content = JSON.stringify({
                teamMembers,
                raciItems
            })
            const res = await api['knowledge-areas'][':projectId'][':area'].$patch({
                param: { projectId, area: 'recursos' },
                json: { content }
            })
            if (!res.ok) throw new Error()
        },
        onSuccess: () => {
            toast.success("Dados salvos com sucesso!")
            queryClient.invalidateQueries({ queryKey: ['ka-detail', projectId, 'recursos'] })
        },
        onError: () => toast.error("Erro ao salvar")
    })

    // Add Team Member
    const addTeamMember = () => {
        if (!newMemberName.trim()) {
            toast.error("Nome é obrigatório")
            return
        }
        const newMember: TeamMember = {
            id: crypto.randomUUID(),
            name: newMemberName,
            role: newMemberRole,
            dedication: newMemberDedication
        }
        setTeamMembers([...teamMembers, newMember])
        setNewMemberName("")
        setNewMemberRole("")
    }

    // Add RACI Item
    const addRaciItem = () => {
        if (!newRaciActivity.trim() || !newRaciPerson.trim()) {
            toast.error("Atividade e Pessoa são obrigatórios")
            return
        }
        const newItem: RACIItem = {
            id: crypto.randomUUID(),
            activity: newRaciActivity,
            person: newRaciPerson,
            raciRole: newRaciRole
        }
        setRaciItems([...raciItems, newItem])
        setNewRaciActivity("")
        setNewRaciPerson("")
    }

    const handleUpload = async (files: File[]) => {
        if (!ka?.id) return
        for (const file of files) {
            try {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('entityId', ka.id)
                formData.append('entityType', 'knowledge_area')

                const res = await fetch('/api/storage/upload', {
                    method: 'POST',
                    body: formData,
                })
                if (!res.ok) {
                    const data = await res.json().catch(() => ({ error: 'Erro ao enviar arquivo' }))
                    throw new Error((data as any).error || 'Erro ao enviar arquivo')
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

    const getRaciColor = (role: string) => {
        if (role.startsWith('R')) return 'bg-emerald-100 text-emerald-700 border-emerald-300'
        if (role.startsWith('A')) return 'bg-amber-100 text-amber-700 border-amber-300'
        if (role.startsWith('C')) return 'bg-sky-100 text-sky-700 border-sky-300'
        if (role.startsWith('I')) return 'bg-slate-100 text-slate-700 border-slate-300'
        return 'bg-slate-100 text-slate-700'
    }

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Equipe do Projeto */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-[#1d4e46] p-2 rounded">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#1d4e46]">Equipe do Projeto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-3 text-sm text-slate-800">
                        <p><span className="font-bold">Recursos Humanos:</span> Identifique os membros da equipe e suas atribuições.</p>
                    </div>

                    {/* Add Team Member Form */}
                    {!isViewer && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <User className="w-3 h-3" /> Nome
                                </Label>
                                <Input value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <Briefcase className="w-3 h-3" /> Função
                                </Label>
                                <Input value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} placeholder="" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <Clock className="w-3 h-3" /> Dedicação
                                </Label>
                                <Select value={newMemberDedication} onValueChange={setNewMemberDedication}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="100% (Integral)">100% (Integral)</SelectItem>
                                        <SelectItem value="75%">75%</SelectItem>
                                        <SelectItem value="50%">50%</SelectItem>
                                        <SelectItem value="25%">25%</SelectItem>
                                        <SelectItem value="Sob demanda">Sob demanda</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {!isViewer && (
                        <Button onClick={addTeamMember} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Membro
                        </Button>
                    )}

                    {teamMembers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum membro cadastrado</p>
                    ) : (
                        <div className="space-y-2">
                            {teamMembers.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-3 rounded border bg-slate-50 group hover:border-[#1d4e46] transition-all">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Nome</div>
                                            <span className="font-medium text-sm">{member.name}</span>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Função</div>
                                            <span className="text-sm">{member.role || '-'}</span>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Dedicação</div>
                                            <span className="text-sm text-emerald-600 font-medium">{member.dedication}</span>
                                        </div>
                                    </div>
                                    {!isViewer && (
                                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setTeamMembers(teamMembers.filter(m => m.id !== member.id))}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {teamMembers.length > 0 && !isViewer && (
                        <Button onClick={() => saveResourceMutation.mutate()} disabled={saveResourceMutation.isPending} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Save className="w-4 h-4 mr-2" /> Salvar Equipe
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* 2. Matriz RACI */}
            <Card className="border-t-4 border-[#1d4e46]">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <div className="bg-[#1d4e46] p-2 rounded">
                        <LayoutGrid className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-lg font-bold text-[#1d4e46]">Matriz RACI</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pb-10">
                    <div className="bg-sky-50 border-l-4 border-sky-400 p-3 text-sm text-slate-800">
                        <p className="font-bold">RACI: Define papéis e responsabilidades.</p>
                        <ul className="mt-1 space-y-0.5">
                            <li>• <span className="font-bold">R (Responsible):</span> Responsável pela execução</li>
                            <li>• <span className="font-bold">A (Accountable):</span> Aprovador final</li>
                            <li>• <span className="font-bold">C (Consulted):</span> Consultado</li>
                            <li>• <span className="font-bold">I (Informed):</span> Informado</li>
                        </ul>
                    </div>

                    {/* Add RACI Item Form */}
                    {!isViewer && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <FileText className="w-3 h-3" /> Atividade
                                </Label>
                                <Input value={newRaciActivity} onChange={e => setNewRaciActivity(e.target.value)} placeholder="" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    <User className="w-3 h-3" /> Pessoa
                                </Label>
                                <Input value={newRaciPerson} onChange={e => setNewRaciPerson(e.target.value)} placeholder="" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                    🏷️ Papel RACI
                                </Label>
                                <Select value={newRaciRole} onValueChange={setNewRaciRole}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="R - Responsável">R - Responsável</SelectItem>
                                        <SelectItem value="A - Aprovador">A - Aprovador</SelectItem>
                                        <SelectItem value="C - Consultado">C - Consultado</SelectItem>
                                        <SelectItem value="I - Informado">I - Informado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {!isViewer && (
                        <Button onClick={addRaciItem} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar à Matriz RACI
                        </Button>
                    )}

                    {raciItems.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum item na matriz RACI</p>
                    ) : (
                        <div className="space-y-2">
                            {raciItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded border bg-slate-50 group hover:border-[#1d4e46] transition-all">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Atividade</div>
                                            <span className="font-medium text-sm">{item.activity}</span>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Pessoa</div>
                                            <span className="text-sm">{item.person}</span>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase text-slate-500 font-bold">Papel</div>
                                            <span className={`text-xs px-2 py-0.5 rounded border ${getRaciColor(item.raciRole)}`}>{item.raciRole}</span>
                                        </div>
                                    </div>
                                    {!isViewer && (
                                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setRaciItems(raciItems.filter(r => r.id !== item.id))}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {raciItems.length > 0 && !isViewer && (
                        <Button onClick={() => saveResourceMutation.mutate()} disabled={saveResourceMutation.isPending} className="bg-[#1d4e46] hover:bg-[#256056] text-white">
                            <Save className="w-4 h-4 mr-2" /> Salvar Matriz RACI
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* 3. Notas Gerais */}
            <NotesSection projectId={projectId} area="recursos" initialContent={""} />

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
                            <span className="font-bold">Anexe documentos relevantes:</span> Organogramas, currículos, matrizes de responsabilidade, ou qualquer documento de RH.
                        </p>
                    </div>
                    {!isViewer && <FileUpload onUpload={handleUpload} />}
                    <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment} isDeleting={isDeletingAttachment} readonly={isViewer} />
                </CardContent>
            </Card>
        </div>
    )
}
