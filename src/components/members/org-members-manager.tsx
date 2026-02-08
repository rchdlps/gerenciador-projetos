import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, UserCog, Trash2, AlertCircle, Users, Mail, Clock, X } from "lucide-react"
import { toast } from "sonner"
import { MemberDialog } from "./member-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useActiveOrg } from "@/contexts/org-context"

// Role label translations
const roleLabels: Record<string, string> = {
    viewer: 'Visualizador',
    gestor: 'Editor',
    secretario: 'Administrador'
}

const roleBadgeStyles: Record<string, string> = {
    secretario: 'bg-purple-100 text-purple-800 border-purple-200',
    gestor: 'bg-blue-100 text-blue-800 border-blue-200',
    viewer: 'bg-gray-100 text-gray-800 border-gray-200'
}

interface Props {
    organizationId: string | null
    canManage: boolean
    userRole: string | null
    isSuperAdmin: boolean
}

export function OrgMembersManager({ organizationId, canManage, userRole, isSuperAdmin }: Props) {
    const [search, setSearch] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedMember, setSelectedMember] = useState<any>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [memberToDelete, setMemberToDelete] = useState<any>(null)
    const queryClient = useQueryClient()
    const { activeOrg } = useActiveOrg()

    // Fetch members
    const { data, isLoading, error } = useQuery({
        queryKey: ['org-members', organizationId, search],
        queryFn: async () => {
            if (!organizationId) return null
            const params = new URLSearchParams({ orgId: organizationId })
            if (search) params.append('q', search)

            const res = await fetch(`/api/members?${params}`)
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to fetch members')
            }
            return res.json()
        },
        enabled: !!organizationId
    })

    // Delete member mutation
    const deleteMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetch(`/api/members/${userId}?orgId=${organizationId}`, {
                method: 'DELETE'
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to remove member')
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success('Membro removido com sucesso')
            queryClient.invalidateQueries({ queryKey: ['org-members'] })
            setDeleteDialogOpen(false)
            setMemberToDelete(null)
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })

    // Resend invitation mutation
    const resendMutation = useMutation({
        mutationFn: async (invitationId: string) => {
            const res = await fetch(`/api/members/invitations/${invitationId}/resend`, {
                method: 'POST'
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to resend invitation')
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success('Convite reenviado com sucesso!')
            queryClient.invalidateQueries({ queryKey: ['org-members'] })
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })

    // Cancel invitation mutation
    const cancelInvitationMutation = useMutation({
        mutationFn: async (invitationId: string) => {
            const res = await fetch(`/api/members/invitations/${invitationId}`, {
                method: 'DELETE'
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to cancel invitation')
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success('Convite cancelado')
            queryClient.invalidateQueries({ queryKey: ['org-members'] })
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })

    const handleDelete = (member: any) => {
        setMemberToDelete(member)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = () => {
        if (memberToDelete) {
            deleteMutation.mutate(memberToDelete.id)
        }
    }

    // No active organization selected
    if (!organizationId) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Nenhuma secretaria selecionada</h2>
                <p className="text-muted-foreground max-w-md">
                    Selecione uma secretaria no menu lateral para visualizar e gerenciar os membros.
                </p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <h3 className="font-bold">Erro ao carregar membros</h3>
                </div>
                <p className="mt-2 text-sm">{(error as Error).message}</p>
            </div>
        )
    }

    const members = data?.data || []
    const pendingInvitations = data?.pendingInvitations || []
    const orgName = data?.meta?.organizationName || activeOrg?.name || 'Organização'

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Membros</h2>
                    <p className="text-muted-foreground">
                        Gerencie os membros da <span className="font-medium text-foreground">{orgName}</span>
                    </p>
                </div>

                {canManage && (
                    <Button onClick={() => {
                        setSelectedMember(null)
                        setDialogOpen(true)
                    }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Convidar Membro
                    </Button>
                )}
            </div>

            {/* Viewer warning */}
            {!canManage && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Você tem acesso de visualização. Contate um administrador para gerenciar membros.</span>
                </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nome ou email..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Membro</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Status</TableHead>
                            {canManage && <TableHead className="text-right">Ações</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Carregando...
                                </TableCell>
                            </TableRow>
                        ) : members.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Users className="w-8 h-8 opacity-50" />
                                        {search ? 'Nenhum membro encontrado.' : 'Nenhum membro nesta organização.'}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            members.map((member: any) => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={member.image} />
                                                <AvatarFallback>
                                                    {member.name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{member.name}</div>
                                                <div className="text-xs text-muted-foreground">{member.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={roleBadgeStyles[member.role] || ''}
                                        >
                                            {roleLabels[member.role] || member.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {member.isActive !== false ? (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                Ativo
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                                Inativo
                                            </Badge>
                                        )}
                                    </TableCell>
                                    {canManage && (
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedMember(member)
                                                        setDialogOpen(true)
                                                    }}
                                                    title="Editar cargo"
                                                >
                                                    <UserCog className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(member)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    title="Remover membro"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pending Invitations Section */}
            {pendingInvitations.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Convites Pendentes ({pendingInvitations.length})
                    </h3>
                    <div className="border rounded-md divide-y">
                        {pendingInvitations.map((invitation: any) => {
                            const isExpired = new Date(invitation.expiresAt) < new Date()
                            return (
                                <div key={invitation.id} className="flex items-center justify-between p-3 bg-amber-50/50">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 bg-amber-100">
                                            <AvatarFallback className="bg-amber-100 text-amber-700">
                                                <Mail className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium text-sm">{invitation.email}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={roleBadgeStyles[invitation.role] || ''}
                                                >
                                                    {roleLabels[invitation.role] || invitation.role}
                                                </Badge>
                                                {isExpired ? (
                                                    <span className="text-red-600">Expirado</span>
                                                ) : (
                                                    <span>Expira em {new Date(invitation.expiresAt).toLocaleDateString('pt-BR')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => resendMutation.mutate(invitation.id)}
                                                disabled={resendMutation.isPending}
                                                title="Reenviar convite"
                                            >
                                                <Mail className="h-4 w-4 mr-1" />
                                                {resendMutation.isPending ? 'Enviando...' : 'Reenviar'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                                                disabled={cancelInvitationMutation.isPending}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                title="Cancelar convite"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Member Dialog */}
            <MemberDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                organizationId={organizationId}
                member={selectedMember}
                userRole={userRole}
                isSuperAdmin={isSuperAdmin}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['org-members'] })}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover membro</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover <strong>{memberToDelete?.name}</strong> desta organização?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
