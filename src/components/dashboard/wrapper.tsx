import { Providers } from "@/components/providers";
import { ProjectList } from "./project-list";
import { OrgProvider } from "@/contexts/org-context";

interface DashboardWrapperProps {
    initialData?: any
}

export function DashboardWrapper({ initialData }: DashboardWrapperProps) {
    return (
        <Providers>
            <OrgProvider initialData={initialData}>
                <ProjectList />
            </OrgProvider>
        </Providers>
    )
}
