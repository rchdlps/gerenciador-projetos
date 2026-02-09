import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Lock, CheckCircle } from "lucide-react"
import { AuthLayout } from "@/components/layout/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ResetPasswordPage({ initialToken }: { initialToken?: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        let token = initialToken
        if (!token) {
            const urlParams = new URLSearchParams(window.location.search)
            token = urlParams.get('token') || undefined
        }

        if (!token) {
            toast.error("Token de recuperação inválido ou expirado.")
            return
        }

        if (password !== confirmPassword) {
            toast.error("As senhas não coincidem.")
            return
        }

        if (password.length < 8) {
            toast.error("A senha deve ter pelo menos 8 caracteres.")
            return
        }

        setIsLoading(true)

        try {
            const { error } = await (authClient as any).resetPassword({
                newPassword: password,
                token,
            })

            if (error) {
                toast.error(error.message)
            } else {
                setIsSuccess(true)
                toast.success("Senha redefinida com sucesso!")
                setTimeout(() => {
                    window.location.href = "/login"
                }, 3000)
            }
        } catch (err) {
            toast.error("Erro ao redefinir senha.")
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <AuthLayout title="Senha Redefinida!">
                <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-300 py-4">
                    <div className="bg-green-100 p-4 rounded-full ring-8 ring-green-50">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>

                    <div className="text-center space-y-2">
                        <p className="text-muted-foreground">
                            Sua senha foi alterada com segurança. Você já pode acessar sua conta.
                        </p>
                    </div>

                    <Button
                        className="w-full h-11 text-base shadow-lg shadow-primary/20 mt-2"
                        onClick={() => window.location.href = '/login'}
                    >
                        Ir para o Login
                    </Button>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout
            title="Redefinir Senha"
        >
            <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">
                    Crie uma nova senha segura para sua conta.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">Nova Senha</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type="password"
                            placeholder="Mínimo de 8 caracteres"
                            className="pl-10 h-11"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            disabled={isLoading}
                        />
                        <div className="absolute left-3 top-3 text-muted-foreground">
                            <Lock className="h-4 w-4" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Repita a nova senha"
                            className="pl-10 h-11"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            disabled={isLoading}
                        />
                        <div className="absolute left-3 top-3 text-muted-foreground">
                            <Lock className="h-4 w-4" />
                        </div>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-11 text-base shadow-lg shadow-primary/20 mt-2"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Redefinindo...
                        </>
                    ) : (
                        "Confirmar Nova Senha"
                    )}
                </Button>

                <div className="text-center pt-2">
                    <a
                        href="/login"
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Voltar para o Login
                    </a>
                </div>
            </form>
        </AuthLayout>
    )
}
