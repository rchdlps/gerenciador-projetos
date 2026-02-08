import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Loader2, Lock } from "lucide-react"

const signUpSchema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
})

export default function SignUp() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const form = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    })

    const onSubmit = async (values: z.infer<typeof signUpSchema>) => {
        setLoading(true)
        setError(null)
        await authClient.signUp.email({
            email: values.email,
            password: values.password,
            name: values.name,
        }, {
            onSuccess: () => {
                window.location.href = "/"
            },
            onError: (ctx) => {
                let message = "Erro ao criar conta"
                if (ctx.error.message?.includes("User already exists") || ctx.error.message?.includes("already in use")) {
                    message = "Este e-mail já está em uso. Tente fazer login."
                } else if (ctx.error.message) {
                    message = ctx.error.message
                }
                setError(message)
                setLoading(false)
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Novo Cadastro</h2>
                <p className="text-sm text-muted-foreground">
                    Crie sua credencial de acesso
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome Completo</FormLabel>
                                <div className="relative">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="João Silva"
                                            className="pl-10 h-11"
                                            disabled={loading}
                                        />
                                    </FormControl>
                                    <div className="absolute left-3 top-3 text-muted-foreground">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>E-mail</FormLabel>
                                <div className="relative">
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="email"
                                            placeholder="nome@empresa.com"
                                            className="pl-10 h-11"
                                            disabled={loading}
                                        />
                                    </FormControl>
                                    <div className="absolute left-3 top-3 text-muted-foreground">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Senha</FormLabel>
                                <div className="relative">
                                    <FormControl>
                                        <PasswordInput
                                            {...field}
                                            className="pl-10 h-11"
                                            disabled={loading}
                                        />
                                    </FormControl>
                                    <div className="absolute left-3 top-3 text-muted-foreground">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary/20" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Conta
                    </Button>
                </form>
            </Form>

            <div className="text-center text-sm">
                Já tem cadastro?{" "}
                <a href="/login" className="text-primary font-semibold hover:underline">
                    Entrar
                </a>
            </div>
        </div>
    )
}
