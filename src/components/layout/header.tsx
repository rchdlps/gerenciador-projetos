import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function Header() {
    return (
        <header className="bg-primary text-primary-foreground shadow-sm sticky top-0 z-50">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-none tracking-tight">
                            GERENCIADOR
                        </h1>
                        <p className="text-xs font-medium text-white/80">
                            PROJETOS
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-semibold leading-none">Admin User</p>
                        <p className="text-xs text-white/70">admin@example.com</p>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="font-medium shadow-none hover:bg-white/90"
                        onClick={async () => {
                            await authClient.signOut();
                            window.location.href = "/login";
                        }}
                    >
                        Sair
                    </Button>
                </div>
            </div>
        </header>
    )
}
