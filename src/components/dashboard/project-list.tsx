import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ArrowRight, Folder, Landmark, Building2, Search, Filter } from "lucide-react"

type Project = {
    id: string
    name: string
    description: string | null
    updatedAt: string
    organizationId?: string
    type: string
    status: string
}

type Organization = {
    id: string
    name: string
    code: string
    logoUrl?: string
}

export function ProjectList() {
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)
    const [name, setName] = useState("")
    const [desc, setDesc] = useState("")
    const [type, setType] = useState("Projeto")
    const [status, setStatus] = useState("em_andamento")
    const [selectedOrg, setSelectedOrg] = useState<string>("")
    const [searchTerm, setSearchTerm] = useState("")
    const [filterOrg, setFilterOrg] = useState("all")

    // Fetch User Organizations
    const { data: organizations, isLoading: isLoadingOrgs } = useQuery<Organization[]>({
        queryKey: ['organizations'],
        queryFn: async () => {
            const res = await api.organizations.$get()
            if (!res.ok) throw new Error("Failed to fetch organizations")
            return res.json()
        }
    })

    // Fetch Projects (Backend filters by user membership)
    const { data: projects, isLoading } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: async () => {
            const res = await api.projects.$get()
            if (!res.ok) throw new Error("Failed to fetch projects")
            return res.json()
        }
    })

    // Auto-select first organization if available
    useEffect(() => {
        if (organizations && organizations.length > 0 && !selectedOrg) {
            setSelectedOrg(organizations[0].id)
        }
    }, [organizations])

    const createProject = useMutation({
        mutationFn: async () => {
            if (!selectedOrg) throw new Error("Organization is required")

            const res = await api.projects.$post({
                json: {
                    name,
                    description: desc,
                    organizationId: selectedOrg,
                    type,
                    status
                }
            })
            if (!res.ok) throw new Error("Failed to create")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            setIsOpen(false)
            setName("")
            setDesc("")
            setType("Projeto")
            setStatus("em_andamento")
        }
    })

    // Group projects by Organization (Local grouping)
    const getOrgName = (orgId: string | null) => {
        if (!orgId) return "Projetos Pessoais / Legado";
        const org = organizations?.find(o => o.id === orgId);
        return org ? `${org.code} - ${org.name}` : "Outra Secretaria";
    }

    // Local Search & Filter
    const filteredProjects = projects?.filter(p => {
        const term = searchTerm.toLowerCase()
        const matchesSearch = p.name.toLowerCase().includes(term) ||
            (p.description?.toLowerCase() || "").includes(term)

        const matchesOrg = filterOrg === "all" ||
            (filterOrg === "personal" && !p.organizationId) ||
            p.organizationId === filterOrg

        return matchesSearch && matchesOrg
    })

    const groupedProjects: Record<string, Project[]> = {};
    if (filteredProjects) {
        filteredProjects.forEach(p => {
            const orgId = p.organizationId || 'personal';
            if (!groupedProjects[orgId]) groupedProjects[orgId] = [];
            groupedProjects[orgId].push(p);
        });
    }

    if (isLoading || isLoadingOrgs) return <div className="p-10 text-center text-muted-foreground animate-pulse">Carregando dados...</div>

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Projetos</h2>
                    <p className="text-muted-foreground mt-1">Gerencie e acompanhe seus projetos por Secretaria</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Plus className="mr-2 h-4 w-4" /> Novo Projeto
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Criar Novo Projeto</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="org">Secretaria / Unidade</Label>
                                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                                    <SelectTrigger id="org">
                                        <SelectValue placeholder="Selecione a Secretaria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {organizations?.map((org) => (
                                            <SelectItem key={org.id} value={org.id}>
                                                {org.code} - {org.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                <Label htmlFor="status">Status Inicial</Label>
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
                                <Label htmlFor="name">Nome do Projeto</Label>
                                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="ex: Implantação de ERP" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Descrição</Label>
                                <Textarea id="desc" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Breve descrição do escopo..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                            <Button onClick={() => createProject.mutate()} disabled={createProject.isPending || !selectedOrg || !name}>
                                {createProject.isPending ? 'Criando...' : 'Criar Projeto'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-muted/20 p-4 rounded-lg border">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar projetos por nome ou descrição..."
                        className="pl-9 bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-[300px]">
                    <Select value={filterOrg} onValueChange={setFilterOrg}>
                        <SelectTrigger className="bg-background">
                            <div className="flex items-center gap-2 w-full overflow-hidden">
                                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="truncate">
                                    <SelectValue placeholder="Filtrar por Secretaria" />
                                </span>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Secretarias</SelectItem>
                            {organizations?.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                    {org.code} - {org.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {Object.keys(groupedProjects).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/30">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Folder className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Nenhum projeto encontrado</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">
                        Você não possui projetos nesta secretaria ou ainda não criou nenhum.
                    </p>
                    <Button onClick={() => setIsOpen(true)}>Criar Projeto</Button>
                </div>
            ) : (
                <div className="space-y-12">
                    {Object.entries(groupedProjects).map(([orgId, orgProjects]) => (
                        <div key={orgId} className="space-y-4 animate-in fade-in duration-500">
                            <div className="flex items-center gap-3 border-b-2 border-primary/10 pb-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">
                                        {getOrgName(orgId === 'personal' ? null : orgId)}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {orgProjects.length} projetos ativos
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {orgProjects.map(project => (
                                    <Card key={project.id} className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 border-border/50 bg-card h-full flex flex-col">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <CardHeader className="pb-2 flex-grow">
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-2">
                                                    {project.name}
                                                </CardTitle>
                                                <Landmark className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 ml-2" />
                                            </div>
                                            <CardDescription className="line-clamp-3 text-sm mt-2">
                                                {project.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pb-2 mt-auto">
                                            <div className="flex items-center text-xs text-muted-foreground gap-1">
                                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                                Ativo
                                                <span className="mx-2">•</span>
                                                {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
                                            </div>
                                        </CardContent>
                                        <CardFooter className="pt-4 border-t border-border/30 bg-muted/20">
                                            <Button asChild variant="ghost" className="w-full text-xs font-semibold group-hover:text-primary transition-colors justify-between px-0 hover:bg-transparent">
                                                <a href={`/projects/${project.id}`}>
                                                    Acessar Projeto <ArrowRight className="ml-2 h-3 w-3" />
                                                </a>
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
