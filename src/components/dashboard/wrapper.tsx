import { Providers } from "@/components/providers";
import { ProjectList } from "./project-list";

export function DashboardWrapper() {
    return (
        <Providers>
            <ProjectList />
        </Providers>
    )
}
