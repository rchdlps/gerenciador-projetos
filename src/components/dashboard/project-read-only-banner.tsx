import { useActiveOrgOptional } from "@/contexts/org-context"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"

interface ProjectReadOnlyBannerProps {
    projectId?: string
    projectOrgId?: string | null
    projectOrgName?: string | null
}

export function ProjectReadOnlyBanner({ projectId, projectOrgId: propProjectOrgId, projectOrgName: propProjectOrgName }: ProjectReadOnlyBannerProps) {
    const orgContext = useActiveOrgOptional()

    const { data: project } = useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => {
            if (!projectId) return null
            const res = await api.projects[':id'].$get({ param: { id: projectId } })
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!projectId && !propProjectOrgId
    })

    const { data: organization } = useQuery({
        queryKey: ['organization', project?.organizationId],
        queryFn: async () => {
            if (!project?.organizationId) return null
            const res = await api.organizations[':id'].$get({ param: { id: project.organizationId } })
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!project?.organizationId && !propProjectOrgName
    })

    const projectOrgId = propProjectOrgId || project?.organizationId
    const projectOrgName = propProjectOrgName || organization?.name

    // If there's no OrgContext (e.g. not wrapped), or no projectOrgId, we don't show the banner.
    if (!orgContext || !projectOrgId) return null

    const { activeOrgId, switchOrg } = orgContext

    // If the active organization matches the project's organization, no banner is needed.
    if (activeOrgId === projectOrgId) return null

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl border border-amber-200/60 shadow-sm w-full sm:w-auto">
                <Lock className="h-4 w-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
                <div className="text-sm">
                    <span className="font-semibold mr-1">Visão Global:</span>
                    <span>Modo de Leitura.</span>
                    <span className="hidden md:inline ml-1 opacity-90">
                        Acesse a secretaria deste projeto para editar.
                    </span>
                </div>
            </div>

            <Button
                onClick={() => switchOrg(projectOrgId)}
                variant="default"
                size="sm"
                className="w-full sm:w-auto shadow-sm transition-all hover:scale-105 active:scale-95 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
                Acessar {projectOrgName || 'Secretaria'}
            </Button>
        </div>
    )
}
