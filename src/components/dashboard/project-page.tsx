import { Providers } from "@/components/providers"
import { OrgProvider } from "@/contexts/org-context"
import { ProjectDetails } from "./project-details"

interface ProjectPageProps {
    id: string
    initialData?: any
}

export function ProjectPage({ id, initialData }: ProjectPageProps) {
    return (
        <Providers>
            <OrgProvider initialData={initialData}>
                <ProjectDetails id={id} />
            </OrgProvider>
        </Providers>
    )
}
