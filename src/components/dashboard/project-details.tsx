
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, LayoutList, KanbanSquare } from "lucide-react"
import { Stakeholders } from "./stakeholders"
import { ScrumbanBoard } from "./board"
import { useState } from "react"
import { PhaseList } from "@/components/phases/phase-list"
import { TaskStats } from "./task-stats"
import { ProjectHeader } from "./project-header"
import { ProjectReadOnlyBanner } from "./project-read-only-banner"
import { useActiveOrgOptional } from "@/contexts/org-context"

export function ProjectDetails({ id }: { id: string }) {
    const [viewMode, setViewMode] = useState<'kanban' | 'phases'>('phases')

    const { data: project, isLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const res = await api.projects[':id'].$get({ param: { id } })
            if (!res.ok) throw new Error('Not found')
            return res.json()
        }
    })

    const { data: organization } = useQuery({
        queryKey: ['organization', project?.organizationId],
        queryFn: async () => {
            if (!project?.organizationId) return null
            const res = await api.organizations[':id'].$get({ param: { id: project.organizationId } })
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!project?.organizationId
    })

    const { data: stakeholders = [] } = useQuery({
        queryKey: ['stakeholders', id],
        queryFn: async () => {
            const res = await api.stakeholders[':projectId'].$get({
                param: { projectId: id }
            })
            if (!res.ok) throw new Error()
            return res.json()
        }
    })

    const { data: phases = [] } = useQuery({
        queryKey: ["phases", id],
        queryFn: async () => {
            const res = await api.phases[":projectId"].$get({ param: { projectId: id } })
            if (!res.ok) throw new Error("Failed to fetch phases")
            return await res.json()
        }
    })

    const { data: boardData = [], isLoading: isBoardLoading } = useQuery({
        queryKey: ['board', id],
        queryFn: async () => {
            const res = await api.board[':projectId'].$get({ param: { projectId: id } })
            if (!res.ok) throw new Error()
            return res.json()
        }
    })

    if (isLoading) return <div>Carregando...</div>
    if (!project) return <div>Projeto não encontrado</div>

    const orgContext = useActiveOrgOptional()
    const isReadOnly = orgContext ? orgContext.activeOrgId !== project.organizationId : false

    // Calculate Phases Stats
    const totalPhases = phases.length
    // A phase is complete if it has tasks and all tasks are 'done'
    const completedPhases = phases.filter((p: any) =>
        p.tasks && p.tasks.length > 0 && p.tasks.every((t: any) => t.status === 'done')
    ).length

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Breadcrumb / Back */}
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" className="pl-0 hover:bg-transparent" asChild>
                    <a href="/" className="flex items-center gap-2 text-primary font-semibold">
                        <ArrowLeft className="h-4 w-4" /> Voltar
                    </a>
                </Button>
                <div className="flex-1" />
                <Button variant="outline" asChild>
                    <a href={`/projects/${id}/knowledge-areas`}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Áreas de Conhecimento
                    </a>
                </Button>
            </div>

            <ProjectReadOnlyBanner projectOrgId={project.organizationId} projectOrgName={organization?.name ?? null} />

            <div className="space-y-8">
                {/* Project Header (Info & Stats) */}
                <ProjectHeader
                    project={project}
                    organization={organization}
                    stakeholders={stakeholders}
                    totalPhases={totalPhases}
                    completedPhases={completedPhases}
                />

                {/* Stakeholders (Manage List) */}
                <Stakeholders projectId={id} />

                {/* Tasks / Phases Section */}
                <div className="space-y-6">
                    <TaskStats columns={boardData} isLoading={isBoardLoading} projectId={id} />

                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-foreground">
                            {viewMode === 'phases' ? 'Painel de Tarefas' : 'Painel de Tarefas'}
                        </h3>
                        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                            <Button
                                variant={viewMode === 'phases' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('phases')}
                                className="gap-2"
                            >
                                <LayoutList className="h-4 w-4" />
                                Fases
                            </Button>
                            <Button
                                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('kanban')}
                                className="gap-2"
                            >
                                <KanbanSquare className="h-4 w-4" />
                                Kanban
                            </Button>
                        </div>
                    </div>

                    {viewMode === 'phases' ? (
                        <PhaseList projectId={id} />
                    ) : (
                        <ScrumbanBoard projectId={id} />
                    )}
                </div>
            </div>
        </div>
    )
}
