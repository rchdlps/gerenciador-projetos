import { Providers } from "@/components/providers"
import { KnowledgeAreas } from "./knowledge-areas"
import { OrgProvider } from "@/contexts/org-context"

export function KnowledgeAreasPage({ projectId, initialData, orgSessionData }: { projectId: string; initialData?: any[]; orgSessionData?: any }) {
    return (
        <Providers>
            <OrgProvider initialData={orgSessionData}>
                <KnowledgeAreas projectId={projectId} initialData={initialData} />
            </OrgProvider>
        </Providers>
    )
}
