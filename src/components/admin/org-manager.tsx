import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Building2, Plus, Shield } from "lucide-react"

type Organization = {
    id: string
    name: string
    code: string
    logoUrl?: string
}

export function OrgManager() {
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)
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
            setIsOpen(false)
            setName("")
            setCode("")
        }
    })

    if (isLoading) return <div>Carregando...</div>

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Shield className="h-8 w-8 text-primary" />
                        Gestão de Secretarias
                    </h2>
                    <p className="text-muted-foreground mt-1">Painel Administrativo para cadastro de Unidades Orçamentárias</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Nova Secretaria
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nova Secretaria</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Secretaria</Label>
                                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Secretaria de Saúde" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">Sigla / Código</Label>
                                <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="SMS" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                            <Button onClick={() => createOrg.mutate()} disabled={createOrg.isPending}>
                                {createOrg.isPending ? 'Criando...' : 'Criar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations?.map(org => (
                    <Card key={org.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {org.code}
                            </CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold line-clamp-2">{org.name}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                ID: {org.id.slice(0, 8)}...
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
