import { cn } from "@/lib/utils"
import { PasswordInput } from "@/components/ui/password-input"

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
            <div className="absolute top-0 left-0 w-full h-2 bg-brand-gradient" />

            <div className="w-full max-w-[400px] space-y-6 relative z-10">
                {/* Logo Section */}
                <div className="flex flex-col items-center text-center space-y-4 mb-8">
                    <div className="bg-white p-3 rounded-xl shadow-lg ring-1 ring-slate-900/5">
                        <img
                            src="/brasao-cuiaba.webp"
                            alt="Brasão Cuiabá"
                            className="w-20 h-20 object-contain"
                        />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                            Prefeitura Municipal de Cuiabá
                        </h2>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Gestão de Projetos
                        </h1>
                    </div>
                </div>

                {/* Card Container */}
                <div className="bg-white/80 backdrop-blur-xl shadow-2xl ring-1 ring-slate-900/5 rounded-2xl p-8 space-y-6">
                    <div className="space-y-2 text-center">
                        <h3 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
                        <p className="text-sm text-slate-500">{subtitle}</p>
                    </div>

                    {children}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-400">
                    &copy; 2026 Secretaria de Planejamento Estratégico
                </p>
            </div>
        </div>
    )
}

export function AuthInput({ label, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">
                {label}
            </label>
            {props.type === "password" ? (
                <PasswordInput
                    id={id}
                    className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        "transition-all duration-200 focus:border-blue-500 focus:ring-blue-500/20"
                    )}
                    {...props}
                />
            ) : (
                <input
                    id={id}
                    className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        "transition-all duration-200 focus:border-blue-500 focus:ring-blue-500/20"
                    )}
                    {...props}
                />
            )}
        </div>
    )
}
