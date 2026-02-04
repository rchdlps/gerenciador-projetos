import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function Header() {
    return (
        <header className="bg-brand-gradient text-primary-foreground shadow-sm sticky top-0 z-50 relative pb-[5px]">
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-white p-1 rounded-sm w-16 h-16 flex items-center justify-center shadow-lg">
                        {/* Placeholder for Official Logo */}
                        <img src="data:image/webp;base64,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" alt="Brasão Cuiabá" className="w-full h-full object-contain"
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
                        <p className="text-sm font-semibold leading-none text-white">Usuário do Sistema</p>
                        <p className="text-xs text-white/70">admin@example.com</p>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="font-medium shadow-none hover:bg-white/90 bg-secondary text-secondary-foreground border-none"
                        onClick={async () => {
                            await authClient.signOut();
                            window.location.href = "/login";
                        }}
                    >
                        Sair
                    </Button>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-brand-stripe" />
        </header>
    )
}
