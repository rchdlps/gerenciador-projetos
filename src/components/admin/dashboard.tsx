import { Providers } from "@/components/providers"
import { useState } from "react"
import { OrgManager } from "./org-manager"
import { AuditLogsViewer } from "./audit-logs"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Activity } from "lucide-react"

export function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'orgs' | 'audit'>('orgs')

    return (
        <Providers>
            <div className="space-y-6">
                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg w-max">
                    <Button
                        variant={activeTab === 'orgs' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('orgs')}
                        className="gap-2"
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Secretarias
                    </Button>
                    <Button
                        variant={activeTab === 'audit' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('audit')}
                        className="gap-2"
                    >
                        <Activity className="w-4 h-4" />
                        Auditoria
                    </Button>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {activeTab === 'orgs' ? (
                        <OrgManager />
                    ) : (
                        <AuditLogsViewer />
                    )}
                </div>
            </div>
        </Providers>
    )
}
