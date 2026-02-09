import type { ReactNode } from "react"
import { Building2 } from "lucide-react"

export function AuthLayout({ children, title }: { children: ReactNode, title?: string }) {
    return (
        <div className="min-h-screen bg-muted/20 flex flex-col">
            {/* Simple Header */}
            <header className="bg-brand-gradient text-white shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/brasao-cuiaba.png')] opacity-10 bg-center bg-no-repeat bg-contain transform scale-150 pointer-events-none"></div>
                <div className="container mx-auto px-4 py-4 flex items-center gap-3 relative z-10">
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                        <Building2 className="w-8 h-8 text-secondary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold leading-none tracking-tight">Prefeitura de Cuiabá</h1>
                        <p className="text-xs text-secondary font-medium tracking-wide border-t border-white/20 mt-1 pt-1 inline-block">
                            Sistema de Governança de Projetos
                        </p>
                    </div>
                </div>
                {/* Gold Stripe */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-stripe"></div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-md space-y-6">
                    {title && (
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight text-brand-dark">{title}</h2>
                            <p className="text-sm text-muted-foreground">Acesse sua conta governamental</p>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-xl border border-border/50 overflow-hidden relative">
                        <div className="h-1 w-full bg-brand-gradient absolute top-0 left-0"></div>
                        <div className="p-6 sm:p-8">
                            {children}
                        </div>
                    </div>

                    <div className="text-center text-xs text-muted-foreground">
                        &copy; 2026 Secretaria Municipal de Planejamento - SAETI
                    </div>
                </div>
            </main>
        </div>
    )
}
