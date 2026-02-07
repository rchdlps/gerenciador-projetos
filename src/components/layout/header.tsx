import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { LogOut } from "lucide-react"

export function Header() {
    const { data: session } = authClient.useSession()

    return (
        <header className="bg-brand-gradient text-primary-foreground shadow-sm sticky top-0 z-50 relative pb-[5px]">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-1 rounded-sm w-16 h-16 flex items-center justify-center shadow-lg">
                        {/* Placeholder for Official Logo */}
                        <img src="/brasao-cuiaba.webp" alt="Brasão Cuiabá" className="w-full h-full object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        <div className="hidden text-green-800 font-bold text-xs text-center leading-tight">
                            BRASÃO CUIABÁ
                        </div>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white/90 uppercase tracking-wider mb-0.5">
                            Prefeitura Municipal de Cuiabá
                        </h2>
                        <h1 className="text-2xl font-bold leading-none tracking-tight text-white drop-shadow-md mb-1">
                            Sistema de Gestão de Projetos
                        </h1>
                        <div className="flex items-center gap-2 text-[10px] md:text-xs font-medium text-white/80 border-t border-white/20 pt-1 mt-1">
                            <span className="uppercase">Secretaria de Planejamento Estratégico e Orçamento</span>
                            <span className="hidden md:inline text-gold-400">|</span>
                            <span className="hidden md:inline">Diretoria Técnica de Governança</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-semibold leading-none text-white">{session?.user?.name || "Usuário"}</p>
                        <p className="text-xs text-white/70">{session?.user?.email || ""}</p>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="font-medium shadow-none hover:bg-white/90 bg-secondary text-secondary-foreground border-none cursor-pointer gap-2"
                        onClick={async () => {
                            await authClient.signOut();
                            window.location.href = "/login";
                        }}
                    >
                        <LogOut className="w-4 h-4" />
                        Sair
                    </Button>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-brand-stripe" />
        </header>
    )
}
