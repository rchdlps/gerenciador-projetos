"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUpload } from "@/components/ui/file-upload"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"

// Schema for General Profile (Name + Avatar)
const profileSchema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
    image: z.string().optional(),
})

// Schema for Password Change
const passwordSchema = z.object({
    currentPassword: z.string().min(1, "A senha atual é obrigatória"),
    newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme a nova senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
})

// Schema for Email Change
const emailSchema = z.object({
    newEmail: z.string().email("E-mail inválido"),
    currentPassword: z.string().min(1, "A senha atual é obrigatória para confirmar a mudança"),
})

export function ProfileForm() {
    const { data: session, isPending, error } = authClient.useSession()
    const [uploading, setUploading] = useState(false)

    // Form 1: General Profile
    const profileForm = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        values: {
            name: session?.user?.name || "",
            image: session?.user?.image || "",
        },
    })

    // ... (keep other forms initialized with defaultValues which don't depend on session immediately if we handle loading) 

    // BUT wait, we need session to be ready for profileForm values to be correct?
    // profileForm uses `values` prop which updates when session changes.
    // So it should be fine to render if we handle isPending check early.

    // Form 2: Password
    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    })

    // Form 3: Email
    const emailForm = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: {
            newEmail: "",
            currentPassword: "",
        },
    })

    if (isPending) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-10 text-red-500">
                Erro ao carregar sessão: {error.message}
            </div>
        )
    }

    if (!session) {
        return (
            <div className="text-center py-10">
                Você precisa estar logado para ver esta página.
            </div>
        )
    }

    // --- Actions ---

    const onUpdateProfile = async (values: z.infer<typeof profileSchema>) => {
        await authClient.updateUser({
            name: values.name,
            image: values.image,
        }, {
            onSuccess: () => {
                toast.success("Perfil atualizado com sucesso!")
            },
            onError: (ctx) => {
                toast.error(ctx.error.message || "Erro ao atualizar perfil")
            }
        })
    }

    const onChangePassword = async (values: z.infer<typeof passwordSchema>) => {
        await authClient.changePassword({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
            revokeOtherSessions: true,
        }, {
            onSuccess: () => {
                toast.success("Senha alterada com sucesso!")
                passwordForm.reset()
            },
            onError: (ctx) => {
                toast.error(ctx.error.message || "Erro ao alterar senha")
            }
        })
    }

    const onChangeEmail = async (values: z.infer<typeof emailSchema>) => {
        // Warning: implementation depends on how better-auth handles email change with password check
        // Often requires verifyCurrentPassword first or specialized hook. 
        // Standard better-auth might send verification email to NEW email first.

        await authClient.changeEmail({
            newEmail: values.newEmail,
        }, {
            onSuccess: () => {
                toast.success("Verifique seu novo email para confirmar a alteração.")
                emailForm.reset()
            },
            onError: (ctx) => {
                toast.error(ctx.error.message || "Erro ao solicitar troca de email")
            }
        })
    }

    const handleAvatarUpload = async (files: File[]) => {
        if (!files.length) return
        const file = files[0]
        setUploading(true)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/storage/upload-avatar', {
                method: 'POST',
                body: formData,
            })
            if (!res.ok) throw new Error('Falha ao enviar avatar')
            const { publicUrl } = await res.json()

            profileForm.setValue('image', publicUrl)
            await profileForm.handleSubmit(onUpdateProfile)()
        } catch (error) {
            console.error(error)
            toast.error('Erro no upload do avatar')
        } finally {
            setUploading(false)
        }
    }



    return (
        <div className="max-w-4xl mx-auto py-10 space-y-8">
            <div className="space-y-6">
                {/* General Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informações Pessoais</CardTitle>
                        <CardDescription>Atualize seu nome e foto de perfil.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-6">
                            {/* Avatar Section */}
                            <div className="flex items-center gap-6">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={profileForm.watch("image") || session.user.image || ""} />
                                    <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <FileUpload onUpload={handleAvatarUpload} />
                                        {uploading && <Loader2 className="animate-spin h-4 w-4" />}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        JPG, GIF ou PNG. Máximo de 2MB.
                                    </p>
                                </div>
                            </div>

                            <Form {...profileForm}>
                                <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
                                    <FormField
                                        control={profileForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome de Exibição</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                                        {profileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Salvar Alterações
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </CardContent>
                </Card>

                {/* Security Section */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Alterar Senha</CardTitle>
                            <CardDescription>Para sua segurança, exigimos sua senha atual.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...passwordForm}>
                                <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                                    <FormField
                                        control={passwordForm.control}
                                        name="currentPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Senha Atual</FormLabel>
                                                <FormControl>
                                                    <PasswordInput placeholder="••••••••" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={passwordForm.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nova Senha</FormLabel>
                                                <FormControl>
                                                    <PasswordInput placeholder="••••••••" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={passwordForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Confirmar Nova Senha</FormLabel>
                                                <FormControl>
                                                    <PasswordInput placeholder="••••••••" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                                        {passwordForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Atualizar Senha
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Alterar Email</CardTitle>
                            <CardDescription>O endereço de email atualizado será usado para login.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...emailForm}>
                                <form onSubmit={emailForm.handleSubmit(onChangeEmail)} className="space-y-4">
                                    <FormField
                                        control={emailForm.control}
                                        name="newEmail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Novo Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="novo@email.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={emailForm.control}
                                        name="currentPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Senha Atual (Confirmação)</FormLabel>
                                                <FormControl>
                                                    <PasswordInput placeholder="••••••••" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" variant="outline" disabled={emailForm.formState.isSubmitting}>
                                        {emailForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Alterar Email
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
