import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface Organization {
    id: string
    name: string
    code: string
    logoUrl: string | null
    role: string
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
        organizations: Organization[]
        isSuperAdmin?: boolean
    }
}

export function OrgProvider({ children, initialData }: OrgProviderProps) {
    const [activeOrgId, setActiveOrgId] = useState<string | null>(initialData?.activeOrganizationId ?? null)
    const [organizations, setOrganizations] = useState<Organization[]>(initialData?.organizations ?? [])
    const [isLoading, setIsLoading] = useState(!initialData)
    const [isSuperAdmin, setIsSuperAdmin] = useState(initialData?.isSuperAdmin ?? false)

    const fetchOrgSession = async () => {
        try {
            const res = await fetch('/api/org-session')
            if (!res.ok) throw new Error('Failed to fetch org session')
            const data = await res.json()

            setActiveOrgId(data.activeOrganizationId)
            setOrganizations(data.organizations)
            setIsSuperAdmin(data.isSuperAdmin ?? false)

            // Auto-select first org ONLY for non-super-admins with SINGLE org
            // Super admins and multi-org users can have null = "view all"
            if (!data.activeOrganizationId && !data.isSuperAdmin) {
                if (data.organizations.length === 1) {
                    await switchOrg(data.organizations[0].id)
                }
            }
        } catch (err) {
            console.error('[OrgContext] Error fetching org session:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const switchOrg = async (orgId: string | null) => {
        try {
            const res = await fetch('/api/org-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId: orgId })
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to switch organization')
            }

            setActiveOrgId(orgId)

            // Reload page to refresh all data with new org context
            window.location.reload()
        } catch (err) {
            console.error('[OrgContext] Error switching org:', err)
            throw err
        }
    }

    useEffect(() => {
        if (!initialData) {
            fetchOrgSession()
        } else if (!initialData.activeOrganizationId && !initialData.isSuperAdmin) {
            // Auto-select first org ONLY for non-super-admins with SINGLE org
            if (initialData.organizations.length === 1) {
                switchOrg(initialData.organizations[0].id)
            }
        }
    }, [])

    const activeOrg = organizations.find(o => o.id === activeOrgId) || null

    return (
        <OrgContext.Provider value={{
            activeOrgId,
            activeOrg,
            organizations,
            isLoading,
            isSuperAdmin,
            switchOrg,
            refetch: fetchOrgSession
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
