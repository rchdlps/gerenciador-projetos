import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Edit2 } from "lucide-react"
import { Stakeholders } from "./stakeholders"
import { ScrumbanBoard } from "./board"
import { KnowledgeAreas } from "./knowledge-areas"

export function ProjectDetails({ id }: { id: string }) {
    const { data: project, isLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const res = await api.projects[':id'].$get({ param: { id } })
            if (!res.ok) throw new Error('Not found')
            return res.json()
        }
    })

    if (isLoading) return <div>Loading...</div>
    if (!project) return <div>Project not found</div>

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
                            {/* Note: In a real app we'd make this editable */}
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

            {/* Knowledge Areas */}
            <div className="space-y-4">
                {/* Knowledge Areas */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-foreground">Áreas de Conhecimento</h3>
                    <KnowledgeAreas projectId={id} />
                </div>
            </div>

            {/* Scrumban Board */}
            <ScrumbanBoard projectId={id} />
        </div>
    )
}
