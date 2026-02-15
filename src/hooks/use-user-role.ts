import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { ORG_ROLES, type OrgRole } from "@/lib/permissions"

export function useUserRole() {
    const { data: session, isLoading } = useQuery({
        queryKey: ['org-session'],
        queryFn: async () => {
            const res = await api['org-session'].$get()
            if (!res.ok) throw new Error("Failed to fetch session")
            return await res.json()
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    })

    const activeOrg = session?.activeOrganization

    // If super admin, they have all permissions
    if (session?.isSuperAdmin) {
        return {
            role: 'secretario' as const,
            isViewer: false,
            isGestor: false,
            isSecretario: true,
            isAdmin: true,
            isSuperAdmin: true,
            canSendNotifications: true,
            isLoading,
            activeOrg
        }
    }

    // When an org is selected, use that org's role.
    // When no org is selected (aggregate view), use the highest role across all orgs.
    let role: string = 'viewer'
    if (activeOrg?.role) {
        role = activeOrg.role
    } else if (session?.organizations?.length) {
        role = session.organizations.reduce((highest: string, org: { role: string }) => {
            const currentIdx = ORG_ROLES.indexOf(highest as OrgRole)
            const orgIdx = ORG_ROLES.indexOf(org.role as OrgRole)
            return orgIdx > currentIdx ? org.role : highest
        }, 'viewer')
    }

    return {
        role,
        isViewer: role === 'viewer',
        isGestor: role === 'gestor',
        isSecretario: role === 'secretario',
        isAdmin: role === 'secretario',
        isSuperAdmin: false,
        canSendNotifications: role === 'secretario',
        isLoading,
        activeOrg
    }
}
