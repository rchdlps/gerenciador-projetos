import { Home, LayoutDashboard, Settings, Layers, FolderDot, Building2 } from "lucide-react"

export function Sidebar() {
    return (
        <aside className="w-64 hidden lg:flex flex-col border-r bg-card/50 backdrop-blur-sm h-[calc(100vh-64px)] sticky top-16">
            <nav className="flex-1 p-4 space-y-6">

                {/* Main Navigation */}
                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                        Menu Principal
                    </h3>
                    <div className="space-y-1">
                        <a href="/" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-accent/50 text-accent-foreground hover:bg-accent hover:text-accent-foreground transition-colors group">
                            <LayoutDashboard className="w-4 h-4 text-primary group-hover:text-primary" />
                            Dashboard
                        </a>
                        <a href="/kanban" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-foreground/70 hover:bg-accent hover:text-accent-foreground transition-colors group">
                            <Layers className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                            Minhas Tarefas
                        </a>
                    </div>
                </div>

                {/* Hierarchy Section */}
                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex justify-between items-center bg-gray-100 p-1 rounded">
                        <span>Unidades (Orgs)</span>
                        <Building2 className="w-3 h-3" />
                    </h3>
                    <div className="space-y-1 mt-2">
                        {/* 
                           Ideally this would be dynamic based on fetching organizations.
                           For now, static placeholders or we can fetch if this was a client component.
                           Since this is a static Sidebar for now, we'll keep it simple or make it interactive later.
                        */}
                        <div className="px-3 py-1.5 text-xs text-muted-foreground italic">
                            Selecione no Dashboard
                        </div>
                    </div>
                </div>

                {/* Admin Section */}
                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                        Administração
                    </h3>
                    <div className="space-y-1">
                        <a href="/admin" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-foreground/70 hover:bg-accent hover:text-accent-foreground transition-colors group">
                            <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                            Gestão de Secretarias
                        </a>
                    </div>
                </div>

            </nav>

            <div className="p-4 border-t bg-muted/10">
                <div className="text-xs text-muted-foreground text-center">
                    &copy; 2026 Prefeitura de Cuiabá
                </div>
            </div>
        </aside>
    )
}
