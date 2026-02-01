import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Save } from "lucide-react"
import {
    Puzzle, Target, Calendar, Wallet, Award,
    Users, MessageSquare, AlertTriangle, ShoppingCart, Users2
} from "lucide-react"

const AREAS = [
    { id: "integracao", icon: Puzzle, title: "Integração", desc: "Gerencimento do plano de projeto" },
    { id: "escopo", icon: Target, title: "Escopo", desc: "Definição do trabalho necessário" },
    { id: "cronograma", icon: Calendar, title: "Cronograma", desc: "Estimativas e sequenciamento" },
    { id: "custos", icon: Wallet, title: "Custos", desc: "Orçamento e controle financeiro" },
    { id: "qualidade", icon: Award, title: "Qualidade", desc: "Padrões e garantia de qualidade" },
    { id: "recursos", icon: Users, title: "Recursos", desc: "Equipe e recursos físicos" },
    { id: "comunicacao", icon: MessageSquare, title: "Comunicação", desc: "Fluxo de informações" },
    { id: "riscos", icon: AlertTriangle, title: "Riscos", desc: "Identificação e mitigação" },
    { id: "aquisicoes", icon: ShoppingCart, title: "Aquisições", desc: "Contratos e fornecedores" },
    { id: "partes", icon: Users2, title: "Partes Interessadas", desc: "Gestão de expectativas" },
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
    )
}

function KnowledgeAreaCard({ projectId, areaDef, initialContent }: { projectId: string, areaDef: any, initialContent: string }) {
    const queryClient = useQueryClient()
    const Icon = areaDef.icon
    const [content, setContent] = useState(initialContent)
    const [isOpen, setIsOpen] = useState(false)

    // Update local state if initialContent changes (e.g. refetch) - but careful not to overwrite user typing
    // Actually, usually redundant if we key the component or handle updates properly. 
    // For simplicity, we trust local state is primary after mount.

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
        }
    })

    const handleSave = () => {
        mutation.mutate(content)
    }

    return (
        <Card className="border shadow-none hover:bg-muted/30 transition-colors group">
            <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
                <div className={`p-2 rounded-lg transition-colors ${content ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'}`}>
                    <Icon className={`w-5 h-5 ${content ? 'text-green-700 dark:text-green-400' : 'text-primary group-hover:text-white'}`} />
                </div>
                <div>
                    <CardTitle className="text-base font-bold text-foreground">{areaDef.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{areaDef.desc}</p>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <Accordion type="single" collapsible value={isOpen ? "item-1" : ""} onValueChange={(v) => setIsOpen(v === "item-1")}>
                    <AccordionItem value="item-1" className="border-none">
                        <AccordionTrigger className="text-xs py-2 hover:no-underline text-primary font-medium">
                            {isOpen ? 'Fechar' : (content ? 'Editar Detalhes' : 'Adicionar Detalhes')}
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Anotações</label>
                                <Textarea
                                    placeholder={`Insira informações sobre ${areaDef.title}...`}
                                    className="text-xs min-h-[100px] bg-background resize-none focus-visible:ring-primary"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                                <div className="flex justify-end">
                                    <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
                                        {mutation.isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                                        <Save className="w-3 h-3 mr-2" />
                                        Salvar
                                    </Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    )
}
