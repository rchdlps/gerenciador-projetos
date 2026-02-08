import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Loader2, ArrowLeft, MailCheck } from "lucide-react"
import { AuthLayout, AuthInput } from "./auth-components"
import { Button } from "@/components/ui/button"

export function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [email, setEmail] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const { error } = await (authClient as any).requestPasswordReset({
                email,
                redirectTo: window.location.origin + "/reset-password",
            })

            if (error) {
                toast.error(error.message)
            } else {
                setIsSubmitted(true)
                toast.success("Email de recuperação enviado!")
            }
        } catch (err) {
            toast.error("Ocorreu um erro ao enviar o email.")
        } finally {
            setIsLoading(false)
        }
    }

    if (isSubmitted) {
        return (
            <AuthLayout
                title="Email Enviado!"
                subtitle={`Enviamos um link de recuperação para ${email}`}
            >
                <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="bg-green-100 p-4 rounded-full ring-8 ring-green-50">
                        <MailCheck className="w-12 h-12 text-green-600" />
                    </div>

                    <p className="text-center text-sm text-muted-foreground">
                        Verifique sua caixa de entrada e spam. O link expira em breve.
                    </p>

                    <div className="w-full space-y-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.location.href = '/login'}
                        >
                            Voltar para o Login
                        </Button>

                        <button
                            type="button"
                            onClick={() => setIsSubmitted(false)}
                            className="w-full text-xs text-center text-muted-foreground hover:text-primary mt-4 underline"
                        >
                            Não recebeu? Tentar novamente
                        </button>
                    </div>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout
            title="Esqueceu sua senha?"
            subtitle="Informe seu email para receber um link de redefinição."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <AuthInput
                    id="email"
                    name="email"
                    type="email"
                    label="Email Cadastrado"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@exemplo.com"
                    required
                />

                <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        "Enviar Link de Recuperação"
                    )}
                </Button>

                <div className="text-center pt-2">
                    <a
                        href="/login"
                        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Voltar para o Login
                    </a>
                </div>
            </form>
        </AuthLayout>
    )
}
