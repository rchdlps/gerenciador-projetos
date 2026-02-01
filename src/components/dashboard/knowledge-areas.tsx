import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea"
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
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {AREAS.map(area => {
                const Icon = area.icon
                return (
                    <Card key={area.id} className="border shadow-none hover:bg-muted/30 transition-colors group">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3 space-y-0">
                            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                <Icon className="w-5 h-5 text-primary group-hover:text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-foreground">{area.title}</CardTitle>
                                <p className="text-xs text-muted-foreground">{area.desc}</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <Accordion type="single" collapsible>
                                <AccordionItem value="item-1" className="border-none">
                                    <AccordionTrigger className="text-xs py-2 hover:no-underline text-primary font-medium">
                                        Editar Detalhes
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase text-muted-foreground">Anotações</label>
                                            <Textarea
                                                placeholder={`Insira informações sobre ${area.title}...`}
                                                className="text-xs min-h-[100px] bg-background resize-none focus-visible:ring-primary"
                                            />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
