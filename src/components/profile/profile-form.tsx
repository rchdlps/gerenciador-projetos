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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, Shield, Mail, Calendar, CheckCircle2, Camera, Phone, Send } from "lucide-react"

function splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = (fullName || "").trim().split(/\s+/)
    return {
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
    }
}

// Schema for General Profile
const profileSchema = z.object({
    firstName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
    lastName: z.string().min(1, "O sobrenome é obrigatório"),
    phone: z.string().optional(),
    funcao: z.string().optional(),
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

function formatMemberSince(dateStr: string | undefined): string {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export function ProfileForm() {
    const { data: session, isPending, error } = authClient.useSession()
    const [uploading, setUploading] = useState(false)
    const [sendingVerification, setSendingVerification] = useState(false)

    const sessionUser = session?.user as (typeof session)["user"] & {
        phone?: string
        funcao?: string
    } | undefined

    const { firstName, lastName } = splitName(sessionUser?.name || "")

    // Form 1: General Profile
    const profileForm = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        values: {
            firstName,
            lastName,
            phone: sessionUser?.phone || "",
            funcao: sessionUser?.funcao || "",
            image: sessionUser?.image || "",
        },
    })

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
        const fullName = `${values.firstName} ${values.lastName}`.trim()
        await authClient.updateUser({
            name: fullName,
            image: values.image,
            phone: values.phone || undefined,
            funcao: values.funcao || undefined,
        } as any, {
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

    const handleSendVerification = async () => {
        if (!sessionUser?.email) return
        setSendingVerification(true)
        try {
            await authClient.sendVerificationEmail({
                email: sessionUser.email,
                callbackURL: "/profile",
            })
            toast.success("Email de verificação enviado! Verifique sua caixa de entrada.")
        } catch {
            toast.error("Erro ao enviar email de verificação. Tente novamente.")
        } finally {
            setSendingVerification(false)
        }
    }

    const avatarUrl = profileForm.watch("image") || sessionUser?.image || ""
    const initials = sessionUser?.name
        ?.split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?"

    return (
        <div className="max-w-4xl mx-auto">
            {/* Hero Banner */}
            <div className="relative rounded-xl overflow-hidden shadow-sm">
                {/* Gradient strip */}
                <div className="h-32 sm:h-40 bg-brand-gradient" />

                {/* Profile info overlapping the banner */}
                <div className="bg-card border border-t-0 rounded-b-xl px-6 pb-6 pt-0">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 sm:-mt-16">
                        {/* Avatar with camera overlay */}
                        <div className="relative group shrink-0 self-center sm:self-auto">
                            <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background shadow-lg">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback className="text-2xl font-semibold bg-muted">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                {uploading ? (
                                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                                ) : (
                                    <Camera className="h-6 w-6 text-white" />
                                )}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || [])
                                        if (files.length) handleAvatarUpload(files)
                                        e.target.value = ""
                                    }}
                                    disabled={uploading}
                                />
                            </label>
                        </div>

                        {/* Name, email, badges */}
                        <div className="flex-1 min-w-0 text-center sm:text-left pb-1">
                            <h1 className="text-2xl font-bold tracking-tight truncate">
                                {sessionUser?.name}
                            </h1>
                            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground mt-0.5">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-sm truncate">{sessionUser?.email}</span>
                            </div>
                            {sessionUser?.funcao && (
                                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-muted-foreground mt-0.5">
                                    <User className="h-3.5 w-3.5 shrink-0" />
                                    <span className="text-sm truncate">{sessionUser.funcao}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                                {sessionUser?.createdAt && (
                                    <Badge variant="secondary" className="gap-1 font-normal">
                                        <Calendar className="h-3 w-3" />
                                        Membro desde {formatMemberSince(sessionUser.createdAt as string)}
                                    </Badge>
                                )}
                                {sessionUser?.emailVerified ? (
                                    <Badge variant="secondary" className="gap-1 font-normal text-emerald-700 bg-emerald-50 border-emerald-200">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Email verificado
                                    </Badge>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSendVerification}
                                        disabled={sendingVerification}
                                        className="inline-flex items-center"
                                    >
                                        <Badge variant="secondary" className="gap-1 font-normal text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer">
                                            {sendingVerification ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Send className="h-3 w-3" />
                                            )}
                                            {sendingVerification ? "Enviando..." : "Verificar email"}
                                        </Badge>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="general" className="mt-6">
                <TabsList>
                    <TabsTrigger value="general" className="gap-1.5">
                        <User className="h-4 w-4" />
                        Geral
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-1.5">
                        <Shield className="h-4 w-4" />
                        Segurança
                    </TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações Pessoais</CardTitle>
                            <CardDescription>Atualize seus dados pessoais e de contato.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...profileForm}>
                                <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FormField
                                            control={profileForm.control}
                                            name="firstName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nome</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="João" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={profileForm.control}
                                            name="lastName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Sobrenome</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Silva" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FormField
                                            control={profileForm.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Telefone</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                            <Input
                                                                className="pl-9"
                                                                placeholder="(65) 99999-0000"
                                                                {...field}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={profileForm.control}
                                            name="funcao"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Função</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Ex: Coordenador, Analista, Gestor"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                                            {profileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Salvar Alterações
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="mt-4">
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
                                        <div className="flex justify-end">
                                            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                                                {passwordForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Atualizar Senha
                                            </Button>
                                        </div>
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
                                        <div className="flex justify-end">
                                            <Button type="submit" variant="outline" disabled={emailForm.formState.isSubmitting}>
                                                {emailForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Alterar Email
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
