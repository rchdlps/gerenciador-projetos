import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from "@/components/ui/sonner"
import { OrgMembersManager } from "./org-members-manager"
import { OrgProvider } from "@/contexts/org-context"

interface Props {
    organizationId: string | null
    canManage: boolean
    userRole: string | null
    isSuperAdmin: boolean
}

export function OrgMembersWrapper({ organizationId, canManage, userRole, isSuperAdmin }: Props) {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            <OrgProvider>
                <OrgMembersManager
                    organizationId={organizationId}
                    canManage={canManage}
                    userRole={userRole}
                    isSuperAdmin={isSuperAdmin}
                />
            </OrgProvider>
            <Toaster />
        </QueryClientProvider>
    )
}
