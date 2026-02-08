import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
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
import { Search, Plus, UserCog, Shield, Building2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

// Add to existing imports
import { UserDialog } from "./user-dialog"

// Role label translations
const roleLabels: Record<string, string> = {
    viewer: 'Visualizador',
    gestor: 'Editor',
    secretario: 'Admin'
}

export function UsersManager() {
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const queryClient = useQueryClient()

    // Fetch Users
    // Fetch Users
    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-users', search],
        queryFn: async () => {
            console.log("Fetching users...", { search })
            try {
                const res = await api.admin.users.$get({ query: { q: search } })
                console.log("Fetch response status:", res.status)
                if (!res.ok) {
                    const txt = await res.text()
                    console.error("Fetch failed:", txt)
                    throw new Error("Failed to fetch users: " + res.status)
                }
                const json = await res.json()
                console.log("Fetch success:", json)
                return json
            } catch (e) {
                console.error("Query Error:", e)
                throw e
            }
        }
    })

    console.log("Render State:", { isLoading, error, dataUsers: data?.data?.length })

    if (error) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                <h3 className="font-bold">Error loading users</h3>
                <pre className="text-xs mt-2">{JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}</pre>
            </div>
        )
    }

    const users = data?.data || []
    const isSuperAdmin = data?.meta?.isSuperAdmin || false

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h2>
                    <p className="text-muted-foreground">
                        {isSuperAdmin
                            ? "Painel Global: Gerencie todos os usuários do sistema."
                            : "Painel da Organização: Gerencie os membros da sua equipe."}
                    </p>
                </div>

                <Button onClick={() => {
                    setSelectedUser(null)
                    setDialogOpen(true)
                }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Usuário
                </Button>

                <UserDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    user={selectedUser}
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
                />
            </div>

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

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Organizações</TableHead>
                            {isSuperAdmin && <TableHead>Permissão Global</TableHead>}
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Carregando...</TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Nenhum usuário encontrado.</TableCell>
                            </TableRow>
                        ) : (
                            users.map((user: any) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.image} />
                                                <AvatarFallback>{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.isActive !== false ? (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Ativo</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Inativo</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {user.organizations.length > 0 ? user.organizations.map((org: any) => (
                                                <Badge key={org.id} variant="secondary" className="text-xs font-normal">
                                                    <Building2 className="mr-1 h-3 w-3 opacity-50" />
                                                    {org.name} ({roleLabels[org.role] || org.role})
                                                </Badge>
                                            )) : (
                                                <span className="text-muted-foreground text-xs italic">Sem organização</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    {isSuperAdmin && (
                                        <TableCell>
                                            {user.globalRole === 'super_admin' ? (
                                                <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-200 border-teal-200">
                                                    <Shield className="mr-1 h-3 w-3" /> Super Admin
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Usuário</span>
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            setSelectedUser(user)
                                            setDialogOpen(true)
                                        }}>
                                            <UserCog className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
