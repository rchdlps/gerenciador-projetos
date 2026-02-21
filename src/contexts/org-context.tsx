import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Organization {
    id: string
    name: string
    code: string
    logoUrl: string | null
    role: string
}

interface OrgSessionData {
    activeOrganizationId: string | null
    activeOrganization: Organization | null
    organizations: Organization[]
    isSuperAdmin: boolean
}

interface OrgContextType {
    activeOrgId: string | null
    activeOrg: Organization | null
    organizations: Organization[]
    isLoading: boolean
    isSuperAdmin: boolean
    switchOrg: (orgId: string | null) => Promise<void>
    refetch: () => Promise<void>
}

const OrgContext = createContext<OrgContextType | null>(null)

interface OrgProviderProps {
    children: ReactNode
    initialData?: {
        activeOrganizationId: string | null
        activeOrganization?: Organization | null
        organizations: Organization[]
        isSuperAdmin?: boolean
    }
}

export function OrgProvider({ children, initialData }: OrgProviderProps) {
    const queryClient = useQueryClient()

    const { data: orgSession, isLoading } = useQuery<OrgSessionData>({
        queryKey: ['org-session'],
        queryFn: async () => {
            const res = await fetch('/api/org-session')
            if (!res.ok) throw new Error('Failed to fetch org session')
            return res.json()
        },
        staleTime: 60_000,
        initialData: initialData ? {
            activeOrganizationId: initialData.activeOrganizationId,
            activeOrganization: initialData.activeOrganization ?? null,
            organizations: initialData.organizations,
            isSuperAdmin: initialData.isSuperAdmin ?? false,
        } : undefined,
    })

    const switchMutation = useMutation({
        mutationFn: async (orgId: string | null) => {
            const res = await fetch('/api/org-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId: orgId }),
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to switch organization')
            }
        },
        onSuccess: () => {
            // Org switch affects all data — reload page to refresh SSR context
            window.location.reload()
        },
    })

    const activeOrgId = orgSession?.activeOrganizationId ?? null
    const organizations = orgSession?.organizations ?? []
    const isSuperAdmin = orgSession?.isSuperAdmin ?? false
    const activeOrg = organizations.find(o => o.id === activeOrgId) || null

    // Auto-select first org for non-super-admins with single org
    useEffect(() => {
        if (!activeOrgId && !isSuperAdmin && organizations.length === 1) {
            switchMutation.mutate(organizations[0].id)
        }
    }, [activeOrgId, isSuperAdmin, organizations.length])

    const switchOrg = async (orgId: string | null) => {
        await switchMutation.mutateAsync(orgId)
    }

    const refetch = async () => {
        await queryClient.invalidateQueries({ queryKey: ['org-session'] })
    }

    return (
        <OrgContext.Provider value={{
            activeOrgId,
            activeOrg,
            organizations,
            isLoading,
            isSuperAdmin,
            switchOrg,
            refetch,
        }}>
            {children}
        </OrgContext.Provider>
    )
}

export function useActiveOrg() {
    const context = useContext(OrgContext)
    if (!context) {
        throw new Error('useActiveOrg must be used within an OrgProvider')
    }
    return context
}

/**
 * Hook for components that need org context but can handle missing provider
 * Returns null if not in provider (useful for shared components)
 */
export function useActiveOrgOptional() {
    return useContext(OrgContext)
}
