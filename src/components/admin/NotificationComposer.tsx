import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Send, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { TargetSelector } from "./TargetSelector";
import { NotificationPreview } from "./NotificationPreview";

const notificationSchema = z.object({
    title: z.string().min(3, "Título muito curto").max(100, "Título muito longo"),
    message: z.string().min(10, "Mensagem muito curta").max(500, "Mensagem muito longa"),
    type: z.enum(["activity", "system"]),
    priority: z.enum(["normal", "high", "urgent"]),
    link: z.string().url("URL inválida").optional().or(z.literal("")),
    targetType: z.enum(["user", "organization", "role", "multi-org", "all"]),
    targetIds: z.array(z.string()).default([]),
    isScheduled: z.boolean(),
    scheduledFor: z.date().optional(),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

type NotificationComposerProps = {
    organizationId?: string;
    isSuperAdmin: boolean;
    onSuccess?: () => void;
};

export function NotificationComposer({
    organizationId,
    isSuperAdmin,
    onSuccess,
}: NotificationComposerProps) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const form = useForm<NotificationFormValues>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            title: "",
            message: "",
            type: "activity",
            priority: "normal",
            link: "",
            targetType: "user",
            targetIds: [],
            isScheduled: false,
        },
    });

    const isScheduled = form.watch("isScheduled");
    const targetType = form.watch("targetType");
    const targetIds = form.watch("targetIds");

    const onSubmit = async (values: NotificationFormValues) => {
        setPreviewOpen(true);
    };

    const handleConfirmSend = async () => {
        const values = form.getValues();
        setIsSubmitting(true);
        setStatus(null);

        try {
            const endpoint = values.isScheduled
                ? "/api/admin/notifications/schedule"
                : "/api/admin/notifications/send";

            const payload = {
                ...values,
                targetIds: values.targetIds,
                // Clean up optional fields
                link: values.link || undefined,
                scheduledFor: values.isScheduled && values.scheduledFor
                    ? values.scheduledFor.toISOString()
                    : undefined,
            };

            const queryParams = organizationId ? `?orgId=${organizationId}` : "";
            const res = await fetch(`${endpoint}${queryParams}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao enviar notificação");
            }

            setStatus({
                type: "success",
                message: values.isScheduled
                    ? "Notificação agendada com sucesso!"
                    : `Notificação enviada para ${data.sentCount} usuários!`,
            });

            // Trigger updates in other components
            window.dispatchEvent(new CustomEvent("notification:updated"));

            // Scroll to top to show success message
            window.scrollTo({ top: 0, behavior: "smooth" });

            form.reset();
            setPreviewOpen(false);
            if (onSuccess) onSuccess();

        } catch (error) {
            setStatus({
                type: "error",
                message: error instanceof Error ? error.message : "Falha ao processar requisição",
            });
            setPreviewOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto p-6 bg-card rounded-lg border shadow-sm">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Nova Notificação</h2>
                <p className="text-muted-foreground">
                    Envie alertas para usuários ou grupos específicos.
                </p>
            </div>

            {status && (
                <Alert variant={status.type === "error" ? "destructive" : "default"} className={status.type === "success" ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20" : ""}>
                    {status.type === "error" && <AlertCircle className="h-4 w-4" />}
                    {status.type === "success" && <Send className="h-4 w-4" />}
                    <AlertTitle>{status.type === "error" ? "Erro" : "Sucesso"}</AlertTitle>
                    <AlertDescription>{status.message}</AlertDescription>
                </Alert>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Título</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Manutenção Programada" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mensagem</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Digite o conteúdo da notificação..."
                                        className="min-h-[100px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="activity">Atividade</SelectItem>
                                            <SelectItem value="system">Sistema</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Prioridade</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a prioridade" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="high">Alta</SelectItem>
                                            <SelectItem value="urgent">Urgente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="link"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Link de Ação (Opcional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://..." {...field} />
                                </FormControl>
                                <FormDescription>
                                    URL para onde o usuário será redirecionado ao clicar.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                        <TargetSelector
                            targetType={targetType}
                            targetIds={targetIds}
                            onTargetTypeChange={(val) => form.setValue("targetType", val)}
                            onTargetIdsChange={(val) => form.setValue("targetIds", val)}
                            organizationId={organizationId}
                            isSuperAdmin={isSuperAdmin}
                        />
                        {form.formState.errors.targetIds && (
                            <p className="text-sm font-medium text-destructive">
                                {form.formState.errors.targetIds.message}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 border p-4 rounded-lg">
                        <FormField
                            control={form.control}
                            name="isScheduled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between w-full space-y-0">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Agendar envio</FormLabel>
                                        <FormDescription>
                                            Programar para enviar em uma data futura.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    {isScheduled && (
                        <FormField
                            control={form.control}
                            name="scheduledFor"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Data e Hora</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={`w-[240px] pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP 'às' HH:mm", { locale: ptBR })
                                                    ) : (
                                                        <span>Selecione uma data</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                            <div className="p-3 border-t">
                                                <Input
                                                    type="time"
                                                    onChange={(e) => {
                                                        const date = field.value || new Date();
                                                        const [hours, minutes] = e.target.value.split(":");
                                                        date.setHours(parseInt(hours), parseInt(minutes));
                                                        field.onChange(date);
                                                    }}
                                                />
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <div className="flex justify-end pt-4">
                        <Button type="submit" size="lg" disabled={isSubmitting}>
                            {isScheduled ? (
                                <>
                                    <Clock className="mr-2 h-4 w-4" />
                                    Agendar
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Enviar Agora
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>

            <NotificationPreview
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                onConfirm={handleConfirmSend}
                isSubmitting={isSubmitting}
                data={{
                    ...form.getValues(),
                    targetCount: form.getValues().targetIds.length, // Rough estimate, accurate for direct selection
                }}
            />
        </div>
    );
}
