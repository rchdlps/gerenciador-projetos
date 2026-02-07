import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function SignIn() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const signIn = async (e?: React.FormEvent) => {
        e?.preventDefault()
        setLoading(true)
        setError(null)
        await authClient.signIn.email({
            email,
            password
        }, {
            onSuccess: () => {
                window.location.href = "/"
            },
            onError: (ctx) => {
                setError(ctx.error.message)
                toast.error("Erro ao entrar", {
                    description: ctx.error.message || "Verifique suas credenciais e tente novamente."
                })
                setLoading(false)
            }
        })
    }



    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Acesso ao Sistema</h2>
                <p className="text-sm text-muted-foreground">
                    Entre com suas credenciais institucionais
                </p>
            </div>

            <form onSubmit={signIn} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">E-mail Institucional</Label>
                    <div className="relative">
                        <Input
                            id="email"
                            type="email"
                            placeholder="usuario@cuiaba.mt.gov.br"
                            className="pl-10 h-11"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                        />
                        <div className="absolute left-3 top-3 text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Senha</Label>
                        <a href="#" className="text-xs text-primary hover:underline font-medium">Esqueceu?</a>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type="password"
                            className="pl-10 h-11"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                        />
                        <div className="absolute left-3 top-3 text-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                        {error}
                    </div>
                )}

                <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary/20" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                </Button>
            </form>

            <div className="text-center text-sm">
                Não possui acesso?{" "}
                <a href="/register" className="text-primary font-semibold hover:underline">
                    Solicitar Cadastro
                </a>
            </div>
        </div>
    )
}
