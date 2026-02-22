import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { ExportDropdown } from "@/components/file-processor/export-dropdown"
import { ImportDialog } from "@/components/file-processor/import-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trash, Plus, Users, Pencil, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Stakeholder {
    id: string
    projectId: string
    name: string
    role: string
    level: string
    email?: string | null
    createdAt: string
}

import { useUserRole } from "@/hooks/use-user-role"

export function Stakeholders({ projectId }: { projectId: string }) {
    const queryClient = useQueryClient()
    const { isViewer } = useUserRole()
    const [isOpen, setIsOpen] = useState(false) // Collapsible state
    const [isDialogOpen, setIsDialogOpen] = useState(false) // Dialog state
    const [newItem, setNewItem] = useState({ name: "", role: "", level: "interessado", email: "" })
    const [activeId, setActiveId] = useState<string | null>(null) // For editing

    const { data: stakeholders, isLoading } = useQuery({
        queryKey: ['stakeholders', projectId],
        queryFn: async () => {
            const res = await api.stakeholders[':projectId'].$get({
                param: { projectId }
            })
            if (!res.ok) throw new Error()
            return res.json()
        }
    })

    const createStakeholder = useMutation({
        mutationFn: async () => {
            const res = await api.stakeholders[':projectId'].$post({
                param: { projectId },
                json: newItem
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stakeholders', projectId] })
            closeDialog()
        }
    })

    const updateStakeholder = useMutation({
        mutationFn: async () => {
            if (!activeId) return
            const res = await api.stakeholders[':id'].$put({
                param: { id: activeId },
                json: newItem
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stakeholders', projectId] })
            closeDialog()
        }
    })

    const deleteStakeholder = useMutation({
        mutationFn: async (id: string) => {
            await api.stakeholders[':id'].$delete({ param: { id } })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stakeholders', projectId] })
        }
    })

    const openCreateDialog = () => {
        setNewItem({ name: "", role: "", level: "interessado", email: "" })
        setActiveId(null)
        setIsDialogOpen(true)
    }

    const openEditDialog = (stakeholder: any) => {
        setNewItem({
            name: stakeholder.name,
            role: stakeholder.role,
            level: stakeholder.level,
            email: stakeholder.email || ""
        })
        setActiveId(stakeholder.id)
        setIsDialogOpen(true)
    }

    const closeDialog = () => {
        setIsDialogOpen(false)
        setNewItem({ name: "", role: "", level: "interessado", email: "" })
        setActiveId(null)
    }

    const handleSave = () => {
        if (activeId) {
            updateStakeholder.mutate()
        } else {
            createStakeholder.mutate()
        }
    }

    const getLevelBadge = (level: string) => {
        const styles = {
            patrocinador: "bg-emerald-100 text-emerald-800",
            gerente: "bg-blue-100 text-blue-800",
            equipe: "bg-yellow-100 text-yellow-800",
            interessado: "bg-red-100 text-red-800"
        }
        return styles[level as keyof typeof styles] || "bg-gray-100"
    }

    if (isLoading) return <div>Loading...</div>

    return (
        <Card className="border shadow-none">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg items-center flex-row justify-between py-4">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <CardTitle className="text-lg">Partes Interessadas</CardTitle>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ExportDropdown projectId={projectId} entity="stakeholders" />
                    {!isViewer && (
                        <ImportDialog projectId={projectId} entity="stakeholders" invalidateKeys={[['stakeholders', projectId]]} />
                    )}
                    {!isViewer && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="sm" className="font-semibold shadow-none text-secondary-foreground cursor-pointer" onClick={openCreateDialog}>
                                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{activeId ? "Editar Parte Interessada" : "Nova Parte Interessada"}</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Nome</Label>
                                        <Input id="name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="role">Papel / Cargo</Label>
                                        <Input id="role" value={newItem.role} onChange={e => setNewItem({ ...newItem, role: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="level">Nível de Envolvimento</Label>
                                        <Select value={newItem.level} onValueChange={val => setNewItem({ ...newItem, level: val })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="patrocinador">Patrocinador</SelectItem>
                                                <SelectItem value="gerente">Gerente</SelectItem>
                                                <SelectItem value="equipe">Equipe</SelectItem>
                                                <SelectItem value="interessado">Interessado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" value={newItem.email} onChange={e => setNewItem({ ...newItem, email: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleSave}>Salvar</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardHeader>
            {isOpen && (
                <CardContent className="p-6">
                    {!stakeholders || stakeholders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p>Nenhuma parte interessada cadastrada.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {stakeholders.map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:border-primary transition-all">
                                    <div className="flex items-center gap-4">
                                        <Avatar>
                                            <AvatarFallback className="bg-primary text-white font-bold">
                                                {s.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm">{s.name}</p>
                                            <p className="text-xs text-muted-foreground">{s.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant="outline" className={`border-0 uppercase text-[10px] ${getLevelBadge(s.level)}`}>
                                            {s.level}
                                        </Badge>
                                        <div className="flex items-center border rounded-md">
                                            {!isViewer && (
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(s)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {!isViewer && <div className="w-px h-4 bg-border"></div>}
                                            {!isViewer && (
                                                <Button variant="ghost" size="icon" onClick={() => deleteStakeholder.mutate(s.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                    <Trash className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}
