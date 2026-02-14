import { Providers } from "@/components/providers"
import { KnowledgeAreas } from "./knowledge-areas"

export function KnowledgeAreasPage({ projectId, initialData }: { projectId: string; initialData?: any[] }) {
    return (
        <Providers>
            <KnowledgeAreas projectId={projectId} initialData={initialData} />
        </Providers>
    )
}
