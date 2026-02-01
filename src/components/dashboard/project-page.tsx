import { Providers } from "@/components/providers"
import { ProjectDetails } from "./project-details"

export function ProjectPage({ id }: { id: string }) {
    return (
        <Providers>
            <ProjectDetails id={id} />
        </Providers>
    )
}
