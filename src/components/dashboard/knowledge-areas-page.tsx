import { Providers } from "@/components/providers"
import { KnowledgeAreas } from "./knowledge-areas"

export function KnowledgeAreasPage({ projectId }: { projectId: string }) {
    return (
        <Providers>
            <KnowledgeAreas projectId={projectId} />
        </Providers>
    )
}
