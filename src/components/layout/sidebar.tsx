import { Home, Briefcase, LayoutDashboard, Settings, FolderDot, Building2, BookOpen, Calendar, ArrowLeft, Bug, Users, Bell, Megaphone } from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { OrgSwitcher } from "./org-switcher"
import { useActiveOrgOptional } from "@/contexts/org-context"

export function Sidebar({ user, initialPath }: { user?: any, initialPath?: string }) {
    const [currentPath, setCurrentPath] = useState(initialPath || "")
    const { data: session } = authClient.useSession()
    const orgContext = useActiveOrgOptional()
    const activeOrg = orgContext?.activeOrg

    useEffect(() => {
        if (typeof window === "undefined") return

        setCurrentPath(window.location.pathname)

        // Update active link when Astro View Transitions navigate
        const onPageLoad = () => setCurrentPath(window.location.pathname)
        document.addEventListener('astro:page-load', onPageLoad)
        return () => document.removeEventListener('astro:page-load', onPageLoad)
    }, [])

    // Check if user is super admin (globalRole is a custom field)
    const currentUser = user || session?.user
    const isSuperAdmin = (currentUser as any)?.globalRole === 'super_admin'

    const isActive = (path: string) => currentPath === path

    // Helper for project subdomain active state
    const projectMatch = currentPath.match(/\/projects\/([^\/]+)/)
    const projectId = projectMatch ? projectMatch[1] : null

    const getLinkClass = (active: boolean, isProjectContext = false) => {
        if (isProjectContext) {
            return cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all group",
                active
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm"
            )
        }
        return cn(
            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors group",
            active
                ? "bg-primary/10 text-primary font-bold"
                : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
        )
    }

    return (
        <aside className="w-64 hidden lg:flex flex-col border-r bg-card/50 backdrop-blur-sm h-[calc(100vh-64px)] sticky top-16">
            <nav className="flex-1 p-4 space-y-6">

                {/* Organization Switcher */}
                <div className="-mx-1">
                    <OrgSwitcher isSuperAdmin={isSuperAdmin} />
                </div>

                {/* Main Navigation */}
                <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                        Menu Principal
                    </h3>
                    <div className="space-y-1">
                        <a href="/" className={getLinkClass(isActive("/"))}>
                            <Briefcase className={cn("w-4 h-4 group-hover:text-primary", isActive("/") ? "text-primary" : "text-muted-foreground")} />
                            Projetos
                        </a>
                        <a href="/dashboard" className={getLinkClass(isActive("/dashboard"))}>
                            <LayoutDashboard className={cn("w-4 h-4 group-hover:text-primary", isActive("/dashboard") ? "text-primary" : "text-muted-foreground")} />
                            Dashboard
                        </a>
                        <a href="/members" className={getLinkClass(isActive("/members"))}>
                            <Users className={cn("w-4 h-4 group-hover:text-primary", isActive("/members") ? "text-primary" : "text-muted-foreground")} />
                            Membros
                        </a>
                        <a href="/notifications" className={getLinkClass(isActive("/notifications"))}>
                            <Bell className={cn("w-4 h-4 group-hover:text-primary", isActive("/notifications") ? "text-primary" : "text-muted-foreground")} />
                            Notificações
                        </a>
                    </div>
                </div>

                {/* Project Context Section - Visible only when in a project */}
                {projectId && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
                            Contexto do Projeto
                        </h3>
                        <div className="space-y-1 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                            <a href={`/projects/${projectId}`} className={getLinkClass(isActive(`/projects/${projectId}`), true)}>
                                <FolderDot className={cn("w-4 h-4 group-hover:text-blue-700", isActive(`/projects/${projectId}`) ? "text-blue-700" : "text-blue-500")} />
                                Visão Geral
                            </a>
                            <a href={`/projects/${projectId}/knowledge-areas`} className={getLinkClass(isActive(`/projects/${projectId}/knowledge-areas`), true)}>
                                <BookOpen className={cn("w-4 h-4 group-hover:text-blue-700", isActive(`/projects/${projectId}/knowledge-areas`) ? "text-blue-700" : "text-slate-400")} />
                                Áreas de Conhecimento
                            </a>
                            <a href={`/projects/${projectId}/calendar`} className={getLinkClass(isActive(`/projects/${projectId}/calendar`), true)}>
                                <Calendar className={cn("w-4 h-4 group-hover:text-blue-700", isActive(`/projects/${projectId}/calendar`) ? "text-blue-700" : "text-slate-400")} />
                                Calendário
                            </a>
                            <div className="pt-2 mt-2 border-t border-blue-200/50">
                                <a href="/" className="flex items-center gap-3 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white/50 rounded-md transition-colors cursor-pointer group">
                                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                                    Sair do Projeto
                                </a>
                            </div>
                        </div>
                    </div>
                )}


                {/* Admin Section - Visible to super_admin or organization admins (secretario) */}
                {(isSuperAdmin || activeOrg?.role === 'secretario') && (
                    <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                            Administração
                        </h3>
                        <div className="space-y-1">
                            {isSuperAdmin && (
                                <>
                                    <a href="/admin" className={getLinkClass(currentPath === "/admin")}>
                                        <Building2 className={cn("w-4 h-4 group-hover:text-primary", currentPath === "/admin" ? "text-primary" : "text-muted-foreground")} />
                                        Gestão de Secretarias
                                    </a>
                                    <a href="/admin/users" className={getLinkClass(currentPath.startsWith("/admin/users"))}>
                                        <Settings className={cn("w-4 h-4 group-hover:text-primary", currentPath.startsWith("/admin/users") ? "text-primary" : "text-muted-foreground")} />
                                        Gerenciar Usuários
                                    </a>
                                </>
                            )}
                            <a href="/admin/notifications" className={getLinkClass(currentPath.startsWith("/admin/notifications"))}>
                                <Megaphone className={cn("w-4 h-4 group-hover:text-primary", currentPath.startsWith("/admin/notifications") ? "text-primary" : "text-muted-foreground")} />
                                Notificações
                            </a>
                        </div>
                    </div>
                )}

                {/* Feedback Section */}
                <div className="mt-auto pt-4 border-t border-border">
                    <button
                        onClick={async () => {
                            try {
                                const Sentry = await import("@sentry/astro");
                                if (Sentry && Sentry.showReportDialog) {
                                    const eventId = Sentry.captureMessage("User Initiated Feedback");
                                    Sentry.showReportDialog({
                                        eventId,
                                        label: "Reportar Problema",
                                        title: "Relatar um erro",
                                        subtitle: "Descreva o que aconteceu para nos ajudar a melhorar.",
                                        user: {
                                            email: currentUser?.email || "anonimo@exemplo.com",
                                            name: currentUser?.name || "Anônimo",
                                        },
                                    });
                                } else {
                                    alert("Erro: Integração Sentry incompleta.");
                                }
                            } catch (e) {
                                console.error("Sentry load failed", e);
                                alert("Erro ao carregar Sentry. Verifique sua conexão.");
                            }
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-md transition-colors w-full group cursor-pointer"
                    >
                        <Bug className="w-4 h-4 group-hover:text-amber-700" />
                        Reportar Problema
                    </button>
                </div>

            </nav>

            <div className="p-4 border-t bg-muted/10">
                <div className="text-xs text-muted-foreground text-center">
                    &copy; 2026 Prefeitura de Cuiabá - SAETI
                </div>
            </div>
        </aside>
    )
}
