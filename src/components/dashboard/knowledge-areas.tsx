import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Save, Search, Lightbulb } from "lucide-react" // Changed imports
import {
    Puzzle, Target, Calendar, Wallet, Award,
    Users, MessageSquare, AlertTriangle, ShoppingCart, Users2
} from "lucide-react"

const AREAS = [
    { id: "integracao", icon: Puzzle, title: "Integração", desc: "Coordenação de todos os aspectos do projeto" },
    { id: "escopo", icon: Target, title: "Escopo", desc: "Definição e controle do que está incluído no projeto" },
    { id: "cronograma", icon: Calendar, title: "Cronograma", desc: "Gerenciamento de prazos e marcos do projeto" },
    { id: "custos", icon: Wallet, title: "Custos", desc: "Planejamento e controle do orçamento" },
    { id: "qualidade", icon: Award, title: "Qualidade", desc: "Garantia de atendimento aos requisitos" },
    { id: "recursos", icon: Users, title: "Recursos", desc: "Gestão de equipe e recursos físicos" },
    { id: "comunicacao", icon: MessageSquare, title: "Comunicação", desc: "Planejamento e distribuição de informações" },
    { id: "riscos", icon: AlertTriangle, title: "Riscos", desc: "Identificação e mitigação de riscos" },
    { id: "aquisicoes", icon: ShoppingCart, title: "Aquisições", desc: "Compras e contratações necessárias" },
    { id: "partes", icon: Users2, title: "Partes Interessadas", desc: "Engajamento e gerenciamento de stakeholders" },
]

export function KnowledgeAreas({ projectId }: { projectId: string }) {
    const { data: areasData = [], isLoading } = useQuery({
        queryKey: ['knowledge-areas', projectId],
        queryFn: async () => {
            const res = await api['knowledge-areas'][':projectId'].$get({ param: { projectId } })
            if (!res.ok) throw new Error()
            return res.json()
        }
    })

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-sky-50 border-l-4 border-[#1d4e46] p-4 rounded-r flex gap-3 text-sm text-[#1d4e46] items-start shadow-sm">
                <Lightbulb className="w-5 h-5 shrink-0 text-yellow-600 mt-0.5" />
                <p>
                    <span className="font-bold">As 10 Áreas de Conhecimento do PMBOK</span> representam os principais campos de especialização necessários para o gerenciamento eficaz de projetos. Documente aqui as informações específicas de cada área para o seu projeto.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AREAS.map(areaDef => {
                    const existingData = areasData.find((a: any) => a.area === areaDef.id)
                    return (
                        <KnowledgeAreaCard
                            key={areaDef.id}
                            projectId={projectId}
                            areaDef={areaDef}
                            initialContent={existingData?.content || ""}
                        />
                    )
                })}
            </div>
        </div>
    )
}

function KnowledgeAreaCard({ projectId, areaDef, initialContent }: { projectId: string, areaDef: any, initialContent: string }) {
    const queryClient = useQueryClient()
    const Icon = areaDef.icon
    const [content, setContent] = useState(initialContent)
    const [open, setOpen] = useState(false)

    const mutation = useMutation({
        mutationFn: async (newContent: string) => {
            const res = await api['knowledge-areas'][':projectId'][':area'].$put({
                param: { projectId, area: areaDef.id },
                json: { content: newContent }
            })
            if (!res.ok) throw new Error()
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['knowledge-areas', projectId] })
            setOpen(false)
        }
    })

    const handleSave = () => {
        mutation.mutate(content)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <div className="relative group cursor-pointer" onClick={() => setOpen(true)}>
                <div className="bg-[#1d4e46] hover:bg-[#256056] text-white rounded-lg p-4 flex items-center justify-between transition-all shadow-md hover:shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-lg">
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{areaDef.title}</h3>
                            <p className="text-xs text-white/70">{areaDef.desc}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* "Clique para abrir" badge - usually hidden or on hover, or always visible based on design */}
                        <div className="hidden group-hover:flex items-center px-2 py-1 bg-yellow-500/90 text-black text-[10px] font-bold rounded-full uppercase tracking-wide animate-in fade-in">
                            Clique para abrir
                        </div>
                        <div className="bg-sky-400/20 p-2 rounded-full group-hover:bg-sky-400/40 transition-colors">
                            <Search className="w-5 h-5 text-sky-300 group-hover:text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="bg-primary/10 p-2 rounded">
                            <Icon className="w-6 h-6 text-primary" />
                        </div>
                        {areaDef.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {areaDef.desc}
                    </p>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold">Conteúdo e Definições</label>
                        <Textarea
                            placeholder={`Descreva os detalhes de ${areaDef.title} para este projeto...`}
                            className="min-h-[300px] resize-y"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
