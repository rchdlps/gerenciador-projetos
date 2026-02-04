import { Home, LayoutDashboard, Settings, Layers, FolderDot, Building2, BookOpen, Calendar, ArrowLeft } from "lucide-react"

export function Sidebar() {
    // Basic client-side path check
    // In a real SSR/hydrated app, we might use a hook or props, but checking window is fine for client component.
    const isClient = typeof window !== 'undefined';
    const currentPath = isClient ? window.location.pathname : '';

    // Check if we are inside a project (e.g. /projects/123)
    // Matches /projects/ anything except empty
    const projectMatch = currentPath.match(/\/projects\/([^\/]+)/);
    const projectId = projectMatch ? projectMatch[1] : null;

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

                {/* Project Context Section - Visible only when in a project */}
                {projectId && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
                            Contexto do Projeto
                            {/* <span className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">Ativo</span> */}
                        </h3>
                        <div className="space-y-1 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                            <a href={`/projects/${projectId}`} className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-blue-700 hover:bg-white hover:shadow-sm transition-all group">
                                <FolderDot className="w-4 h-4 text-blue-500 group-hover:text-blue-700" />
                                Visão Geral
                            </a>
                            <a href={`/projects/${projectId}/knowledge-areas`} className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm transition-all group">
                                <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                Áreas de Conhecimento
                            </a>
                            <a href={`/projects/${projectId}/calendar`} className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm transition-all group">
                                <Calendar className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                                Calendário
                            </a>
                            <div className="pt-2 mt-2 border-t border-blue-200/50">
                                <a href="/" className="flex items-center gap-3 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">
                                    <ArrowLeft className="w-3 h-3" />
                                    Sair do Projeto
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hierarchy Section */}
                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex justify-between items-center bg-slate-100 p-1.5 rounded">
                        <span>Unidades (Orgs)</span>
                        <Building2 className="w-3 h-3 text-slate-500" />
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
