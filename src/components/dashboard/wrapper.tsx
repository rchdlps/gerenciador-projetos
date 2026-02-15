import { Providers } from "@/components/providers";
import { ProjectList } from "./project-list";
import { OrgProvider } from "@/contexts/org-context";

interface DashboardWrapperProps {
    initialData?: any
    initialProjects?: any[]
}

export function DashboardWrapper({ initialData, initialProjects }: DashboardWrapperProps) {
    return (
        <Providers>
            <OrgProvider initialData={initialData}>
                <ProjectList initialProjects={initialProjects} />
            </OrgProvider>
        </Providers>
    )
}
