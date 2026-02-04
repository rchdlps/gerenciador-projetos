import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Edit2 } from "lucide-react"
import { Stakeholders } from "./stakeholders"
import { ScrumbanBoard } from "./board"
import { KnowledgeAreas } from "./knowledge-areas"

import { useState } from "react"
import { PhaseList } from "@/components/phases/phase-list"
import { LayoutList, KanbanSquare } from "lucide-react"

import { TaskStats } from "./task-stats"

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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Breadcrumb / Back */}
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" className="pl-0 hover:bg-transparent" asChild>
                    <a href="/" className="flex items-center gap-2 text-primary font-semibold">
                        <ArrowLeft className="h-4 w-4" /> Voltar
                    </a>
                </Button>
            </div>

            {/* Config Card */}
            <Card className="border shadow-none">
                <CardHeader className="bg-primary text-primary-foreground rounded-t-lg flex flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <Edit2 className="h-5 w-5" />
                        <CardTitle className="text-lg">Configuração do Projeto</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-bold uppercase text-muted-foreground">Nome do Projeto</label>
                            <Input defaultValue={project.name} className="font-semibold text-lg" readOnly />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-bold uppercase text-muted-foreground">Descrição</label>
                            <p className="text-sm text-foreground/80">{project.description || "Sem descrição"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stakeholders */}
            <Stakeholders projectId={id} />

            {/* Tasks / Phases Section */}
            <div className="space-y-6">
                <TaskStats columns={boardData} isLoading={isBoardLoading} />

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

            {/* Knowledge Areas */}
            <div className="space-y-4">
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-foreground">Áreas de Conhecimento</h3>
                    <KnowledgeAreas projectId={id} />
                </div>
            </div>
        </div>
    )
}
