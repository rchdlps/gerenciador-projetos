import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Building2, Plus, Shield, Search, MoreHorizontal, Edit, Trash } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

type Organization = {
    id: string
    name: string
    code: string
    logoUrl?: string
}

export function OrgManager() {
    const queryClient = useQueryClient()
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null)
    const [name, setName] = useState("")
    const [code, setCode] = useState("")

    const { data: organizations, isLoading } = useQuery<Organization[]>({
        queryKey: ['organizations'],
        queryFn: async () => {
            const res = await api.organizations.$get()
            if (!res.ok) throw new Error("Failed to fetch")
            return res.json()
        }
    })

    const createOrg = useMutation({
        mutationFn: async () => {
            const res = await api.organizations.$post({
                json: { name, code }
            })
            if (!res.ok) throw new Error("Failed to create")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] })
            resetForm()
        }
    })

    const updateOrg = useMutation({
        mutationFn: async (vars: { id: string, name: string, code: string }) => {
            const res = await api.organizations[':id'].$put({
                param: { id: vars.id },
                json: { name: vars.name, code: vars.code }
            })
            if (!res.ok) throw new Error("Failed to update")
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] })
            resetForm()
        }
    })

    function resetForm() {
        setIsSheetOpen(false)
        setEditingId(null)
        setName("")
        setCode("")
    }

    function handleEdit(org: Organization) {
        setEditingId(org.id)
        setName(org.name)
        setCode(org.code)
        setIsSheetOpen(true)
    }

    function handleCreate() {
        setEditingId(null)
        setName("")
        setCode("")
        setIsSheetOpen(true)
    }

    const filteredOrgs = organizations?.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.code.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) return <div>Carregando...</div>

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-200">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Shield className="h-6 w-6 text-blue-700" />
                        </div>
                        Gestão de Secretarias
                    </h2>
                    <p className="text-slate-500 mt-2 max-w-lg">
                        Gerencie as unidades orçamentárias e configure permissões de acesso.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar secretaria..."
                            className="pl-9 bg-white border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> Nova Secretaria
                        </Button>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>{editingId ? "Editar Secretaria" : "Nova Secretaria"}</SheetTitle>
                                <SheetDescription>
                                    {editingId
                                        ? "Atualize os dados da unidade orçamentária abaixo."
                                        : "Preencha os dados para cadastrar uma nova unidade orçamentária."
                                    }
                                </SheetDescription>
                            </SheetHeader>
                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome da Secretaria</Label>
                                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Secretaria de Saúde" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code">Sigla / Código</Label>
                                    <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: SMS" />
                                </div>
                            </div>
                            <SheetFooter>
                                <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancelar</Button>
                                <Button
                                    onClick={() => editingId
                                        ? updateOrg.mutate({ id: editingId, name, code })
                                        : createOrg.mutate()
                                    }
                                    disabled={createOrg.isPending || updateOrg.isPending}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {createOrg.isPending || updateOrg.isPending ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Criar Secretaria')}
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrgs?.map(org => (
                    <Card key={org.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                    <Building2 className="h-5 w-5 text-slate-400" />
                                </div>
                                <div>
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium">
                                        {org.code}
                                    </Badge>
                                </div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleEdit(org)}>
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-red-600">
                                        <Trash className="mr-2 h-4 w-4" /> Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <h3 className="text-lg font-bold text-slate-900 line-clamp-2 min-h-[3.5rem] mb-2">
                                {org.name}
                            </h3>
                            <p className="text-xs text-slate-400 font-mono">
                                ID: {org.id.slice(0, 8)}...
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredOrgs?.length === 0 && (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                        <Building2 className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Nenhuma secretaria encontrada</h3>
                    <p className="text-slate-500 mt-1">Tente buscar por outro termo ou adicione uma nova.</p>
                </div>
            )}
        </div>
    )
}
