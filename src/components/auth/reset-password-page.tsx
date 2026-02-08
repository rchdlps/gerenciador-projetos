import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { AuthLayout, AuthInput } from "./auth-components"
import { Button } from "@/components/ui/button"

export function ResetPasswordPage({ initialToken }: { initialToken?: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        let token = initialToken
        if (!token) {
            // Fallback for client-side navigation if token not passed as prop
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
                toast.success("Senha redefinida com sucesso! Redirecionando...")
                setTimeout(() => {
                    window.location.href = "/login"
                }, 2000)
            }
        } catch (err) {
            toast.error("Erro ao redefinir senha.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Redefinir Senha"
            subtitle="Crie uma nova senha segura para sua conta."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <AuthInput
                    id="password"
                    name="password"
                    type="password"
                    label="Nova Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    required
                    minLength={8}
                />

                <AuthInput
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label="Confirmar Senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    minLength={8}
                />

                <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 mt-2"
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
            </form>
        </AuthLayout>
    )
}
