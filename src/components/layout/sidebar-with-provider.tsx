import { OrgProvider } from "@/contexts/org-context"
import { Sidebar } from "./sidebar"

interface SidebarWithProviderProps {
    user?: any
}

/**
 * Wrapper component that provides OrgContext to Sidebar
 * Used in Astro layouts with client:load
 */
export function SidebarWithProvider({ user }: SidebarWithProviderProps) {
    return (
        <OrgProvider>
            <Sidebar user={user} />
        </OrgProvider>
    )
}
