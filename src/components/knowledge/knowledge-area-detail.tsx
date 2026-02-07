import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Loader2, Trash2, Paperclip, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Providers } from "@/components/providers"
import { ChangeControlSection } from "./change-control-section"
import { NotesSection } from "./notes-section"
import { TAPSection } from "./tap-section"
import { ScheduleSection } from "./schedule-section"
import { QualitySection } from "./quality-section"
import { FileUpload } from "@/components/ui/file-upload"
import { AttachmentList, type Attachment } from "@/components/attachments/attachment-list"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CommunicationView from "../projects/knowledge-areas/communication/communication-view"
import ProcurementView from "./procurement-view"
import ScopeView from "./scope-view"
import CostView from "./cost-view"
import ResourceView from "./resource-view"
import RiskView from "./risk-view"
import StakeholderView from "./stakeholder-view"

export function KnowledgeAreaDetail({ projectId, area }: { projectId: string, area: string }) {
    return (
        <Providers>
            <KnowledgeAreaContent projectId={projectId} area={area} />
        </Providers>
    )
}

function KnowledgeAreaContent({ projectId, area }: { projectId: string, area: string }) {
    const queryClient = useQueryClient()
    const [isDeletingAttachment, setIsDeletingAttachment] = useState<string | null>(null)

    const { data: ka, isLoading } = useQuery({
        queryKey: ['ka-detail', projectId, area],
        queryFn: async () => {
            const res = await api['knowledge-areas'][':projectId'][':area'].$get({
                param: { projectId, area }
            })
            if (!res.ok) throw new Error()
            return res.json()
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
                if (!initRes.ok) throw new Error("Failed to get upload URL")
                const { url, key } = await initRes.json()

                await fetch(url, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type }
                })

                await api.storage.confirm.$post({
                    json: {
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        key,
                        entityId: ka.id,
                        entityType: 'knowledge_area'
                    }
                })

                toast.success(`Upload de ${file.name} concluído!`)
            } catch (error) {
                console.error(error)
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
            if (!res.ok) throw new Error("Failed to delete")
            toast.success("Anexo excluído")
            refetchAttachments()
        } catch (error) {
            toast.error("Erro ao excluir anexo")
        } finally {
            setIsDeletingAttachment(null)
        }
    }

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
    if (!ka) return <div>Erro ao carregar área de conhecimento.</div>

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* TAP Section - Only for integration */}
            {area === 'integracao' && <TAPSection projectId={projectId} />}

            {/* Schedule Section - Only for schedule */}
            {area === 'cronograma' && <ScheduleSection projectId={projectId} />}

            {/* Quality Section - Only for quality */}
            {area === 'qualidade' && <QualitySection projectId={projectId} />}

            {/* Communication Section - Only for communication */}
            {area === 'comunicacao' && <CommunicationView projectId={projectId} />}

            {/* Procurement Section - Only for procurement */}
            {area === 'aquisicoes' && <ProcurementView projectId={projectId} />}

            {/* Scope Section - Only for scope */}
            {area === 'escopo' && <ScopeView projectId={projectId} />}

            {/* Cost Section - Only for costs */}
            {area === 'custos' && <CostView projectId={projectId} />}

            {/* Resource Section - Only for resources */}
            {area === 'recursos' && <ResourceView projectId={projectId} />}

            {/* Risk Section - Only for risks */}
            {area === 'riscos' && <RiskView projectId={projectId} />}

            {/* Stakeholder Section - Only for stakeholders */}
            {area === 'partes' && <StakeholderView projectId={projectId} />}

            {/* Notes Section - Hidden for communication, procurement, escopo, custos, recursos, riscos, and partes */}
            {area !== 'comunicacao' && area !== 'aquisicoes' && area !== 'escopo' && area !== 'custos' && area !== 'recursos' && area !== 'riscos' && area !== 'partes' && (
                <NotesSection
                    projectId={projectId}
                    area={area}
                    initialContent={ka.content || ""}
                />
            )}

            {/* Change Control Section - Hidden for schedule, quality, communication, procurement, escopo, custos, recursos, riscos, and partes */}
            {area !== 'cronograma' && area !== 'qualidade' && area !== 'comunicacao' && area !== 'aquisicoes' && area !== 'escopo' && area !== 'custos' && area !== 'recursos' && area !== 'riscos' && area !== 'partes' && (
                <ChangeControlSection
                    projectId={projectId}
                    area={area}
                    kaId={ka.id}
                    changes={ka.changes}
                    onDelete={async (id) => {
                        if (confirm("Excluir este registro?")) {
                            const res = await api['knowledge-areas'].changes[':id'].$delete({ param: { id } })
                            if (res.ok) {
                                queryClient.invalidateQueries({ queryKey: ['ka-detail', projectId, area] })
                                toast.success("Registro removido")
                            }
                        }
                    }}
                />
            )}

            {/* Attachments Section - Hidden for escopo, custos, recursos, riscos, and partes (handled internally) */}
            {area !== 'escopo' && area !== 'custos' && area !== 'recursos' && area !== 'riscos' && area !== 'partes' && (
                <Card className="border-t-4 border-slate-600">
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                        <div className="bg-slate-600 p-2 rounded">
                            <Paperclip className="w-5 h-5 text-white" />
                        </div>
                        <CardTitle className="text-lg font-bold text-slate-800">Documentos Anexados ({attachments.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-slate-50 border-l-4 border-slate-400 p-3 text-sm text-slate-800 flex gap-2">
                            <Paperclip className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>
                                <span className="font-bold">Anexe documentos relevantes:</span> Contratos, planilhas, apresentações, imagens, PDFs, ou qualquer arquivo que complemente as informações desta área.
                            </p>
                        </div>

                        <FileUpload onUpload={handleUpload} />
                        <AttachmentList
                            attachments={attachments}
                            onDelete={handleDeleteAttachment}
                            isDeleting={isDeletingAttachment}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
