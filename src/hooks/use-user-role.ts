import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

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

    const activeOrgId = session?.activeOrganizationId
    const activeOrg = session?.activeOrganization

    // If super admin, they have all permissions
    if (session?.isSuperAdmin) {
        return {
            role: 'admin', // Treat as admin for UI logic
            isViewer: false,
            isAdmin: true,
            isSuperAdmin: true,
            isLoading,
            activeOrg
        }
    }

    // Standard role check
    const role = activeOrg?.role || 'viewer' // Default to viewer if no role found (safety)

    return {
        role,
        isViewer: role === 'viewer',
        isAdmin: role === 'admin' || role === 'owner',
        isSuperAdmin: false,
        isLoading,
        activeOrg
    }
}
