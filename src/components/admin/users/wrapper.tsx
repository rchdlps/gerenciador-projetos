import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from "@/components/ui/sonner"
import { UsersManager } from "@/components/admin/users/users-manager"

// Specific Wrapper for Admin Page to ensure single React Root
export function AdminUsersWrapper() {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            <UsersManager />
            <Toaster />
        </QueryClientProvider>
    )
}
