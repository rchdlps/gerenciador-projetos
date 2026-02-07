import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Edit3, Lightbulb, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function NotesSection({ projectId, area, initialContent }: { projectId: string, area: string, initialContent: string }) {
    const queryClient = useQueryClient()
    const [content, setContent] = useState(initialContent)

    const mutation = useMutation({
        mutationFn: async (newContent: string) => {
            const res = await api['knowledge-areas'][':projectId'][':area'].$put({
                param: { projectId, area },
                json: { content: newContent }
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            // No toast for auto-save to avoid spam
            queryClient.invalidateQueries({ queryKey: ['ka-detail', projectId, area] })
        }
    })

    const handleSave = () => {
        mutation.mutate(content)
        toast.success("Notas salvas!")
    }

    return (
        <Card className="border-t-4 border-yellow-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <div className="bg-yellow-400 p-2 rounded">
                        <Edit3 className="w-5 h-5 text-yellow-900" />
                    </div>
                    <CardTitle className="text-lg font-bold text-yellow-900">Notas Gerais</CardTitle>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSave}
                    disabled={mutation.isPending}
                    className="border-yellow-400 text-yellow-900 h-8 hover:bg-yellow-50"
                >
                    {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
                    Salvar Notas
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 text-sm text-amber-900 flex gap-2">
                    <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                        <span className="font-bold">Espaço para anotações livres:</span> Use este campo para documentar informações importantes, observações, decisões, lições aprendidas ou qualquer outra informação relevante sobre esta área de conhecimento.
                    </p>
                </div>

                <Textarea
                    id="notes-content"
                    aria-label="Conteúdo das Notas"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Adicione anotações gerais, observações importantes, decisões tomadas, lições aprendidas..."
                    className="min-h-[200px] bg-white border-slate-200 focus:border-yellow-400 focus:ring-yellow-400"
                />
            </CardContent>
        </Card>
    )
}

import { Button } from "@/components/ui/button"
