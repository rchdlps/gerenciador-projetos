import { useState, useEffect } from "react"
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { Plus, X, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Membership {
    organizationId: string
    role: "secretario" | "gestor" | "viewer"
}

interface UserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultOrgId?: string
    user?: any
    onSuccess: () => void
}

export function UserDialog({ open, onOpenChange, defaultOrgId, user, onSuccess }: UserDialogProps) {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [globalRole, setGlobalRole] = useState<"user" | "super_admin">("user")
    const [isActive, setIsActive] = useState(true)

    // Multi-org memberships
    const [memberships, setMemberships] = useState<Membership[]>([])

    // Fetch permitted organizations
    const { data: orgs } = useQuery({
        queryKey: ['admin-orgs'],
        queryFn: async () => {
            const res = await api.admin.organizations.$get()
            if (!res.ok) return []
            return res.json()
        },
        enabled: open
    })

    useEffect(() => {
        if (open) {
            if (user) {
                // Edit Mode
                setName(user.name)
                setEmail(user.email)
                setGlobalRole(user.globalRole || "user")
                setIsActive(user.isActive !== false)

                // Load existing memberships
                if (user.organizations && user.organizations.length > 0) {
                    setMemberships(user.organizations.map((org: any) => ({
                        organizationId: org.id,
                        role: org.role
                    })))
                } else {
                    setMemberships([])
                }
            } else {
                // Create Mode
                setName("")
                setEmail("")
                setGlobalRole("user")
                setIsActive(true)
                // Start with one empty membership row if defaultOrgId provided
                if (defaultOrgId) {
                    setMemberships([{ organizationId: defaultOrgId, role: "viewer" }])
                } else {
                    setMemberships([])
                }
            }
        }
    }, [open, user, defaultOrgId])

    const addMembership = () => {
        // Find first org not already added
        const usedOrgIds = memberships.map(m => m.organizationId)
        const availableOrg = orgs?.find((o: any) => !usedOrgIds.includes(o.id))
        if (availableOrg) {
            setMemberships([...memberships, { organizationId: availableOrg.id, role: "viewer" }])
        }
    }

    const removeMembership = (index: number) => {
        setMemberships(memberships.filter((_, i) => i !== index))
    }

    const updateMembership = (index: number, field: "organizationId" | "role", value: string) => {
        const updated = [...memberships]
        updated[index] = { ...updated[index], [field]: value }
        setMemberships(updated)
    }

    const getAvailableOrgs = (currentOrgId: string) => {
        const usedOrgIds = memberships.map(m => m.organizationId).filter(id => id !== currentOrgId)
        return orgs?.filter((o: any) => !usedOrgIds.includes(o.id)) || []
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (user) {
                // UPDATE MODE - use memberships array
                const res = await api.admin.users[":id"].$patch({
                    param: { id: user.id },
                    json: {
                        name,
                        globalRole,
                        isActive,
                        memberships
                    }
                })
                if (!res.ok) {
                    const err = await res.json() as any
                    throw new Error(err.error || "Failed to update user")
                }
                toast.success("Usuário atualizado com sucesso!")
            } else {
                // CREATE MODE - use first membership
                const firstMembership = memberships[0]
                const res = await api.admin.users.$post({
                    json: {
                        name,
                        email,
                        organizationId: firstMembership?.organizationId,
                        orgRole: firstMembership?.role
                    }
                })

                if (!res.ok) {
                    const err = await res.json() as any
                    throw new Error(err.error || "Failed to create user")
                }

                // If more memberships, add them via patch
                if (memberships.length > 1 && (res as any).userId) {
                    const userId = (await res.json() as any).userId
                    await api.admin.users[":id"].$patch({
                        param: { id: userId },
                        json: { memberships }
                    })
                }

                toast.success("Usuário convidado com sucesso!")
            }

            onSuccess()
            onOpenChange(false)
        } catch (error) {
            toast.error((error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    const canAddMore = orgs && memberships.length < orgs.length

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader>
                    <DialogTitle>{user ? "Editar Usuário" : "Convidar Usuário"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!user} />
                    </div>

                    {/* Multi-Organization Memberships */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Organizações</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addMembership}
                                disabled={!canAddMore}
                            >
                                <Plus className="w-3 h-3 mr-1" /> Adicionar
                            </Button>
                        </div>

                        {memberships.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-md">
                                <Building2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                Nenhuma organização atribuída
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {memberships.map((membership, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                                        <Select
                                            value={membership.organizationId}
                                            onValueChange={(v) => updateMembership(index, "organizationId", v)}
                                        >
                                            <SelectTrigger className="flex-1 min-w-0">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getAvailableOrgs(membership.organizationId).map((org: any) => (
                                                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select
                                            value={membership.role}
                                            onValueChange={(v: any) => updateMembership(index, "role", v)}
                                        >
                                            <SelectTrigger className="w-32 shrink-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="viewer">Visualizador</SelectItem>
                                                <SelectItem value="gestor">Editor</SelectItem>
                                                <SelectItem value="secretario">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeMembership(index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Advanced Permissions (Backend validates permission) */}
                    <div className="pt-6 border-t">
                        <Label className="text-muted-foreground text-xs uppercase font-bold mb-3 block">Permissões Globais</Label>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Cargo Global</Label>
                                <Select value={globalRole} onValueChange={(v: any) => setGlobalRole(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">Usuário Padrão</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Status da Conta</Label>
                                <Select
                                    value={isActive ? "active" : "inactive"}
                                    onValueChange={(v) => setIsActive(v === "active")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Ativo</SelectItem>
                                        <SelectItem value="inactive">Inativo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : (user ? "Salvar Alterações" : "Convidar")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
