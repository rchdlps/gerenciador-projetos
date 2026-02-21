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

import { ProjectReadOnlyBanner } from "./project-read-only-banner"

export function KnowledgeAreas({ projectId, initialData = [] }: { projectId: string; initialData?: any[] }) {
    const { data: areasData = [], isLoading } = useQuery({
        queryKey: ['knowledge-areas', projectId],
        queryFn: async () => {
            const res = await api['knowledge-areas'][':projectId'].$get({ param: { projectId } })
            if (!res.ok) throw new Error()
            return res.json()
        },
        initialData,
        staleTime: 1000 * 60 * 2,
    })

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>

    return (
        <div className="space-y-6" aria-label="Áreas de Conhecimento">
            <ProjectReadOnlyBanner projectId={projectId} />

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
    const Icon = areaDef.icon

    return (
        <a href={`/projects/${projectId}/knowledge-areas/${areaDef.id}`} className="relative group cursor-pointer block">
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
                    <div className="hidden group-hover:flex items-center px-2 py-1 bg-yellow-500/90 text-black text-[10px] font-bold rounded-full uppercase tracking-wide animate-in fade-in">
                        Clique para detalhar
                    </div>
                    <div className="bg-sky-400/20 p-2 rounded-full group-hover:bg-sky-400/40 transition-colors">
                        <Search className="w-5 h-5 text-sky-300 group-hover:text-white" />
                    </div>
                </div>
            </div>
        </a>
    )
}
