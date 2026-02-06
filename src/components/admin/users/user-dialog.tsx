import { useState, useEffect } from "react"
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { api } from "@/lib/api-client"

interface UserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultOrgId?: string
    user?: any // TODO: add proper type
    onSuccess: () => void
}

export function UserDialog({ open, onOpenChange, defaultOrgId, user, onSuccess }: UserDialogProps) {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [role, setRole] = useState<"secretario" | "gestor" | "viewer">("viewer")
    const [globalRole, setGlobalRole] = useState<"user" | "super_admin">("user")
    const [isActive, setIsActive] = useState(true)
    const [selectedOrgId, setSelectedOrgId] = useState(defaultOrgId || "")

    useEffect(() => {
        if (open) {
            console.log("Dialog Open. User:", user)
            if (user) {
                // Edit Mode
                setName(user.name)
                setEmail(user.email)
                setGlobalRole(user.globalRole || "user")

                // Force boolean check
                const isUserActive = user.isActive === false ? false : true;
                console.log("Setting active to:", isUserActive, "from:", user.isActive);
                setIsActive(isUserActive)
                // ...

                // Select first organization role by default if available
                if (user.organizations && user.organizations.length > 0) {
                    const firstOrg = user.organizations[0]
                    setSelectedOrgId(firstOrg.id)
                    setRole(firstOrg.role)
                }
            } else {
                // Create Mode
                setName("")
                setEmail("")
                setGlobalRole("user")
                setIsActive(true)
                setSelectedOrgId(defaultOrgId || "")
                setRole("viewer")
            }
        }
    }, [open, user, defaultOrgId])


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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (user) {
                // UPDATE MODE
                const res = await api.admin.users[":id"].$patch({
                    param: { id: user.id },
                    json: {
                        name,
                        globalRole,
                        isActive,
                        organizationId: selectedOrgId || undefined,
                        orgRole: role
                    }
                })
                if (!res.ok) {
                    const err = await res.json() as any
                    throw new Error(err.error || "Failed to update user")
                }
                toast.success("Usuário atualizado com sucesso!")
            } else {
                // CREATE MODE
                const res = await api.admin.users.$post({
                    json: {
                        name,
                        email,
                        organizationId: selectedOrgId || undefined,
                        orgRole: role
                    }
                })

                if (!res.ok) {
                    const err = await res.json() as any
                    throw new Error(err.error || "Failed to create user")
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{user ? "Editar Usuário" : "Convidar Usuário"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!user} />
                    </div>

                    <div className="space-y-2">
                        <Label>Organização</Label>
                        <Select value={selectedOrgId} onValueChange={setSelectedOrgId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {orgs?.map((org: any) => (
                                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Função na Organização</Label>
                        <Select value={role} onValueChange={(v: any) => setRole(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viewer">Visualizador</SelectItem>
                                <SelectItem value="gestor">Gestor</SelectItem>
                                <SelectItem value="secretario">Secretário (Admin)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Advanced Permissions (Backend validates permission) */}
                    <div className="pt-4 border-t">
                        <Label className="text-muted-foreground text-xs uppercase font-bold mb-2 block">Permissões Globais</Label>

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
                                    onValueChange={(v) => {
                                        console.log("Status changged to:", v)
                                        setIsActive(v === "active")
                                    }}
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
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : (user ? "Salvar Alterações" : "Convidar")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent >
        </Dialog >
    )
}
