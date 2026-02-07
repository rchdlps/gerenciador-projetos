import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Building2, User, UserCheck, CheckCircle2, Layout, Activity, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface ProjectHeaderProps {
    project: any
    organization: any
    stakeholders: any[]
    totalPhases: number
    completedPhases: number
}

export function ProjectHeader({ project, organization, stakeholders, totalPhases, completedPhases }: ProjectHeaderProps) {
    const queryClient = useQueryClient()
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [name, setName] = useState(project.name)
    const [desc, setDesc] = useState(project.description || "")
    const [type, setType] = useState(project.type || "Projeto")
    const [status, setStatus] = useState(project.status || "em_andamento")

    const updateProject = useMutation({
        mutationFn: async () => {
            const res = await api.projects[':id'].$patch({
                param: { id: project.id },
                json: {
                    name,
                    description: desc,
                    type,
                    status
                }
            })
            if (!res.ok) throw new Error("Failed to update")
            return res.json()
        },
        onSuccess: () => {
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['project', project.id] })
            // Also invalidate list if needed
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            setIsEditOpen(false)
            toast.success("Projeto atualizado com sucesso!")
            // Force reload if needed to reflect server-side prop changes (since we are in Astro island)
            // But react-query handle client state. The prop 'project' comes from server.
            // We might need to reload page if the parent doesn't re-render.
            // For now, let's assume client-side navigation or hydration handles it,
            // or simplest: window.location.reload() if props are static.
            // Ideally we should use client-side fetching for the header details or
            // make the header fully client-rendered.
            // Given it's passed as props, updating it requires parent re-render or page reload.
            window.location.reload()
        },
        onError: () => {
            toast.error("Erro ao atualizar projeto")
        }
    })

    // Calculate progress percentage
    const progressPercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0

    // We now prioritize Organization fields for these roles, but could fallback to Stakeholders if needed.
    // For now, let's purely use Organization fields as per the request.
    const secretarioName = organization?.secretario || "-"
    const secretariaAdjuntaName = organization?.secretariaAdjunta || "-"
    const diretoriaTecnicaName = organization?.diretoriaTecnica || "-"

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10" aria-label="Cabeçalho do Projeto">
            {/* Main Info Card - Clean Minimalist */}
            <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl overflow-hidden relative group/card">
                <div className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Editar Projeto</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome do Projeto</Label>
                                    <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipo de Projeto</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger id="type">
                                            <SelectValue placeholder="Selecione o Tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Obra">Obra</SelectItem>
                                            <SelectItem value="Trabalho Social">Trabalho Social</SelectItem>
                                            <SelectItem value="Programa">Programa</SelectItem>
                                            <SelectItem value="Serviço">Serviço</SelectItem>
                                            <SelectItem value="Aquisição">Aquisição</SelectItem>
                                            <SelectItem value="Evento">Evento</SelectItem>
                                            <SelectItem value="Estudo">Estudo</SelectItem>
                                            <SelectItem value="Capacitação">Capacitação</SelectItem>
                                            <SelectItem value="Inovação">Inovação</SelectItem>
                                            <SelectItem value="TIC">TIC</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger id="status">
                                            <SelectValue placeholder="Selecione o Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                            <SelectItem value="concluido">Concluído</SelectItem>
                                            <SelectItem value="suspenso">Suspenso</SelectItem>
                                            <SelectItem value="cancelado">Cancelado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="desc">Descrição</Label>
                                    <Textarea id="desc" value={desc} onChange={e => setDesc(e.target.value)} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                                <Button onClick={() => updateProject.mutate()} disabled={updateProject.isPending}>
                                    {updateProject.isPending ? 'Salvando...' : 'Salvar Alterações'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <CardContent className="p-8 lg:p-10 space-y-10">
                    {/* Organization Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-[0.15em]">
                            <Building2 className="w-4 h-4 text-primary/60" />
                            Órgão Responsável
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                            {organization?.name || "Órgão não definido"}
                        </h2>
                        <div className="flex gap-2 mt-2">
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                {project.type || "Projeto"}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${status === 'concluido' ? 'bg-green-100 text-green-800' :
                                    status === 'suspenso' ? 'bg-yellow-100 text-yellow-800' :
                                        status === 'cancelado' ? 'bg-red-100 text-red-800' :
                                            'bg-blue-100 text-blue-800'
                                }`}>
                                {status === 'em_andamento' ? 'Em Andamento' :
                                    status === 'concluido' ? 'Concluído' :
                                        status === 'suspenso' ? 'Suspenso' :
                                            status === 'cancelado' ? 'Cancelado' : status}
                            </span>
                        </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Roles Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Secretário */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-[0.15em]">
                                <User className="w-3.5 h-3.5" />
                                Secretário
                            </div>
                            <p className="font-bold text-lg text-slate-900 truncate" title={secretarioName}>
                                {secretarioName}
                            </p>
                        </div>

                        {/* Secretária Adjunta */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-[0.15em]">
                                <UserCheck className="w-3.5 h-3.5" />
                                Secretaria Adjunta
                            </div>
                            <p className="font-bold text-lg text-slate-900 truncate" title={secretariaAdjuntaName}>
                                {secretariaAdjuntaName}
                            </p>
                        </div>

                        {/* Diretora Técnica */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-[0.15em]">
                                <Activity className="w-3.5 h-3.5" />
                                Diretoria Técnica
                            </div>
                            <p className="font-bold text-lg text-slate-900 truncate" title={diretoriaTecnicaName}>
                                {diretoriaTecnicaName}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status Cards Column */}
            <div className="space-y-6">
                {/* Progress Card - Clean */}
                <Card className="bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl group">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] uppercase tracking-[0.15em]">
                                <Layout className="w-4 h-4" />
                                Progresso
                            </div>
                            <span className="text-4xl font-black text-primary tracking-tighter">
                                {progressPercentage}%
                            </span>
                        </div>

                        <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden mb-8 shadow-inner">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                                {completedPhases} concluídas
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
                                {totalPhases} fases no projeto
                            </div>
                        </div>

                    </CardContent>
                </Card>

                {/* Phases Count Card - Clean */}
                <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
                    <CardContent className="p-8 flex items-center justify-between">
                        <div>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">
                                {completedPhases} / {totalPhases}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                Fases do Cronograma
                            </div>
                        </div>
                        <div className="flex items-center justify-center w-14 h-14 bg-primary/5 rounded-2xl border border-primary/10">
                            <CheckCircle2 className="w-7 h-7 text-primary" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
