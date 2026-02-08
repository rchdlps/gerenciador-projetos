import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { LogOut, User } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header({ user }: { user?: any }) {
    const { data: session } = authClient.useSession()
    const currentUser = user || session?.user

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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-12 flex items-center gap-3 px-2 hover:bg-white/10 rounded-md transition-colors data-[state=open]:bg-white/10">
                                <div className="hidden md:block text-right">
                                    <p className="text-sm font-semibold leading-none text-white">{currentUser?.name || "Usuário"}</p>
                                    <p className="text-xs text-white/70">{currentUser?.email || ""}</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                                    <User className="h-4 w-4 text-white" />
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{currentUser?.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {currentUser?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <a href="/profile" className="cursor-pointer flex items-center">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Meu Perfil</span>
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={async () => {
                                await authClient.signOut();
                                window.location.href = "/login";
                            }} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Sair</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-brand-stripe" />
        </header>
    )
}
