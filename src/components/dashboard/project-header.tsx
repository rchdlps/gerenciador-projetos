import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Building2, User, UserCheck, CheckCircle2, Layout, Activity, Pencil, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUserRole } from "@/hooks/use-user-role"

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
    const { isViewer } = useUserRole()

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
            if (!res.ok) {
                const errorText = await res.text()
                console.error('[ProjectHeader] Update failed:', res.status, errorText)
                throw new Error(`Failed to update: ${res.status} - ${errorText}`)
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', project.id] })
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            setIsEditOpen(false)
            toast.success("Projeto atualizado com sucesso!")
            window.location.reload()
        },
        onError: (error: Error) => {
            console.error('[ProjectHeader] Mutation error:', error)
            toast.error(`Erro ao atualizar projeto: ${error.message}`)
        }
    })

    const progressPercentage = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0
    const secretarioName = organization?.secretario || "-"
    const secretariaAdjuntaName = organization?.secretariaAdjunta || "-"
    const diretoriaTecnicaName = organization?.diretoriaTecnica || "-"

    const getInitials = (name: string) => {
        if (!name || name === "-") return "-"
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
    }

    const formatName = (name: string) => {
        if (!name || name === "-") return "-"
        const parts = name.toLowerCase().split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1))
        if (parts.length > 2) {
            return `${parts[0]} ${parts[parts.length - 1]}`
        }
        return parts.join(' ')
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 items-stretch" aria-label="Cabeçalho do Projeto">
            <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden relative group/card flex flex-col h-full">
                {!isViewer && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 ease-in-out z-10">
                        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors">
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
                                                <SelectItem value="recorrente">Recorrente</SelectItem>
                                                <SelectItem value="proposta">Proposta</SelectItem>
                                                <SelectItem value="planejamento">Planejamento</SelectItem>
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
                )}

                <CardContent className="p-8 flex flex-col h-full justify-between gap-8">
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors bg-slate-50 text-slate-600">
                                    {project.type || "Projeto"}
                                </span>
                                <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${status === 'concluido' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    status === 'suspenso' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        status === 'cancelado' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                            status === 'recorrente' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                                status === 'proposta' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                                                    status === 'planejamento' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                                                        'bg-sky-50 text-sky-700 border-sky-200'
                                    }`}>
                                    {status === 'em_andamento' ? 'Em Andamento' :
                                        status === 'concluido' ? 'Concluído' :
                                            status === 'suspenso' ? 'Suspenso' :
                                                status === 'cancelado' ? 'Cancelado' :
                                                    status === 'recorrente' ? 'Recorrente' :
                                                        status === 'proposta' ? 'Proposta' :
                                                            status === 'planejamento' ? 'Planejamento' : status}
                                </span>
                            </div>

                            <h1 className="text-3xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                                {project.name}
                            </h1>
                        </div>

                        {project.description && (
                            <p className="text-base text-slate-600 max-w-4xl leading-relaxed">
                                {project.description}
                            </p>
                        )}
                    </div>

                    <div className="space-y-8">
                        <Separator className="bg-slate-100" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            {/* Organization Section */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sky-700 font-bold text-[11px] uppercase tracking-[0.2em]">
                                    <Building2 className="w-4 h-4" />
                                    Órgão Responsável
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                                    {organization?.name || "Órgão não definido"}
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                                {/* Secretário */}
                                <div className="space-y-1 group">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1 group-hover:text-slate-600 transition-colors">
                                        Secretário(a)
                                    </p>
                                    <div className="flex flex-col">
                                        <p className="font-bold text-slate-900 text-sm leading-none" title={secretarioName}>
                                            {formatName(secretarioName)}
                                        </p>
                                    </div>
                                </div>

                                {/* Secretária Adjunta */}
                                <div className="space-y-1 group">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1 group-hover:text-slate-600 transition-colors">
                                        Sec. Adjunto(a)
                                    </p>
                                    <div className="flex flex-col">
                                        <p className="font-bold text-slate-900 text-sm leading-none" title={secretariaAdjuntaName}>
                                            {formatName(secretariaAdjuntaName)}
                                        </p>
                                    </div>
                                </div>

                                {/* Diretora Técnica */}
                                <div className="space-y-1 group">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1 group-hover:text-slate-600 transition-colors">
                                        Dir. Técnica
                                    </p>
                                    <div className="flex flex-col">
                                        <p className="font-bold text-slate-900 text-sm leading-none" title={diretoriaTecnicaName}>
                                            {formatName(diretoriaTecnicaName)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col gap-6 h-full">
                <Card className="bg-slate-50/50 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl group overflow-hidden flex-1 flex flex-col justify-center">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] uppercase tracking-[0.2em]">
                                <Layout className="w-4 h-4" />
                                Progresso
                            </div>
                            <span className="text-5xl font-black text-sky-700 tracking-tighter">
                                {progressPercentage}%
                            </span>
                        </div>

                        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden mb-8">
                            <div
                                className="h-full bg-sky-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(3,105,161,0.3)]"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-sky-600 rounded-full animate-pulse" />
                                {completedPhases} fases concluídas
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                {totalPhases} total
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl flex-1 flex flex-col justify-center">
                    <CardContent className="p-8 flex items-center justify-between">
                        <div>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">
                                {completedPhases} <span className="text-slate-300">/</span> {totalPhases}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                                Fases do Cronograma
                            </div>
                        </div>
                        <div className="flex items-center justify-center w-14 h-14 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600 transition-transform group-hover:scale-110 duration-300">
                            <CheckCircle2 className="w-7 h-7" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
