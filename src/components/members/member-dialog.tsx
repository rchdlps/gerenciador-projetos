import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface MemberDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId: string
    member?: any
    userRole: string | null
    isSuperAdmin: boolean
    onSuccess: () => void
}

export function MemberDialog({
    open,
    onOpenChange,
    organizationId,
    member,
    userRole,
    isSuperAdmin,
    onSuccess
}: MemberDialogProps) {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [role, setRole] = useState<"secretario" | "gestor" | "viewer">("viewer")

    const isEditMode = !!member

    useEffect(() => {
        if (open) {
            if (member) {
                // Edit mode
                setName(member.name || "")
                setEmail(member.email || "")
                setRole(member.role || "viewer")
            } else {
                // Create mode
                setName("")
                setEmail("")
                setRole("viewer")
            }
        }
    }, [open, member])

    // Determine available roles based on user's role
    const getAvailableRoles = () => {
        if (isSuperAdmin) {
            return [
                { value: 'viewer', label: 'Visualizador' },
                { value: 'gestor', label: 'Editor' },
                { value: 'secretario', label: 'Administrador' }
            ]
        }

        if (userRole === 'secretario') {
            return [
                { value: 'viewer', label: 'Visualizador' },
                { value: 'gestor', label: 'Editor' },
                { value: 'secretario', label: 'Administrador' }
            ]
        }

        // Gestor can only assign viewer or gestor
        return [
            { value: 'viewer', label: 'Visualizador' },
            { value: 'gestor', label: 'Editor' }
        ]
    }

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: { name: string; email: string; role: string }) => {
            const res = await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId,
                    name: data.name,
                    email: data.email,
                    role: data.role
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to invite member')
            }

            return res.json()
        },
        onSuccess: (data) => {
            if (data.type === 'existing_user') {
                toast.success('Membro adicionado com sucesso! Um email de notificação foi enviado.')
            } else {
                toast.success('Convite enviado com sucesso! O usuário receberá um email para criar sua conta.')
            }
            onSuccess()
            onOpenChange(false)
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data: { role: string }) => {
            const res = await fetch(`/api/members/${member.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId,
                    role: data.role
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to update member')
            }

            return res.json()
        },
        onSuccess: () => {
            toast.success('Cargo atualizado com sucesso!')
            onSuccess()
            onOpenChange(false)
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (isEditMode) {
            updateMutation.mutate({ role })
        } else {
            if (!name.trim() || !email.trim()) {
                toast.error('Preencha todos os campos')
                return
            }
            createMutation.mutate({ name, email, role })
        }
    }

    const isLoading = createMutation.isPending || updateMutation.isPending
    const availableRoles = getAvailableRoles()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditMode ? 'Editar Cargo' : 'Convidar Membro'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isEditMode ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Digite o nome completo"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@exemplo.com"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Se o usuário já existir, será adicionado a esta organização.
                                    Caso contrário, será criada uma conta com senha temporária.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="p-3 bg-muted/50 rounded-md">
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="role">Cargo</Label>
                        <Select value={role} onValueChange={(v: any) => setRole(v)}>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Selecione um cargo" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableRoles.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {role === 'secretario' && 'Acesso total: pode gerenciar projetos, membros e configurações.'}
                            {role === 'gestor' && 'Acesso de edição: pode criar e editar projetos, tarefas e convidar membros.'}
                            {role === 'viewer' && 'Acesso de leitura: pode visualizar projetos e tarefas.'}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading
                                ? 'Salvando...'
                                : isEditMode
                                    ? 'Salvar'
                                    : 'Convidar'
                            }
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
