import { Providers } from "@/components/providers"
import { OrgProvider } from "@/contexts/org-context"
import { Sidebar } from "./sidebar"

interface SidebarWithProviderProps {
    user?: any
    initialData?: {
        activeOrganizationId: string | null
        organizations: any[]
        isSuperAdmin?: boolean
    }
    initialPath?: string
}

/**
 * Wrapper component that provides OrgContext to Sidebar
 * Used in Astro layouts with client:load
 */
export function SidebarWithProvider({ user, initialData, initialPath }: SidebarWithProviderProps) {
    return (
        <Providers>
            <OrgProvider initialData={initialData}>
                <Sidebar user={user} initialPath={initialPath} />
            </OrgProvider>
        </Providers>
    )
}
