import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

export function InviteUserDialog() {
    const [open, setOpen] = useState(false)
    const [email, setEmail] = useState("")
    const [role, setRole] = useState("user")
    const [organizationId, setOrganizationId] = useState("")

    // Fetch Organizations to invite to
    const { data: organizations } = useQuery({
        queryKey: ['organizations'],
        queryFn: async () => {
            const res = await api.organizations.$get()
            if (!res.ok) return []
            return res.json()
        }
    })

    const inviteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role, organizationId })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to send invitation')
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success("Convite enviado com sucesso!")
            setOpen(false)
            setEmail("")
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !organizationId) return
        inviteMutation.mutate()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Convidar Usuário
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Convidar Membro</DialogTitle>
                    <DialogDescription>
                        Envie um convite por email para adicionar um novo membro à equipe.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="org">Organização</Label>
                        <Select value={organizationId} onValueChange={setOrganizationId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a organização" />
                            </SelectTrigger>
                            <SelectContent>
                                {organizations?.map((org: any) => (
                                    <SelectItem key={org.id} value={org.id}>
                                        {org.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="colaborador@exemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Função</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">Membro</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={inviteMutation.isPending || !organizationId}>
                            {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Convite
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
