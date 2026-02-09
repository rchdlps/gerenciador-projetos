import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Loader2, ArrowLeft, MailCheck, Mail } from "lucide-react"
import { AuthLayout } from "@/components/layout/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
            <AuthLayout title="Email Enviado!">
                <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-300 py-4">
                    <div className="bg-green-100 p-4 rounded-full ring-8 ring-green-50">
                        <MailCheck className="w-12 h-12 text-green-600" />
                    </div>

                    <div className="text-center space-y-2">
                        <p className="text-muted-foreground">
                            Enviamos um link de recuperação para <strong>{email}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Verifique sua caixa de entrada e spam. O link expira em breve.
                        </p>
                    </div>

                    <div className="w-full space-y-3 pt-2">
                        <Button
                            variant="outline"
                            className="w-full h-11"
                            onClick={() => window.location.href = '/login'}
                        >
                            Voltar para o Login
                        </Button>

                        <button
                            type="button"
                            onClick={() => setIsSubmitted(false)}
                            className="w-full text-xs text-center text-muted-foreground hover:text-primary underline"
                        >
                            Não recebeu? Tentar novamente
                        </button>
                    </div>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout title="Recuperar Senha">
            <div className="space-y-6">
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Informe seu e-mail cadastrado para receber um link de redefinição de senha.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                                required
                                disabled={isLoading}
                            />
                            <div className="absolute left-3 top-3 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11 text-base shadow-lg shadow-primary/20"
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
                            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Voltar para o Login
                        </a>
                    </div>
                </form>
            </div>
        </AuthLayout>
    )
}
